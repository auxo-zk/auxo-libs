import { Field, Group, Provable, Scalar } from 'o1js';
import { DynamicArray } from './DynamicArray.js';
import { CustomScalar } from './CustomScalar.js';

describe('DynamicArray', () => {
  const MAX_HEIGHT = 2 ** 5;
  class DynamicFieldArray extends DynamicArray(Field, MAX_HEIGHT) {}
  class DynamicGroupArray extends DynamicArray(Group, MAX_HEIGHT) {}
  class DynamicScalarArray extends DynamicArray(CustomScalar, MAX_HEIGHT) {}

  it('Should be provable', async () => {
    Provable.runAndCheck(() => {
      // Field
      let fieldValues = Provable.Array(Field, 3).fromFields([
        Field(0),
        Field(1),
        Field(2),
      ]);
      let fieldArray = Provable.witness(
        DynamicFieldArray,
        () => new DynamicFieldArray(fieldValues)
      );
      // Provable.log(fieldArray);

      // Group
      let groupValues = Provable.Array(Group, 1).fromFields(
        Group.generator.toFields()
      );
      let groupArray = Provable.witness(
        DynamicGroupArray,
        () => new DynamicGroupArray(groupValues)
      );
      // Provable.log(groupArray);

      // Scalar
      let scalarValues = Provable.Array(CustomScalar, 1).fromFields(
        CustomScalar.fromScalar(Scalar.random()).toFields()
      );
      // Provable.log(scalarValues);
      let scalarArray = Provable.witness(
        DynamicScalarArray,
        () => new DynamicScalarArray(scalarValues)
      );
      // Provable.log(scalarArray);
    });
  });

  it('Should serialize correctly', async () => {
    // Field
    let fieldValues = [Field(0), Field(1), Field(2), Field(1)];
    let fieldArray = new DynamicFieldArray(fieldValues);
    let fieldSerialized = fieldArray.toFields();
    let fieldDeserialized = DynamicFieldArray.fromFields(
      [fieldArray.length, fieldSerialized].flat()
    );
    fieldDeserialized.length.assertEquals(fieldArray.length);
    for (let i = 0; i < fieldArray.values.length; i++) {
      (fieldDeserialized as DynamicFieldArray)
        .get(Field(i))
        .assertEquals(fieldArray.get(Field(i)));
    }

    // Group
    let groupValues = [Group.generator, Group.zero, Group.generator];
    let groupArray = new DynamicGroupArray(groupValues);
    let groupSerialized = groupArray.toFields();
    let groupDeserialized = DynamicGroupArray.fromFields(
      [groupArray.length, groupSerialized].flat()
    );
    groupDeserialized.length.assertEquals(groupArray.length);
    for (let i = 0; i < groupArray.values.length; i++) {
      (groupDeserialized as DynamicGroupArray)
        .get(Field(i))
        .assertEquals(groupArray.get(Field(i)));
    }

    // Scalar
    let scalarValues = [
      CustomScalar.fromScalar(Scalar.random()),
      CustomScalar.fromScalar(Scalar.random()),
    ];
    let scalarArray = new DynamicScalarArray(scalarValues);
    let scalarSerialized = scalarArray.toFields();
    let scalarDeserialized = DynamicScalarArray.fromFields(
      [scalarArray.length, scalarSerialized].flat()
    );
    scalarDeserialized.length.assertEquals(scalarArray.length);
    for (let i = 0; i < scalarArray.values.length; i++) {
      (scalarDeserialized as DynamicScalarArray)
        .get(Field(i))
        .assertEquals(scalarArray.get(Field(i)));
    }
  });
});
