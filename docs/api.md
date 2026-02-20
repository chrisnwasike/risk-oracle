# API Reference (Coming soon)

Complete reference for Risk Oracle's REST API, SDK, and smart contract interfaces.

---

## REST API

Base URL: `https://api.riskoracle.io` (coming soon)  
Testnet: Run locally or deploy your own

### Authentication

**None required.** All endpoints are public and read-only.

---

### Endpoints

#### `GET /tier/:address`

Get the current tier and explanation for a wallet.

**Parameters:**
- `address` (path, required) - Ethereum address (0x + 40 hex chars)

**Example Request:**
```bash
curl https://api.riskoracle.io/tier/0x1234567890123456789012345678901234567890
```

**Response:**
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "tier": 3,
  "explanation": "Tier 3: 25 transactions over 21 days - trusted consistent behavior"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid address format
- `429` - Rate limit exceeded (100 requests/minute)
- `500` - Server error

---

#### `GET /wallets`

List all classified wallets (for debugging).

**Example Request:**
```bash
curl https://api.riskoracle.io/wallets
```

**Response:**
```json
{
  "count": 1247,
  "wallets": [
    {
      "address": "0x1111...",
      "tier": 0,
      "txCount": 0,
      "firstSeen": "2025-02-15T10:00:00Z",
      "lastSeen": "2025-02-15T10:00:00Z"
    },
    {
      "address": "0x2222...",
      "tier": 1,
      "txCount": 15,
      "firstSeen": "2025-01-10T08:30:00Z",
      "lastSeen": "2025-02-20T14:22:00Z"
    }
  ]
}
```

---

#### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-02-20T12:00:00Z"
}
```

---

## TypeScript SDK

### Installation

```bash
npm install @risk-oracle/sdk ethers
```

---

### Classes

#### `RiskOracleClient`

Main client for interacting with the oracle.

**Constructor:**
```typescript
new RiskOracleClient(
  providerOrSigner: Provider | Signer,
  oracleAddress?: string
)
```

**Parameters:**
- `providerOrSigner` - Ethers.js Provider or Signer
- `oracleAddress` - Oracle contract address (defaults to Robinhood Testnet)

**Example:**
```typescript
import { RiskOracleClient } from '@risk-oracle/sdk';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://rpc.testnet.chain.robinhood.com');
const client = new RiskOracleClient(provider);
```

---

### Methods

#### `getTier(address: string): Promise<number>`

Get the tier for a wallet.

**Parameters:**
- `address` - Wallet address

**Returns:** Tier number (0-4)

**Example:**
```typescript
const tier = await client.getTier('0x1234...');
console.log(tier); // 3
```

---

#### `getTierName(address: string): Promise<string>`

Get the human-readable tier name.

**Returns:** "Unknown" | "Restricted" | "Standard" | "Trusted" | "Advanced"

**Example:**
```typescript
const name = await client.getTierName('0x1234...');
console.log(name); // "Trusted"
```

---

#### `can(address: string, actionType: ActionType): Promise<boolean>`

Check if a wallet can perform an action.

**Parameters:**
- `address` - Wallet address
- `actionType` - Action type enum (0-4)

**Returns:** `true` if allowed, `false` if blocked

**Example:**
```typescript
import { ActionType } from '@risk-oracle/sdk';

const canTrade = await client.can('0x1234...', ActionType.TRADE);
if (canTrade) {
  // Execute trade
} else {
  // Show error
}
```

---

#### `getPermissions(address: string): Promise<Permissions>`

Get all action permissions at once.

**Returns:**
```typescript
{
  basic: boolean,
  trade: boolean,
  leverage: boolean,
  govern: boolean,
  withdraw: boolean
}
```

**Example:**
```typescript
const perms = await client.getPermissions('0x1234...');
console.log(perms);
// {
//   basic: true,
//   trade: true,
//   leverage: true,
//   govern: true,
//   withdraw: true
// }
```

---

#### `getWalletInfo(address: string): Promise<WalletInfo>`

Get comprehensive wallet information.

**Returns:**
```typescript
{
  address: string,
  tier: number,
  tierName: string,
  permissions: Permissions
}
```

**Example:**
```typescript
const info = await client.getWalletInfo('0x1234...');
console.log(info);
// {
//   address: '0x1234...',
//   tier: 3,
//   tierName: 'Trusted',
//   permissions: { ... }
// }
```

---

#### `setTier(address: string, tier: number): Promise<TransactionResponse>`

**(Admin only)** Set tier for a wallet.

**Requires:** Signer with owner permissions

**Example:**
```typescript
const signer = new ethers.Wallet(privateKey, provider);
const client = new RiskOracleClient(signer);

