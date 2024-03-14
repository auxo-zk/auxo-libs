import { Bool, Field, Poseidon, Provable, ProvablePure, Struct } from 'o1js';

import { hashable } from './Hashable.js';

export { StaticArray };

function StaticArray<T>(type: ProvablePure<T>, length: number) {
    const _type = hashable(type);
    return class _StaticArray extends Struct({
        values: Provable.Array(type, length),
    }) {
        static from(values: T[]): _StaticArray {
            return new _StaticArray(values);
        }

        static fromFields(fields: Field[]): _StaticArray {
            return super.fromFields(fields) as _StaticArray;
        }

        static empty(): _StaticArray {
            return new _StaticArray();
        }

        static hash(value: T): Field {
            return Poseidon.hash(type.toFields(value));
        }

        static Null(): T {
            return type.fromFields(Array(type.sizeInFields()).fill(Field(0)));
        }

        static fillWithNull(values: T[]): T[] {
            let tempValues = [...values];
            for (let i = values.length; i < length; i++) {
                tempValues[i] = _StaticArray.Null();
            }
            return tempValues;
        }

        public constructor(values?: T[]) {
            super({
                values: _StaticArray.fillWithNull(values ?? []),
            });
        }

        public get(index: Field): T {
            const mask = this.indexMask(index);
            return Provable.switch(mask, type, this.values);
        }

        public set(index: Field, value: T): void {
            const mask = this.indexMask(index);
            for (let i = 0; i < this.values.length; i++) {
                this.values[i] = Provable.switch(
                    [mask[i], mask[i].not()],
                    type,
                    [value, this.values[i]]
                );
            }
        }

        public toFields(): Field[] {
            return this.values.map((v) => type.toFields(v)).flat();
        }

        public copy(): this {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newArr = new (<any>this.constructor)();
            newArr.values = this.values.slice();
            return newArr;
        }

        public includes(value: T): Bool {
            let result = Field(0);
            for (let i = 0; i < this.values.length; i++) {
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

        public hash(): Field {
            return Poseidon.hash(this.toFields());
        }

        public toString(): string {
            return this.values.toString();
        }

        public indexMask(index: Field): Bool[] {
            const mask = [];
            // let lengthReached = Bool(false);
            for (let i = 0; i < this.values.length; i++) {
                // lengthReached = Field(i).equals(this.length).or(lengthReached);
                const isIndex = Field(i).equals(index);
                // assert index < length
                // isIndex.and(lengthReached).not().assertTrue();
                // no more, assert index < length, if index < length then return type null()
                mask[i] = isIndex;
            }
            return mask;
        }

        public map(fn: (v: T, i: Field) => T): this {
            const newArr = this.copy();
            for (let i = 0; i < newArr.values.length; i++) {
                newArr.values[i] = fn(newArr.values[i], Field(i));
            }
            return newArr;
        }
    };
}
