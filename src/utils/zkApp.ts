import {
    AccountUpdate,
    Bool,
    Field,
    Provable,
    PublicKey,
    SmartContract,
    TokenId,
    Void,
} from 'o1js';

export {
    updateActionState,
    packNumberArray,
    unpackNumberArray,
    buildAssertMessage,
    checkInvalidAction,
    requireSignature,
    requireCaller,
    checkCondition,
};

function updateActionState(state: Field, action: Field[][]) {
    let actionsHash = AccountUpdate.Actions.hash(action);
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
