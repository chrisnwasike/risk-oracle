# Classification Rules

Risk Oracle uses deterministic rules to classify wallet behavior into tiers 0-4. This document explains exactly how classification works.

---

## Core Philosophy

**We measure behavioral discipline, not profitability.**

- ❌ We don't care if you made money
- ❌ We don't care about portfolio size  
- ❌ We don't care about token choices
- ✅ We care about decision patterns
- ✅ We care about consistency over time
- ✅ We care about impulse control

---

## Tier Definitions

### Tier 0: Unknown

**Meaning:** New wallet or insufficient data to classify.

**Criteria:**
- Fewer than 3 transactions, OR
- Account age less than 1 week, OR
- No classification has been run yet

**Typical user:**
- Brand new wallet
- Just bridged funds to chain
- Haven't interacted with protocols yet

**Action limits:**
- Basic actions: ✅ Allowed
- Trading: ❌ Blocked
- Leverage: ❌ Blocked
- Governance: ❌ Blocked
- Withdrawals: ❌ Blocked

---

### Tier 1: Restricted

**Meaning:** Suspicious behavior patterns detected. High risk of exploitation or abuse.

**Criteria (ANY of these trigger Tier 1):**
1. **5+ flip trades** - Rapid buy/sell of same asset
2. **Impulsive trading** - 5+ transactions within 1 hour
3. **High suspicious ratio** - >30% of transactions flagged as suspicious

**Typical user:**
- Bot accounts
- Flip traders / sandwich attackers
- Accounts showing erratic patterns
- Potential exploit testing

**Action limits:**
- Basic actions: ✅ Allowed
- Trading: ❌ Blocked
- Leverage: ❌ Blocked
- Governance: ❌ Blocked
- Withdrawals: ❌ Blocked

**Recovery:** 
- Wait 2 weeks with clean behavior
- Add 10+ non-suspicious transactions
- System will reclassify to Tier 2

---

### Tier 2: Standard

**Meaning:** Normal, legitimate usage. Basic trust established.

**Criteria (ALL must be true):**
- Minimum 3 transactions
- Account age 7+ days
- No red flags (flips, impulse patterns)
- Transactions spread across the week (not clustered)

**Typical user:**
- Regular DeFi user
- Occasional swaps
- Some liquidity provision
- Normal withdrawal patterns

**Action limits:**
- Basic actions: ✅ Allowed
- Trading: ✅ Allowed
- Leverage: ❌ Blocked (need Tier 3)
- Governance: ❌ Blocked (need Tier 3)
- Withdrawals: ✅ Allowed

**This is the default "good user" tier.**

---

### Tier 3: Trusted

**Meaning:** Consistent, stable behavior over weeks. Advanced features unlocked.

**Criteria (ALL must be true):**
- Minimum 10 transactions
- Account age 14+ days
- Consistent activity (transactions spread over 50% of account lifetime)
- No suspicious patterns
- No flip trades

**Typical user:**
- Active protocol user
- Multiple interactions per week
- Provides liquidity consistently
- Participates in governance
- Long-term holder behavior

**Action limits:**
- Basic actions: ✅ Allowed
- Trading: ✅ Allowed
- Leverage: ✅ Allowed
- Governance: ✅ Allowed
- Withdrawals: ✅ Allowed

**All features unlocked.**

---

### Tier 4: Advanced

**Meaning:** Long-term trusted user with months of stable history. Maximum trust.

**Criteria (ALL must be true):**
- Minimum 30 transactions
- Account age 90+ days (3 months)
- Consistent activity across entire lifetime
- Zero suspicious activity
- Transaction frequency stable (not bursty)

**Typical user:**
- Protocol power users
- Liquidity providers with long positions
- Active DAO members
- Long-term believers in ecosystem

**Action limits:**
- All actions: ✅ Allowed
- May receive special privileges in integrated protocols (lower fees, higher limits)

**This is the "VIP" tier.**

---

## Behavior Detection

### What is a "Flip Trade"?

A flip trade is detected when:

```
1. Buy asset X
2. Sell asset X within 30 minutes
3. Repeat 5+ times
```

**Why we flag this:**
- Indicates bot behavior
- Often used in sandwich attacks
- Shows lack of conviction (pure speculation)
- Destabilizes protocol liquidity

**False positives:**
- Day traders doing legitimate arbitrage
- **Mitigation:** If consistently profitable and spread over weeks, tier increases anyway

---

### What is "Impulsive Trading"?

Detected when:

```
5+ transactions within a 60-minute window
```

**Why we flag this:**
- Suggests emotional/reactive decisions
- Often precedes bad trades
- Can indicate testing for exploits
- Associated with higher loss rates

**False positives:**
- Legitimate high-frequency strategies
- **Mitigation:** If sustained over time without issues, tier increases

---

### What is "Suspicious Activity"?

Flagged when transaction exhibits:

- Extremely large value (>$100k) from new wallet
- Interacting with known exploit contracts
- Gas price manipulation patterns
- Unusual contract interactions
- Copy-paste of exploit transaction patterns

**How we detect:**
- Pattern matching against known exploits
- Statistical outlier detection
- Manual review flags (rare)

---

## Time-Based Trust

**Key principle:** Trust increases slowly, decreases quickly.

### Earning Trust (Slow)

```
Week 1:  Tier 0 → Tier 2 (if clean behavior)
Week 2:  Tier 2 → Tier 3 (if consistent)
Month 3: Tier 3 → Tier 4 (if stable)
```

