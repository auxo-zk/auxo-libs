import { Bool, Field, Poseidon, Provable, Scalar, Struct, UInt64 } from 'o1js';

const SHIFT_CONST_ODD = Scalar.from(-1n - BigInt(2 ** 255)).toBigInt();
const SHIFT_CONST_EVEN = Scalar.from(SHIFT_CONST_ODD)
    .div(Scalar.from(2))
    .toBigInt();

export class CustomScalar extends Struct({
    head: Field,
    tail: Field,
}) {
    static fromScalar(scalar: Scalar): CustomScalar {
        let bits = scalar.toFields().map((e) => Bool.fromFields([e]));
        return new CustomScalar({
            head: Field.fromBits(bits.slice(0, 127)),
            tail: Field.fromBits(bits.slice(127)),
        });
    }

    static fromFields(fields: Field[]): CustomScalar {
        return new CustomScalar({
            head: fields[0],
            tail: fields[1],
        });
    }

    static toScalar(scalar: CustomScalar): Scalar {
        return Scalar.fromBits(
            scalar.head
                .toBits()
                .slice(0, 127)
                .concat(scalar.tail.toBits().slice(0, 128))
        );
    }

    static toFields(value: { head: Field; tail: Field }): Field[] {
        return [value.head].concat([value.tail]);
    }

    static sizeInFields(): number {
        return 2;
    }

    static fromUInt64(number: UInt64): CustomScalar {
        return Provable.if(
            number.value.isEven(),
            CustomScalar.fromScalar(
                Scalar.fromBits(
                    number.value.div(2).add(Field(SHIFT_CONST_EVEN)).toBits()
                )
            ),
            CustomScalar.fromScalar(
                Scalar.fromBits(
                    number.value.add(Field(SHIFT_CONST_ODD)).div(2).toBits()
                )
            )
        );
    }

    hash(): Field {
        return Poseidon.hash(this.toScalar().toFields());
    }

    equals(s: CustomScalar): Bool {
        return this.head.equals(s.head).and(this.tail.equals(s.tail));
    }

    assertEquals(s: CustomScalar, message?: string | undefined): void {
        this.equals(s).assertTrue(message);
    }

    toScalar(): Scalar {
        return CustomScalar.toScalar(this);
    }

    toFields(): Field[] {
        return CustomScalar.toFields(this);
    }

    fromFields(fields: Field[]): CustomScalar {
        return CustomScalar.fromFields(fields);
    }
}
