import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import prisma from './db';
import { classifyWallet, explainTier } from './classifier';
import { validateAddress, simpleRateLimit } from './middleware/validation';
import { validateEnv, config } from './config';

dotenv.config();

try {
  validateEnv();
} catch (error: any) {
  console.error('❌ Configuration error:', error.message);
  process.exit(1);
}

const app = express();
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Risk Oracle API', status: 'running' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

/** List all classified wallets (primarily for debugging). */
app.get('/wallets', async (_req: Request, res: Response) => {
  try {
    const wallets = await prisma.wallet.findMany({
      include: { _count: { select: { transactions: true } } }
    });

    res.json({
      count:   wallets.length,
      wallets: wallets.map(w => ({
        address:          w.address,
        tier:             w.tier,
        txCount:          w.txCount,
        transactionsInDb: w._count.transactions,
        firstSeen:        w.firstSeen,
        lastSeen:         w.lastSeen
      }))
    });
  } catch (error) {
    console.error('Error listing wallets:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

/** Get the current tier for a specific wallet address. */
app.get(
  '/tier/:address',
  simpleRateLimit(100, 60_000), // 100 requests per minute per IP
  validateAddress,
  async (req: Request, res: Response) => {
    try {
      // FIX: Express route params are always strings. The previous
      // Array.isArray guard was dead code — removed.
      const address = (req.params.address as string).toLowerCase();

      const [tier, explanation] = await Promise.all([
        classifyWallet(address),
        explainTier(address)
      ]);

      res.json({ address, tier, explanation });
    } catch (error) {
      console.error('Error querying tier:', error);
      res.status(500).json({ error: 'Failed to classify wallet' });
    }
  }
);

// ── Server startup ────────────────────────────────────────────────────────

const PORT = config.server.port;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Exiting.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));