import {
    Bool,
    Cache,
    Field,
    Mina,
    PrivateKey,
    Provable,
    Reducer,
    SmartContract,
    State,
    TokenId,
    UInt64,
    ZkProgram,
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
import {
    divExact,
    fieldXOR,
    fromUInt64ToScalar,
    getBitLength,
} from './math.js';
import { checkInvalidAction, updateActionState } from './zkApp.js';

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

        @method
        async testWithSender(value1: Field, value2: Field) {
            this.sender.getAndRequireSignatureV2();
            value1.assertEquals(value2);
            this.num.set(value1);
            this.reducer.dispatch(value1);
            this.emitEvent('test', value2);
        }

        @method
        async checkAction(action: Field) {
            let flag = Bool(false);
            flag = checkInvalidAction(
                flag,
                action.equals(Field(1)),
                'Test error'
            );
            Provable.log(flag);
        }

        @method
        async multipleActions(action1: Field, action2: Field) {
            this.reducer.dispatch(action1);
            this.reducer.dispatch(action2);
        }
    }

    const TestProgram = ZkProgram({
        name: 'TestProgram',
        methods: {
            dummy: {
                privateInputs: [],
                async method() {
                    return;
                },
            },
        },
    });

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

    beforeAll(async () => {
        const Local = await Mina.LocalBlockchain({ proofsEnabled: doProofs });
        Mina.setActiveInstance(Local);

        Provable.log(Local.testAccounts);
        feePayer = {
            sender: {
                publicKey: Local.testAccounts[0],
                privateKey: Local.testAccounts[0].key,
            },
        };
        let keyPairs = [...Array(3)].map(() => PrivateKey.randomKeypair());
        testZkApp1 = getZkApp(
            keyPairs[0],
            new TestContract(keyPairs[0].publicKey),
            {
                name: 'TestContract1',
                initArgs: {
                    num: Field(100),
                },
            }
        );
        testZkApp2 = getZkApp(
            keyPairs[1],
            new TestContract(keyPairs[1].publicKey),
            {
                name: 'TestContract2',
                initArgs: {
                    num: Field(200),
                },
            }
        );
        testZkAppWithToken = getZkApp(
            keyPairs[0],
            new TestContract(
                testZkApp1.key.publicKey,
                TokenId.derive(testZkApp2.key.publicKey)
            ),
            { name: 'TestContract1' }
        );
    });

    it('Should generate random accounts', async () => {
        const accountNames = ['test1', 'test2', 'test1'];
        const accounts = randomAccounts(accountNames);
        expect(Object.entries(accounts).length).toEqual(
            new Set(accountNames).size
        );
    });

    it('Should compile', async () => {
        await compile(TestProgram, {
            cache,
            profiler,
            logger,
            proofsEnabled: false,
        });
        if (doProofs)
            await compile(TestContract, {
                cache,
                profiler,
                logger,
                proofsEnabled: undefined,
            });
    });

    it('Should deploy zkApp', async () => {
        await deployZkApps([testZkApp1, testZkApp2], feePayer, true, {
            logger,
        });
    });

    it('Should deploy zkApp with token', async () => {
        await deployZkAppsWithToken(
            [
                {
                    owner: testZkApp2,
                    user: testZkAppWithToken,
                },
            ],
            feePayer,
            true,
            { logger }
        );
    });

    it('Should prove', async () => {
        await prove(
            TestContract.name,
            'test',
            async () =>
                (testZkApp1.contract as TestContract).test(Field(1), Field(1)),
            { profiler, logger }
        );
    });

    it('Should send tx', async () => {
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
        await sendTx(tx.sign([feePayer.sender.privateKey]), true, { logger });
    });

    it('Should fail to send tx', async () => {
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

    it('Should prove and send tx', async () => {
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
            { profiler, logger }
        );
    });

    it('Should check and log invalid action', async () => {
        await Mina.transaction(
            {
                sender: feePayer.sender.publicKey,
                fee: feePayer.fee || TX_FEE,
                memo: feePayer.memo,
                nonce: feePayer.nonce,
            },
            async () =>
                (testZkApp1.contract as TestContract).checkAction(Field(1))
        );

        await Mina.transaction(
            {
                sender: feePayer.sender.publicKey,
                fee: feePayer.fee || TX_FEE,
                memo: feePayer.memo,
                nonce: feePayer.nonce,
            },
            async () =>
                (testZkApp1.contract as TestContract).checkAction(Field(0))
        );
    });

    it('Should calculate correct hash', async () => {
        let currentActionState = testZkApp1.contract.account.actionState.get();
        let tx = await Mina.transaction(
            {
                sender: feePayer.sender.publicKey,
                fee: feePayer.fee || TX_FEE,
                memo: feePayer.memo,
                nonce: feePayer.nonce,
            },
            async () =>
                (testZkApp1.contract as TestContract).multipleActions(
                    Field(1),
                    Field(2)
                )
        );
        await tx.prove();
        await sendTx(tx.sign([feePayer.sender.privateKey]), true, { logger });
        let newActionState = testZkApp1.contract.account.actionState.get();
        // let actionsHash = updateActionState(currentActionState, [[Field(1)]]);
        // actionsHash = updateActionState(actionsHash, [[Field(2)]]);
        let actionsHash = updateActionState(currentActionState, [
            [Field(1)],
            [Field(2)],
        ]);
        expect(newActionState).toEqual(actionsHash);
    });

    it('Should fetch actions', async () => {
        let actions = await fetchActions(
            testZkApp1.key.publicKey,
            Reducer.initialActionState
        );
        expect(actions.length).toBeGreaterThan(0);
    });

    it('Should fetch events', async () => {
        let events = await fetchEvents(testZkApp1.key.publicKey);
        expect(events.length).toBeGreaterThan(0);
    });

    it('Should fetch state', async () => {
        let state = await fetchZkAppState(testZkApp1.key.publicKey);
        expect(state.length).toEqual(8);
    });

    afterAll(async () => {
        profiler.store();
    });
});

