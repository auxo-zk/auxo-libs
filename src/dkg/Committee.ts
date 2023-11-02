import {
    Field,
    Group,
    Poseidon,
    PrivateKey,
    PublicKey,
    Scalar,
    Struct,
} from 'o1js';
import * as ElgamalECC from '../utils/Elgamal.js';
import { DynamicArray } from '../utils/DynamicArray.js';
import { CustomScalar } from '../utils/CustomScalar.js';

export {
    SecretPolynomial,
    Round1Contribution,
    Round2Contribution,
    Round2Data,
    TallyContribution,
    calculatePublicKey,
    calculatePolynomialValue,
    generateRandomPolynomial,
    getRound1Contribution,
    getRound2Contribution,
    getTallyContribution,
    getLagrangeCoefficient,
    getResultVector,
};

const GroupDynamicArray = DynamicArray(Group, 32);
const ScalarDynamicArray = DynamicArray(CustomScalar, 32);

type SecretPolynomial = {
    a: Scalar[];
    C: Group[];
    f: Scalar[];
};

type Round2Data = {
    c: Scalar;
    U: Group;
};

class Round1Contribution extends Struct({
    C: GroupDynamicArray,
}) {
    static empty(): Round1Contribution {
        return new Round1Contribution({
            C: new GroupDynamicArray(),
        });
    }

    toFields(): Field[] {
        return this.C.toFields();
    }

    hash(): Field {
        return Poseidon.hash(this.toFields());
    }
}
class Round2Contribution extends Struct({
    c: ScalarDynamicArray,
    U: GroupDynamicArray,
}) {
    static empty(): Round2Contribution {
        return new Round2Contribution({
            c: new ScalarDynamicArray(),
            U: new GroupDynamicArray(),
        });
    }

    toFields(): Field[] {
        return this.c.toFields().concat(this.U.toFields());
    }

    hash(): Field {
        return Poseidon.hash(this.toFields());
    }
}

class TallyContribution extends Struct({
    D: GroupDynamicArray,
}) {
    static empty(): TallyContribution {
        return new TallyContribution({
            D: new GroupDynamicArray(),
        });
    }

    toFields(): Field[] {
        return this.D.toFields();
    }

    hash(): Field {
        return Poseidon.hash(this.toFields());
    }
}

function calculatePublicKey(
    round1Contributions: Round1Contribution[]
): PublicKey {
    let result = Group.zero;
    for (let i = 0; i < round1Contributions.length; i++) {
        result = result.add(round1Contributions[i].C.values[0]);
    }
    return PublicKey.fromGroup(result);
}

function calculatePolynomialValue(a: Scalar[], x: number): Scalar {
    let result = Scalar.from(a[0]);
    for (let i = 1; i < a.length; i++) {
        result = result.add(a[i].mul(Scalar.from(Math.pow(x, i))));
    }
    return result;
}

function generateRandomPolynomial(T: number, N: number): SecretPolynomial {
    let a = new Array<Scalar>(T);
    let C = new Array<Group>(T);
    for (let i = 0; i < T; i++) {
        a[i] = Scalar.random();
        C[i] = Group.generator.scale(a[i]);
    }
    let f = new Array<Scalar>(N);
    for (let i = 0; i < N; i++) {
        f[i] = calculatePolynomialValue(a, i + 1);
    }
    return { a, C, f };
}

function getRound1Contribution(secret: SecretPolynomial): Round1Contribution {
    let provableC = GroupDynamicArray.from(secret.C);
    return new Round1Contribution({ C: provableC });
}

function getRound2Contribution(
    secret: SecretPolynomial,
    index: number,
    round1Contributions: Round1Contribution[]
): Round2Contribution {
    let data = new Array<Round2Data>(secret.f.length);
    let c = new Array<Scalar>(secret.f.length);
    let U = new Array<Group>(secret.f.length);
    for (let i = 0; i < data.length; i++) {
        if (i + 1 == index) {
            c[i] = Scalar.from(0n);
            U[i] = Group.zero;
        } else {
            let encryption = ElgamalECC.encrypt(
                secret.f[i].toBigInt(),
                PublicKey.fromGroup(round1Contributions[i].C.values[0])
            );
            c[i] = Scalar.from(encryption.c);
            U[i] = encryption.U;
        }
    }
    let provablec = ScalarDynamicArray.from(
        c.map((e) => CustomScalar.fromScalar(e))
    );
    let provableU = GroupDynamicArray.from(U);
    return new Round2Contribution({ c: provablec, U: provableU });
}

function getTallyContribution(
    secret: SecretPolynomial,
    index: number,
    round2Data: Round2Data[],
    R: Group[]
): TallyContribution {
    let decryptions: Scalar[] = round2Data.map((data) =>
        Scalar.from(
            ElgamalECC.decrypt(
                data.c.toBigInt(),
                data.U,
                PrivateKey.fromBigInt(secret.a[0].toBigInt())
            ).m
        )
    );
    let ski: Scalar = decryptions.reduce(
        (prev: Scalar, curr: Scalar) => prev.add(curr),
        secret.f[index]
    );

    let D = new Array<Group>(R.length);
    for (let i = 0; i < R.length; i++) {
        D[i] = R[i].scale(ski);
    }
    return new TallyContribution({ D: GroupDynamicArray.from(D) });
}

function getLagrangeCoefficient(listIndex: number[]): Scalar[] {
    const threshold = listIndex.length;
    let lagrangeCoefficient = new Array<Scalar>(threshold);
    for (let i = 0; i < threshold; i++) {
        let indexI = listIndex[i];
        let numerator = Scalar.from(1);
        let denominator = Scalar.from(1);
        for (let j = 0; j < threshold; j++) {
            let indexJ = listIndex[j];
            if (indexI != indexJ) {
                numerator = numerator.mul(Scalar.from(indexJ));
                denominator = denominator.mul(Scalar.from(indexJ - indexI));
            }
        }
        lagrangeCoefficient[i] = numerator.div(denominator);
    }
    return lagrangeCoefficient;
}

function getResultVector(
    listIndex: number[],
    D: Group[][],
    M: Group[]
): Group[] {
    let lagrangeCoefficient = getLagrangeCoefficient(listIndex);
    let threshold = listIndex.length;
    let sumD = Array<Group>(M.length);
    sumD.fill(Group.zero);
    for (let i = 0; i < threshold; i++) {
        for (let j = 0; j < sumD.length; j++) {
            sumD[j] = sumD[j].add(D[i][j].scale(lagrangeCoefficient[i]));
        }
    }
    // console.log(sumD);
    let result = Array<Group>(M.length);
    for (let i = 0; i < result.length; i++) {
        result[i] = M[i].sub(sumD[i]);
    }
    return result;
}
