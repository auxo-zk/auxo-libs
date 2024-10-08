import {
    Bool,
    Field,
    Provable,
    Reducer,
    Scalar,
    SmartContract,
    method,
} from 'o1js';
import { Bit255 } from './Bit255.js';

describe('Bit255', () => {
    it('Should be provable', async () => {
        class TestBit255 extends SmartContract {
            reducer = Reducer({ actionType: Bit255 });

            @method
            async xor(a: Bit255, b: Bit255, c: Bit255) {
                let res = Bit255.xor(a, b);
                res.assertEquals(c);
                res.assertEquals(
                    Bit255.fromScalar(
                        Provable.witness(Scalar, () =>
                            Scalar.from(Scalar.random().toBigInt())
                        )
                    )
                );
            }
        }

        await TestBit255.analyzeMethods();
    });

    it('Should xor correctly', async () => {
        let r1 = Scalar.random();
        let r2 = Scalar.random();
        let bitString1 = Bit255.fromScalar(r1);
        let bitString2 = Bit255.fromScalar(r2);
        let bigInt1 = bitString1.toBigInt();
        let bigInt2 = bitString2.toBigInt();

        let bitStringXor = Bit255.xor(bitString1, bitString2);
        let bigIntXor = bigInt1 ^ bigInt2;
        expect(bitStringXor.toBigInt()).toEqual(bigIntXor);

        let bitStringXor1 = bitStringXor.xor(bitString2);
        bitStringXor1.assertEquals(bitString1);
        let bigIntXor1 = bigIntXor ^ bigInt2;
        expect(bitStringXor1.toBigInt()).toEqual(bigIntXor1);

        let bitStringXor2 = bitStringXor.xor(bitString1);
        bitStringXor2.assertEquals(bitString2);
        let bigIntXor2 = bigIntXor ^ bigInt1;
        expect(bitStringXor2.toBigInt()).toEqual(bigIntXor2);
    });

    // WARNING - not preserving Scalar's constant value
    it('Should convert between bigint correctly', async () => {
        let r = Scalar.random();
        let bitString = Bit255.fromScalar(r);
        expect(Bit255.fromBigInt(r.toBigInt()).toBigInt()).toEqual(
            r.toBigInt()
        );
        expect(Bit255.fromBigInt(bitString.toBigInt())).toEqual(bitString);
        expect(bitString.toBigInt()).not.toEqual(r.toBigInt());
    });

    it('Should convert between Scalar correctly', async () => {
        let r = Scalar.random();
        let converted = Bit255.fromScalar(r).toScalar();
        expect(r.toBigInt()).toEqual(converted.toBigInt());
    });

    it('Should convert between Fields correctly', async () => {
        let b = Bit255.fromScalar(Scalar.random());
        let converted = Bit255.fromFields(b.toFields());
        expect(b.toBigInt()).toEqual(converted.toBigInt());
    });

    it('Should convert between bits correctly', async () => {
        let b = Bit255.fromScalar(Scalar.random());
        let converted = Bit255.fromBits(b.toBits());
        expect(b.toBigInt()).toEqual(converted.toBigInt());
    });

    it('Should preserve correctness between bigint and bits', async () => {
        let r = Field.random();
        let bi = r.toBigInt();
        let bits = r.toBits();
        expect(Bit255.fromBits(bits.concat([Bool(false)])).toBigInt()).toEqual(
            bi
        );
        // let b2 = Bit255.fromBigInt(b.toBigInt());
        // expect(b.toBigInt()).toEqual(b1.toBigInt());
        // expect(b.toBigInt()).toEqual(b2.toBigInt());
    });
});
