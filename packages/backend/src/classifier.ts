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
const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;
const TWO_WEEKS = 14 * ONE_DAY;
const ONE_MONTH = 30 * ONE_DAY;
const THREE_MONTHS = 90 * ONE_DAY;

// Behavior thresholds
const FLIP_THRESHOLD = 5; // Number of flip trades to trigger restriction
const MIN_TX_FOR_TIER_2 = 3; // Minimum transactions for standard tier
const MIN_TX_FOR_TIER_3 = 10; // Minimum transactions for trusted tier
const MIN_TX_FOR_TIER_4 = 30; // Minimum transactions for advanced tier

/**
 * Classify a single wallet based on its transaction history
 * Returns tier number (0-4)
 */
export async function classifyWallet(address: string): Promise<number> {
  // Normalize address to lowercase
  const normalizedAddress = address.toLowerCase();

  // Fetch wallet with all transactions
  const wallet = await prisma.wallet.findUnique({
    where: { address: normalizedAddress },
    include: {
      transactions: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  // Wallet doesn't exist → Tier 0
  if (!wallet) {
    return 0;
  }

  const txCount = wallet.transactions.length;
  const now = new Date();
  const accountAge = now.getTime() - wallet.firstSeen.getTime();

  // RULE 1: No transactions → Tier 0 (Unknown)
  if (txCount === 0) {
    return 0;
  }

  // RULE 2: Check for bad behaviors → Tier 1 (Restricted)
  const flipCount = wallet.transactions.filter(tx => tx.isFlip).length;
  const suspiciousCount = wallet.transactions.filter(tx => tx.isSuspicious).length;

  // Too many flips → cap at Tier 1
  if (flipCount >= FLIP_THRESHOLD) {
    return 1;
  }

  // High ratio of suspicious activity → cap at Tier 1
  if (txCount > 0 && suspiciousCount / txCount > 0.3) {
    return 1;
  }

  // RULE 3: Check for rapid trading (impulse behavior)
  const hasImpulsiveTrading = detectImpulsiveTrading(wallet.transactions);
  if (hasImpulsiveTrading) {
    return 1;
  }

  // RULE 4: Age + Transaction maturity unlock higher tiers
  
  // Tier 2 (Standard): Some activity, no red flags
  if (txCount >= MIN_TX_FOR_TIER_2 && accountAge >= ONE_WEEK) {
    
    // Tier 3 (Trusted): Consistent activity over weeks
    if (txCount >= MIN_TX_FOR_TIER_3 && accountAge >= TWO_WEEKS) {
      const hasConsistentActivity = checkConsistentActivity(wallet.transactions, TWO_WEEKS);
      
      if (hasConsistentActivity) {
        
        // Tier 4 (Advanced): Long-term stable history
        if (txCount >= MIN_TX_FOR_TIER_4 && accountAge >= THREE_MONTHS) {
          const hasLongTermStability = checkConsistentActivity(wallet.transactions, THREE_MONTHS);
          
          if (hasLongTermStability) {
            return 4;
          }
        }
        
        return 3;
      }
    }
    
    return 2;
  }

  // Default: Not enough activity → Tier 0
  return 0;
}

/**
 * Detect impulsive trading patterns
 * Looks for multiple transactions in short time windows
 */
function detectImpulsiveTrading(transactions: any[]): boolean {
  if (transactions.length < 5) return false;

  // Check for 5+ transactions within 1 hour
  for (let i = 0; i < transactions.length - 4; i++) {
    const windowStart = transactions[i].timestamp.getTime();
    const windowEnd = transactions[i + 4].timestamp.getTime();
    const duration = windowEnd - windowStart;

    if (duration < 60 * 60 * 1000) { // 1 hour
      return true; // Impulsive behavior detected
    }
  }

  return false;
}

/**
 * Check if wallet has consistent activity over a time period
 * Consistency = transactions spread across the time period, not clustered
 */
function checkConsistentActivity(transactions: any[], periodMs: number): boolean {
  if (transactions.length < 3) return false;

  const now = new Date().getTime();
  const periodStart = now - periodMs;

  // Filter transactions within the period
  const recentTx = transactions.filter(tx => tx.timestamp.getTime() >= periodStart);

  if (recentTx.length < 3) return false;

  // Check if transactions are spread out (not all clustered in one day)
  const firstTx = recentTx[0].timestamp.getTime();
  const lastTx = recentTx[recentTx.length - 1].timestamp.getTime();
  const spread = lastTx - firstTx;

  // Transactions should span at least 50% of the period
  return spread >= periodMs * 0.5;
}

/**
 * Classify all wallets in database
 * Updates tier field for each wallet
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
        data: { tier: newTier }
      });

      console.log(`✓ ${wallet.address}: Tier ${oldTier} → Tier ${newTier}`);
    } else {
      console.log(`  ${wallet.address}: Tier ${oldTier} (unchanged)`);
    }
  }

  console.log('\n✅ Classification complete!');
}

/**
 * Get tier explanation for debugging
 */
export async function explainTier(address: string): Promise<string> {
  const normalizedAddress = address.toLowerCase();
  
  const wallet = await prisma.wallet.findUnique({
    where: { address: normalizedAddress },
    include: {
      transactions: true
    }
  });

  if (!wallet) {
    return 'Tier 0: Wallet not found';
  }

  const tier = await classifyWallet(address);
  const txCount = wallet.transactions.length;
  const flipCount = wallet.transactions.filter(tx => tx.isFlip).length;
  const accountAge = new Date().getTime() - wallet.firstSeen.getTime();
  const ageDays = Math.floor(accountAge / ONE_DAY);

  let explanation = `Tier ${tier}: `;

  if (tier === 0) {
    explanation += txCount === 0 
      ? 'No transaction history' 
      : 'Insufficient activity or too new';
  } else if (tier === 1) {
    explanation += `Restricted due to ${flipCount} flip trades or suspicious patterns`;
  } else if (tier === 2) {
    explanation += `${txCount} transactions over ${ageDays} days - standard behavior`;
  } else if (tier === 3) {
    explanation += `${txCount} transactions over ${ageDays} days - trusted consistent behavior`;
  } else if (tier === 4) {
    explanation += `${txCount} transactions over ${ageDays} days - long-term stable history`;
  }

  return explanation;
}
