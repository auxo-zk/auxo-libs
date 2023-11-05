import { Field, Group, Provable, Scalar } from 'o1js';
import { DynamicArray } from './DynamicArray';
import { CustomScalar } from './CustomScalar';

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
      Provable.log(fieldArray);

      // Group
      let groupValues = Provable.Array(Group, 1).fromFields(
        Group.generator.toFields()
      );
      let groupArray = Provable.witness(
        DynamicGroupArray,
        () => new DynamicGroupArray(groupValues)
      );
      Provable.log(groupArray);

      // Scalar - Not working because Scalar takes up 255 Fields => Stack overflow
      let scalarValues = Provable.Array(CustomScalar, 1).fromFields(
        CustomScalar.fromScalar(Scalar.random()).toFields()
      );
      Provable.log(scalarValues);
      let scalarArray = Provable.witness(
        DynamicScalarArray,
        () => new DynamicScalarArray(scalarValues)
      );
      // Provable.log(Scalar.sizeInFields());
      Provable.log(scalarArray);
    });
  });
});
