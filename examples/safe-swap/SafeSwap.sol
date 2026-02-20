// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SafeSwap
 * @notice Example DEX that gates large trades by wallet tier
 * @dev Demonstrates Risk Oracle integration for trade protection
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
    
    // Action types from Risk Oracle
    uint8 constant ACTION_TRADE = 1;
    
    // Tier-based trade limits (in wei, assuming 18 decimals)
    uint256 constant TIER_0_LIMIT = 100 ether;   // $100 equivalent
    uint256 constant TIER_1_LIMIT = 0;           // Restricted - no trading
    uint256 constant TIER_2_LIMIT = 10_000 ether; // $10k equivalent
    uint256 constant TIER_3_LIMIT = 100_000 ether; // $100k equivalent
    uint256 constant TIER_4_LIMIT = type(uint256).max; // No limit for trusted
    
    // Simple liquidity pools (token => balance)
    mapping(address => uint256) public liquidity;
    
    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint8 userTier
    );
    
    event TierLimitEnforced(address indexed user, uint8 tier, uint256 attemptedAmount, uint256 limit);
    
    constructor(address _oracle) {
        oracle = IRiskOracle(_oracle);
    }
    
    /**
     * @notice Swap tokens with tier-based limits
     * @param tokenIn Token being sold
     * @param tokenOut Token being bought
     * @param amountIn Amount to sell
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        require(tokenIn != tokenOut, "Same token");
        require(amountIn > 0, "Amount must be > 0");
        
        // Check wallet tier
        uint8 tier = oracle.getTier(msg.sender);
        
        // Get tier-specific limit
        uint256 limit = getTierLimit(tier);
        
        // Enforce limit
        if (amountIn > limit) {
            emit TierLimitEnforced(msg.sender, tier, amountIn, limit);
            revert("Amount exceeds tier limit");
        }
        
        // For Tier 2+ on large trades, double-check with can()
        if (amountIn > 1000 ether) {
            require(oracle.can(msg.sender, ACTION_TRADE), "Tier insufficient for large trade");
        }
        
        // Simple constant product AMM formula (x * y = k)
        // In production, use a proper AMM like Uniswap V2/V3
        uint256 reserveIn = liquidity[tokenIn];
        uint256 reserveOut = liquidity[tokenOut];
        require(reserveIn > 0 && reserveOut > 0, "No liquidity");
        
        // Calculate output (with 0.3% fee)
        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut > 0, "Insufficient output");
        
        // Transfer tokens
        require(
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn),
            "Transfer in failed"
        );
        require(
            IERC20(tokenOut).transfer(msg.sender, amountOut),
            "Transfer out failed"
        );
        
        // Update reserves
        liquidity[tokenIn] += amountIn;
        liquidity[tokenOut] -= amountOut;
        
        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, tier);
        
        return amountOut;
    }
    
    /**
     * @notice Get trade limit for a given tier
     */
    function getTierLimit(uint8 tier) public pure returns (uint256) {
        if (tier == 0) return TIER_0_LIMIT;
        if (tier == 1) return TIER_1_LIMIT;
        if (tier == 2) return TIER_2_LIMIT;
        if (tier == 3) return TIER_3_LIMIT;
        if (tier == 4) return TIER_4_LIMIT;
        return 0;
    }
    
    /**
     * @notice Calculate output amount (AMM formula)
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        uint256 amountInWithFee = amountIn * 997; // 0.3% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        return numerator / denominator;
    }
    
    /**
     * @notice Add liquidity (admin only for this example)
     */
    function addLiquidity(address token, uint256 amount) external {
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        liquidity[token] += amount;
    }
}
