import fs from 'fs/promises';
import { PrivateKey, PublicKey } from 'o1js';
import { Base58Key, Config, Key, ZkApp } from 'src/utils/constants.js';

export { readConfig, readZkAppConfig, readUserConfig };

async function readConfig(path = 'config.json'): Promise<Config> {
    return JSON.parse(await fs.readFile(path, 'utf8'));
}

async function readZkAppConfig(
    label: string | number,
    path = 'config.json'
): Promise<{
    url: string;
    fee: string;
    feePayer: Key;
    zkApp: ZkApp;
}> {
    const configJson = await readConfig(path);
    let config =
        typeof label === 'string'
            ? configJson.deployAliases[label]
            : Object.values(configJson.deployAliases)[label];

    let { url, fee } = config;

    let feepayerBase58Key: Base58Key = JSON.parse(
        await fs.readFile(config.feepayerKeyPath, 'utf8')
    );
    let feepayerKey: Key = {
        privateKey: PrivateKey.fromBase58(feepayerBase58Key.privateKey),
        publicKey: PublicKey.fromBase58(feepayerBase58Key.publicKey),
    };

    let zkAppBase58Key: Base58Key = JSON.parse(
        await fs.readFile(config.keyPath, 'utf8')
    );
    let zkAppKey: Key = {
        privateKey: PrivateKey.fromBase58(zkAppBase58Key.privateKey),
        publicKey: PublicKey.fromBase58(zkAppBase58Key.publicKey),
    };

    return {
        url,
        fee,
        feePayer: feepayerKey,
        zkApp: {
            key: zkAppKey,
        },
    };
}

async function readUserConfig(
    label: string | number,
    path = 'config.json'
): Promise<{
    url: string;
    fee: string;
    feePayer: Key;
    user: Key;
}> {
    const configJson = await readConfig(path);
    let config =
        typeof label === 'string'
            ? configJson.deployAliases[label]
            : Object.values(configJson.deployAliases)[label];

    let { url, fee } = config;

    let feepayerBase58Key: Base58Key = JSON.parse(
        await fs.readFile(config.feepayerKeyPath, 'utf8')
    );
    let feepayerKey: Key = {
        privateKey: PrivateKey.fromBase58(feepayerBase58Key.privateKey),
        publicKey: PublicKey.fromBase58(feepayerBase58Key.publicKey),
    };

    let userBase58Key: Base58Key = JSON.parse(
        await fs.readFile(config.keyPath, 'utf8')
    );
    let userKey: Key = {
        privateKey: PrivateKey.fromBase58(userBase58Key.privateKey),
        publicKey: PublicKey.fromBase58(userBase58Key.publicKey),
    };

    return {
        url,
        fee,
        feePayer: feepayerKey,
        user: userKey,
    };
}
