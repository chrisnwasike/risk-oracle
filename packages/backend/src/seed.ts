import prisma from './db';

/**
 * Seed the database with representative wallets and transactions.
 *
 * Expected tier outcomes after classification:
 *   Wallet 1 → Tier 0 (no transactions)
 *   Wallet 2 → Tier 1 (flip-trading pattern)
 *   Wallet 3 → Tier 2 (normal user, ≥3 txs, ≥7 days old, no red flags)
 *   Wallet 4 → Tier 3 (stable trader, ≥10 txs, ≥14 days, consistent spread)
 *   Wallet 5 → Tier 4 (long-term trusted, ≥30 txs, ≥90 days, not bursty)
 */
async function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();

  const wallets = [
    {
      address:     '0x1111111111111111111111111111111111111111',
      description: 'Brand new wallet — expects Tier 0'
    },
    {
      address:     '0x2222222222222222222222222222222222222222',
      description: 'Flip trader — expects Tier 1'
    },
    {
      address:     '0x3333333333333333333333333333333333333333',
      description: 'Normal user — expects Tier 2'
    },
    {
      address:     '0x4444444444444444444444444444444444444444',
      description: 'Stable trader — expects Tier 3'
    },
    {
      address:     '0x5555555555555555555555555555555555555555',
      description: 'Long-term trusted — expects Tier 4'
    }
  ];

  for (const w of wallets) {
    await prisma.wallet.create({
      data: { address: w.address, tier: 0, txCount: 0 }
    });
    console.log(`✓ Created wallet: ${w.address} — ${w.description}`);
  }

  const now = new Date();

  // ── Wallet 1: no transactions (Tier 0) ──────────────────────────────────
  console.log('\n📝 Wallet 1: No transactions (stays Tier 0)');

  // ── Wallet 2: flip trader (Tier 1) ──────────────────────────────────────
  // 10 flip trades inside a 1-hour window → triggers both impulse AND flip checks
  console.log('\n📝 Wallet 2: Adding flip-trading pattern...');
  const wallet2    = await prisma.wallet.findUnique({ where: { address: wallets[1].address } });
  const w2Start    = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

  for (let i = 0; i < 10; i++) {
    await prisma.transaction.create({
      data: {
        walletId:    wallet2!.id,
        txHash:      `0xflip${String(i).padStart(60, '0')}`,
        blockNumber: 1_000_000 + i,
        timestamp:   new Date(w2Start.getTime() + i * 5 * 60 * 1000), // every 5 min
        action:      i % 2 === 0 ? 'buy' : 'sell',
        valueUsd:    1_000,
        gasUsed:     150_000,
        isFlip:      true,
        isSuspicious: true
      }
    });
  }

  await prisma.wallet.update({
    where: { address: wallets[1].address },
    data:  { txCount: 10, firstSeen: w2Start, lastSeen: now }
  });

  // ── Wallet 3: normal user (Tier 2) ──────────────────────────────────────
  // FIX: Must be ≥7 days old for Tier 2. Previously set to 2 days, which
  // caused the wallet to be classified as Tier 0 instead of Tier 2.
  console.log('\n📝 Wallet 3: Adding normal trading pattern (≥7 days old)...');
  const wallet3 = await prisma.wallet.findUnique({ where: { address: wallets[2].address } });
  const w3Start = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days ago

  for (let i = 0; i < 5; i++) {
    await prisma.transaction.create({
      data: {
        walletId:    wallet3!.id,
        txHash:      `0xnormal${String(i).padStart(58, '0')}`,
        blockNumber: 1_000_100 + i,
        timestamp:   new Date(w3Start.getTime() + i * 32 * 60 * 60 * 1000), // every ~32 h
        action:      'swap',
        valueUsd:    500 + Math.random() * 1_000,
        gasUsed:     120_000,
        isFlip:      false,
        isSuspicious: false
      }
    });
  }

  await prisma.wallet.update({
    where: { address: wallets[2].address },
    data:  { txCount: 5, firstSeen: w3Start, lastSeen: now }
  });

  // ── Wallet 4: stable trader (Tier 3) ────────────────────────────────────
  // ≥10 txs, ≥14 days old, transactions spread across >50% of the window
  console.log('\n📝 Wallet 4: Adding stable trading pattern (≥14 days)...');
  const wallet4 = await prisma.wallet.findUnique({ where: { address: wallets[3].address } });
  const w4Start = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago

  for (let i = 0; i < 20; i++) {
    await prisma.transaction.create({
      data: {
        walletId:    wallet4!.id,
        txHash:      `0xstable${String(i).padStart(58, '0')}`,
        blockNumber: 1_000_200 + i,
        timestamp:   new Date(w4Start.getTime() + i * 16 * 60 * 60 * 1000), // every 16 h
        action:      i % 3 === 0 ? 'provide_liquidity' : 'swap',
        valueUsd:    2_000 + Math.random() * 3_000,
        gasUsed:     180_000,
        isFlip:      false,
        isSuspicious: false
      }
    });
  }

  await prisma.wallet.update({
    where: { address: wallets[3].address },
    data:  { txCount: 20, firstSeen: w4Start, lastSeen: now }
  });

  // ── Wallet 5: long-term trusted (Tier 4) ────────────────────────────────
  // ≥30 txs, ≥90 days old, activity spread across ≥4 distinct weeks
  console.log('\n📝 Wallet 5: Adding long-term stable pattern (≥90 days, not bursty)...');
  const wallet5 = await prisma.wallet.findUnique({ where: { address: wallets[4].address } });
  const w5Start = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000); // 91 days ago

  for (let i = 0; i < 50; i++) {
    await prisma.transaction.create({
      data: {
        walletId:    wallet5!.id,
        txHash:      `0xlongterm${String(i).padStart(56, '0')}`,
        blockNumber: 1_000_300 + i,
        // Space evenly ~every 44 hours so we land in many different weeks
        timestamp:   new Date(w5Start.getTime() + i * 44 * 60 * 60 * 1000),
        action:      ['swap', 'provide_liquidity', 'stake'][i % 3],
        valueUsd:    5_000 + Math.random() * 5_000,
        gasUsed:     200_000,
        isFlip:      false,
        isSuspicious: false
      }
    });
  }

  await prisma.wallet.update({
    where: { address: wallets[4].address },
    data:  { txCount: 50, firstSeen: w5Start, lastSeen: now }
  });

  console.log('\n✅ Database seeded successfully!');
  console.log('\nSummary:');
  console.log('  5 wallets created');
  console.log('  85 transactions created');
  console.log('\nExpected tiers after `npm run classify`:');
  console.log('  Wallet 1 → Tier 0 (no txs)');
  console.log('  Wallet 2 → Tier 1 (flip trading)');
  console.log('  Wallet 3 → Tier 2 (normal, 8 days old, 5 txs)');
  console.log('  Wallet 4 → Tier 3 (stable, 15 days old, 20 txs)');
  console.log('  Wallet 5 → Tier 4 (long-term, 91 days old, 50 txs)');
}

seed()
  .catch(e => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });