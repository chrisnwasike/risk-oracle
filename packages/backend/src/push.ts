import dotenv from 'dotenv';
import prisma from './db';
import { classifyWallet } from './classifier';
import { getOracleWriter } from './chain';
import { validateBlockchainEnv } from './config';

dotenv.config();

// Validate blockchain environment variables
try {
  validateBlockchainEnv();
} catch (error: any) {
  console.error('❌ Configuration error:', error.message);
  process.exit(1);
}

// Maximum wallets per batch transaction
// Contract enforces max 200, we use 50 to stay safe on gas
const BATCH_SIZE = 50;

async function pushTiersToChain() {
  console.log('🔗 Starting tier sync: Database → Chain\n');

  // Step 1: Get all wallets from database
  const wallets = await prisma.wallet.findMany();
  console.log(`📋 Found ${wallets.length} wallets to process`);

  // Step 2: Classify each wallet and collect results
  console.log('🔍 Classifying wallets...');
  
  const results: { address: string; tier: number }[] = [];

  for (const wallet of wallets) {
    const tier = await classifyWallet(wallet.address);
    results.push({ address: wallet.address, tier });

    // Also update tier in database to keep it in sync
    await prisma.wallet.update({
      where: { address: wallet.address },
      data: { tier }
    });

    console.log(`  ${wallet.address} → Tier ${tier}`);
  }

  // Step 3: Connect to contract
  console.log('\n🔌 Connecting to oracle contract...');
  const { contract, wallet: signerWallet } = getOracleWriter();

  // Show which wallet is signing
  console.log(`  Signer: ${signerWallet.address}`);
  console.log(`  Contract: ${process.env.CONTRACT_ADDRESS}`);

  // Step 4: Push in batches
  console.log('\n📤 Pushing tiers to chain...');

  // Split results into chunks of BATCH_SIZE
  const batches = chunkArray(results, BATCH_SIZE);
  console.log(`  ${results.length} wallets split into ${batches.length} batch(es)`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n  Batch ${i + 1}/${batches.length} - ${batch.length} wallets`);

    const addresses = batch.map(r => r.address);
    const tiers = batch.map(r => r.tier);

    try {
      // Send batch transaction to chain
      const tx = await contract.setTierBatch(addresses, tiers);
      console.log(`  ✓ Transaction sent: ${tx.hash}`);

      // Wait for transaction to be confirmed
      console.log('  ⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log(`  ✅ Confirmed in block ${receipt.blockNumber}`);
      console.log(`  ⛽ Gas used: ${receipt.gasUsed.toString()}`);

    } catch (error: any) {
      console.error(`  ❌ Batch ${i + 1} failed:`, error.message);
      throw error;
    }
  }

  console.log('\n✅ Sync complete!');
  console.log(`   ${results.length} tiers pushed to chain`);
}

/**
 * Split an array into chunks of a given size
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

pushTiersToChain()
  .catch((error) => {
    console.error('\n❌ Push failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });