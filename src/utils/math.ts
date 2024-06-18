import { Scalar, UInt64 } from 'o1js';

export { fromUInt64ToScalar };

function fromUInt64ToScalar(number: UInt64): Scalar {
    return Scalar.fromBits(number.value.toBits());
}
