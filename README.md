# Risk Oracle

> Deterministic behavioral classification for DeFi safety

[![CI](https://github.com/chrisnwasike/risk-oracle/actions/workflows/ci.yml/badge.svg)](https://github.com/chrisnwasike/risk-oracle/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Discord](https://img.shields.io/discord/YOUR_DISCORD_ID?label=discord)](https://discord.gg/riskoracle)

Risk Oracle classifies wallet behavior into deterministic tiers (0-4) that protocols use to gate financial actions. Think of it as a behavioral credit score for DeFi, but permissionless and transparent.

## 🎯 What Problem Does This Solve?

DeFi protocols face a dilemma:
- **Without gates:** Exploiters, bots, and rug pullers freely interact
- **With KYC:** Kills permissionless nature of DeFi
- **With centralized risk scoring:** Single point of failure, opaque

**Risk Oracle solves this** by providing deterministic, on-chain behavioral tiers that protocols can trust.

## 🏗️ How It Works

```
User Behavior → Off-chain Classification → On-chain Oracle → Protocol Gates Actions
```

1. **Off-chain indexer** observes wallet transactions
2. **Classification engine** applies deterministic rules (no ML, no subjectivity)
3. **Backend pushes** tier updates to smart contract
4. **Protocols query** `oracle.can(wallet, actionType)` before allowing actions

## ⚡ Quick Start

### For Protocol Developers

```bash
npm install @risk-oracle/sdk ethers
```

```typescript
import { createClient, ActionType } from '@risk-oracle/sdk';

const client = createClient();
const canTrade = await client.can('0x1234...', ActionType.TRADE);
```

### For Solidity Contracts

```solidity
interface IRiskOracle {
    function can(address wallet, uint8 actionType) external view returns (bool);
}

contract MyProtocol {
    IRiskOracle oracle = IRiskOracle(0x53520A628e165D195F9F0A279044533F6D02eFd6);
    
    function trade() external {
        require(oracle.can(msg.sender, 1), "Insufficient tier");
        // ... your logic
    }
}
```

## 📊 Tier System

| Tier | Name | Meaning | Requirements |
|------|------|---------|--------------|
| 0 | Unknown | New or insufficient data | No history |
| 1 | Restricted | Suspicious behavior | Flip trading, impulse patterns |
| 2 | Standard | Normal usage | 3+ txs, 1+ week, clean behavior |
| 3 | Trusted | Stable & consistent | 10+ txs, 2+ weeks, consistent activity |
| 4 | Advanced | Long-term trusted | 30+ txs, 3+ months, stable history |

## 🚀 Deployed Contracts

| Network | Address | Explorer |
|---------|---------|----------|
| Robinhood Chain Testnet | `0x53520A628e165D195F9F0A279044533F6D02eFd6` | [View](https://explorer.testnet.chain.robinhood.com/address/0x53520A628e165D195F9F0A279044533F6D02eFd6) |

## 📦 Packages

This monorepo contains:

- **[@risk-oracle/sdk](./packages/sdk)** - TypeScript SDK for integration
- **[@risk-oracle/contracts](./packages/contracts)** - Solidity oracle contracts
- **[@risk-oracle/backend](./packages/backend)** - Classification engine & API
- **[examples/](./examples/)** - Integration examples (DEX, lending, DAO)

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run backend API
cd packages/backend
npm run dev

# Run contract tests
cd packages/contracts
forge test

# Build SDK
cd packages/sdk
npm run build
```

## 📖 Documentation

- [Integration Guide](./docs/integration.md)
- [Classification Rules](./docs/classification.md)
- [API Reference](./docs/api.md)
- [Example Contracts](./examples/)

## 🤝 Integration Partners

Currently integrated with:
- *Add your first protocol partners here*

Interested in integrating? [Open an issue](https://github.com/chrisnwasike/risk-oracle/issues/new) or DM us on [Twitter](https://twitter.com/riskoracle).

## 🎓 Why "Deterministic"?

Unlike ML-based risk scoring, Risk Oracle uses explicit, auditable rules:
- ✅ Same inputs always produce same outputs
- ✅ No black-box decisions
- ✅ Anti-gaming resistant by design
- ✅ Fully transparent logic

## 🔐 Security

- Audited by: *TBD*
- Bug bounty: *TBD*
- Security policy: [SECURITY.md](./SECURITY.md)

## 💰 Funding

Risk Oracle is open-source infrastructure. Supported by:
- Gitcoin Grants
- Arbitrum Foundation
- *Add other grant sources*

[Support us on Gitcoin](https://gitcoin.co/grants/your-id)

## 📄 License

MIT - see [LICENSE](./LICENSE)

## 🙏 Acknowledgments

Built on:
- [Robinhood Chain](https://robinhood.com/crypto/wallet) (Arbitrum L2)
- [Foundry](https://github.com/foundry-rs/foundry)
- [Prisma](https://www.prisma.io/)
- [ethers.js](https://docs.ethers.org/)

## 📬 Contact

- Twitter: [@riskoracle](https://twitter.com/chrisnwasike)
- Discord: [Join our server](https://discord.gg/chrisnwasike)
- Email: chrisnwasike@gmail.com
- Website: [riskoracle.io](https://riskoracle.io)

---

**Building the safety layer for DeFi, one tier at a time.** 🛡️