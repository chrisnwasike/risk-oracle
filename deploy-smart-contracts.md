# Robinhood Chain Contract Deployment Tutorial (Foundry)

This guide walks through how to deploy a smart contract to Robinhood Chain, a Layer 2 using Foundry. If you’ve deployed to Ethereum or other Arbitrum chains before, the flow should feel very familiar.

## Prerequisites

Before you begin, make sure you have a wallet with testnet `ETH` on Robinhood Chain.

- Network: `Robinhood Chain Testnet`
- Chain ID: `46630`
- RPC URL: `https://rpc.testnet.chain.robinhood.com`
- Block Explorer: [explorer.testnet.chain.robinhood.com](https://explorer.testnet.chain.robinhood.com)

If you still need funds, use the [faucet](https://faucet.testnet.chain.robinhood.com/). For wallet setup, see [Add network to your wallet](/chain/add-network-to-wallet).

## Install Foundry

If you have already installed Foundry, you may skip this step.

```bash
# Download and run the foundryup installer. Follow the prompts:
curl -L https://foundry.paradigm.xyz | bash

# Next, run foundryup to install forge, anvil, cast and chisel
foundryup
```

## Create a Foundry Project

```bash
mkdir rh-deploy
cd rh-deploy
forge init
```

## Create a Test Contract

Place this file anywhere in the `src/` directory of your project with a `.sol` file extension.

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract HelloRobinhood {
    function hello() external pure returns (string memory) {
        return "Hello, Robinhood Chain!";
    }
}
```

## Deploy the Test Contract

```bash
# Set this to the wallet key that holds your Robinhood Chain testnet ETH.
# Never commit real private keys.
export PRIVATE_KEY=0x<your_private_key>

export RH_RPC_URL=https://rpc.testnet.chain.robinhood.com

# This command will deploy the HelloRobinhood contract and output its address
forge create HelloRobinhood \
  --rpc-url $RH_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## Verify the Test Contract on Block Explorer

```bash
forge verify-contract <contract_address> \
  src/HelloRobinhood.sol:HelloRobinhood \
  --chain-id 46630 \
  --rpc-url $RH_RPC_URL \
  --verifier blockscout \
  --verifier-url https://explorer.testnet.chain.robinhood.com/api/
```

After submitting verification, check your contract page on the explorer:

`https://explorer.testnet.chain.robinhood.com/address/<contract_address>`
