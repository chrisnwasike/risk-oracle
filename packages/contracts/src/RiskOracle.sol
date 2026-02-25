// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title  RiskOracle
 * @notice Minimal read-only oracle. Stores wallet risk tiers set by off-chain classifier.
 * @dev    All intelligence lives off-chain. This contract only stores and serves tiers.
 *
 * Tier meanings:
 *   0 = Unknown    (new or unclassified wallet)
 *   1 = Restricted (suspicious behaviour detected)
 *   2 = Standard   (normal usage)
 *   3 = Trusted    (stable behaviour over time)
 *   4 = Advanced   (long-term stable history)
 *
 * Roles:
 *   owner   — may grant/revoke the updater role, and transfer ownership.
 *             Should be a multisig or timelock in production.
 *   updater — may call setTier, setTierBatch, and deleteTier.
 *             Intended for the off-chain classifier service wallet.
 *
 * Security notes:
 *   - Two-step ownership transfer (prevents bricking via typo).
 *   - Separate updater role: classifier key compromise cannot transfer ownership.
 *   - Explicit deleteTier / reset capability.
 *   - Restricted wallets (Tier 1) are denied ACTION_BASIC and all higher actions.
 *   - Batch size validated against a gas-safe ceiling.
 *   - Zero-address wallet guard on all write paths.
 *   - No ETH handling; no external calls; no reentrancy surface.
 */
