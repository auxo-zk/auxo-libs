import { Scalar } from 'o1js';
import { Bit255 } from './Bit255';

describe('CustomScalar', () => {
  it('Should xor correctly', async () => {
    let r1 = Scalar.random();
    let r2 = Scalar.random();
    let bitString1 = Bit255.fromScalar(r1);
    let bitString2 = Bit255.fromScalar(r2);

    let bitStringXor = Bit255.xor(bitString1, bitString2);
    bitStringXor.xor(bitString1).assertEquals(bitString2);
    bitStringXor.xor(bitString2).assertEquals(bitString1);
  });
});
