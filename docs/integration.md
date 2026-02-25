# Integration Guide

This guide walks you through integrating Risk Oracle into your DeFi protocol in under 30 minutes.

---

## Quick Integration (5 Minutes)

### For Solidity Contracts

**Step 1: Add the interface**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IRiskOracle {
    function getTier(address wallet) external view returns (uint8);
    function can(address wallet, uint8 actionType) external view returns (bool);
}
```

**Step 2: Initialize in your contract**

```solidity
contract YourProtocol {
    IRiskOracle public oracle;
    
    constructor() {
        // Robinhood Chain Testnet
        oracle = IRiskOracle(0xFb641c36EFD330a2b2909F1746dBdB218064B84F);
    }
}
```

**Step 3: Gate your risky functions**

```solidity
function riskyAction() external {
    require(oracle.can(msg.sender, 1), "Insufficient tier");
    
    // Your logic here
}
```

**Done!** You've integrated Risk Oracle.

---

## Action Types Reference

Use these constants when checking permissions:

| Constant | Value | Minimum Tier | Use Case |
|----------|-------|--------------|----------|
| `ACTION_BASIC` | 0 | Tier 0+ | View functions, queries |
| `ACTION_TRADE` | 1 | Tier 2+ | Swaps, basic trades |
| `ACTION_LEVERAGE` | 2 | Tier 3+ | Margin trading, leverage |
| `ACTION_GOVERN` | 3 | Tier 3+ | Governance proposals |
| `ACTION_WITHDRAW` | 4 | Tier 2+ | Large withdrawals |

---

## Integration Patterns

### Pattern 1: Binary Gate (Recommended)

Simple allow/deny based on tier.

```solidity
function swap(uint256 amount) external {
    require(oracle.can(msg.sender, 1), "Need Tier 2+ to trade");
    
    // Execute swap
}
```

**Best for:** Most protocols, simple and effective.

---

### Pattern 2: Tiered Limits

Different limits based on wallet tier.

```solidity
function borrow(uint256 amount) external {
    uint8 tier = oracle.getTier(msg.sender);
    uint256 maxBorrow = getMaxBorrow(tier);
    
    require(amount <= maxBorrow, "Exceeds tier limit");
    
    // Execute borrow
}

function getMaxBorrow(uint8 tier) internal pure returns (uint256) {
    if (tier == 0) return 100e18;      // $100
    if (tier == 1) return 0;            // Restricted
    if (tier == 2) return 10_000e18;    // $10k
    if (tier == 3) return 100_000e18;   // $100k
    if (tier == 4) return type(uint256).max; // Unlimited
    return 0;
}
```

**Best for:** Lending protocols, gradual unlock models.

---

### Pattern 3: Dynamic Fees

Lower fees for higher tiers.

```solidity
function getSwapFee(address user) public view returns (uint256) {
    uint8 tier = oracle.getTier(user);
    
    if (tier >= 4) return 10; // 0.1%
    if (tier >= 3) return 20; // 0.2%
    if (tier >= 2) return 30; // 0.3%
    return 50; // 0.5% for Tier 0-1
}
```

**Best for:** DEXs, protocols wanting to reward trusted users.

---

### Pattern 4: Progressive Access

Unlock features as tier increases.

```solidity
function propose(string memory description) external {
    require(oracle.can(msg.sender, 3), "Need Tier 3+ to propose");
    // Create governance proposal
}

function vote(uint256 proposalId) external {
    require(oracle.getTier(msg.sender) >= 2, "Need Tier 2+ to vote");
    // Cast vote
}
```

**Best for:** DAOs, governance systems.

---

## TypeScript/JavaScript Integration

### Using the SDK

**Install:**
```bash
npm install @risk-oracle/sdk ethers
```

**Basic usage:**
```typescript
import { createClient, ActionType } from '@risk-oracle/sdk';

const client = createClient();

// Check if wallet can trade
const canTrade = await client.can(
  '0x1234567890123456789012345678901234567890',
  ActionType.TRADE
);

if (canTrade) {
  // Allow the trade
} else {
  // Reject or show upgrade message
}
```

**Get full wallet info:**
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

---

## Frontend Integration (React)

### Display Tier Badge

```typescript
import { useState, useEffect } from 'react';
import { createClient } from '@risk-oracle/sdk';