describe('Math', () => {
    it('Should convert UInt64 to Scalar', async () => {
        expect(fromUInt64ToScalar(UInt64.from(0)).toBigInt()).toEqual(0n);
        expect(fromUInt64ToScalar(UInt64.from(123456789)).toBigInt()).toEqual(
            123456789n
        );
        expect(
            fromUInt64ToScalar(UInt64.from(UInt64.MAXINT())).toBigInt()
        ).toEqual(UInt64.MAXINT().toBigInt());
    });
    it('Should convert UInt64 to Scalar', async () => {
        expect(fromUInt64ToScalar(UInt64.from(0)).toBigInt()).toEqual(0n);
        expect(fromUInt64ToScalar(UInt64.from(123456789)).toBigInt()).toEqual(
            123456789n
        );
        expect(
            fromUInt64ToScalar(UInt64.from(UInt64.MAXINT())).toBigInt()
        ).toEqual(UInt64.MAXINT().toBigInt());
    });

    it('Should get correct bit length', async () => {
        expect(getBitLength(0)).toEqual(1);
        expect(getBitLength(1)).toEqual(1);
        expect(getBitLength(2)).toEqual(2);
        expect(getBitLength(3)).toEqual(2);
        expect(getBitLength(4)).toEqual(3);
        expect(getBitLength(255)).toEqual(8);
        expect(getBitLength(256)).toEqual(9);
    });

    it('Should perform exact division', async () => {
        expect(divExact(Field(10), Field(2)).toBoolean()).toBe(true);
        expect(divExact(Field(10), Field(3)).toBoolean()).toBe(false);
        expect(divExact(Field(0), Field(1)).toBoolean()).toBe(true);
        expect(() => divExact(Field(1), Field(0)).toBoolean()).toThrow();
    });

    it('Should perform field XOR', async () => {
        expect(fieldXOR(Field(0), Field(0)).toBigInt()).toEqual(0n);
        expect(fieldXOR(Field(1), Field(0)).toBigInt()).toEqual(1n);
        expect(fieldXOR(Field(1), Field(1)).toBigInt()).toEqual(0n);
        expect(fieldXOR(Field(123456789), Field(987654321)).toBigInt()).toEqual(
            BigInt(123456789) ^ BigInt(987654321)
        );
        let f1 = Field.random();
        let f2 = Field.random();
        expect(fieldXOR(f1, f2).toBigInt()).toEqual(
            f1.toBigInt() ^ f2.toBigInt()
        );
        expect(fieldXOR(f1, f1).toBigInt()).toEqual(0n);
        expect(fieldXOR(fieldXOR(f1, f2), f2).toBigInt()).toEqual(
            f1.toBigInt()
        );
    });
});
