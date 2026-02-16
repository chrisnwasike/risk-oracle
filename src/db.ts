import { PrismaClient } from '@prisma/client';

// Create a single Prisma Client instance
// This is a singleton pattern - we only want one connection pool
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'], // Log SQL queries in development
});

// Export the client for use in other modules
export default prisma;
