# SafeSwap Example

Demonstrates tier-gated trading limits in a DEX.

## Features

- Tier 0 (Unknown): Max $100 trades
- Tier 1 (Restricted): No trading allowed
- Tier 2 (Standard): Max $10k trades
- Tier 3 (Trusted): Max $100k trades
- Tier 4 (Advanced): Unlimited

## Usage
```solidity
SafeSwap swap = new SafeSwap(oracleAddress);
swap.addLiquidity(tokenA, 1000 ether);
swap.addLiquidity(tokenB, 1000 ether);

// User swaps - automatically tier-gated
swap.swap(tokenA, tokenB, 500 ether);
```

## Integration Points

1. Constructor takes oracle address
2. `swap()` checks `oracle.getTier(msg.sender)`
3. Large trades additionally verify `oracle.can(msg.sender, ACTION_TRADE)`

## Deploy
```bash
forge create SafeSwap --constructor-args 0x53520A628e165D195F9F0A279044533F6D02eFd6
```