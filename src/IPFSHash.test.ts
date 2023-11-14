import { Provable } from 'o1js';
import { IPFSHash } from './IPFSHash.js';

describe('DynamicArray', () => {
  it('Should be provable code', async () => {
    Provable.runAndCheck(() => {
      let ipfsHash = 'QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n';
      let encodedData = Provable.witness(IPFSHash, () => {
        return IPFSHash.fromString(ipfsHash);
      });
      Provable.log(encodedData);
    });
  });

  it('Should convert correctly', async () => {
    let ipfsHash = 'QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n';
    let encoded = IPFSHash.fromString(ipfsHash);
    let decoded = encoded.toString();
    expect(decoded).toEqual(ipfsHash);
  });
});
