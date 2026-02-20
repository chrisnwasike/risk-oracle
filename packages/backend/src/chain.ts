import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Load ABI from file
const abiPath = path.join(__dirname, 'abi', 'RiskOracle.json');
const ORACLE_ABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

/**
 * Creates a read-only connection to the oracle contract.
 * Use this for querying tiers (no private key needed).
 */
export function getOracleReader() {
  const rpcUrl = process.env.RPC_URL;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!rpcUrl) throw new Error('RPC_URL not set in .env');
  if (!contractAddress) throw new Error('CONTRACT_ADDRESS not set in .env');

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, ORACLE_ABI, provider);

  return contract;
}

/**
 * Creates a write-enabled connection to the oracle contract.
 * Use this for pushing tier updates (requires private key).
 */
export function getOracleWriter() {
  const rpcUrl = process.env.RPC_URL;
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl) throw new Error('RPC_URL not set in .env');
  if (!contractAddress) throw new Error('CONTRACT_ADDRESS not set in .env');
  if (!privateKey) throw new Error('PRIVATE_KEY not set in .env');

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Wallet signs transactions with the private key
  const wallet = new ethers.Wallet(privateKey, provider);

  // Contract connected to wallet can send transactions
  const contract = new ethers.Contract(contractAddress, ORACLE_ABI, wallet);

  return { contract, wallet, provider };
}
