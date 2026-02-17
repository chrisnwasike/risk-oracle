import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import prisma from './db';
import { classifyWallet, explainTier } from './classifier';
import { validateAddress, simpleRateLimit } from './middleware/validation';
import { validateEnv, config } from './config';

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
try {
  validateEnv();
} catch (error: any) {
  console.error('❌ Configuration error:', error.message);
  process.exit(1);
}

// Create Express application
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Hello world endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Risk Oracle API',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint - list all wallets
app.get('/wallets', async (req: Request, res: Response) => {
  try {
    const wallets = await prisma.wallet.findMany({
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });
    
    res.json({
      count: wallets.length,
      wallets: wallets.map(w => ({
        address: w.address,
        tier: w.tier,
        txCount: w.txCount,
        transactionsInDb: w._count.transactions,
        firstSeen: w.firstSeen,
        lastSeen: w.lastSeen
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Get tier for a specific wallet
app.get('/tier/:address', 
  simpleRateLimit(100, 60000), // 100 requests per minute
  validateAddress,
  async (req: Request, res: Response) => {
    try {
      const address = Array.isArray(req.params.address) 
        ? req.params.address[0] 
        : req.params.address;
      
      // Classify in real-time (deterministic)
      const tier = await classifyWallet(address.toLowerCase());
      const explanation = await explainTier(address);
      
      res.json({
        address,
        tier,
        explanation
      });
    } catch (error) {
      console.error('Error querying tier:', error);
      res.status(500).json({ error: 'Failed to classify wallet' });
    }
  }
);

// Get port from environment or use default
const PORT = config.server.port;

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server...');
  server.close(async () => {
    console.log('Server closed. Disconnecting from database...');
    await prisma.$disconnect();
    console.log('Database disconnected. Exiting.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received. Closing server...');
  server.close(async () => {
    console.log('Server closed. Disconnecting from database...');
    await prisma.$disconnect();
    console.log('Database disconnected. Exiting.');
    process.exit(0);
  });
});