import {
  Bool,
  Encryption,
  Field,
  Group,
  MerkleWitness,
  Poseidon,
  PrivateKey,
  Provable,
  PublicKey,
  Scalar,
  Struct,
  UInt32,
} from 'o1js';

export class ElgamalECC {
  static xor(a: Field, b: Field) {
    let a_bits = a.toBits(255);
    let b_bits = b.toBits(255);
    let r = Provable.witness(Field, () => Field(0));
    let r_bits = r.toBits(255);
    for (let i = 0; i < r_bits.length; i++) {
      r_bits[i] = Bool(!!a_bits[i] !== !!b_bits[i]);
    }
    return (r = Field.fromBits(r_bits));
  }

  static encrypt(
    m: Field,
    pbK: PublicKey
  ): {
    b: Scalar;
    U: Group;
    c: Field;
  } {
    let b = Provable.witness(Scalar, () => Scalar.random());
    let U = Group.generator.scale(b);
    let V = pbK.toGroup().scale(b);
    let k = Poseidon.hash(U.toFields().concat(V.toFields()));
    let c = this.xor(k, m);
    return {
      b: b,
      U: U,
      c: c,
    };
  }

  static decrypt(U: Group, c: Field, prvK: PrivateKey): { m: Field } {
    let V = U.scale(Scalar.fromFields(prvK.toFields()));
    let k = Poseidon.hash(U.toFields().concat(V.toFields()));
    let m = this.xor(k, c);
    return { m: m };
  }
}
