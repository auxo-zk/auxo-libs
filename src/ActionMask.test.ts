import { Field } from 'o1js';
import { ActionMask as _ActionMask } from './ActionMask';

describe('ActionMask', () => {
    it('Should create correct mask', async () => {
        const MAX_LENGTH = 3;
        const INDEX = 1;
        class ActionMask extends _ActionMask(MAX_LENGTH) {}
        let mask = ActionMask.createMask(Field(INDEX));
        expect(Number(mask.length)).toEqual(MAX_LENGTH);
        mask.values.map((e, i) => {
            if (i == INDEX) expect(e.toBoolean()).toBe(true);
            else expect(e.toBoolean()).toBe(false);
        });
    });
});
