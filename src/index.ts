import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import prisma from './db';

// Load environment variables from .env file
dotenv.config();

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

// Get port from environment or use default
const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
