import dotenv from 'dotenv';
import prisma from './db';
import { getOracleReader } from './chain';
import { validateBlockchainEnv } from './config';

dotenv.config();

// Validate blockchain environment variables
try {
  validateBlockchainEnv();
} catch (error: any) {
  console.error('❌ Configuration error:', error.message);
  process.exit(1);
}

async function queryChainTiers() {
  console.log('🔎 Querying tiers from chain...\n');

  // Get all wallets from database
  const wallets = await prisma.wallet.findMany();

  // Connect to contract (read-only)
  const contract = getOracleReader();

  const tierNames = ['Unknown', 'Restricted', 'Standard', 'Trusted', 'Advanced'];

  console.log('Address                                      DB Tier   Chain Tier  Match?');
  console.log('─'.repeat(75));

  let allMatch = true;

  for (const wallet of wallets) {
    // Read tier from chain
    const chainTier = Number(await contract.getTier(wallet.address));
    const dbTier = wallet.tier;
    const match = chainTier === dbTier;

    if (!match) allMatch = false;

    const matchSymbol = match ? '✅' : '❌';
    console.log(
      `${wallet.address}   ${dbTier} (${tierNames[dbTier].padEnd(10)})  ${chainTier} (${tierNames[chainTier].padEnd(10)})  ${matchSymbol}`
    );
  }

  console.log('─'.repeat(75));

  if (allMatch) {
    console.log('\n✅ All tiers match between database and chain!');
  } else {
    console.log('\n⚠️  Some tiers do not match. Run `npm run push` to sync.');
  }

  // Also test can() for a sample wallet
  console.log('\n📋 Testing can() for each tier...\n');

  const actionNames = ['BASIC', 'TRADE', 'LEVERAGE', 'GOVERN', 'WITHDRAW'];

  for (const wallet of wallets) {
    const tier = Number(await contract.getTier(wallet.address));
    console.log(`Wallet ...${wallet.address.slice(-6)} (Tier ${tier} - ${tierNames[tier]}):`);

    for (let action = 0; action <= 4; action++) {
      const allowed = await contract.can(wallet.address, action);
      const symbol = allowed ? '✅' : '❌';
      console.log(`  ${symbol} ACTION_${actionNames[action]}`);
    }
    console.log();
  }
}

queryChainTiers()
  .catch((error) => {
    console.error('❌ Query failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });