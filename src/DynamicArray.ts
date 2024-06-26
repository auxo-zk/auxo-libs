import {
    Bool,
    Field,
    Group,
    Poseidon,
    Provable,
    ProvablePure,
    PublicKey,
    Scalar,
    Struct,
} from 'o1js';

import { Bit255 } from './Bit255.js';
import { hashable } from './Hashable.js';

export {
    Bit255DynamicArray,
    BoolDynamicArray,
    FieldDynamicArray,
    GroupDynamicArray,
    ScalarDynamicArray,
    PublicKeyDynamicArray,
    DynamicArray,
};

function Bit255DynamicArray(maxLength: number) {
    if (maxLength > 128) throw new Error('Exceed maximum size');
    return DynamicArray(Bit255, maxLength);
}

function BoolDynamicArray(maxLength: number) {
    if (maxLength > 256) throw new Error('Exceed maximum size');
    return DynamicArray(Bool, maxLength);
}

function FieldDynamicArray(maxLength: number) {
    if (maxLength > 256) throw new Error('Exceed maximum size');
    return DynamicArray(Field, maxLength);
}

function GroupDynamicArray(maxLength: number) {
    if (maxLength > 128) throw new Error('Exceed maximum size');
    return DynamicArray(Group, maxLength);
}

function ScalarDynamicArray(maxLength: number) {
    if (maxLength > 128) throw new Error('Exceed maximum size');
    return DynamicArray(Scalar, maxLength);
}

function PublicKeyDynamicArray(maxLength: number) {
    if (maxLength > 128) throw new Error('Exceed maximum size');
    return DynamicArray(PublicKey, maxLength);
}

