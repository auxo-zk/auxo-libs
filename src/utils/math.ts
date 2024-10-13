import { Bool, Field, Gadgets, Scalar, UInt64 } from 'o1js';

export { divExact, fieldXOR, fromUInt64ToScalar, getBitLength };

/**
 * @deprecated Use `Scalar.fromField` instead.
 */
function fromUInt64ToScalar(number: UInt64): Scalar {
    return Scalar.fromBits(number.value.toBits());
}

function getBitLength(N: number): number {
    return N == 0 ? 1 : Math.floor(Math.log2(N)) + 1;
}

function divExact(a: Field, b: Field): Bool {
    b.assertNotEquals(Field(0));
    return a.div(b).lessThanOrEqual(a);
}

function fieldXOR(a: Field, b: Field): Field {
    let a240 = Field.fromBits(a.toBits().slice(0, 240));
    let b240 = Field.fromBits(b.toBits().slice(0, 240));
    let a14 = Field.fromBits(a.toBits().slice(240));
    let b14 = Field.fromBits(b.toBits().slice(240));
    let xor240 = Gadgets.xor(a240, b240, 240);
    let xor14 = Gadgets.xor(a14, b14, 14);
    return Field.fromBits([
        ...xor240.toBits().slice(0, 240),
        ...xor14.toBits().slice(0, 14),
    ]);
}
