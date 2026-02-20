import prisma from './db';

/**
 * DETERMINISTIC RISK CLASSIFIER
 *
 * Classifies wallets into tiers 0-4 based on behavioral patterns.
 * Rules are explicit, deterministic, and anti-gaming resistant.
 *
 * Philosophy: We measure behavioral discipline, not profitability.
 */

// Time constants (in milliseconds)
const ONE_DAY    = 24 * 60 * 60 * 1000;
const ONE_WEEK   = 7  * ONE_DAY;
const TWO_WEEKS  = 14 * ONE_DAY;
const THREE_MONTHS = 90 * ONE_DAY;

// Behavior thresholds
const FLIP_THRESHOLD     = 5;  // flip trades required to trigger restriction
const SUSPICIOUS_RATIO   = 0.3; // fraction of suspicious txs that triggers restriction
const MIN_TX_FOR_TIER_2  = 3;
const MIN_TX_FOR_TIER_3  = 10;
const MIN_TX_FOR_TIER_4  = 30;

/**
 * Classify a single wallet based on its transaction history.
 * Returns tier number (0-4).
 */
export async function classifyWallet(address: string): Promise<number> {
  const normalizedAddress = address.toLowerCase();

  const wallet = await prisma.wallet.findUnique({
    where: { address: normalizedAddress },
    include: {
      transactions: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  // Wallet not in DB → Tier 0
  if (!wallet) return 0;

  const txs = wallet.transactions;
  const txCount = txs.length;

  // RULE 1: No transactions → Tier 0 (Unknown)
  if (txCount === 0) return 0;

  const accountAge = Date.now() - wallet.firstSeen.getTime();

  // RULE 2: Bad behaviors → Tier 1 (Restricted)
  const flipCount       = txs.filter(tx => tx.isFlip).length;
  const suspiciousCount = txs.filter(tx => tx.isSuspicious).length;

  if (flipCount >= FLIP_THRESHOLD) return 1;
  if (suspiciousCount / txCount > SUSPICIOUS_RATIO) return 1;
  if (detectImpulsiveTrading(txs)) return 1;

  // RULE 3: Progressive tier unlock based on age + tx count + consistency

  if (txCount >= MIN_TX_FOR_TIER_2 && accountAge >= ONE_WEEK) {

    if (txCount >= MIN_TX_FOR_TIER_3 && accountAge >= TWO_WEEKS) {
      const consistentOverTwoWeeks = checkConsistentActivity(txs, TWO_WEEKS);

      if (consistentOverTwoWeeks) {

        if (txCount >= MIN_TX_FOR_TIER_4 && accountAge >= THREE_MONTHS) {
          // FIX: For Tier 4 require consistency over the full 3-month window
          // AND verify that activity is not concentrated in a single burst
          // (i.e. transactions must be spread across at least 4 distinct weeks).
          const consistentOverThreeMonths = checkConsistentActivity(txs, THREE_MONTHS);
          const notBursty = checkNotBursty(txs, THREE_MONTHS);

          if (consistentOverThreeMonths && notBursty) return 4;
        }

        return 3;
      }
    }

    return 2;
  }

  return 0;
}

/**
 * Detect impulsive trading: 5+ transactions within any 60-minute window.
 * Transactions must be pre-sorted ascending by timestamp.
 */
function detectImpulsiveTrading(transactions: { timestamp: Date }[]): boolean {
  if (transactions.length < 5) return false;

  for (let i = 0; i <= transactions.length - 5; i++) {
    const windowStart = transactions[i].timestamp.getTime();
    const windowEnd   = transactions[i + 4].timestamp.getTime();

    if (windowEnd - windowStart < 60 * 60 * 1000) {
      return true;
    }
  }

  return false;
}

/**
 * Check that the wallet has activity spread across a given time window.
 * "Spread" means the first and last transactions within the window are
 * at least 50% of the window apart — i.e. activity isn't entirely front-loaded.
 */
function checkConsistentActivity(
  transactions: { timestamp: Date }[],
  periodMs: number
): boolean {
  if (transactions.length < 3) return false;

  const periodStart = Date.now() - periodMs;
  const recentTxs   = transactions.filter(tx => tx.timestamp.getTime() >= periodStart);

  if (recentTxs.length < 3) return false;

  const first  = recentTxs[0].timestamp.getTime();
  const last   = recentTxs[recentTxs.length - 1].timestamp.getTime();
  const spread = last - first;

  return spread >= periodMs * 0.5;
}

/**
 * Check that activity is not bursty — requires transactions to appear
 * in at least 4 distinct calendar weeks within the period.
 * This prevents a wallet from doing 30 txs in a single week, waiting
 * 3 months, then qualifying for Tier 4.
 */
function checkNotBursty(
  transactions: { timestamp: Date }[],
  periodMs: number
): boolean {
  const periodStart = Date.now() - periodMs;
  const recentTxs   = transactions.filter(tx => tx.timestamp.getTime() >= periodStart);

  // Collect distinct ISO week keys (YYYY-Www)
  const weeks = new Set<string>();
  for (const tx of recentTxs) {
    const d   = tx.timestamp;
    // ISO week number trick: Thursday of the week determines the year/week
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / ONE_DAY) + 1;
    const weekNum = Math.ceil((dayOfYear + jan4.getDay()) / 7);
    weeks.add(`${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`);
  }

  return weeks.size >= 4;
}

/**
 * Classify all wallets in the database and persist the updated tier.
 */
export async function classifyAllWallets(): Promise<void> {
  console.log('🔍 Starting wallet classification...\n');

  const wallets = await prisma.wallet.findMany();

  for (const wallet of wallets) {
    const oldTier = wallet.tier;
    const newTier = await classifyWallet(wallet.address);

    if (oldTier !== newTier) {
      await prisma.wallet.update({
        where: { address: wallet.address },
        data:  { tier: newTier }
      });
      console.log(`✓ ${wallet.address}: Tier ${oldTier} → Tier ${newTier}`);
    } else {
      console.log(`  ${wallet.address}: Tier ${oldTier} (unchanged)`);
    }
  }

  console.log('\n✅ Classification complete!');
}

/**
 * Return a human-readable explanation of why a wallet received its tier.
 */
export async function explainTier(address: string): Promise<string> {
  const normalizedAddress = address.toLowerCase();

  const wallet = await prisma.wallet.findUnique({
    where: { address: normalizedAddress },
    include: { transactions: true }
  });

  if (!wallet) return 'Tier 0: Wallet not found';

  const tier      = await classifyWallet(address);
  const txCount   = wallet.transactions.length;
  const flipCount = wallet.transactions.filter(tx => tx.isFlip).length;
  const ageDays   = Math.floor((Date.now() - wallet.firstSeen.getTime()) / ONE_DAY);

  switch (tier) {
    case 0:
      return txCount === 0
        ? 'Tier 0: No transaction history'
        : `Tier 0: Insufficient activity or account too new (${ageDays} days old, ${txCount} txs)`;
    case 1:
      return `Tier 1: Restricted — ${flipCount} flip trade(s) or high suspicious-activity ratio detected`;
    case 2:
      return `Tier 2: ${txCount} transactions over ${ageDays} days — standard behavior`;
    case 3:
      return `Tier 3: ${txCount} transactions over ${ageDays} days — trusted consistent behavior`;
    case 4:
      return `Tier 4: ${txCount} transactions over ${ageDays} days — long-term stable history`;
    default:
      return `Tier ${tier}: Unrecognized tier`;
  }
}