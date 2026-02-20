import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates that all required environment variables are present.
 * Throws on startup if any are missing so failures are loud and immediate.
 */
export function validateEnv() {
  // FIX: PORT is not required — we fall back to 3000.
  // Keeping it in the required list made the fallback dead code and
  // forced every deployment to explicitly set PORT even when the default was fine.
  const required = ['DATABASE_URL'];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file.`
    );
  }
}

/**
 * Validates blockchain-specific environment variables.
 * Only required when running push/query scripts.
 */
export function validateBlockchainEnv() {
  const required = ['CONTRACT_ADDRESS', 'PRIVATE_KEY', 'RPC_URL'];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing blockchain environment variables: ${missing.join(', ')}\n` +
      `Required for contract interaction. Please check your .env file.`
    );
  }

  const address = process.env.CONTRACT_ADDRESS!;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error('CONTRACT_ADDRESS must be a valid Ethereum address (0x + 40 hex chars)');
  }

  const privateKey = process.env.PRIVATE_KEY!;
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    throw new Error('PRIVATE_KEY must be 0x followed by 64 hex characters');
  }
}

export const config = {
  database: {
    url: process.env.DATABASE_URL!
  },
  server: {
    // FIX: PORT is optional — default to 3000 when not set.
    port: parseInt(process.env.PORT ?? '3000', 10)
  },
  blockchain: {
    contractAddress: process.env.CONTRACT_ADDRESS,
    privateKey:      process.env.PRIVATE_KEY,
    rpcUrl:          process.env.RPC_URL
  },
  nodeEnv: process.env.NODE_ENV ?? 'development'
};