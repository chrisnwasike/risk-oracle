import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates that all required environment variables are present
 * Throws error on startup if any are missing
 */
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'PORT',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file.`
    );
  }
}

/**
 * Validates blockchain-specific environment variables
 * Only required when running push/query scripts
 */
export function validateBlockchainEnv() {
  const required = [
    'CONTRACT_ADDRESS',
    'PRIVATE_KEY',
    'RPC_URL',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing blockchain environment variables: ${missing.join(', ')}\n` +
      `Required for contract interaction. Please check your .env file.`
    );
  }

  // Validate CONTRACT_ADDRESS format
  const address = process.env.CONTRACT_ADDRESS;
  if (address && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error('CONTRACT_ADDRESS must be a valid Ethereum address (0x + 40 hex chars)');
  }

  // Validate PRIVATE_KEY format
  const privateKey = process.env.PRIVATE_KEY;
  if (privateKey && !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    throw new Error('PRIVATE_KEY must be 0x followed by 64 hex characters');
  }
}

export const config = {
  database: {
    url: process.env.DATABASE_URL!,
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  blockchain: {
    contractAddress: process.env.CONTRACT_ADDRESS,
    privateKey: process.env.PRIVATE_KEY,
    rpcUrl: process.env.RPC_URL,
  },
  nodeEnv: process.env.NODE_ENV || 'development',
};
