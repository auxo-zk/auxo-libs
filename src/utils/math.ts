import { Field, Provable, Scalar, UInt64 } from 'o1js';

export { SHIFT_CONST_ODD, SHIFT_CONST_EVEN, fromUInt64ToScalar };

const SHIFT_CONST_ODD = Scalar.from(-1n - BigInt(2 ** 255)).toBigInt();
const SHIFT_CONST_EVEN = Scalar.from(SHIFT_CONST_ODD)
    .div(Scalar.from(2))
    .toBigInt();

function fromUInt64ToScalar(number: UInt64): Scalar {
    return Provable.if(
        number.value.isEven(),
        Scalar.fromBits(
            number.value.div(2).add(Field(SHIFT_CONST_EVEN)).toBits()
        ),
        Scalar.fromBits(
            number.value.add(Field(SHIFT_CONST_ODD)).div(2).toBits()
        )
    );
}