function DynamicArray<T>(type: ProvablePure<T>, maxLength: number) {
    const _type = hashable(type);
    return class _DynamicArray extends Struct({
        length: Field,
        values: Provable.Array(type, maxLength),
    }) {
        static from(values: T[]): _DynamicArray {
            return new _DynamicArray(values);
        }

        static fromFields(fields: Field[]): _DynamicArray {
            return super.fromFields(fields) as _DynamicArray;
        }

        static empty(length?: Field): _DynamicArray {
            const arr = new _DynamicArray();
            arr.length = length ?? Field(0);
            return arr;
        }

        static hash(value: T): Field {
            return _type.hash(value);
        }

        static Null(): T {
            return type.fromFields(Array(type.sizeInFields()).fill(Field(0)));
        }

        static fillWithNull(values: T[], length: number): T[] {
            let tempValues = [...values];
            for (let i = values.length; i < length; i++) {
                tempValues[i] = _DynamicArray.Null();
            }
            return tempValues;
        }

        public constructor(values?: T[]) {
            super({
                values: _DynamicArray.fillWithNull(values ?? [], maxLength),
                length: values === undefined ? Field(0) : Field(values.length),
            });
        }

        public get(index: Field): T {
            const mask = this.indexMask(index);
            return Provable.switch(mask, type, this.values);
        }

        public set(index: Field, value: T): void {
            const mask = this.indexMask(index);
            for (let i = 0; i < this.maxLength(); i++) {
                this.values[i] = Provable.switch(
                    [mask[i], mask[i].not()],
                    type,
                    [value, this.values[i]]
                );
            }
        }

        public toFields(): Field[] {
            return [
                this.length,
                ...this.values.map((v) => type.toFields(v)).flat(),
            ];
        }

        public push(value: T): void {
            this.incrementLength(Field(1));
            this.set(this.length.sub(1), value);
        }

        public pop(n: Field): void {
            const mask = this.lengthMask(this.length.sub(n));
            this.decrementLength(n);

            for (let i = 0; i < this.maxLength(); i++) {
                this.values[i] = Provable.switch(
                    [mask[i], mask[i].not()],
                    type,
                    [this.values[i], _DynamicArray.Null()]
                );
            }
        }

        public concat(other: this): this {
            const newArr = other.copy();
            newArr.shiftRight(this.length);
            let masked = Bool(true);
            for (let i = 0; i < this.maxLength(); i++) {
                masked = Provable.if(
                    Field(i).equals(this.length),
                    Bool(false),
                    masked
                );
                newArr.values[i] = Provable.if(
                    masked,
                    type,
                    this.values[i],
                    newArr.values[i]
                );
            }
            return newArr;
        }

        public copy(): this {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newArr = new (<any>this.constructor)();
            newArr.values = this.values.slice();
            newArr.length = this.length;
            return newArr;
        }

        public slice(start: Field, end: Field): this {
            const newArr = this.copy();
            newArr.shiftLeft(start);
            newArr.pop(newArr.length.sub(end.sub(start)));
            return newArr;
        }

        public insert(index: Field, value: T): void {
            const arr1 = this.slice(Field(0), index);
            const arr2 = this.slice(index, this.length);
            arr2.shiftRight(Field(1));
            arr2.set(Field(0), value);
            const concatArr = arr1.concat(arr2);
            this.values = concatArr.values;
            this.length = concatArr.length;
        }

        public includes(value: T): Bool {
            let result = Field(0);
            for (let i = 0; i < this.maxLength(); i++) {
                result = result.add(
                    Provable.if(
                        _type.equals(this.values[i], value),
                        Field(1),
                        Field(0)
                    )
                );
            }
            return result.equals(Field(0)).not();
        }

        public assertIncludes(value: T): void {
            this.includes(value).assertTrue();
        }

        public shiftLeft(n: Field): void {
            n.equals(this.length).assertFalse();
            this.decrementLength(n);

            const nullArray = _DynamicArray.empty(n);

            const possibleResults = [];
            const mask = [];
            for (let i = 0; i < this.maxLength(); i++) {
                possibleResults[i] = this.values
                    .slice(i, this.maxLength())
                    .concat(nullArray.values.slice(0, i));
                mask[i] = Field(i).equals(n);
            }

            const result = [];
            for (let i = 0; i < this.maxLength(); i++) {
                const possibleFieldsAtI = possibleResults.map((r) => r[i]);
                result[i] = Provable.switch(mask, type, possibleFieldsAtI);
            }
            this.values = result;
        }

        public shiftRight(n: Field): void {
            const nullArray = _DynamicArray.empty(n);
            this.incrementLength(n);

            const possibleResults = [];
            const mask = [];
            for (let i = 0; i < this.maxLength(); i++) {
                possibleResults[i] = nullArray.values
                    .slice(0, i)
                    .concat(this.values.slice(0, this.maxLength() - i));
                mask[i] = Field(i).equals(nullArray.length);
            }

            const result = [];
            for (let i = 0; i < this.maxLength(); i++) {
                const possibleFieldsAtI = possibleResults.map((r) => r[i]);
                result[i] = Provable.switch(mask, type, possibleFieldsAtI);
            }
            this.values = result;
        }

        public hash(): Field {
            return Poseidon.hash(this.toFields());
        }

        public maxLength(): number {
            return maxLength;
        }

        public toString(): string {
            return this.values
                .slice(0, parseInt(this.length.toString()))
                .toString();
        }

        public indexMask(index: Field): Bool[] {
            const mask = [];
            // let lengthReached = Bool(false);
            for (let i = 0; i < this.maxLength(); i++) {
                // lengthReached = Field(i).equals(this.length).or(lengthReached);
                const isIndex = Field(i).equals(index);
                // assert index < length
                // isIndex.and(lengthReached).not().assertTrue();
                // no more, assert index < length, if index < length then return type null()
                mask[i] = isIndex;
            }
            return mask;
        }

        public incrementLength(n: Field): void {
            const newLength = this.length.add(n);
            // assert length + n <= maxLength
            let lengthLteMaxLength = Bool(false);
            for (let i = 0; i < this.maxLength() + 1; i++) {
                lengthLteMaxLength = lengthLteMaxLength.or(
                    Field(i).equals(newLength)
                );
            }
            lengthLteMaxLength.assertTrue();
            this.length = newLength;
        }

        public decrementLength(n: Field): void {
            this.length = this.length.sub(n);
            // make sure length did not underflow
            let newLengthFound = Bool(false);
            for (let i = 0; i < this.maxLength() + 1; i++) {
                newLengthFound = newLengthFound.or(
                    Field(i).equals(this.length)
                );
            }
            newLengthFound.assertTrue();
        }

        public lengthMask(n: Field): Bool[] {
            const mask = [];
            let masked = Bool(true);
            for (let i = 0; i < this.maxLength(); i++) {
                masked = Provable.if(Field(i).equals(n), Bool(false), masked);
                mask[i] = masked;
            }
            return mask;
        }

        public map(fn: (v: T, i: Field) => T): this {
            const newArr = this.copy();
            let masked = Bool(true);
            for (let i = 0; i < newArr.values.length; i++) {
                masked = Provable.if(
                    Field(i).equals(newArr.length),
                    Bool(false),
                    masked
                );
                newArr.values[i] = Provable.if(
                    masked,
                    type,
                    fn(newArr.values[i], Field(i)),
                    _DynamicArray.Null()
                );
            }
            return newArr;
        }
    };
}
