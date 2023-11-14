import { Scalar } from 'o1js';
import { CustomScalar } from './CustomScalar.js';

describe('CustomScalar', () => {
  it('Should convert correctly', async () => {
    let original = Scalar.random();
    console.log('Original:', original);
    let encoded = CustomScalar.fromScalar(original);
    // console.log('Encoded:', encoded);
    let decoded = encoded.toScalar();
    // console.log('Decoded:', decoded);
    expect(original).toEqual(decoded);
  });
});