function TierBadge({ address }: { address: string }) {
  const [tier, setTier] = useState<number | null>(null);
  
  useEffect(() => {
    const client = createClient();
    client.getTier(address).then(setTier);
  }, [address]);
  
  if (tier === null) return <span>Loading...</span>;
  
  const tierNames = ['Unknown', 'Restricted', 'Standard', 'Trusted', 'Advanced'];
  const tierColors = ['gray', 'red', 'blue', 'green', 'purple'];
  
  return (
    <span style={{ color: tierColors[tier] }}>
      Tier {tier}: {tierNames[tier]}
    </span>
  );
}
```

### Gate UI Based on Tier

```typescript
import { useState, useEffect } from 'react';
import { createClient, ActionType } from '@risk-oracle/sdk';

function TradeButton({ userAddress }: { userAddress: string }) {
  const [canTrade, setCanTrade] = useState(false);
  
  useEffect(() => {
    const client = createClient();
    client.can(userAddress, ActionType.TRADE).then(setCanTrade);
  }, [userAddress]);
  
  if (!canTrade) {
    return (
      <div>
        <button disabled>Trade (Requires Tier 2+)</button>
        <p>Build your tier by using the protocol more!</p>
      </div>
    );
  }
  
  return <button onClick={handleTrade}>Trade</button>;
}
```

---

## Testing Your Integration

### 1. Test Wallets

Use these pre-classified test wallets on Robinhood Chain Testnet:

| Address | Tier | Purpose |
|---------|------|---------|
| `0x1111111111111111111111111111111111111111` | 0 | Test Unknown behavior |
| `0x2222222222222222222222222222222222222222` | 1 | Test Restricted behavior |
| `0x3333333333333333333333333333333333333333` | 2 | Test Standard behavior |
| `0x4444444444444444444444444444444444444444` | 3 | Test Trusted behavior |
| `0x5555555555555555555555555555555555555555` | 4 | Test Advanced behavior |

### 2. Integration Checklist

- [ ] Oracle interface added to your contract
- [ ] Oracle initialized with correct address
- [ ] Risky functions gated with `oracle.can()`
- [ ] Tested with all 5 test wallets
- [ ] UI shows tier information to users
- [ ] Error messages explain tier requirements
- [ ] Integration announced to Risk Oracle team

---

## Gas Optimization

### Reading Tiers is Cheap

```solidity
// Cost: ~5,000 gas (one SLOAD)
uint8 tier = oracle.getTier(msg.sender);

// Cost: ~5,500 gas (one SLOAD + tiny logic)
bool allowed = oracle.can(msg.sender, ACTION_TRADE);
```

**Tip:** Cache tier in memory if checking multiple times:

```solidity
function complexAction() external {
    uint8 tier = oracle.getTier(msg.sender);
    
    // Use 'tier' multiple times without re-reading
    require(tier >= 2, "Need Tier 2+");
    
    uint256 limit = calculateLimit(tier);
    uint256 fee = calculateFee(tier);
    
    // ... rest of logic
}
```

---

## Multi-Chain Support

Risk Oracle will expand to multiple chains. Prepare your contract:

```solidity
contract YourProtocol {
    IRiskOracle public oracle;
    
    // Make oracle address configurable
    function setOracle(address _oracle) external onlyOwner {
        oracle = IRiskOracle(_oracle);
    }
}
```

When Risk Oracle deploys to a new chain, you can update the address.

**Upcoming chains:**
- Arbitrum One (Q2 2025)
- Base (Q2 2025)
- Optimism (Q3 2025)

---

## Need Help?

- **Quick questions:** [Discord](https://discord.gg/riskoracle)
- **Integration support:** DM [@RiskOracle](https://twitter.com/riskoracle)
- **Bug reports:** [GitHub Issues](https://github.com/chrisnwasike/risk-oracle/issues)
- **Email:** chrisnwasike@gmail.com

---

## Example Projects

See full integration examples:

1. **[SafeSwap](../examples/safe-swap/)** - DEX with tier-gated trade limits
2. **[TieredLending](../examples/tiered-lending/)** - Lending with dynamic limits (coming soon)
3. **[DAOGovernance](../examples/dao-governance/)** - Tier-gated proposals (coming soon)

---

**Next:** Learn about [Classification Rules](./classification.md) to understand how tiers are assigned.
