# Auxo Libs

<p align="center">
    <a href="http://auxo.fund/" target="blank"><img src="https://lh3.googleusercontent.com/u/0/drive-viewer/AKGpihbOeavm7ejNaJLr70jxI0YLtj_KzKk7pzjyfbrBPxKRCmXIhEmhLftyPX_ZgOTdpE_B9uoPmiyP1NhBTIShqW8rtQhusA=w2388-h1376" alt="Auxo Logo" /></a>
</p>

<p align="center">
An On-chain Funding Platform with privacy-preserving features powered by ZKP.
</p>
<p align="center">
    <a href="https://www.npmjs.com/org/auxo-dev" target="_blank"><img src="https://img.shields.io/npm/v/@auxo-dev/auxo-libs.svg" alt="NPM Version" /></a>
    <a href="https://www.npmjs.com/org/auxo-dev" target="_blank"><img src="https://img.shields.io/npm/l/@auxo-dev/auxo-libs.svg" alt="Package License" /></a>
    <a href="https://www.npmjs.com/org/auxo-dev" target="_blank"><img src="https://img.shields.io/npm/dm/@auxo-dev/auxo-libs.svg" alt="NPM Downloads" /></a>
    <a href="https://twitter.com/AuxoZk" target="_blank"><img src="https://img.shields.io/twitter/follow/AuxoZk.svg?style=social&label=Follow"></a>
</p>

## Description

This library provides shared resources for our packages, such as custom provable data structures, utility and helper functions...

## Features

1. **Bit255**: Custom provable data structure for storing a 255-bit string.

2. **CustomScalar**: Custom provable data structure for storing Scalar as Field[], using only 2 Field instead of 256 Field.

3. **IpfsHash**: Custom provable data structure for storing CID (v1) of files stored on IPFS.

4. **DynamicArray**: Custom provable data structure for dynamic-length arrays with different provable type: Bool, Bit255, Field, Group, PublicKey, Scalar.

5. **Utils**: Services can request to use generated keys for their use cases.

-   Benchmark
-   Mina account's config
-   Network interaction
-   zkApp's helpers

## How to build

```sh
npm run build
```

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```

## License

[Apache-2.0](LICENSE)
