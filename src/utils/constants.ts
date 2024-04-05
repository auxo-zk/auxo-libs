import {
    Field,
    IncludedTransaction,
    PendingTransaction,
    PrivateKey,
    PublicKey,
    RejectedTransaction,
    SmartContract,
    UInt32,
    UInt64,
} from 'o1js';

export {
    MAX_RETRY,
    TX_FEE,
    FileSystem,
    Profiler,
    Logger,
    Program,
    Config,
    Base58Key,
    Key,
    ZkApp,
    FeePayer,
    TxResult,
    FetchedActions,
    FetchedEvents,
};

const MAX_RETRY = 3;

const TX_FEE = 0.101 * 1e9;

type FileSystem = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appendFile(...args: any): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readFile(...args: any): Promise<any>;
};

type Profiler = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    times: Record<string, any>;
    start: (label: string) => void;
    stop: () => Profiler;
    store: () => void;
};

type Logger = {
    info: boolean;
    memoryUsage: boolean;
};

type Program = {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    compile(args?: any): Promise<{
        verificationKey: { data: string; hash: Field };
    }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};

type Config = {
    deployAliases: Record<
        string,
        {
            url: string;
            keyPath: string;
            feepayerKeyPath: string;
            feepayerAlias: string;
            fee: string;
        }
    >;
};

type Base58Key = {
    privateKey: string;
    publicKey: string;
};

type Key = {
    privateKey: PrivateKey;
    publicKey: PublicKey;
};

type ZkApp = {
    key: Key;
    contract?: SmartContract;
    name?: string;
    actions?: Field[][];
    events?: Field[][];
};

type FeePayer = {
    sender: Key;
    fee?: number | string | UInt64;
    memo?: string;
    nonce?: number;
};

type TxResult = PendingTransaction | RejectedTransaction | IncludedTransaction;

type FetchedActions = {
    actions: string[][];
    hash: string;
};

type FetchedEvents = {
    events: {
        data: string[];
        transactionInfo: {
            hash: string;
            memo: string;
            status: string;
        };
    }[];
    blockHeight: UInt32;
    blockHash: string;
    parentBlockHash: string;
    globalSlot: UInt32;
    chainStatus: string;
};
