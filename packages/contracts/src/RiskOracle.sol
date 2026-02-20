// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RiskOracle
 * @notice Minimal read-only oracle. Stores wallet risk tiers set by off-chain classifier.
 * @dev All intelligence lives off-chain. This contract only stores and serves tiers.
 *
 * Tier meanings:
 *   0 = Unknown   (new or unclassified wallet)
 *   1 = Restricted (suspicious behavior detected)
 *   2 = Standard   (normal usage)
 *   3 = Trusted    (stable behavior over time)
 *   4 = Advanced   (long-term stable history)
 */
contract RiskOracle {

    // ─────────────────────────────────────────
    // State
    // ─────────────────────────────────────────

    // Owner can push tier updates from off-chain classifier
    address public owner;

    // Wallet address → tier (0-4)
    mapping(address => uint8) private tiers;

    // ─────────────────────────────────────────
    // Action type constants
    // Protocols use these to describe what action
    // the wallet wants to perform.
    // ─────────────────────────────────────────

    uint8 public constant ACTION_BASIC    = 0; // Transfer, read-only interactions
    uint8 public constant ACTION_TRADE    = 1; // Swaps and basic trades
    uint8 public constant ACTION_LEVERAGE = 2; // Margin, leverage positions
    uint8 public constant ACTION_GOVERN   = 3; // Governance voting
    uint8 public constant ACTION_WITHDRAW = 4; // Large withdrawals

    // ─────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────

    event TierUpdated(address indexed wallet, uint8 oldTier, uint8 newTier);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ─────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "RiskOracle: caller is not owner");
        _;
    }

    // ─────────────────────────────────────────
    // Write functions (owner only)
    // ─────────────────────────────────────────

    /**
     * @notice Set the tier for a single wallet
     * @param wallet  The wallet address to update
     * @param tier    The new tier value (0-4)
     */
    function setTier(address wallet, uint8 tier) external onlyOwner {
        require(wallet != address(0), "RiskOracle: zero address");
        require(tier <= 4, "RiskOracle: tier out of range");

        uint8 oldTier = tiers[wallet];
        tiers[wallet] = tier;

        emit TierUpdated(wallet, oldTier, tier);
    }

    /**
     * @notice Set tiers for multiple wallets in one transaction (gas efficient)
     * @param wallets  Array of wallet addresses
     * @param newTiers Array of corresponding tier values
     */
    function setTierBatch(
        address[] calldata wallets,
        uint8[] calldata newTiers
    ) external onlyOwner {
        require(wallets.length == newTiers.length, "RiskOracle: length mismatch");
        require(wallets.length <= 200, "RiskOracle: batch too large");

        for (uint256 i = 0; i < wallets.length; i++) {
            require(wallets[i] != address(0), "RiskOracle: zero address");
            require(newTiers[i] <= 4, "RiskOracle: tier out of range");

            uint8 oldTier = tiers[wallets[i]];
            tiers[wallets[i]] = newTiers[i];

            emit TierUpdated(wallets[i], oldTier, newTiers[i]);
        }
    }

    /**
     * @notice Transfer ownership to a new address
     * @param newOwner The address to transfer ownership to
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "RiskOracle: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─────────────────────────────────────────
    // Read functions (public)
    // These are the integration surface for other protocols.
    // ─────────────────────────────────────────

    /**
     * @notice Get the tier for a wallet
     * @param wallet The wallet address to query
     * @return tier  The tier value (0-4). Returns 0 for unknown wallets.
     */
    function getTier(address wallet) external view returns (uint8) {
        return tiers[wallet];
    }

    /**
     * @notice Check if a wallet is allowed to perform an action
     * @param wallet     The wallet address
     * @param actionType The type of action (use ACTION_* constants)
     * @return allowed   True if the wallet's tier permits the action
     *
     * Minimum tier required per action:
     *   ACTION_BASIC    (0) → Tier 0+  (anyone)
     *   ACTION_TRADE    (1) → Tier 2+  (standard)
     *   ACTION_LEVERAGE (2) → Tier 3+  (trusted)
     *   ACTION_GOVERN   (3) → Tier 3+  (trusted)
     *   ACTION_WITHDRAW (4) → Tier 2+  (standard)
     */
    function can(address wallet, uint8 actionType) external view returns (bool) {
        uint8 tier = tiers[wallet];

        if (actionType == ACTION_BASIC)    return tier >= 0; // Always allowed
        if (actionType == ACTION_TRADE)    return tier >= 2;
        if (actionType == ACTION_LEVERAGE) return tier >= 3;
        if (actionType == ACTION_GOVERN)   return tier >= 3;
        if (actionType == ACTION_WITHDRAW) return tier >= 2;

        // Unknown action type → deny by default
        return false;
    }
}
