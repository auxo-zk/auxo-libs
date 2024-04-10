import {
    AccountUpdate,
    Cache,
    Field,
    Mina,
    PendingTransaction,
    PrivateKey,
    PublicKey,
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
    compile,
    prove,
    proveAndSendTx,
    deployZkApps,
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
    proofGeneration: Promise<T>,
    profiler?: Profiler,
    logger?: Logger
): Promise<T> {
    if (logger && logger.memoryUsage)
        console.log('Current memory usage:', getMemoryUsage(), 'MB');
    if (logger && logger.info)
        console.log(`Generating proof for ${programName}.${methodName}()...`);
    if (profiler) profiler.start(`${programName}.${methodName}.prove`);
    let result = await proofGeneration;
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
            result = await tx.safeSend();
            if (result.status === 'pending') {
                if (waitForBlock)
                    return await (result as PendingTransaction).wait();
            } else if (result.status === 'rejected') {
                if (logger && logger.error)
                    console.error('Failed to send Tx with errors:');
                throw result.errors;
            }
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
    if (profiler) profiler.start(`${contractName}.${methodName}.prove`);
    await tx.prove();
    if (profiler) profiler.stop();
    if (logger && logger.info) console.log('Generating proof done!');
    return await sendTx(
        await tx.sign([feePayer.sender.privateKey]),
        waitForBlock
    );
}

async function deployZkApps(
    deployData: [
        {
            zkApp: ZkApp;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initArgs: [string, any][];
        }
    ],
    feePayer: FeePayer,
    waitForBlock = false,
    logger?: Logger
): Promise<TxResult> {
    for (let i = 0; i < deployData.length; i++) {
        if (deployData[i].zkApp.contract === undefined)
            throw new Error(
                `${
                    deployData[i].zkApp.name || 'Unknown'
                } did not define any contract!`
            );
    }
    if (logger && logger.info) {
        console.log('Deploying:');
        deployData.map((e) => {
            console.log(`- ${e.zkApp.name} || 'Unknown'`);
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
                deployData.length
            );
            deployData.map((e) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                e.zkApp.contract!.deploy();
                e.initArgs.map(([key, value]) =>
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (e.zkApp.contract as any)[key].set(value)
                );
            });
        }
    );
    let result = await sendTx(
        await tx.sign([
            feePayer.sender.privateKey,
            ...deployData.map((e) => e.zkApp.key.privateKey),
        ]),
        waitForBlock
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
