import { Bool, Field, Poseidon, Provable, Scalar, Struct } from 'o1js';
import { CustomScalar } from './CustomScalar.js';

// WARNING - Convert between Scalar and Bit255 does not preserve bigint value
export class Bit255 extends Struct({
    head: Field,
    tail: Field,
}) {
    static fromScalar(scalar: Scalar): Bit255 {
        let bits = scalar.toFields().map((e) => Bool.fromFields([e]));
        return new Bit255({
            head: Field.fromBits(bits.slice(0, 127)),
            tail: Field.fromBits(bits.slice(127)),
        });
    }

    static toScalar(b: Bit255): Scalar {
        return new CustomScalar({
            head: b.head,
            tail: b.tail,
        }).toScalar();
    }

    static fromFields(fields: Field[]): Bit255 {
        return new Bit255({
            head: fields[0],
            tail: fields[1],
        });
    }

    static toFields(value: { head: Field; tail: Field }): Field[] {
        return [value.head].concat([value.tail]);
    }

    static sizeInFields(): number {
        return 2;
    }

    static xor(a: Bit255, b: Bit255): Bit255 {
        return Provable.witness(Bit255, () =>
            Bit255.fromBigInt(a.toBigInt() ^ b.toBigInt())
        );
    }

    static fromBits(bits: Bool[]): Bit255 {
        if (bits.length !== 255) throw new Error('Invalid input length');
        return new Bit255({
            head: Field.fromBits(bits.slice(0, 127)),
            tail: Field.fromBits(bits.slice(127)),
        });
    }

    static fromBigInt(i: bigint): Bit255 {
        let bits = new Array<Bool>(255).fill(Bool(false));
        let index = 0;
        while (i > 0) {
            bits[index] = Bool(i % 2n == 1n);
            i = i / 2n;
            index += 1;
        }
        return Bit255.fromBits(bits);
    }

    static toBigInt(b: Bit255): bigint {
        let bits = b.head
            .toBits()
            .slice(0, 127)
            .concat(b.tail.toBits().slice(0, 128));
        let res = 0n;
        for (let i = 0; i < 255; i++) {
            if (bits[i].toBoolean()) res += BigInt(Math.pow(2, i));
        }
        return res;
    }

    equals(b: Bit255): Bool {
        return this.head.equals(b.head).and(this.tail.equals(b.tail));
    }

    assertEquals(b: Bit255): void {
        this.head.assertEquals(b.head);
        this.tail.assertEquals(b.tail);
    }

    hash(): Field {
        return Poseidon.hash(this.toFields());
    }

    fromFields(fields: Field[]): Bit255 {
        return Bit255.fromFields(fields);
    }

    toFields(): Field[] {
        return Bit255.toFields(this);
    }

    toScalar(): Scalar {
        return Bit255.toScalar(this);
    }

    xor(b: Bit255): Bit255 {
        return Bit255.xor(this, b);
    }

    toBigInt(): bigint {
        return Bit255.toBigInt(this);
    }
}
