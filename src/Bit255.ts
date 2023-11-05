import { Bool, Field, Gadgets, Poseidon, Scalar, Struct } from 'o1js';

export class Bit255 extends Struct({
  head: Field,
  tail: Field,
}) {
  static fromScalar(scalar: Scalar): Bit255 {
    let bits = scalar.toFields().map((e) => e.toBits()[0]);
    return new Bit255({
      head: Field.fromBits(bits.slice(0, 127)),
      tail: Field.fromBits(bits.slice(127)),
    });
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
    return new Bit255({
      head: Gadgets.xor(a.head, b.head, 127),
      tail: Gadgets.xor(a.tail, b.tail, 126),
    });
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

  xor(b: Bit255): Bit255 {
    return Bit255.xor(this, b);
  }
}
