import { Bool, Field, Gadgets, Poseidon, Scalar, Struct } from 'o1js';

const MASK_HEAD = (1n << 128n) - 1n;
const MASK_TAIL = (1n << 127n) - 1n;

// WARNING - Convert between Scalar and Bit255 does not preserve bigint value
export class Bit255 extends Struct({
    head: Field,
    tail: Field,
}) {
    static fromScalar(scalar: Scalar): Bit255 {
        let bits = [scalar.lowBit].concat(scalar.high254.toBits());
        return new Bit255({
            head: Field.fromBits(bits.slice(0, 128)),
            tail: Field.fromBits(bits.slice(128)),
        });
    }

    static toScalar(b: Bit255): Scalar {
        return Scalar.fromFields([
            b.head.toBits()[0].toField(),
            Field.fromBits(
                b.head
                    .toBits()
                    .slice(1, 128)
                    .concat(b.tail.toBits().slice(0, 127))
            ),
        ]);
    }

    static fromFields(fields: Field[]): Bit255 {
        return new Bit255({
            head: fields[0],
            tail: fields[1],
        });
    }

    static toFields(value: { head: Field; tail: Field }): Field[] {
        return [value.head, value.tail];
    }

    static sizeInFields(): number {
        return 2;
    }

    static xor(a: Bit255, b: Bit255): Bit255 {
        return new Bit255({
            head: Gadgets.xor(a.head, b.head, 128),
            tail: Gadgets.xor(a.tail, b.tail, 127),
        });
    }

    static fromBits(bits: Bool[]): Bit255 {
        if (bits.length !== 255) throw new Error('Invalid input length');
        return new Bit255({
            head: Field.fromBits(bits.slice(127)),
            tail: Field.fromBits(bits.slice(0, 127)),
        });
    }

    static toBits(b: Bit255): Bool[] {
        return b.tail
            .toBits()
            .slice(0, 127)
            .concat(b.head.toBits().slice(0, 128));
    }

    static fromBigInt(i: bigint): Bit255 {
        return new Bit255({
            head: Field((i >> 127n) & MASK_HEAD),
            tail: Field(i & MASK_TAIL),
        });
    }

    static toBigInt(b: Bit255): bigint {
        return (b.head.toBigInt() << 127n) + b.tail.toBigInt();
    }

    equals(b: Bit255): Bool {
        return this.head.equals(b.head).and(this.tail.equals(b.tail));
    }

    assertEquals(b: Bit255, message?: string | undefined): void {
        this.equals(b).assertTrue(message);
    }

    hash(): Field {
        return Poseidon.hash(this.toFields());
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

    toBits(): Bool[] {
        return Bit255.toBits(this);
    }
}
