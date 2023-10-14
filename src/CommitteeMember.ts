import {
    Bool,
    Encryption,
    Field,
    Group,
    MerkleWitness,
    Poseidon,
    PrivateKey,
    Provable,
    PublicKey,
    Scalar,
    Struct,
    UInt32,
} from 'o1js';
import { ElgamalECC } from './Elgamal';

const MEMBERSHIP_DEPTH = 10;
const ROUND_1_CONTRIBUTION_DEPTH = 10;
const ROUND_2_CONTRIBUTION_DEPTH = 10;
const TALLY_CONTRIBUTION_DEPTH = 10;

function getMerkleWitnessType(depth: number) {
    return MerkleWitness(depth);
}

let w = {
    isLeft: false,
    sibling: Field(0),
};
let dummyWitness = Array.from(Array(10).keys()).map(() => w);

export const ContributionStage: { [key: string]: Field } = {
    ROUND_1: Field(0),
    ROUND_2: Field(1),
    DECRYPTION: Field(2),
};

export class SecretPolynomial extends Struct({
    C: [Group],
    a: [Field],
    a0: Field,
    f: [Field],
}) {}

export class Round1Contribution extends Struct({
    C: [Group],
    witness: getMerkleWitnessType(ROUND_1_CONTRIBUTION_DEPTH),
    keyId: Field,
}) {
    getHash(): Field {
        let packed: Field[] = [];
        for (let i = 0; i < this.C.length; i++) {
            packed.concat(this.C[i].toFields());
        }
        return Poseidon.hash(packed);
    }
}

export class Round2Data extends Struct({ U: Group, c: Field }) {
    getHash(): Field {
        return Poseidon.hash(this.U.toFields().concat(this.c));
    }
}

export class Round2Contribution extends Struct({
    data: [Round2Data],
    witness: getMerkleWitnessType(ROUND_2_CONTRIBUTION_DEPTH),
    keyId: Field,
}) {
    getHash(): Field {
        return Poseidon.hash(this.data.map((e) => e.getHash()));
    }
}

export class TallyContribution extends Struct({
    D: [Group],
    witness: getMerkleWitnessType(ROUND_2_CONTRIBUTION_DEPTH),
    keyId: Field,
}) {
    getHash(): Field {
        return Poseidon.hash(this.D.map((p) => Field.fromFields(p.toFields())));
    }
}

export class CommitteeMember extends Struct({
    publicKey: PublicKey,
    index: Number,
    witness: getMerkleWitnessType(10),
    T: Number,
    N: Number,
}) {
    static getPublicKey(round1Contributions: Round1Contribution[]): PublicKey {
        let result = Group.zero;
        for (let i = 0; i < round1Contributions.length; i++) {
            result = result.add(round1Contributions[i].C[0]);
        }
        return PublicKey.fromGroup(result);
    }

    getHash(): Field {
        return Poseidon.hash(this.publicKey.toFields());
    }

    calculatePolynomialValue(a: Field[], x: number): Field {
        let result = Field(0);
        for (let i = 0; i < this.T; i++) {
            result = result.add(a[i].mul(Math.pow(x, i)));
        }
        return result;
    }

    getRandomPolynomial(): SecretPolynomial {
        let a = new Array<Field>(this.T);
        let C = new Array<Group>(this.T);
        for (let i = 0; i < this.T; i++) {
            a[i] = Field.random();
            C[i] = Group.generator.scale(Scalar.fromFields(a[i].toFields()));
        }
        let f = new Array<Field>(this.N);
        for (let i = 0; i < this.N; i++) {
            f[i] = this.calculatePolynomialValue(a, i + 1);
        }
        return { C: C, a: a, a0: a[0], f: f };
    }

    getRound1Contribution(
        secret: SecretPolynomial,
        keyId: Field
    ): Round1Contribution {
        return new Round1Contribution({
            C: secret.C,
            keyId: keyId,
            witness: new (getMerkleWitnessType(this.index - 1))(dummyWitness),
        });
    }

    getRound2Contribution(
        secret: SecretPolynomial,
        publicKeys: Group[],
        keyId: Field
    ): Round2Contribution {
        let data = new Array<Round2Data>(this.N);
        for (let i = 0; i < this.N; i++) {
            if (i + 1 == Number(this.index)) {
                data[i].U = Group.zero;
                data[i].c = Field(0);
            } else {
                let encryption = ElgamalECC.encrypt(
                    secret.f[i],
                    PublicKey.fromGroup(publicKeys[i])
                );
                data[i].U = encryption.U;
                data[i].c = encryption.c;
            }
        }
        return new Round2Contribution({
            data: data,
            witness: new (getMerkleWitnessType(this.index - 1))(dummyWitness),
            keyId: keyId,
        });
    }

    getTallyContribution(
        secret: SecretPolynomial,
        privateKey: PrivateKey,
        round2Data: Round2Data[],
        R: Group[],
        keyId: Field
    ) {
        let decryptions: Field[] = round2Data.map(
            (data) => ElgamalECC.decrypt(data.U, data.c, privateKey).m
        );
        let ski: Field = decryptions.reduce(
            (prev: Field, curr: Field) => prev.add(curr),
            secret.f[this.index]
        );

        let D = new Array<Group>(R.length);
        for (let i = 0; i < R.length; i++) {
            D[i] = R[i].scale(Scalar.fromFields(ski.toFields()));
        }
        return new TallyContribution({
            D: D,
            witness: new (getMerkleWitnessType(this.index - 1))(dummyWitness),
            keyId: keyId,
        });
    }

    getLagrangeCoefficient(listIndex: number[]): Field[] {
        let lagrangeCoefficient = new Array<Field>(this.T);
        for (let i = 0; i < this.T; i++) {
            let indexI = listIndex[i];
            let numerator = Field(1);
            let denominator = Field(1);
            for (let j = 0; j < this.T; j++) {
                let indexJ = listIndex[j];
                if (indexI != indexJ) {
                    numerator = numerator.mul(indexJ);
                    denominator = denominator.mul(indexJ - indexI);
                }
            }

            while (denominator.lessThan(Field(0))) {
                denominator = denominator.add(Field.ORDER);
            }
            denominator = denominator.inv();
            lagrangeCoefficient[i] = numerator.mul(denominator);
        }
        return lagrangeCoefficient;
    }
}
