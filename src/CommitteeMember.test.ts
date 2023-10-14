import { Field, Group, PrivateKey, PublicKey } from 'o1js';
import {
    CommitteeMember,
    Round1Contribution,
    Round2Contribution,
    SecretPolynomial,
    getMerkleWitnessType,
} from './CommitteeMember';
import { emptyWitness } from 'o1js/dist/node/lib/proof_system';

describe('CommitteeMember', () => {
    let T = 3;
    let N = 5;
    let keyId = Field(0);
    let committees: {
        privateKey: PrivateKey;
        committeeMember: CommitteeMember;
        secretPolynomial: SecretPolynomial;
        round1Contribution: Round1Contribution | any;
        round2Contribution: Round2Contribution | any;
    }[] = [];
    let round1Contributions: Round1Contribution[] = [];
    let publicKey: PublicKey;
    let w = {
        isLeft: false,
        sibling: Field(0),
    };
    let dummyWitness = Array.from(Array(10).keys()).map(() => w);
    beforeAll(async () => {
        for (let i = 0; i < N; i++) {
            let privateKey = PrivateKey.random();
            let committeeMember = new CommitteeMember({
                publicKey: privateKey.toPublicKey(),
                index: i + 1,
                T: T,
                N: N,
                witness: new (getMerkleWitnessType(10))(dummyWitness),
            });
            let secretPolynomial = committeeMember.getRandomPolynomial();
            let round1Contribution = committeeMember.getRound1Contribution(
                secretPolynomial,
                keyId
            );
            round1Contributions.push(round1Contribution);
            committees.push({
                privateKey: privateKey,
                committeeMember: committeeMember,
                secretPolynomial: secretPolynomial,
                round1Contribution: round1Contribution,
                round2Contribution: null,
            });
        }

        publicKey = CommitteeMember.getPublicKey(round1Contributions);
        console.log(publicKey.x.toBigInt());
        console.log(publicKey.toJSON());
    });
    it('Test Key Generation', async () => {
        let m = 1;
        // for (let i = 0; i < N; i++) {
        //     let senderIndex = i + 1;
        //     let publicKeys: Group[] = [];
        //     for (let j = 0; j < N; j++) {
        //         let recipientIndex = j + 1;
        //         if (senderIndex != recipientIndex) {
        //             publicKeys.push(
        //                 committees[j].privateKey.toPublicKey().toGroup()
        //             );
        //         }
        //     }
        //     let round2Contribution = committees[
        //         i
        //     ].committeeMember.getRound2Contribution(
        //         committees[i].secretPolynomial,
        //         publicKeys,
        //         keyId
        //     );
        // }
    });
});
