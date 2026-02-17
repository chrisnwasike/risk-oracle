import { PrismaClient } from '@prisma/client';

// Create a single Prisma Client instance
// This is a singleton pattern - we only want one connection pool
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Export the client for use in other modules
export default prisma;