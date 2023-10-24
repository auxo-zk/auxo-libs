import { Field, Group, Provable, PrivateKey, PublicKey, Scalar } from 'o1js';
import * as Committee from './CommitteeMember';

describe('CommitteeMember', () => {
    let T = 3;
    let N = 5;
    let keyId = Field(0);
    let committees: {
        privateKey: PrivateKey;
        index: number;
        secretPolynomial: Committee.SecretPolynomial;
        round1Contribution?: Committee.Round1Contribution;
        round2Contribution?: Committee.Round2Contribution;
        tallyContribution?: Committee.TallyContribution;
    }[] = [];
    let round1Contributions: Committee.Round1Contribution[] = [];
    let round2Contributions: Committee.Round2Contribution[] = [];
    let tallyContributions: Committee.TallyContribution[] = [];
    let publicKey: PublicKey;
    let R: Group[][] = [];
    let M: Group[][] = [];
    let sumR: Group[] = [];
    let sumM: Group[] = [];
    let D: Group[][] = [];
    let listIndex = [1, 2, 3];
    const plainVectors = [
        [1000n, 0n, 0n],
        [0n, 1000n, 0n],
        [0n, 0n, 1000n],
        [2000n, 0n, 0n],
        [2000n, 0n, 0n],
    ];
    let result = [5000n, 1000n, 1000n];

    beforeAll(async () => {
        for (let i = 0; i < N; i++) {
            let privateKey = PrivateKey.random();
            // let committeeMember = {
            //   publicKey: privateKey.toPublicKey(),
            //   index: i + 1,
            //   round1Contribution: undefined,
            //   round2Contribution: undefined,
            // };
            let secretPolynomial = Committee.generateRandomPolynomial(T, N);
            committees.push({
                privateKey: privateKey,
                index: i + 1,
                secretPolynomial: secretPolynomial,
                round1Contribution: undefined,
                round2Contribution: undefined,
            });
        }
    });

    it('Should generate round 1 contribution', async () => {
        for (let i = 0; i < N; i++) {
            let round1Contribution = Committee.getRound1Contribution(
                committees[i].secretPolynomial
            );
            committees[i].round1Contribution = round1Contribution;
            round1Contributions.push(round1Contribution);
        }
        publicKey = Committee.calculatePublicKey(round1Contributions);
        // Provable.log(publicKey);
        // Provable.log(round1Contributions);
    });

    it('Should generate round 2 contribution', async () => {
        for (let i = 0; i < N; i++) {
            let round2Contribution = Committee.getRound2Contribution(
                committees[i].secretPolynomial,
                committees[i].index,
                round1Contributions
            );
            committees[i].round2Contribution = round2Contribution;
            round2Contributions.push(round2Contribution);
        }
        // Provable.log(round2Contributions);
        // round2Contributions.map((e) => console.log(e.data));
    });

    it('Should accumulate encryption', async () => {
        for (let i = 0; i < plainVectors.length; i++) {
            let encryptedVector = Committee.encryptVector(
                Committee.calculatePublicKey(round1Contributions),
                plainVectors[i]
            );
            R.push(encryptedVector.R);
            M.push(encryptedVector.M);
        }

        let accumulatedEncryption = Committee.accumulateEncryption(R, M);
        sumR = accumulatedEncryption.sumR;
        sumM = accumulatedEncryption.sumM;
        // Provable.log(sumR, sumM);
    });

    it('Should generate tally contribution', async () => {
        for (let i = 0; i < T; i++) {
            let round2Data: Committee.Round2Data[] = [];
            round2Contributions.reduce(
                (prev, curr, index) =>
                    index == committees[listIndex[i] - 1].index - 1
                        ? prev
                        : round2Data.push(
                              curr.data[committees[listIndex[i] - 1].index - 1]
                          ),
                {}
            );
            let tallyContribution = Committee.getTallyContribution(
                committees[listIndex[i] - 1].secretPolynomial,
                committees[listIndex[i] - 1].index - 1,
                round2Data,
                sumR
            );
            committees[listIndex[i] - 1].tallyContribution = tallyContribution;
            tallyContributions.push(tallyContribution);
            D.push(tallyContribution.D);
        }
        // Provable.log(tallyContributions);
        // tallyContributions.map((e) => Provable.log(e.D));
    });

    it('Should calculate result vector', async () => {
        // console.log(D.length);
        let resultVector = Committee.getResultVector(listIndex, D, sumM);
        // Provable.log('Result vector: ', resultVector);
        for (let i = 0; i < result.length; i++) {
            let point = Group.generator.scale(Scalar.from(result[i]));
            // Provable.log(point);
            expect(resultVector[i].x).toEqual(point.x);
            expect(resultVector[i].y).toEqual(point.y);
        }
    });
});
