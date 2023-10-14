import { Field, PrivateKey, PublicKey, Scalar } from 'o1js';
import { Pallas } from 'o1js/dist/node/bindings/crypto/elliptic_curve';
import { ElgamalECC } from './Elgamal';
import bigInt from 'big-integer';

describe('ElgamalECC', () => {
    it('Should xor successfully', async () => {
        let a = Scalar.random();
        let b = Scalar.random();
        let xorResult1 = bigInt(a.toBigInt()).xor(b.toBigInt());
        let xorResult2 = ElgamalECC.xor(
            Field.from(a.toBigInt()),
            Field.from(b.toBigInt())
        );

        expect(BigInt(xorResult1.toString())).toEqual(xorResult2.toBigInt());
    });

    it('Should decrypt successfully', async () => {
        let msg = Scalar.random();
        let privateKey = PrivateKey.random();
        let publicKey = privateKey.toPublicKey();
        let encrypted = ElgamalECC.encrypt(
            Field.from(msg.toBigInt()),
            publicKey
        );

        let decrypted = ElgamalECC.decrypt(
            encrypted.U,
            encrypted.c,
            privateKey
        );

        expect(msg.toBigInt()).toEqual(decrypted.m.toBigInt());
    });
});
