import { Bool, Field, Scalar, UInt64 } from 'o1js';

export { divExact, fromUInt64ToScalar, getBitLength };

/**
 * @deprecated Use `Scalar.fromField` instead.
 */
function fromUInt64ToScalar(number: UInt64): Scalar {
    return Scalar.fromBits(number.value.toBits());
}

function getBitLength(N: number): number {
    return Math.floor(Math.log2(N)) + 1;
}

function divExact(a: Field, b: Field): Bool {
    return a.div(b).lessThanOrEqual(a);
}