contract RiskOracle {

    // ─────────────────────────────────────────
    // State
    // ─────────────────────────────────────────

    /// @notice Current owner — may manage the updater role and transfer ownership.
    address public owner;

    /// @notice Candidate for ownership; must call acceptOwnership() to complete transfer.
    address public pendingOwner;

    /// @notice Address authorised to push tier updates from the off-chain classifier.
    address public updater;

    /// @dev wallet address → tier (0–4). Unmapped addresses return 0 (Unknown).
    mapping(address => uint8) private tiers;

    // ─────────────────────────────────────────
    // Action type constants
    // ─────────────────────────────────────────

    uint8 public constant ACTION_BASIC    = 0; // Read-only / low-risk interactions
    uint8 public constant ACTION_TRADE    = 1; // Swaps and basic trades
    uint8 public constant ACTION_LEVERAGE = 2; // Margin / leveraged positions
    uint8 public constant ACTION_GOVERN   = 3; // Governance proposals / votes
    uint8 public constant ACTION_WITHDRAW = 4; // Withdrawals

    // ─────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────

    /// @dev Maximum wallets per batch. Calibrated to ~5 M gas on mainnet.
    ///      Increase for L2 deployments where gas limits are much higher.
    uint256 public constant MAX_BATCH = 200;

    uint8 private constant MAX_TIER = 4;

    // ─────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────

    event TierUpdated(address indexed wallet, uint8 oldTier, uint8 newTier);
    event TierDeleted(address indexed wallet, uint8 oldTier);

    event UpdaterChanged(address indexed oldUpdater, address indexed newUpdater);

    event OwnershipTransferProposed(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferOverwritten(address indexed displaced, address indexed replacement);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event OwnershipTransferCancelled(address indexed cancelledCandidate);

    // ─────────────────────────────────────────
    // Errors  (gas-cheaper than string reverts)
    // ─────────────────────────────────────────

    error NotOwner();
    error NotUpdater();
    error NotPendingOwner();
    error ZeroAddress();
    error TierOutOfRange(uint8 tier);
    error LengthMismatch();
    error BatchTooLarge(uint256 length);
    error NoPendingTransfer();
    error TierNotSet();
    error NoChange();

    // ─────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────

    /**
     * @param initialUpdater Address of the off-chain classifier wallet.
     *                       May be address(0) to leave updater unset at deploy time.
     */
    constructor(address initialUpdater) {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);

        if (initialUpdater != address(0)) {
            updater = initialUpdater;
            emit UpdaterChanged(address(0), initialUpdater);
        }
    }

    // ─────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    modifier onlyUpdater() {
        _onlyUpdater();
        _;
    }

    function _onlyOwner() internal view {
        if (msg.sender != owner) revert NotOwner();
    }

    function _onlyUpdater() internal view {
        if (msg.sender != updater) revert NotUpdater();
    }

    // ─────────────────────────────────────────
    // Updater role management (owner only)
    // ─────────────────────────────────────────

    /**
     * @notice Grant or rotate the updater role to a new address.
     * @dev    Pass address(0) to revoke the updater role entirely (emergency pause).
     * @param  newUpdater The address to designate as updater.
     */
    function setUpdater(address newUpdater) external onlyOwner {
        address old = updater;
        updater = newUpdater;
        emit UpdaterChanged(old, newUpdater);
    }

    // ─────────────────────────────────────────
    // Ownership — two-step transfer
    // ─────────────────────────────────────────

    /**
     * @notice Propose a new owner. The candidate must call acceptOwnership() to finalise.
     * @dev    If a pending candidate already exists they are displaced and an
     *         OwnershipTransferOverwritten event is emitted before the new proposal.
     * @param  candidate The address being proposed as the next owner.
     */
    function proposeOwner(address candidate) external onlyOwner {
        if (candidate == address(0)) revert ZeroAddress();

        address current = pendingOwner;
        if (current != address(0)) {
            // Emit a displacement event so off-chain monitors can track the change.
            emit OwnershipTransferOverwritten(current, candidate);
        }

        pendingOwner = candidate;
        emit OwnershipTransferProposed(owner, candidate);
    }

    /**
     * @notice Accept a pending ownership transfer. Must be called by the pending owner.
     */
    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address oldOwner = owner;
        owner        = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, owner);
    }

    /**
     * @notice Cancel a pending ownership transfer. Can only be called by the current owner.
     */
    function cancelOwnershipTransfer() external onlyOwner {
        if (pendingOwner == address(0)) revert NoPendingTransfer();
        address cancelled = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferCancelled(cancelled);
    }

    // ─────────────────────────────────────────
    // Write functions (updater only)
    // ─────────────────────────────────────────

    /**
     * @notice Set the tier for a single wallet.
     * @param  wallet The wallet address to update.
     * @param  tier   The new tier value (0–4).
     */
    function setTier(address wallet, uint8 tier) external onlyUpdater {
        if (wallet == address(0)) revert ZeroAddress();
        if (tier > MAX_TIER)      revert TierOutOfRange(tier);

        uint8 oldTier = tiers[wallet];
        if (oldTier == tier) revert NoChange();

        tiers[wallet] = tier;
        emit TierUpdated(wallet, oldTier, tier);
    }

    /**
     * @notice Set tiers for multiple wallets in one transaction.
     * @param  wallets  Array of wallet addresses (max MAX_BATCH).
     * @param  newTiers Array of corresponding tier values (each 0–4).
     */
    function setTierBatch(
        address[] calldata wallets,
        uint8[]   calldata newTiers
    ) external onlyUpdater {
        if (wallets.length != newTiers.length) revert LengthMismatch();
        if (wallets.length > MAX_BATCH)        revert BatchTooLarge(wallets.length);

        for (uint256 i = 0; i < wallets.length; ) {
            if (wallets[i] == address(0)) revert ZeroAddress();
            if (newTiers[i] > MAX_TIER)   revert TierOutOfRange(newTiers[i]);

            uint8 oldTier = tiers[wallets[i]];
            if (oldTier != newTiers[i]) {
                tiers[wallets[i]] = newTiers[i];
                emit TierUpdated(wallets[i], oldTier, newTiers[i]);
            }

            unchecked { ++i; } // safe: loop bounded by MAX_BATCH (≤ 200)
        }
    }

    /**
     * @notice Explicitly remove a wallet's tier entry, resetting it to 0 (Unknown).
     * @dev    Reverts if the wallet is already unset (tier == 0) to avoid spurious events.
     * @param  wallet The wallet address to clear.
     */
    function deleteTier(address wallet) external onlyUpdater {
        if (wallet == address(0)) revert ZeroAddress();

        uint8 oldTier = tiers[wallet];
        if (oldTier == 0) revert TierNotSet();

        delete tiers[wallet];
        emit TierDeleted(wallet, oldTier);
    }

    // ─────────────────────────────────────────
    // Read functions (public)
    // ─────────────────────────────────────────

    /**
     * @notice Get the tier for a single wallet.
     * @param  wallet The wallet address to query.
     * @return        The tier value (0–4). Unregistered wallets return 0 (Unknown).
     */
    function getTier(address wallet) external view returns (uint8) {
        return tiers[wallet];
    }

    /**
     * @notice Get tiers for multiple wallets in a single call.
     * @param  wallets Array of wallet addresses to query.
     * @return result  Array of tier values in the same order as input.
     */
    function getTierBatch(address[] calldata wallets)
        external
        view
        returns (uint8[] memory result)
    {
        result = new uint8[](wallets.length);
        for (uint256 i = 0; i < wallets.length; ) {
            result[i] = tiers[wallets[i]];
            unchecked { ++i; }
        }
    }

    /**
     * @notice Check whether a wallet may perform a given action.
     *
     * Minimum tier required per action type:
     *   ACTION_BASIC    (0) → Tier 2+  (Unknown and Restricted wallets are blocked)
     *   ACTION_TRADE    (1) → Tier 2+
     *   ACTION_LEVERAGE (2) → Tier 3+
     *   ACTION_GOVERN   (3) → Tier 3+
     *   ACTION_WITHDRAW (4) → Tier 2+
     *   Unknown action type → denied (fail-safe)
     *
     * @param  wallet     The wallet address to check.
     * @param  actionType One of the ACTION_* constants defined above.
     * @return            True if the wallet's tier permits the action.
     */
    function can(address wallet, uint8 actionType) external view returns (bool) {
        uint8 tier = tiers[wallet];

        if (actionType == ACTION_BASIC)    return tier >= 2;
        if (actionType == ACTION_TRADE)    return tier >= 2;
        if (actionType == ACTION_LEVERAGE) return tier >= 3;
        if (actionType == ACTION_GOVERN)   return tier >= 3;
        if (actionType == ACTION_WITHDRAW) return tier >= 2;

        // Unknown action type → deny by default (fail-safe).
        return false;
    }
}
