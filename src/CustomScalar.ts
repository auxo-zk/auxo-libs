import { Bool, Field, Poseidon, Scalar, Struct, UInt64 } from 'o1js';
import { fromUInt64ToScalar } from './utils/math.js';

/**
 * @deprecated This class is deprecated. Use Scalar instead.
 */
export class CustomScalar extends Struct({
    scalar: Scalar,
}) {
    static fromScalar(scalar: Scalar): CustomScalar {
        return new CustomScalar({
            scalar,
        });
    }

    static fromFields(fields: Field[]): CustomScalar {
        return new CustomScalar({
            scalar: Scalar.fromFields(fields),
        });
    }

    static toScalar(scalar: CustomScalar): Scalar {
        return scalar.scalar;
    }

    static toFields({ scalar }: { scalar: Scalar }): Field[] {
        return scalar.toFields();
    }

    static sizeInFields(): number {
        return 2;
    }

    static fromUInt64(number: UInt64): CustomScalar {
        return CustomScalar.fromScalar(fromUInt64ToScalar(number));
    }

    hash(): Field {
        return Poseidon.hash(this.toFields());
    }

    equals(s: CustomScalar): Bool {
        return this.hash().equals(s.hash());
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
}
