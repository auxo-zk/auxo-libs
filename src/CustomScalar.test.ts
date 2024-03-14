import { Scalar, UInt64 } from 'o1js';
import { CustomScalar } from './CustomScalar.js';

describe('CustomScalar', () => {
    it('Should convert between Scalar correctly', async () => {
        let original = Scalar.random();
        let encoded = CustomScalar.fromScalar(original);
        let decoded = encoded.toScalar();
        expect(original).toEqual(decoded);
    });

    it('Should convert from odd UInt64 value correctly', async () => {
        let number = UInt64.from(BigInt(10 ** 16) + 1n);
        let scalar = CustomScalar.fromUInt64(number);
        expect(scalar.toScalar().toBigInt()).toEqual(number.toBigInt());
    });

    it('Should not convert from even UInt64 value', async () => {
        expect(() =>
            CustomScalar.fromUInt64(UInt64.from(BigInt(10 ** 16)))
        ).toThrow();
    });
});