const tx = await client.setTier('0x1234...', 3);
await tx.wait(); // Wait for confirmation
```

---

#### `setTierBatch(addresses: string[], tiers: number[]): Promise<TransactionResponse>`

**(Admin only)** Set tiers for multiple wallets in one transaction.

**Requires:** Signer with owner permissions

**Parameters:**
- `addresses` - Array of wallet addresses (max 200)
- `tiers` - Array of corresponding tiers

**Example:**
```typescript
const addresses = ['0x1111...', '0x2222...', '0x3333...'];
const tiers = [2, 3, 1];

const tx = await client.setTierBatch(addresses, tiers);
await tx.wait();
```

---

### Helper Functions

#### `createClient(rpcUrl?: string, oracleAddress?: string): RiskOracleClient`

Create a client with default RPC provider.

**Example:**
```typescript
import { createClient } from '@risk-oracle/sdk';

const client = createClient(); // Uses Robinhood Testnet by default
```

---

#### `isValidAddress(address: string): boolean`

Validate Ethereum address format.

**Example:**
```typescript
import { isValidAddress } from '@risk-oracle/sdk';

if (isValidAddress('0x1234...')) {
  // Valid
}
```

---

### Enums

#### `ActionType`

```typescript
enum ActionType {
  BASIC = 0,      // View functions, basic reads
  TRADE = 1,      // Swaps, trades
  LEVERAGE = 2,   // Margin, leverage positions
  GOVERN = 3,     // Governance proposals
  WITHDRAW = 4    // Withdrawals
}
```

---

### Constants

#### `NETWORKS`

Pre-configured network details.

```typescript
const NETWORKS = {
  robinhoodTestnet: {
    chainId: 46630,
    rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
    oracleAddress: '0x53520A628e165D195F9F0A279044533F6D02eFd6',
    explorer: 'https://explorer.testnet.chain.robinhood.com'
  }
}
```

---

#### `TIER_NAMES`

Human-readable tier names.

```typescript
const TIER_NAMES = {
  0: 'Unknown',
  1: 'Restricted',
  2: 'Standard',
  3: 'Trusted',
  4: 'Advanced'
}
```

---

## Smart Contract Interface

### Solidity ABI

```solidity
interface IRiskOracle {
    // Read functions
    function getTier(address wallet) external view returns (uint8);
    function can(address wallet, uint8 actionType) external view returns (bool);
    function owner() external view returns (address);
    
    // Action type constants
    function ACTION_BASIC() external view returns (uint8);
    function ACTION_TRADE() external view returns (uint8);
    function ACTION_LEVERAGE() external view returns (uint8);
    function ACTION_GOVERN() external view returns (uint8);
    function ACTION_WITHDRAW() external view returns (uint8);
    
    // Write functions (owner only)
    function setTier(address wallet, uint8 tier) external;
    function setTierBatch(address[] calldata wallets, uint8[] calldata tiers) external;
    function transferOwnership(address newOwner) external;
    
    // Events
    event TierUpdated(address indexed wallet, uint8 oldTier, uint8 newTier);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
}
```

---

### Read Functions

#### `getTier(address wallet) → uint8`

Get tier for a wallet.

**Gas cost:** ~5,000 gas

**Returns:** 0, 1, 2, 3, or 4

**Example:**
```solidity
uint8 tier = oracle.getTier(msg.sender);
```

---

#### `can(address wallet, uint8 actionType) → bool`

Check if wallet can perform action.

**Gas cost:** ~5,500 gas

**Parameters:**
- `wallet` - Address to check
- `actionType` - 0 (BASIC), 1 (TRADE), 2 (LEVERAGE), 3 (GOVERN), 4 (WITHDRAW)

**Returns:** `true` if allowed, `false` if blocked

**Example:**
```solidity
require(oracle.can(msg.sender, 1), "Need Tier 2+ to trade");
```

---

### Write Functions (Owner Only)

#### `setTier(address wallet, uint8 tier)`

Update tier for a single wallet.

**Requirements:**
- Caller must be contract owner
- `wallet` cannot be zero address
- `tier` must be 0-4

**Gas cost:** ~30,000 gas

**Example:**
```solidity
oracle.setTier(userAddress, 3);
```

---

#### `setTierBatch(address[] wallets, uint8[] tiers)`

Update tiers for multiple wallets (gas efficient).

**Requirements:**
- Caller must be contract owner
- Array lengths must match
- Max 200 addresses per batch
- No zero addresses
- All tiers 0-4

**Gas cost:** ~25,000 + (1,200 × N) gas  
*Where N = number of wallets*

**Example:**
```solidity
address[] memory addrs = new address[](3);
addrs[0] = 0x1111...;
addrs[1] = 0x2222...;
addrs[2] = 0x3333...;

uint8[] memory newTiers = new uint8[](3);
newTiers[0] = 2;
newTiers[1] = 3;
newTiers[2] = 1;

