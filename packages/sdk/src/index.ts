import { ethers, Contract, Provider, Signer } from 'ethers';

// Oracle ABI (minimal interface)
const RISK_ORACLE_ABI = [
  'function getTier(address wallet) external view returns (uint8)',
  'function can(address wallet, uint8 actionType) external view returns (bool)',
  'function setTier(address wallet, uint8 tier) external',
  'function setTierBatch(address[] calldata wallets, uint8[] calldata tiers) external'
];

// Action type constants
export enum ActionType {
  BASIC = 0,
  TRADE = 1,
  LEVERAGE = 2,
  GOVERN = 3,
  WITHDRAW = 4
}

// Tier names for display
export const TIER_NAMES: Record<number, string> = {
  0: 'Unknown',
  1: 'Restricted',
  2: 'Standard',
  3: 'Trusted',
  4: 'Advanced'
};

// Network configurations
export const NETWORKS = {
  robinhoodTestnet: {
    chainId: 46630,
    rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
    oracleAddress: '0x53520A628e165D195F9F0A279044533F6D02eFd6',
    explorer: 'https://explorer.testnet.chain.robinhood.com'
  }
};

/**
 * RiskOracle SDK Client
 */
export class RiskOracleClient {
  private contract: Contract;
  private provider: Provider;
  private signer?: Signer;

  /**
   * Create a RiskOracleClient instance
   * @param providerOrSigner - Ethers provider or signer
   * @param oracleAddress - Oracle contract address (defaults to Robinhood testnet)
   */
  constructor(
    providerOrSigner: Provider | Signer,
    oracleAddress: string = NETWORKS.robinhoodTestnet.oracleAddress
  ) {
    if ('provider' in providerOrSigner && providerOrSigner.provider) {
      // It's a signer
      this.signer = providerOrSigner as Signer;
      this.provider = providerOrSigner.provider!;
      this.contract = new Contract(oracleAddress, RISK_ORACLE_ABI, this.signer);
    } else {
      // It's a provider
      this.provider = providerOrSigner as Provider;
      this.contract = new Contract(oracleAddress, RISK_ORACLE_ABI, this.provider);
    }
  }

  /**
   * Get the tier for a wallet address
   * @param address - Wallet address to check
   * @returns Tier number (0-4)
   */
  async getTier(address: string): Promise<number> {
    const tier = await this.contract.getTier(address);
    return Number(tier);
  }

  /**
   * Get the tier name for a wallet
   * @param address - Wallet address to check
   * @returns Tier name (e.g., "Trusted")
   */
  async getTierName(address: string): Promise<string> {
    const tier = await this.getTier(address);
    return TIER_NAMES[tier] || 'Unknown';
  }

  /**
   * Check if a wallet can perform an action
   * @param address - Wallet address to check
   * @param actionType - Type of action (use ActionType enum)
   * @returns True if allowed, false otherwise
   */
  async can(address: string, actionType: ActionType): Promise<boolean> {
    return await this.contract.can(address, actionType);
  }

  /**
   * Check multiple actions at once
   * @param address - Wallet address to check
   * @returns Object with all action permissions
   */
  async getPermissions(address: string): Promise<Record<string, boolean>> {
    const [canBasic, canTrade, canLeverage, canGovern, canWithdraw] = await Promise.all([
      this.can(address, ActionType.BASIC),
      this.can(address, ActionType.TRADE),
      this.can(address, ActionType.LEVERAGE),
      this.can(address, ActionType.GOVERN),
      this.can(address, ActionType.WITHDRAW)
    ]);

    return {
      basic: canBasic,
      trade: canTrade,
      leverage: canLeverage,
      govern: canGovern,
      withdraw: canWithdraw
    };
  }

  /**
   * Get full wallet info (tier + permissions)
   * @param address - Wallet address to check
   */
  async getWalletInfo(address: string) {
    const [tier, permissions] = await Promise.all([
      this.getTier(address),
      this.getPermissions(address)
    ]);

    return {
      address,
      tier,
      tierName: TIER_NAMES[tier],
      permissions
    };
  }

  /**
   * Set tier for a wallet (requires signer with owner permissions)
   * @param address - Wallet address
   * @param tier - New tier (0-4)
   */
  async setTier(address: string, tier: number): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for setTier operation');
    }
    if (tier < 0 || tier > 4) {
      throw new Error('Tier must be between 0 and 4');
    }
    return await this.contract.setTier(address, tier);
  }

  /**
   * Set tiers for multiple wallets in one transaction
   * @param wallets - Array of wallet addresses
   * @param tiers - Array of corresponding tiers
   */
  async setTierBatch(
    wallets: string[],
    tiers: number[]
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for setTierBatch operation');
    }
    if (wallets.length !== tiers.length) {
      throw new Error('Wallets and tiers arrays must have same length');
    }
    if (wallets.length > 200) {
      throw new Error('Batch size limited to 200 wallets');
    }
    return await this.contract.setTierBatch(wallets, tiers);
  }
}

/**
 * Helper function to create a client with a JSON-RPC provider
 * @param rpcUrl - RPC endpoint URL
 * @param oracleAddress - Oracle contract address
 */
export function createClient(
  rpcUrl: string = NETWORKS.robinhoodTestnet.rpcUrl,
  oracleAddress?: string
): RiskOracleClient {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new RiskOracleClient(provider, oracleAddress);
}

/**
 * Helper to check if an address is valid
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Export everything
export default RiskOracleClient;