import { AppStoreButtons } from '../../../components/AppStoreButtons'

# Add network to your wallet

## Faucet

To view the [**faucet**](https://faucet.testnet.chain.robinhood.com/), click here to deposit testnet funds directly into your wallet.

## Robinhood Wallet

[Robinhood Wallet](https://robinhood.com/web3-wallet/) provides support for Robinhood Chain&apos;s Testnet. To enable:

1. Download Robinhood Wallet (requires iOS or Android)

<AppStoreButtons />

2. Create a wallet
3. Go to settings and select Developer Settings
4. Enable Robinhood Chain Testnet mode. *Note: Only balances & browser are supported*.

## Connect using a Browser Wallet

Robinhood Chain’s Testnet is compatible with EVM Wallets (MetaMask, Phantom, and more). Click on your wallet below to automatically connect to the Robinhood Chain Testnet:

import { ConnectButton } from '../../../components/ConnectButton'

<ConnectButton />

### To add manually to MetaMask:

1. In MetaMask, follow these instructions to add a network manually.
2. Enter the details below:

| Property | Value |
| :--- | :--- |
| Network Name | Robinhood Chain Testnet |
| Description | A public testnet for Robinhood Chain |
| Chain ID | 46630 |
| Default RPC URL | `https://rpc.testnet.chain.robinhood.com` |
| Currency Symbol | ETH |
| Block Explorer | [explorer.testnet.chain.robinhood.com](https://explorer.testnet.chain.robinhood.com) |
