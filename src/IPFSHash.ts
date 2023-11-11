import { Encoding } from 'o1js';
import { FieldDynamicArray } from './DynamicArray.js';

export class IPFSHash extends FieldDynamicArray(3) {
  static fromString(s: string): IPFSHash {
    return new IPFSHash(Encoding.stringToFields(s));
  }

  static toString(hash: IPFSHash): string {
    return Encoding.stringFromFields(hash.values.slice(0, Number(hash.length)));
  }

  toString(): string {
    return IPFSHash.toString(this);
  }
}
