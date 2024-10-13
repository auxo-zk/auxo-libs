import {
    AccountUpdate,
    Bool,
    Field,
    MerkleList,
    Provable,
    PublicKey,
    SmartContract,
    TokenId,
    Void,
} from 'o1js';

export {
    assertRollupActions,
    assertRollupField,
    assertRollupFields,
    buildAssertMessage,
    buildInvalidActionMessage,
    checkCondition,
    checkInvalidAction,
    packNumberArray,
    requireCaller,
    requireSignature,
    updateActionState,
    unpackNumberArray,
};

function updateActionState(state: Field, action: Field[][]) {
    let actionsHash = AccountUpdate.Actions.hash(action.reverse());
    return AccountUpdate.Actions.updateSequenceState(state, actionsHash);
}

function packNumberArray(numbers: number[], maxSize: number): Field {
    return Field.fromBits(numbers.map((e) => Field(e).toBits(maxSize)).flat());
}

function unpackNumberArray(packed: Field, maxSize: number): number[] {
    let numbers: number[] = [];
    for (let i = 0; i < 255 / maxSize; i++) {
        numbers.push(
            Number(
                Field.fromBits(
                    packed.toBits().slice(i * maxSize, (i + 1) * maxSize)
                )
            )
        );
    }
    return numbers;
}

function buildAssertMessage(
    circuit: string,
    method: string,
    errorMsg: string
): string {
    return `${circuit}::${method}: ${errorMsg}`;
}

function buildInvalidActionMessage(
    circuit: string,
    method: string,
    errorMsg: string
): string {
    return `${circuit}::${method}: Skipping invalid action: ${errorMsg}`;
}

function checkInvalidAction(flag: Bool, check: Bool, message?: string) {
    Provable.witness(Void, () => {
        if (check.not().toBoolean()) {
            console.info(message || 'Unknown error!');
        }
    });
    return flag.or(check.not());
}

function requireSignature(address: PublicKey) {
    AccountUpdate.createSigned(address);
}

function requireCaller(address: PublicKey, contract: SmartContract) {
    contract.self.body.mayUseToken = AccountUpdate.MayUseToken.ParentsOwnToken;
    let update = AccountUpdate.create(
        contract.address,
        TokenId.derive(address)
    );
    update.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;
    return update;
}

function checkCondition(condition: Bool, message?: string) {
    Provable.witness(Void, () => {
        if (!condition.toBoolean()) {
            console.error(message || 'Unknown error!');
        }
    });
    return condition;
}

function assertRollupField(
    proofValue: Field,
    stateValue: Field,
    message?: string
) {
    proofValue.assertEquals(
        stateValue,
        (message || '') + ' incorrect initial rollup value'
    );
}

function assertRollupFields(
    proofValue: Array<Field>,
    stateValue: Array<Field>,
    numFields: number,
    message?: string
) {
    for (let i = 0; i < numFields; i++) {
        assertRollupField(proofValue[i], stateValue[i], message);
    }
}

function assertRollupActions(
    proof: {
        initialActionState: Field;
        nextActionState: Field;
    },
    curActionState: Field,
    latestActionState: Field,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions: MerkleList<MerkleList<any>>,
    MAX_ROLLUP_ACTIONS: number,
    message?: string
) {
    assertRollupField(proof.initialActionState, curActionState, message);
    let checkActionStateExists = Bool(false);
    let nextActionState = curActionState;
    let iter = actions.startIterating();
    for (let i = 0; i < MAX_ROLLUP_ACTIONS; i++) {
        let isEmpty = iter.isAtEnd();
        let merkleActions = iter.next();
        nextActionState = Provable.if(
            isEmpty,
            nextActionState,
            AccountUpdate.Actions.updateSequenceState(
                nextActionState,
                merkleActions.hash
            )
        );
        checkActionStateExists = checkActionStateExists.or(
            Provable.if(
                isEmpty,
                Bool(false),
                nextActionState.equals(proof.nextActionState)
            )
        );
    }
    checkActionStateExists.assertTrue(
        (message || '') + ' incorrect next rollup state'
    );
    nextActionState.assertEquals(
        latestActionState,
        (message || '') + ' incorrect action list'
    );
}
