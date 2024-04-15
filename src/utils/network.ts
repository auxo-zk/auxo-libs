import {
    AccountUpdate,
    Cache,
    Field,
    Mina,
    PendingTransaction,
    PrivateKey,
    PublicKey,
    Reducer,
    SmartContract,
    TokenId,
    Transaction,
    UInt32,
    fetchAccount,
} from 'o1js';
import { getMemoryUsage } from './benchmark.js';
import {
    FeePayer,
    FetchedActions,
    FetchedEvents,
    Key,
    Logger,
    MAX_RETRY,
    Profiler,
    Program,
    TX_FEE,
    TxResult,
    ZkApp,
} from './constants.js';

export {
    randomAccounts,
    getZkApp,
    compile,
    prove,
    proveAndSendTx,
    deployZkApps,
    deployZkAppsWithToken,
    sendTx,
    fetchNonce,
    fetchActions,
    fetchEvents,
    fetchZkAppState,
};

function randomAccounts<K extends string>(
    names: K[]
): { keys: Record<K, PrivateKey>; addresses: Record<K, PublicKey> } {
    let base58Keys = Array(names.length)
        .fill('')
        .map(() => PrivateKey.random().toBase58());
    let keys = Object.fromEntries(
        names.map((name, idx) => [name, PrivateKey.fromBase58(base58Keys[idx])])
    ) as Record<K, PrivateKey>;
    let addresses = Object.fromEntries(
        names.map((name) => [name, keys[name].toPublicKey()])
    ) as Record<K, PublicKey>;
    return { keys, addresses };
}

function getZkApp(
    key: Key,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contract: any,
    name?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initArgs?: Record<string, any>,
    actionStates?: Field[],
    actions?: Field[][],
    events?: Field[][]
) {
    return {
        key,
        contract,
        name: name || 'Unknown',
        initArgs: initArgs || {},
        actionStates: actionStates || [Reducer.initialActionState],
        actions: actions || [],
        events: events || [],
    };
}

async function compile(
    program: Program,
    cache?: Cache,
    profiler?: Profiler,
    logger?: Logger
): Promise<{
    verificationKey: { data: string; hash: Field };
}> {
    let result;
    if (logger && logger.memoryUsage)
        console.log('Current memory usage:', getMemoryUsage(), 'MB');
    if (logger && logger.info) console.log(`Compiling ${program.name}...`);
    if (profiler) profiler.start(`${program.name}.compile`);
    if (cache) result = await program.compile({ cache });
    else result = await program.compile();
    if (profiler) profiler.stop();
    if (logger && logger.info) console.log('Compiling done!');
    if (logger && logger.memoryUsage)
        console.log('Current memory usage:', getMemoryUsage(), 'MB');
    return result;
}

async function prove<T>(
    programName: string,
    methodName: string,
    proofGeneration: () => Promise<T>,
    profiler?: Profiler,
    logger?: Logger
): Promise<T> {
    if (logger && logger.memoryUsage)
        console.log('Current memory usage:', getMemoryUsage(), 'MB');
    if (logger && logger.info)
        console.log(`Generating proof for ${programName}.${methodName}()...`);
    if (profiler) profiler.start(`${programName}.${methodName}`);
    let result = await proofGeneration();
    if (profiler) profiler.stop();
    if (logger && logger.info) console.log('Generating proof done!');
    return result;
}

async function sendTx(
    tx: Transaction,
    waitForBlock = false,
    logger?: Logger
): Promise<TxResult> {
    let retries = MAX_RETRY;
    let result;
    while (retries > 0) {
        try {
            result = await tx.send();
            if (waitForBlock)
                result = await (result as PendingTransaction).wait();
            if (logger && logger.info) console.log('Succeeded to send Tx!');
            return result;
        } catch (error) {
            retries--;
            if (logger && logger.error) {
                console.error('Failed to send Tx with errors:', error);
                console.log(`Retrying...`);
            }
        }
    }
    throw new Error(`Failed to send Tx after ${MAX_RETRY} retries!`);
}

async function proveAndSendTx(
    contractName: string,
    methodName: string,
    functionCall: () => Promise<void>,
    feePayer: FeePayer,
    waitForBlock = false,
    profiler?: Profiler,
    logger?: Logger
) {
    if (logger && logger.memoryUsage)
        console.log('Current memory usage:', getMemoryUsage(), 'MB');

    let tx = await Mina.transaction(
        {
            sender: feePayer.sender.publicKey,
            fee: feePayer.fee || TX_FEE,
            memo: feePayer.memo,
            nonce: await fetchNonce(feePayer.sender.publicKey),
        },
        functionCall
    );
    if (logger && logger.info)
        console.log(
            `Generating proof and submit tx for ${contractName}.${methodName}()...`
        );
    if (profiler) profiler.start(`${contractName}.${methodName}`);
    await tx.prove();
    if (profiler) profiler.stop();
    if (logger && logger.info) console.log('Generating proof done!');
    return await sendTx(
        await tx.sign([feePayer.sender.privateKey]),
        waitForBlock,
        logger
    );
}

