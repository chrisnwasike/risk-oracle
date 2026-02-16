import { classifyAllWallets } from './classifier';
import prisma from './db';

async function main() {
  try {
    await classifyAllWallets();
    
    // Show final tier distribution
    console.log('\n📊 Tier Distribution:');
    
    for (let tier = 0; tier <= 4; tier++) {
      const count = await prisma.wallet.count({ where: { tier } });
      const tierNames = ['Unknown', 'Restricted', 'Standard', 'Trusted', 'Advanced'];
      console.log(`  Tier ${tier} (${tierNames[tier]}): ${count} wallets`);
    }
    
  } catch (error) {
    console.error('❌ Classification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
