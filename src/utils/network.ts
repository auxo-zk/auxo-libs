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
    fetchActions,
    fetchEvents,
    fetchZkAppState,
};

function randomAccounts<K extends string>(
    ...names: [K, ...K[]]
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
    logger?: Logger,
    profiler?: Profiler
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
    logger?: Logger,
    profiler?: Profiler
): Promise<T> {
    if (logger && logger.memoryUsage)
        console.log('Current memory usage:', getMemoryUsage(), 'MB');
    if (logger && logger.info)
        console.log(`Generating proof for ${programName}.${methodName}()...`);
    if (profiler) profiler.start(`${programName}.${methodName}.prove`);
    let result = await proofGeneration;
    if (profiler) profiler.stop();
    console.log('Generating proof done!');
    return result;
}

async function proveAndSendTx(
    contractName: string,
    methodName: string,
    functionCall: () => void,
    feePayer: FeePayer,
    logger?: Logger,
    profiler?: Profiler,
    waitForBlock = false
) {
    if (logger && logger.memoryUsage)
        console.log('Current memory usage:', getMemoryUsage(), 'MB');
    let { account, error } = await fetchAccount({
        publicKey: feePayer.sender.publicKey,
    });
    if (account === undefined)
        throw new Error(
            `Error ${error?.statusCode}: ${error?.statusText}` ||
                'Account not found!'
        );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    feePayer.nonce = feePayer.nonce || Number(account!.nonce);
    let tx = await Mina.transaction(
        {
            sender: feePayer.sender.publicKey,
            fee: feePayer.fee,
            memo: feePayer.memo,
            nonce: feePayer.nonce,
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
    console.log('Generating proof done!');
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
    logger?: Logger,
    waitForBlock = false
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

    let { account, error } = await fetchAccount({
        publicKey: feePayer.sender.publicKey,
    });
    if (account === undefined)
        throw new Error(
            `Error ${error?.statusCode}: ${error?.statusText}` ||
                'Account not found!'
        );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    feePayer.nonce = feePayer.nonce || Number(account!.nonce);

    let tx = await Mina.transaction(
        {
            sender: feePayer.sender.publicKey,
            fee: feePayer.fee,
            memo: feePayer.memo,
            nonce: feePayer.nonce,
        },
        () => {
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
    console.log('Successfully deployed!');
    return result;
}

async function sendTx(
    tx: Transaction,
    waitForBlock = false
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
                console.error('Transaction failed with errors:', result.errors);
            }
            return result;
        } catch (error) {
            console.error(error);
            retries--;
            if (retries === 0) {
                throw error; // Throw the error if no more retries left
            }
            console.log(`Retrying... (${retries} retries left)`);
        }
    }
    throw new Error('Cannot send Tx!');
}

async function fetchActions(
    publicKey: PublicKey,
    fromActionState?: Field,
    endActionState?: Field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<FetchedActions[] | { error: any }> {
    return await Mina.fetchActions(publicKey, {
        fromActionState: fromActionState,
        endActionState: endActionState,
    });
}

async function fetchEvents(
    publicKey: PublicKey,
    tokenId?: Field,
    from?: number,
    to?: number
): Promise<FetchedEvents[]> {
    return await Mina.fetchEvents(publicKey, tokenId || TokenId.default, {
        from: from == undefined ? undefined : UInt32.from(from),
        to: to == undefined ? undefined : UInt32.from(to),
    });
}

async function fetchZkAppState(
    publicKey: string
): Promise<Field[] | undefined> {
    const result = await fetchAccount({
        publicKey: publicKey,
    });
    const account = result.account;
    if (account == undefined) throw new Error('Account not found!');
    if (account.zkapp === undefined) throw new Error('zkApp not found!');

    return account?.zkapp?.appState;
}
