import {
    Cache,
    Field,
    Mina,
    PrivateKey,
    Reducer,
    SmartContract,
    State,
    TokenId,
    method,
    state,
} from 'o1js';
import fs from 'fs/promises';
import {
    compile,
    deployZkApps,
    deployZkAppsWithToken,
    fetchActions,
    fetchEvents,
    fetchZkAppState,
    getZkApp,
    prove,
    proveAndSendTx,
    randomAccounts,
    sendTx,
} from './network.js';
import { FeePayer, TX_FEE, ZkApp } from './constants.js';
import { getProfiler } from './benchmark.js';

describe('Utils', () => {
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

        @method
        async testWithSender(value1: Field, value2: Field) {
            this.sender.getAndRequireSignature();
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
    let testZkApp1: ZkApp;
    let testZkApp2: ZkApp;
    let testZkAppWithToken: ZkApp;
    const Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
    Mina.setActiveInstance(Local);

    beforeAll(async () => {
        feePayer = { sender: Local.testAccounts[0] };
        let keyPairs = [...Array(3)].map(() => PrivateKey.randomKeypair());
        testZkApp1 = getZkApp(
            keyPairs[0],
            new TestContract(keyPairs[0].publicKey),
            'TestContract1',
            {
                num: Field(100),
            }
        );
        testZkApp2 = getZkApp(
            keyPairs[1],
            new TestContract(keyPairs[1].publicKey),
            'TestContract2',
            {
                num: Field(200),
            }
        );
        testZkAppWithToken = getZkApp(
            keyPairs[0],
            new TestContract(
                testZkApp1.key.publicKey,
                TokenId.derive(testZkApp2.key.publicKey)
            ),
            'TestContract1'
        );
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
        await deployZkApps([testZkApp1, testZkApp2], feePayer);
    });

    it('should deploy zkApp with token', async () => {
        await deployZkAppsWithToken(
            [
                {
                    owner: testZkApp2,
                    user: testZkAppWithToken,
                },
            ],
            feePayer
        );
    });

    it('should prove', async () => {
        await prove(
            TestContract.name,
            'test',
            async () =>
                (testZkApp1.contract as TestContract).test(Field(1), Field(1)),
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
                (testZkApp1.contract as TestContract).test(Field(1), Field(1))
        );
        await tx.prove();
        await sendTx(tx.sign([feePayer.sender.privateKey]), true);
    });

    it('should fail to send tx', async () => {
        let tx = await Mina.transaction(
            {
                sender: feePayer.sender.publicKey,
                fee: feePayer.fee || TX_FEE,
                memo: feePayer.memo,
                nonce: feePayer.nonce,
            },
            async () =>
                (testZkApp1.contract as TestContract).test(Field(1), Field(1))
        );
        await tx.prove();
        expect(sendTx(tx, true)).rejects.toThrow();
    });

    it('should prove and send tx', async () => {
        await proveAndSendTx(
            TestContract.name,
            'test',
            async () =>
                (testZkApp1.contract as TestContract).testWithSender(
                    Field(1),
                    Field(1)
                ),
            feePayer,
            true,
            profiler,
            logger
        );
    });

    it('should fetch actions', async () => {
        let actions = await fetchActions(
            testZkApp1.key.publicKey,
            Reducer.initialActionState
        );
        expect(actions.length).toBeGreaterThan(0);
    });

    it('should fetch events', async () => {
        let events = await fetchEvents(testZkApp1.key.publicKey);
        expect(events.length).toBeGreaterThan(0);
    });

    it('should fetch state', async () => {
        let state = await fetchZkAppState(testZkApp1.key.publicKey);
        expect(state.length).toEqual(8);
    });

    afterAll(async () => {
        profiler.store();
    });
});
