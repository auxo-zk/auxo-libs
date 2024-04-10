import {
    Cache,
    Field,
    Mina,
    PrivateKey,
    Provable,
    PublicKey,
    Reducer,
    SmartContract,
    State,
    method,
    state,
} from 'o1js';
import fs from 'fs/promises';
import {
    compile,
    deployZkApps,
    fetchActions,
    fetchEvents,
    fetchZkAppState,
    prove,
    proveAndSendTx,
    randomAccounts,
    sendTx,
} from './network.js';
import { FeePayer, TX_FEE, ZkApp } from './constants.js';
import { getProfiler } from './benchmark.js';

describe('Network', () => {
    class TestContract extends SmartContract {
        @state(Field) num = State<Field>();

        reducer = Reducer({ actionType: Field });
        events = { ['test']: Field };

        @method
        async test(value1: Field, value2: Field) {
            value1.assertEquals(value2);
            this.num.set(value1);
            this.reducer.dispatch(value1);
            this.emitEvent('test', value2);
        }
    }

    const doProofs = true;
    const cache = Cache.FileSystem('caches');
    const logger = {
        info: true,
        error: true,
        memoryUsage: true,
    };
    const profiler = getProfiler('Test', fs);
    let feePayer: FeePayer;
    let testZkApp: ZkApp;
    // const network = Mina.Network({
    //     mina: 'http://localhost:8080/graphql',
    //     archive: 'http://localhost:8282',
    //     lightnetAccountManager: 'http://localhost:8181',
    // });
    // Mina.setActiveInstance(network);
    const Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
    Mina.setActiveInstance(Local);

    beforeAll(async () => {
        // let accquiredKeys = await Lightnet.listAcquiredKeyPairs({});
        // if (accquiredKeys?.length == 0) {
        //     let privateKey = (await Lightnet.acquireKeyPair()).privateKey;
        //     let publicKey = privateKey.toPublicKey();
        //     feePayer = { sender: { privateKey, publicKey } };
        // } else {
        // feePayer = {
        //     sender: {
        //         privateKey: accquiredKeys![0].privateKey,
        //         publicKey: accquiredKeys![0].publicKey,
        //     },
        // };
        feePayer = { sender: Local.testAccounts[0] };
        // }
        if (true) {
            testZkApp = {
                key: {
                    privateKey:
                        PrivateKey.fromBigInt(
                            26008585964768579152708118465695424684184602768554064880048813177630307793166n
                        ),
                    publicKey: PublicKey.fromBase58(
                        'B62qnh3axyuNcX2VbtRc2EB1731qJRJoFF6H4HVebf381JTwutdypjr'
                    ),
                },
                name: 'TestContract',
            };
        } else {
            testZkApp = {
                key: PrivateKey.randomKeypair(),
                name: 'TestContract',
            };
        }
        testZkApp.contract = new TestContract(testZkApp.key.publicKey);
        Provable.log('Fee payer:', feePayer.sender);
        Provable.log('zkApp:', testZkApp.key);
    });

    it('should generate random accounts', async () => {
        const accountNames = ['test1', 'test2', 'test1'];
        const accounts = randomAccounts(accountNames);
        expect(Object.entries(accounts).length).toEqual(
            new Set(accountNames).size
        );
    });

    it('should compile contract', async () => {
        if (doProofs) await compile(TestContract, cache, profiler, logger);
    });

    it('should deploy zkApp', async () => {
        await deployZkApps(
            [
                {
                    zkApp: testZkApp,
                    initArgs: [],
                },
            ],
            feePayer
        );
    });

    it('should prove', async () => {
        await prove(
            TestContract.name,
            'test',
            (testZkApp.contract as TestContract).test(Field(1), Field(1)),
            profiler,
            logger
        );
    });

    it('should send tx', async () => {
        let tx = await Mina.transaction(
            {
                sender: feePayer.sender.publicKey,
                fee: feePayer.fee || TX_FEE,
                memo: feePayer.memo,
                nonce: feePayer.nonce,
            },
            async () =>
                (testZkApp.contract as TestContract).test(Field(1), Field(1))
        );
        await tx.prove();
        await sendTx(tx.sign([feePayer.sender.privateKey]), true);
    });

    it('should prove and send tx', async () => {
        await proveAndSendTx(
            TestContract.name,
            'test',
            async () =>
                (testZkApp.contract as TestContract).test(Field(1), Field(1)),
            feePayer,
            true,
            profiler,
            logger
        );
    });

    it('should fetch actions', async () => {
        let actions = await fetchActions(
            testZkApp.key.publicKey,
            Reducer.initialActionState
        );
        expect(actions.length).toBeGreaterThan(0);
    });

    it('should fetch events', async () => {
        let events = await fetchEvents(testZkApp.key.publicKey);
        expect(events.length).toBeGreaterThan(0);
    });

    it('should fetch state', async () => {
        let state = await fetchZkAppState(testZkApp.key.publicKey);
        expect(state.length).toEqual(8);
    });
});
