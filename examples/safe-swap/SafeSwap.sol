// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SafeSwap
 * @notice Example DEX that gates large trades by wallet tier.
 * @dev Demonstrates Risk Oracle integration for trade protection.
 */

interface IRiskOracle {
    function getTier(address wallet) external view returns (uint8);
    function can(address wallet, uint8 actionType) external view returns (bool);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SafeSwap {
    IRiskOracle public immutable oracle;

    // FIX: addLiquidity was marked "admin only" in comments but had no access
    // control. Added an owner role so the guard actually enforces the intent.
    address public owner;

    uint8 constant ACTION_TRADE = 1;

    // Tier-based trade limits (in wei, assuming 18-decimal token)
    uint256 constant TIER_0_LIMIT = 100 ether;           // $100 equivalent
    uint256 constant TIER_1_LIMIT = 0;                   // Restricted — no trading
    uint256 constant TIER_2_LIMIT = 10_000 ether;        // $10k equivalent
    uint256 constant TIER_3_LIMIT = 100_000 ether;       // $100k equivalent
    uint256 constant TIER_4_LIMIT = type(uint256).max;   // No limit

    // Simple single-token liquidity pools
    mapping(address => uint256) public liquidity;

    // ── Events ────────────────────────────────────────────────────────────

    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint8   userTier
    );

    event TierLimitEnforced(
        address indexed user,
        uint8   tier,
        uint256 attemptedAmount,
        uint256 limit
    );

    event LiquidityAdded(address indexed token, uint256 amount);

    // ── Modifiers ─────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "SafeSwap: caller is not owner");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────

    constructor(address _oracle) {
        oracle = IRiskOracle(_oracle);
        owner  = msg.sender;
    }

    // ── Core swap logic ───────────────────────────────────────────────────

    /**
     * @notice Swap tokenIn for tokenOut, subject to the caller's tier limit.
     * @param tokenIn  Token being sold.
     * @param tokenOut Token being bought.
     * @param amountIn Exact amount of tokenIn to sell.
     * @return amountOut Amount of tokenOut received.
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        require(tokenIn  != tokenOut, "SafeSwap: same token");
        require(amountIn  > 0,        "SafeSwap: amount must be > 0");

        uint8   tier  = oracle.getTier(msg.sender);
        uint256 limit = getTierLimit(tier);

        if (amountIn > limit) {
            emit TierLimitEnforced(msg.sender, tier, amountIn, limit);
            revert("SafeSwap: amount exceeds tier limit");
        }

        // For large trades additionally verify via can() (belt-and-suspenders)
        if (amountIn > 1_000 ether) {
            require(oracle.can(msg.sender, ACTION_TRADE), "SafeSwap: tier insufficient for large trade");
        }

        uint256 reserveIn  = liquidity[tokenIn];
        uint256 reserveOut = liquidity[tokenOut];
        require(reserveIn > 0 && reserveOut > 0, "SafeSwap: no liquidity");

        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut > 0, "SafeSwap: insufficient output amount");

        require(
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn),
            "SafeSwap: transfer in failed"
        );
        require(
            IERC20(tokenOut).transfer(msg.sender, amountOut),
            "SafeSwap: transfer out failed"
        );

        liquidity[tokenIn]  += amountIn;
        liquidity[tokenOut] -= amountOut;

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, tier);
    }

    // ── View helpers ──────────────────────────────────────────────────────

    /**
     * @notice Return the maximum trade size for a given tier.
     */
    function getTierLimit(uint8 tier) public pure returns (uint256) {
        if (tier == 0) return TIER_0_LIMIT;
        if (tier == 1) return TIER_1_LIMIT;
        if (tier == 2) return TIER_2_LIMIT;
        if (tier == 3) return TIER_3_LIMIT;
        if (tier == 4) return TIER_4_LIMIT;
        return 0; // unknown tier → deny
    }

    /**
     * @notice Constant-product AMM output formula with a 0.3% fee.
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator       = amountInWithFee * reserveOut;
        uint256 denominator     = (reserveIn * 1_000) + amountInWithFee;
        return numerator / denominator;
    }

    // ── Admin ─────────────────────────────────────────────────────────────

    /**
     * @notice Add liquidity for a token. Restricted to the contract owner.
     * @dev FIX: Previously had no access control despite the comment saying
     *      "admin only". Added onlyOwner modifier to enforce that intent.
     */
    function addLiquidity(address token, uint256 amount) external onlyOwner {
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "SafeSwap: transfer failed"
        );
        liquidity[token] += amount;
        emit LiquidityAdded(token, amount);
    }

    /**
     * @notice Transfer contract ownership.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "SafeSwap: zero address");
        owner = newOwner;
    }
}
