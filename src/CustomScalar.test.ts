import { Scalar } from 'o1js';
import { CustomScalar } from 'src/CustomScalar.js';

describe('CustomScalar', () => {
    it('Should convert correctly', async () => {
        let original = Scalar.random();
        console.log('Original:', original);
        let encoded = CustomScalar.fromScalar(original);
        let decoded = encoded.toScalar();
        expect(original).toEqual(decoded);
    });
});