**You cannot rush this.** Time requirements are absolute.

---

### Losing Trust (Fast)

```
Single flip trade pattern:    Tier 3 → Tier 1
Suspicious transaction:        Tier 4 → Tier 2
Multiple violations:           Any tier → Tier 1
```

**Recovery takes 2-4 weeks of clean behavior.**

---

## Anti-Gaming Design

### What We Prevent

**Strategy: "Farm transactions to boost tier"**
- ❌ **Blocked by:** Consistency requirement - transactions must be spread over time
- ❌ **Blocked by:** Value threshold - dust transactions don't count

**Strategy: "Create multiple wallets to bypass restrictions"**
- ❌ **Blocked by:** Each wallet classified independently
- ❌ **Blocked by:** New wallets start at Tier 0 (can't trade immediately)

**Strategy: "Buy a high-tier wallet"**
- ❌ **Blocked by:** Change in behavior pattern resets tier
- ❌ **Blocked by:** Unusual activity from previously dormant wallet triggers review

**Strategy: "Wait 3 months, then exploit"**
- ❌ **Blocked by:** One exploit drops you to Tier 1
- ❌ **Blocked by:** Tier is valuable - not worth burning for one attack

---

## Determinism Guarantee

**Same inputs ALWAYS produce same outputs.**

Given:
- Wallet address
- Transaction history
- Current timestamp

The classification algorithm will ALWAYS return the same tier.

**No randomness. No ML. No human judgment.**

This means:
- ✅ You can predict your tier
- ✅ Protocols can trust the output
- ✅ System is auditable
- ✅ No bias or discrimination

---

## Classification Frequency

**How often are tiers updated?**

- **On-chain:** Tiers are pushed in batches every 24 hours
- **Off-chain:** Classification runs continuously as new transactions arrive
- **Real-time:** API endpoint always returns latest classification

**Why not real-time on-chain?**
- Gas costs - would be expensive to update after every transaction
- Batching is more efficient
- 24-hour lag is acceptable for behavioral patterns (they don't change instantly)

---

## Edge Cases

### What if I'm misclassified?

**If you believe your tier is wrong:**

1. Check your transaction history for patterns
2. Verify account age and transaction count
3. Look for any flagged transactions

**If still incorrect:**
- Open a GitHub issue with your address
- We'll review and explain the classification
- If it's a bug, we'll fix it

**Note:** "I should be higher" is not a bug. Rules are rules.

---

### What if I stop using the protocol?

**Inactivity does NOT decrease your tier.**

- Tier 3 wallet that goes dormant for 6 months → Still Tier 3 when it returns
- Trust is earned, not rented

**However:**
- If you return and immediately show suspicious patterns, tier may drop
- Long dormancy followed by sudden large activity may trigger review

---

### What about privacy?

**All classification is based on public on-chain data.**

- We don't know your identity
- We don't track IPs
- We only see what's already on the blockchain

**Your tier is public** (anyone can query the oracle).

If privacy is a concern:
- Use a fresh wallet for sensitive activities
- Accept starting from Tier 0

---

## Classification Algorithm (Technical)

### High-Level Flow

```
1. Fetch wallet address
2. Query all transactions from database
3. Calculate account age (now - firstSeen)
4. Count total transactions
5. Check for bad behaviors:
   - Count flip trades
   - Detect impulsive patterns  
   - Calculate suspicious ratio
6. If ANY bad behavior → return Tier 1
7. Else, check progression criteria:
   - txCount >= 3 AND age >= 7 days → Tier 2
   - txCount >= 10 AND age >= 14 days AND consistent → Tier 3
   - txCount >= 30 AND age >= 90 days AND consistent → Tier 4
8. Return tier
```

### Pseudo-code

```typescript
function classifyWallet(address: string): number {
  const wallet = getWallet(address);
  const txs = getTransactions(address);
  const age = now() - wallet.firstSeen;
  
  // Rule 1: No history
  if (txs.length === 0) return 0;
  
  // Rule 2: Bad behaviors cap at Tier 1
  const flipCount = txs.filter(tx => tx.isFlip).length;
  if (flipCount >= 5) return 1;
  
  const suspiciousRatio = txs.filter(tx => tx.isSuspicious).length / txs.length;
  if (suspiciousRatio > 0.3) return 1;
  
  if (hasImpulsivePattern(txs)) return 1;
  
  // Rule 3: Progression
  if (txs.length >= 30 && age >= 90_DAYS && isConsistent(txs, 90_DAYS)) {
    return 4;
  }
  
  if (txs.length >= 10 && age >= 14_DAYS && isConsistent(txs, 14_DAYS)) {
    return 3;
  }
  
  if (txs.length >= 3 && age >= 7_DAYS) {
    return 2;
  }
  
  return 0;
}
```

---

## FAQ

**Q: How long until I reach Tier 3?**  
A: Minimum 2 weeks with 10+ transactions. Could take longer if activity isn't consistent.

**Q: Can I pay to increase my tier?**  
A: No. Time and behavior only.

**Q: What if I get flagged incorrectly?**  
A: Open a GitHub issue. We'll review manually.

**Q: Do different tokens affect my tier?**  
A: No. We don't care what you trade, only how you trade.

**Q: Can I have multiple wallets with different tiers?**  
A: Yes. Each wallet is independent.

**Q: Will tiers ever change?**  
A: The algorithm may improve, but changes will be announced. Your tier won't drop due to rule changes.

---

**Next:** See [API Reference](./api.md) for technical integration details.