oracle.setTierBatch(addrs, newTiers);
```

---

### Action Type Constants

```solidity
uint8 public constant ACTION_BASIC    = 0;
uint8 public constant ACTION_TRADE    = 1;
uint8 public constant ACTION_LEVERAGE = 2;
uint8 public constant ACTION_GOVERN   = 3;
uint8 public constant ACTION_WITHDRAW = 4;
```

---

### Events

#### `TierUpdated`

Emitted when a wallet's tier changes.

```solidity
event TierUpdated(
    address indexed wallet,
    uint8 oldTier,
    uint8 newTier
);
```

**Example usage:**
```solidity
// Listen for tier changes
oracle.on("TierUpdated", (wallet, oldTier, newTier) => {
  console.log(`${wallet} changed from Tier ${oldTier} to ${newTier}`);
});
```

---

## Rate Limits

### REST API

- **100 requests per minute** per IP address
- `429 Too Many Requests` if exceeded
- Reset after 60 seconds

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1645372800
```

---

### SDK (RPC Calls)

No rate limits from Risk Oracle, but:
- Subject to your RPC provider's limits
- Recommended: Use caching for frequently queried addresses

**Caching example:**
```typescript
const cache = new Map<string, { tier: number, timestamp: number }>();

async function getCachedTier(address: string): Promise<number> {
  const cached = cache.get(address);
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour
    return cached.tier;
  }
  
  const tier = await client.getTier(address);
  cache.set(address, { tier, timestamp: Date.now() });
  return tier;
}
```

---

## Error Handling

### REST API Errors

```typescript
try {
  const response = await fetch('https://api.riskoracle.io/tier/0xinvalid');
  const data = await response.json();
  
  if (!response.ok) {
    console.error(data.error); // "Invalid Ethereum address format"
  }
} catch (error) {
  console.error('Network error:', error);
}
```

---

### SDK Errors

```typescript
try {
  const tier = await client.getTier('0xinvalid');
} catch (error) {
  if (error.code === 'INVALID_ARGUMENT') {
    console.error('Invalid address format');
  } else if (error.code === 'NETWORK_ERROR') {
    console.error('Cannot reach RPC');
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

### Contract Errors

```solidity
// These will revert with error messages:

oracle.setTier(address(0), 2);
// Error: "RiskOracle: zero address"

oracle.setTier(userAddress, 5);
// Error: "RiskOracle: tier out of range"

oracle.setTierBatch(wallets, tiers);
// Error: "RiskOracle: length mismatch" (if array sizes differ)

oracle.setTierBatch(tooManyWallets, tiers);
// Error: "RiskOracle: batch too large" (if > 200 wallets)
```

---

## Network Configuration

### Robinhood Chain Testnet

```typescript
{
  chainId: 46630,
  name: 'Robinhood Chain Testnet',
  rpc: 'https://rpc.testnet.chain.robinhood.com',
  explorer: 'https://explorer.testnet.chain.robinhood.com',
  oracle: '0x53520A628e165D195F9F0A279044533F6D02eFd6',
  faucet: 'https://faucet.testnet.chain.robinhood.com'
}
```

---

### Coming Soon

- **Arbitrum One** (Q2 2025)
- **Base** (Q2 2025)
- **Optimism** (Q3 2025)

Oracle addresses will be announced when deployed.

---

## Code Examples

### Full Integration Example (TypeScript)

```typescript
import { createClient, ActionType } from '@risk-oracle/sdk';

async function checkUserAccess(userAddress: string) {
  const client = createClient();
  
  // Get full wallet info
  const info = await client.getWalletInfo(userAddress);
  
  console.log(`User: ${info.address}`);
  console.log(`Tier: ${info.tier} (${info.tierName})`);
  
  // Check specific action
  if (info.permissions.trade) {
    console.log('✅ User can trade');
  } else {
    console.log('❌ User cannot trade (need Tier 2+)');
  }
  
  return info;
}

// Usage
checkUserAccess('0x1234567890123456789012345678901234567890');
```

---

### Full Integration Example (Solidity)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IRiskOracle {
    function can(address wallet, uint8 actionType) external view returns (bool);
}

contract MyDEX {
    IRiskOracle public immutable oracle;
    uint8 constant ACTION_TRADE = 1;
    
    constructor(address _oracle) {
        oracle = IRiskOracle(_oracle);
    }
    
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        // Gate risky action
        require(
            oracle.can(msg.sender, ACTION_TRADE),
            "Need Tier 2+ to trade"
        );
        
        // Execute swap logic
        // ...
        
        return amountOut;
    }
}
```

---

## Support

**Questions?**
- GitHub: https://github.com/chrisnwasike/risk-oracle
- Email: chrisnwasike@gmail.com

**Found a bug?**
- Open an issue: https://github.com/chrisnwasike/risk-oracle/issues

---

**See also:**
- [Integration Guide](./integration.md) - Step-by-step integration
- [Classification Rules](./classification.md) - How tiers are assigned