async function deployZkApps(
    zkApps: ZkApp[],
    feePayer: FeePayer,
    waitForBlock = false,
    logger?: Logger
): Promise<TxResult> {
    if (logger && logger.info) {
        console.log('Deploying:');
        zkApps.map((e) => {
            console.log(`- ${e.name}`);
        });
    }

    let tx = await Mina.transaction(
        {
            sender: feePayer.sender.publicKey,
            fee: feePayer.fee || TX_FEE,
            memo: feePayer.memo,
            nonce: await fetchNonce(feePayer.sender.publicKey),
        },
        async () => {
            AccountUpdate.fundNewAccount(
                feePayer.sender.publicKey,
                zkApps.length
            );
            zkApps.map((e) => {
                e.contract.deploy();
                Object.entries(e.initArgs ?? {}).map(([key, value]) =>
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (e.contract as any)[key].set(value)
                );
            });
        }
    );
    let result = await sendTx(
        await tx.sign([
            feePayer.sender.privateKey,
            ...zkApps.map((e) => e.key.privateKey),
        ]),
        waitForBlock,
        logger
    );
    if (logger && logger.info) console.log('Successfully deployed!');
    return result;
}

async function deployZkAppsWithToken(
    zkAppPairs: {
        owner: ZkApp;
        user: ZkApp;
    }[],
    feePayer: FeePayer,
    waitForBlock = false,
    logger?: Logger
) {
    if (logger && logger.info) {
        console.log('Deploying:');
        zkAppPairs.map((e) => {
            console.log(`- ${e.user.name} with ${e.owner.name}'s token`);
        });
    }
    let tx = await Mina.transaction(
        {
            sender: feePayer.sender.publicKey,
            fee: feePayer.fee || TX_FEE,
            memo: feePayer.memo,
            nonce: await fetchNonce(feePayer.sender.publicKey),
        },
        async () => {
            AccountUpdate.fundNewAccount(
                feePayer.sender.publicKey,
                zkAppPairs.length
            );
            let ownerSet: { [key: string]: SmartContract } = {};
            zkAppPairs.map((e) => {
                e.user.contract.deploy();
                e.owner.contract.approve(e.user.contract.self);
                Object.assign(ownerSet, {
                    [e.owner.key.publicKey.toBase58()]: e.owner.contract,
                });
            });
            Object.values(ownerSet).map((e) =>
                AccountUpdate.attachToTransaction(e.self)
            );
        }
    );
    let result = await sendTx(
        await tx.sign([
            feePayer.sender.privateKey,
            ...zkAppPairs.map((e) => e.user.key.privateKey),
        ]),
        waitForBlock,
        logger
    );
    if (logger && logger.info) console.log('Successfully deployed!');
    return result;
}

async function fetchNonce(
    publicKey: PublicKey,
    logger?: Logger
): Promise<number | undefined> {
    try {
        let { account, error } = await fetchAccount({
            publicKey: publicKey,
        });
        if (account == undefined) throw error;
        return Number(account.nonce);
    } catch (error) {
        if (logger && logger.error) console.error(error);
    }
}

async function fetchActions(
    publicKey: PublicKey,
    fromActionState?: Field,
    endActionState?: Field,
    tokenId: Field = TokenId.default
): Promise<FetchedActions[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any = await Mina.fetchActions(
        publicKey,
        {
            fromActionState,
            endActionState,
        },
        tokenId
    );
    if (result.error) throw result.error;
    return result;
}

async function fetchEvents(
    publicKey: PublicKey,
    from?: number,
    to?: number,
    tokenId: Field = TokenId.default
): Promise<FetchedEvents[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any = await Mina.fetchEvents(publicKey, tokenId, {
        from: from == undefined ? undefined : UInt32.from(from),
        to: to == undefined ? undefined : UInt32.from(to),
    });
    if (result.error) throw result.error;
    return result;
}

async function fetchZkAppState(publicKey: PublicKey): Promise<Field[]> {
    let account = await Mina.getAccount(publicKey);
    if (account.zkapp === undefined)
        throw new Error('This account is not a zkApp!');
    return account?.zkapp?.appState;
}
