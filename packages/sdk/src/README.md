# @risk-oracle/sdk

TypeScript SDK for integrating Risk Oracle into your DeFi protocol.

## Installation

```bash
npm install @risk-oracle/sdk ethers
```

## Quick Start

### Check Wallet Tier

```typescript
import { createClient } from '@risk-oracle/sdk';

const client = createClient();
const tier = await client.getTier('0x1234...');
console.log(`Wallet tier: ${tier}`); // 0-4
```

### Gate Actions by Tier

```typescript
import { RiskOracleClient, ActionType } from '@risk-oracle/sdk';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://rpc.testnet.chain.robinhood.com');
const client = new RiskOracleClient(provider);

// Check if wallet can trade
const canTrade = await client.can('0x1234...', ActionType.TRADE);
if (!canTrade) {
  throw new Error('Insufficient tier for trading');
}
```

### Get Full Wallet Info

```typescript
const info = await client.getWalletInfo('0x1234...');
console.log(info);
// {
//   address: '0x1234...',
//   tier: 3,
//   tierName: 'Trusted',
//   permissions: {
//     basic: true,
//     trade: true,
//     leverage: true,
//     govern: true,
//     withdraw: true
//   }
// }
```

## Solidity Integration

```solidity
interface IRiskOracle {
    function getTier(address wallet) external view returns (uint8);
    function can(address wallet, uint8 actionType) external view returns (bool);
}

contract MyProtocol {
    IRiskOracle oracle = IRiskOracle(0xFb641c36EFD330a2b2909F1746dBdB218064B84F);
    
    function riskyAction() external {
        require(oracle.can(msg.sender, 1), "Need Tier 2+ to trade");
        // ... your logic
    }
}
```

## Action Types

- `BASIC (0)` - Any tier can perform
- `TRADE (1)` - Requires Tier 2+
- `LEVERAGE (2)` - Requires Tier 3+
- `GOVERN (3)` - Requires Tier 3+
- `WITHDRAW (4)` - Requires Tier 2+

## Tier Meanings

- **Tier 0 (Unknown)** - New wallet or insufficient data
- **Tier 1 (Restricted)** - Suspicious behavior detected
- **Tier 2 (Standard)** - Normal usage pattern
- **Tier 3 (Trusted)** - Stable behavior over weeks
- **Tier 4 (Advanced)** - Long-term trusted (months of stability)

## Networks

Currently deployed on:
- **Robinhood Chain Testnet** - `0xFb641c36EFD330a2b2909F1746dBdB218064B84F`

## API Reference

See [full documentation](https://chrisnwasike.github.io/risk-oracle/) for complete API reference.

## License

MIT