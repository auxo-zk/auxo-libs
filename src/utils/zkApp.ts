import { AccountUpdate, Field, PublicKey, SmartContract, TokenId } from 'o1js';

export {
    updateActionState,
    updateActionStateWithHash,
    packNumberArray,
    buildAssertMessage,
    requireSignature,
    requireCaller,
};

function updateActionState(state: Field, action: Field[][]) {
    let actionsHash = AccountUpdate.Actions.hash(action);
    return AccountUpdate.Actions.updateSequenceState(state, actionsHash);
}

function updateActionStateWithHash(state: Field, actionsHash: Field) {
    return AccountUpdate.Actions.updateSequenceState(state, actionsHash);
}

function packNumberArray(numbers: number[], maxSize: number): Field {
    return Field.fromBits(numbers.map((e) => Field(e).toBits(maxSize)).flat());
}

function buildAssertMessage(
    circuit: string,
    method: string,
    errorEnum: string
): string {
    return `${circuit}::${method}: ${errorEnum}`;
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
