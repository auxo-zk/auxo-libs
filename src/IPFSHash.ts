import { Encoding } from 'o1js';
import { FieldDynamicArray } from './DynamicArray.js';

export class IpfsHash extends FieldDynamicArray(3) {
    static fromString(s: string): IpfsHash {
        return new IpfsHash(Encoding.stringToFields(s));
    }

    static toString(hash: IpfsHash): string {
        return Encoding.stringFromFields(
            hash.values.slice(0, Number(hash.length))
        );
    }

    toString(): string {
        return IpfsHash.toString(this);
    }
}
