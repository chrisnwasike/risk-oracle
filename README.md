# Risk Oracle

Deterministic Risk Tier Oracle Middleware for EVM chains. Classifies wallet behavior into safety tiers (0-4) that protocols can use to gate financial actions.

## What This Is

A blockchain infrastructure primitive that:
- Observes wallet transaction behavior off-chain
- Classifies wallets into deterministic tiers (0=Unknown, 1=Restricted, 2=Standard, 3=Trusted, 4=Advanced)
- Serves tiers on-chain via a minimal read-only oracle contract
- Enables protocols to safely allow/deny actions based on behavioral stability

**This is NOT:**
- A dashboard or UI
- A reputation system
- A scoring algorithm
- Analytics or gamification

**This IS:**
- A safety gate for protocols
- A dependency other protocols integrate to operate safely

## Architecture

```
PostgreSQL Database → Backend Classifier → Smart Contract Oracle
     (tx history)      (deterministic        (on-chain reads)
                        tier assignment)
```

**Off-chain:**
- Indexer stores wallet transactions
- Rule engine classifies behavior patterns
- Backend pushes tier updates in batches

**On-chain:**
- Minimal oracle contract (`getTier`, `can`)
- Protocols integrate via SDK/direct calls

## Classification Rules

Tiers are deterministic state machine outputs based on:

**Bad behaviors (caps tier):**
- Flip trading (rapid buy/sell same asset)
- Impulsive patterns (many txs in short windows)
- High suspicious transaction ratio

**Good behaviors (unlock progression):**
- Account age
- Transaction consistency over time
- Stable behavioral patterns

**Time-based trust:**
- Tier 2: 3+ transactions, 1+ week
- Tier 3: 10+ transactions, 2+ weeks, consistent activity
- Tier 4: 30+ transactions, 3+ months, long-term stability

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Git

### Setup

1. **Clone and install:**
```bash
git clone <your-repo>
cd risk-oracle
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your values
```

3. **Setup database:**
```bash
createdb risk_oracle
npx prisma migrate dev
```

4. **Seed sample data:**
```bash
npm run seed
```

## Usage

### Local Development

**Start API server:**
```bash
npm run dev
```

**Classify wallets:**
```bash
npm run classify
```

**Push tiers to chain:**
```bash
npm run push
```

**Query chain tiers:**
```bash
npm run query
```

### API Endpoints

**GET `/tier/:address`**
- Returns tier and explanation for a wallet
- Rate limited: 100 req/min
- Example: `GET /tier/0x1234...`

Response:
```json
{
  "address": "0x1234...",
  "tier": 2,
  "explanation": "Tier 2: 5 transactions over 10 days - standard behavior"
}
```

**GET `/wallets`**
- Lists all wallets and their tiers
- For debugging only

**GET `/health`**
- Health check endpoint

## Smart Contract

Deployed on Robinhood Chain Testnet: `0x53520A628e165D195F9F0A279044533F6D02eFd6`

### Integration Example

```solidity
interface IRiskOracle {
  function getTier(address wallet) external view returns (uint8);
  function can(address wallet, uint8 actionType) external view returns (bool);
}

contract MyProtocol {
  IRiskOracle oracle = IRiskOracle(0x5352...eFd6);
  
  function trade() external {
    require(oracle.can(msg.sender, 1), "Insufficient tier");
    // ... trading logic
  }
}
```

### Action Types

- `0` = BASIC (any tier)
- `1` = TRADE (tier 2+)
- `2` = LEVERAGE (tier 3+)
- `3` = GOVERN (tier 3+)
- `4` = WITHDRAW (tier 2+)

## Project Structure

```
risk-oracle/
├── src/
│   ├── index.ts          # API server
│   ├── classifier.ts     # Tier classification engine
│   ├── chain.ts          # Blockchain interaction
│   ├── db.ts             # Database client
│   ├── config.ts         # Environment validation
│   ├── seed.ts           # Sample data generator
│   ├── classify.ts       # Batch classification script
│   ├── push.ts           # Push tiers to chain
│   ├── query.ts          # Query chain tiers
│   ├── middleware/
│   │   └── validation.ts # API validation & rate limiting
│   └── abi/
│       └── RiskOracle.json
├── contracts/
│   ├── src/
│   │   └── RiskOracle.sol
│   └── test/
│       └── RiskOracle.t.sol
├── prisma/
│   └── schema.prisma
└── README.md
```

## Testing

**Backend tests:** (TODO in next phase)
```bash
npm test
```

**Contract tests:**
```bash
cd contracts
forge test -vv
```

## Deployment

### Deploy Contract

1. Get testnet ETH from faucet
2. Deploy:
```bash
cd contracts
forge create src/RiskOracle.sol:RiskOracle \
  --rpc-url $RH_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

3. Update `.env` with deployed address

### Production Checklist

- [ ] Use separate wallet for contract owner (not same as deployer)
- [ ] Set `NODE_ENV=production` to disable query logging
- [ ] Use proper rate limiting (Redis-based)
- [ ] Setup monitoring for tier updates
- [ ] Enable transaction retry logic for push failures
- [ ] Backup database regularly
- [ ] Monitor gas prices before batch updates
- [ ] Setup alerts for classification anomalies

## Security Considerations

**Anti-gaming:**
- Rules designed to resist farming behavior
- Time requirements cannot be rushed
- Bad behavior permanently caps tier

**Contract security:**
- Owner-only tier updates
- Input validation on all functions
- Minimal attack surface (read-only for protocols)

**Backend security:**
- Rate limiting on API endpoints
- Input validation on all endpoints
- Environment variable validation
- Graceful error handling

## Performance

**Database:**
- Indexes on `address`, `tier`, `walletId`, `timestamp`
- Prisma connection pooling
- Optimized queries for classification

**Blockchain:**
- Batch updates (up to 200 wallets per transaction)
- Gas-efficient storage (simple mapping)
- Read operations ~5k gas

**Typical costs:**
- 5 wallets: ~126k gas
- 50 wallets: ~600k gas
- 200 wallets: ~2.4M gas

## License

MIT

## Contributing

This is infrastructure. Contributions must:
1. Improve protocol safety gating
2. Maintain determinism
3. Resist gaming
4. Remain minimal

No features that don't directly serve protocol integration.
