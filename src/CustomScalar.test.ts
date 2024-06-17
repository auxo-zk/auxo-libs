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
        let min = UInt64.zero;
        let max = UInt64.MAXINT();
        let odd = UInt64.from(BigInt(10 ** 16) + 1n);
        let even = UInt64.from(BigInt(10 ** 8));
        expect(CustomScalar.fromUInt64(min).toScalar().toBigInt()).toEqual(
            min.toBigInt()
        );
        expect(CustomScalar.fromUInt64(max).toScalar().toBigInt()).toEqual(
            max.toBigInt()
        );
        expect(CustomScalar.fromUInt64(odd).toScalar().toBigInt()).toEqual(
            odd.toBigInt()
        );
        expect(CustomScalar.fromUInt64(even).toScalar().toBigInt()).toEqual(
            even.toBigInt()
        );
    });

    it('Should assert equality correctly with message', async () => {
        let a = CustomScalar.fromScalar(Scalar.from(1n));
        let b = CustomScalar.fromScalar(Scalar.from(1n));
        let c = CustomScalar.fromScalar(Scalar.from(2n));
        expect(() => a.assertEquals(b, 'a and b are equal')).not.toThrow();
        expect(() => a.assertEquals(c, 'a and c are not equal')).toThrow();
    });

    it('Should convert to and from fields correctly', async () => {
        let original = CustomScalar.fromScalar(Scalar.random());
        expect(original.toFields().length).toEqual(CustomScalar.sizeInFields());
        expect(
            CustomScalar.fromFields(original.toFields())
                .equals(original)
                .toBoolean()
        ).toEqual(true);
    });
});
