import prisma from './db';

async function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();

  // Sample wallet addresses (lowercase)
  const wallets = [
    {
      address: '0x1111111111111111111111111111111111111111',
      description: 'Brand new wallet - should be Tier 0'
    },
    {
      address: '0x2222222222222222222222222222222222222222',
      description: 'Suspicious flipper - should be Tier 1'
    },
    {
      address: '0x3333333333333333333333333333333333333333',
      description: 'Normal user - should be Tier 2'
    },
    {
      address: '0x4444444444444444444444444444444444444444',
      description: 'Stable trader - should be Tier 3'
    },
    {
      address: '0x5555555555555555555555555555555555555555',
      description: 'Long-term trusted - should be Tier 4'
    }
  ];

  // Create wallets
  for (const w of wallets) {
    const wallet = await prisma.wallet.create({
      data: {
        address: w.address,
        tier: 0, // Start all at tier 0 - classifier will update
        txCount: 0
      }
    });
    console.log(`✓ Created wallet: ${w.address} - ${w.description}`);
  }

  // Add transactions for each wallet to demonstrate different behaviors
  
  // Wallet 1: New wallet - no transactions (stays Tier 0)
  console.log('\n📝 Wallet 1: No transactions (new account)');

  // Wallet 2: Suspicious flipper - rapid buy/sell same asset
  console.log('\n📝 Wallet 2: Adding flip trading pattern...');
  const wallet2 = await prisma.wallet.findUnique({ where: { address: wallets[1].address } });
  
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  for (let i = 0; i < 10; i++) {
    const timestamp = new Date(oneHourAgo.getTime() + i * 5 * 60 * 1000); // Every 5 minutes
    await prisma.transaction.create({
      data: {
        walletId: wallet2!.id,
        txHash: `0xflip${i.toString().padStart(60, '0')}`,
        blockNumber: 1000000 + i,
        timestamp,
        action: i % 2 === 0 ? 'buy' : 'sell',
        valueUsd: 1000,
        gasUsed: 150000,
        isFlip: true,
        isSuspicious: true
      }
    });
  }

  // Wallet 3: Normal user - occasional swaps
  console.log('\n📝 Wallet 3: Adding normal trading pattern...');
  const wallet3 = await prisma.wallet.findUnique({ where: { address: wallets[2].address } });
  
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < 5; i++) {
    const timestamp = new Date(twoDaysAgo.getTime() + i * 8 * 60 * 60 * 1000); // Every 8 hours
    await prisma.transaction.create({
      data: {
        walletId: wallet3!.id,
        txHash: `0xnormal${i.toString().padStart(58, '0')}`,
        blockNumber: 1000100 + i,
        timestamp,
        action: 'swap',
        valueUsd: 500 + Math.random() * 1000,
        gasUsed: 120000,
        isFlip: false,
        isSuspicious: false
      }
    });
  }

  // Wallet 4: Stable trader - regular activity over weeks
  console.log('\n📝 Wallet 4: Adding stable trading pattern...');
  const wallet4 = await prisma.wallet.findUnique({ where: { address: wallets[3].address } });
  
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < 20; i++) {
    const timestamp = new Date(twoWeeksAgo.getTime() + i * 16 * 60 * 60 * 1000); // Every 16 hours
    await prisma.transaction.create({
      data: {
        walletId: wallet4!.id,
        txHash: `0xstable${i.toString().padStart(58, '0')}`,
        blockNumber: 1000200 + i,
        timestamp,
        action: i % 3 === 0 ? 'provide_liquidity' : 'swap',
        valueUsd: 2000 + Math.random() * 3000,
        gasUsed: 180000,
        isFlip: false,
        isSuspicious: false
      }
    });
  }

  // Wallet 5: Long-term trusted - months of consistent activity
  console.log('\n📝 Wallet 5: Adding long-term stable pattern...');
  const wallet5 = await prisma.wallet.findUnique({ where: { address: wallets[4].address } });
  
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(threeMonthsAgo.getTime() + i * 2 * 24 * 60 * 60 * 1000); // Every 2 days
    await prisma.transaction.create({
      data: {
        walletId: wallet5!.id,
        txHash: `0xlongterm${i.toString().padStart(56, '0')}`,
        blockNumber: 1000300 + i,
        timestamp,
        action: ['swap', 'provide_liquidity', 'stake'][i % 3],
        valueUsd: 5000 + Math.random() * 5000,
        gasUsed: 200000,
        isFlip: false,
        isSuspicious: false
      }
    });
  }

  // Update wallet txCounts and timestamps
  await prisma.wallet.update({
    where: { address: wallets[1].address },
    data: { 
      txCount: 10,
      firstSeen: oneHourAgo,
      lastSeen: now
    }
  });

  await prisma.wallet.update({
    where: { address: wallets[2].address },
    data: { 
      txCount: 5,
      firstSeen: twoDaysAgo,
      lastSeen: now
    }
  });

  await prisma.wallet.update({
    where: { address: wallets[3].address },
    data: { 
      txCount: 20,
      firstSeen: twoWeeksAgo,
      lastSeen: now
    }
  });

  await prisma.wallet.update({
    where: { address: wallets[4].address },
    data: { 
      txCount: 50,
      firstSeen: threeMonthsAgo,
      lastSeen: now
    }
  });

  console.log('\n✅ Database seeded successfully!');
  console.log('\nSummary:');
  console.log('- 5 wallets created');
  console.log('- 85 transactions created');
  console.log('\nWallets ready for classification.');
}

seed()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
