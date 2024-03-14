import {
    Bool,
    Field,
    Poseidon,
    Reducer,
    Scalar,
    SmartContract,
    Struct,
    method,
} from 'o1js';
import { StaticArray } from './StaticArray.js';

describe('StaticArray', () => {
    class CustomStruct extends Struct({
        f1: Field,
        s: Scalar,
        f2: Field,
        b: Bool,
    }) {
        toFields(): Field[] {
            return CustomStruct.toFields(this);
        }
    }

    const LENGTH = 5;
    class CustomStructArray extends StaticArray(CustomStruct, LENGTH) {}

    it('Should be provable', async () => {
        class Action extends Struct({
            arr: CustomStructArray,
        }) {}
        class TestDynamicArray extends SmartContract {
            reducer = Reducer({ actionType: Action });

            @method
            test(action: Action) {
                this.reducer.dispatch(action);
            }
        }

        await TestDynamicArray.compile();
    });

    it('Should serialize StaticArray correctly', async () => {
        let values = [
            new CustomStruct({
                f1: Field(1),
                s: Scalar.from(3n),
                f2: Field(2),
                b: Bool(false),
            }),
            new CustomStruct({
                f1: Field(2),
                s: Scalar.from(3n),
                f2: Field(5),
                b: Bool(true),
            }),
            new CustomStruct({
                f1: Field(1),
                s: Scalar.from(3n),
                f2: Field(20),
                b: Bool(true),
            }),
            new CustomStruct({
                f1: Field(1134),
                s: Scalar.from(3n),
                f2: Field(2),
                b: Bool(false),
            }),
            new CustomStruct({
                f1: Field(1),
                s: Scalar.from(2 ** 11),
                f2: Field(2 ** 12),
                b: Bool(false),
            }),
        ];
        let array = new CustomStructArray(values);
        CustomStructArray.fromFields(array.toFields())
            .hash()
            .assertEquals(
                Poseidon.hash([
                    ...array.values
                        .map((e) => (e as CustomStruct).toFields())
                        .flat(),
                ])
            );
    });
});
