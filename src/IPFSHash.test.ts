import { Provable } from 'o1js';
import { IpfsHash } from './IpfsHash.js';

describe('IpfsHash', () => {
    it('Should be provable code', async () => {
        Provable.runAndCheck(() => {
            let ipfsHash = 'QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n';
            let encodedData = Provable.witness(IpfsHash, () => {
                return IpfsHash.fromString(ipfsHash);
            });
            Provable.log(encodedData);
        });
    });

    it('Should convert correctly', async () => {
        let ipfsHash = 'QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n';
        let encoded = IpfsHash.fromString(ipfsHash);
        let decoded = encoded.toString();
        expect(decoded).toEqual(ipfsHash);
    });
});
