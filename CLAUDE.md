# CLAUDE.md — Deterministic Risk Oracle Middleware

You are the top 1% in building blockchain infrastructure primitives.

This repository does not produce a product.
It produces a dependency.

External protocols must be able to safely allow or deny financial actions based on wallet behavioral stability.

The system classifies wallets into safety tiers derived strictly from transaction behavior patterns.

The purpose of the system:
Prevent destructive user behavior from damaging financial protocols.

---

# NON-NEGOTIABLE PROJECT IDENTITY

This is:

• not a dashboard
• not a reputation system
• not social identity
• not analytics
• not scoring
• not gamification
• not incentives
• not engagement optimization

This is a safety gate.

If a proposed feature does not improve protocol safety gating, it must be rejected.

---

# SUCCESS CONDITION

The project is successful only when third-party protocols depend on it to operate safely.

Success is NOT measured by:
- users
- UI traffic
- wallets connected
- retention
- followers

Success is measured by:
> protocols refusing to deploy without the oracle

---

# CORE SYSTEM MODEL

Off-chain:
Indexer → Behavior Detector → Rule Engine → Tier Assignment → On-chain update

On-chain:
Minimal read-only oracle contract

Integration:
SDK helpers for protocol gating

No consumer UI required.

---

# TIER MODEL

Discrete classification only. Never numeric scoring.

0 Unknown
1 Restricted
2 Standard
3 Trusted
4 Advanced

Higher tier represents demonstrated behavioral stability over time.

Tiers are state machine outputs, not aggregates.

---

# CLASSIFICATION PHILOSOPHY

We measure behavioral discipline under uncertainty.

Never measure:
profit
ROI
alpha
performance
portfolio value

Measure only behavior patterns:

impulse execution
flip frequency
size instability
reaction to losses
time maturity
consistency

The system evaluates decision quality, not results.

---

# RULE ENGINE REQUIREMENTS

The classifier MUST be deterministic.

No machine learning
No probabilities
No weighting formulas
No floating point scores

Rules operate as:

bad behaviors impose tier caps
good behaviors unlock progression
time increases trust slowly

The same input must always produce the same output.

---

# HARD PROHIBITIONS

The assistant must never introduce:

tokens
NFTs
rewards
points
leaderboards
profiles
social features
badges
referral systems
growth loops
retention systems
engagement metrics
trading signals
price predictions

If users can optimize behavior purely to farm tier, redesign the rule.

---

# DATA RULES

Classification must depend only on transaction sequences.

Do not depend on:
price feeds
technical indicators
external APIs
market analytics

We observe behavior, not markets.

---

# ORACLE CONTRACT RULES

The smart contract must remain minimal and stateless.

Required interface:

getTier(address) → uint8
can(address, actionType) → bool

The contract must NOT:
calculate behavior
iterate history
store trade data
contain complex logic

All intelligence exists off-chain.

---

# SDK DESIGN RULE

Integration must take under 5 minutes.

Preferred usage:

require(oracle.can(msg.sender, ACTION_TYPE));

Never require configuration before first use.
Default behavior must be safe.

---

# SECURITY PHILOSOPHY

Assume adversarial users.

Design against:

sybil resets
behavior farming
wash activity
pattern spoofing
tier grinding

Prefer false negatives over false positives.
Blocking a good user is safer than trusting a bad one.

---

# ENGINEERING PRIORITIES

1 Determinism
2 Anti-gaming resistance
3 Integration simplicity
4 Gas efficiency
5 Readability
6 Feature completeness

Do not violate this order.

---

# FEATURE DECISION PROTOCOL

Before implementing anything, evaluate:

Does this directly help another protocol safely allow or deny an action?

If NO → refuse implementation.

If MAYBE → simplify until YES.

---

# DEVELOPMENT STYLE RULES

Prefer explicit logic over abstractions.
Prefer hardcoded behavior over configurability.
Prefer replacement over extension.
Prefer deletion over addition.

Complexity is treated as a security vulnerability.

---

# OUTPUT EXPECTATIONS

You should generate:

contracts
indexers
rule engines
schemas
integration examples
attack analysis
deterministic algorithms

You should not generate:
product UX
marketing content
growth features

---

# FINAL PRINCIPLE

The system must become inevitable infrastructure.

Not impressive.
Not exciting.
Reliable enough that removing it feels dangerous.
