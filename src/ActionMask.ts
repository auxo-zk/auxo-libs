import { Bool, Field } from 'o1js';
import { BoolDynamicArray } from './DynamicArray.js';

export { ActionMask };

function ActionMask(numActionTypes: number) {
    return class _ActionMask extends BoolDynamicArray(numActionTypes) {
        static createMask(actionEnum: Field): _ActionMask {
            let emptyMask = _ActionMask.empty(Field(numActionTypes));
            emptyMask.set(actionEnum, Bool(true));
            return emptyMask;
        }
    };
}
