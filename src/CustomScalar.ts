import { Bool, Field, Poseidon, Scalar, Struct } from 'o1js';

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

    hash(): Field {
        return Poseidon.hash(this.toScalar().toFields());
    }

    equals(s: CustomScalar): Bool {
        return this.head.equals(s.head).and(this.tail.equals(s.tail));
    }

    assertEquals(s: CustomScalar): void {
        this.equals(s).assertTrue();
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
