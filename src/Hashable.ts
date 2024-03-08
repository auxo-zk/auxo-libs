import { Bool, Field, Poseidon, Provable } from 'o1js';

export type HashableProvable<T> = Provable<T> & {
    hash(x: T): Field;
    equals(x: T, other: T): Bool;
};

export function hashable<T>(type: Provable<T>): HashableProvable<T> {
    return {
        ...type,
        hash(x: T): Field {
            return Poseidon.hash(type.toFields(x));
        },
        equals(x: T, other: T): Bool {
            return this.hash(x).equals(this.hash(other));
        },
    };
}
