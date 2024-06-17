import {
    Bool,
    Field,
    Group,
    Poseidon,
    PublicKey,
    Reducer,
    Scalar,
    SmartContract,
    Struct,
    method,
} from 'o1js';
import {
    Bit255DynamicArray,
    BoolDynamicArray,
    FieldDynamicArray,
    GroupDynamicArray,
    PublicKeyDynamicArray,
    ScalarDynamicArray,
} from './DynamicArray.js';
import { Bit255 } from './Bit255.js';

describe('DynamicArray', () => {
    const MAX_HEIGHT = 5;
    class BoolArray extends BoolDynamicArray(MAX_HEIGHT) {}
    class Bit255Array extends Bit255DynamicArray(MAX_HEIGHT) {}
    class FieldArray extends FieldDynamicArray(MAX_HEIGHT) {}
    class GroupArray extends GroupDynamicArray(MAX_HEIGHT) {}
    class PublicKeyArray extends PublicKeyDynamicArray(MAX_HEIGHT) {}
    class ScalarArray extends ScalarDynamicArray(MAX_HEIGHT) {}

    class CustomStruct extends Struct({
        value1: Field,
        dynamicArray: GroupArray,
        value2: Field,
    }) {}

    it('Should be provable', async () => {
        class Action extends Struct({
            boolArr: BoolArray,
            bit255Arr: Bit255Array,
            fieldArr: FieldArray,
            // groupArr: GroupArray,
            pubKeyArr: PublicKeyArray,
            scalarArr: ScalarArray,
        }) {}
        class TestDynamicArray extends SmartContract {
            reducer = Reducer({ actionType: Action });

            @method
            async test(action: Action) {
                this.reducer.dispatch(action);
            }
        }

        await TestDynamicArray.analyzeMethods();
    });

    it('Should serialize BoolDynamicArray correctly', async () => {
        let boolValues = [Bool(true), Bool(false), Bool(true), Bool(false)];
        let boolArray = new BoolArray(boolValues);
        BoolArray.fromFields(boolArray.toFields())
            .hash()
            .assertEquals(
                Poseidon.hash([
                    boolArray.length,
                    ...boolArray.values.map((e) => e.toFields()).flat(),
                ])
            );
    });

    it('Should serialize Bit255DynamicArray correctly', async () => {
        let bit255Values = [
            Bit255.fromScalar(Scalar.random()),
            Bit255.fromScalar(Scalar.random()),
            Bit255.fromScalar(Scalar.random()),
            Bit255.fromScalar(Scalar.random()),
        ];
        let bit255Array = new Bit255Array(bit255Values);
        Bit255Array.fromFields(bit255Array.toFields())
            .hash()
            .assertEquals(
                Poseidon.hash([
                    bit255Array.length,
                    ...bit255Array.values
                        .map((e) => new Bit255(e).toFields())
                        .flat(),
                ])
            );
    });

    it('Should serialize FieldDynamicArray correctly', async () => {
        let fieldValues = [Field(0), Field(1), Field(2), Field(1)];
        let fieldArray = new FieldArray(fieldValues);
        FieldArray.fromFields(fieldArray.toFields())
            .hash()
            .assertEquals(
                Poseidon.hash([Field(fieldValues.length), ...fieldValues])
            );
    });

    it('Should serialize GroupDynamicArray correctly', async () => {
        let groupValues = [Group.generator, Group.zero, Group.generator];
        let groupArray = new GroupArray(groupValues);
        GroupArray.fromFields(groupArray.toFields())
            .hash()
            .assertEquals(
                Poseidon.hash([
                    groupArray.length,
                    ...groupArray.values.map((e) => e.toFields()).flat(),
                ])
            );
    });

    it('Should serialize PublicKeyDynamicArray correctly', async () => {
        let pubKeyValues = [
            PublicKey.fromGroup(Group.generator),
            PublicKey.fromGroup(Group.zero),
            PublicKey.fromGroup(Group.generator),
        ];
        let pubKeyArray = new PublicKeyArray(pubKeyValues);
        PublicKeyArray.fromFields(pubKeyArray.toFields())
            .hash()
            .assertEquals(
                Poseidon.hash([
                    pubKeyArray.length,
                    ...pubKeyArray.values.map((e) => e.toFields()).flat(),
                ])
            );
    });

    it('Should serialize ScalarDynamicArray correctly', async () => {
        let scalarValues = [Scalar.random(), Scalar.random(), Scalar.random()];
        let scalarArray = new ScalarArray(scalarValues);
        ScalarArray.fromFields(scalarArray.toFields())
            .hash()
            .assertEquals(
                Poseidon.hash([
                    scalarArray.length,
                    ...scalarArray.values.map((e) => e.toFields()).flat(),
                ])
            );
    });

    it('Should serialize CustomStruct correctly', async () => {
        // CustomStruct
        let before = new CustomStruct({
            value1: Field(1),
            dynamicArray: new GroupArray([
                Group.generator,
                Group.zero,
                Group.generator,
            ]),
            value2: Field(2),
        });
        let after = CustomStruct.fromFields(CustomStruct.toFields(before));
        before.value1.assertEquals(after.value1);
        before.dynamicArray.hash().assertEquals(after.dynamicArray.hash());
        before.value2.assertEquals(after.value2);
    });
});
