// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/RiskOracle.sol";

/**
 * @title RiskOracleTest
 * @notice Tests for the RiskOracle contract
 */
contract RiskOracleTest is Test {

    RiskOracle public oracle;

    // Test addresses
    address public owner = address(this);
    address public wallet1 = address(0x1111);
    address public wallet2 = address(0x2222);
    address public wallet3 = address(0x3333);
    address public stranger = address(0x9999);

    // Run before each test
    function setUp() public {
        oracle = new RiskOracle();
    }

    // ─────────────────────────────────────────
    // Deployment tests
    // ─────────────────────────────────────────

    function test_OwnerIsDeployer() public view {
        assertEq(oracle.owner(), address(this));
    }

    function test_DefaultTierIsZero() public view {
        assertEq(oracle.getTier(wallet1), 0);
        assertEq(oracle.getTier(wallet2), 0);
        assertEq(oracle.getTier(address(0xDEAD)), 0);
    }

    // ─────────────────────────────────────────
    // setTier tests
    // ─────────────────────────────────────────

    function test_SetTier() public {
        oracle.setTier(wallet1, 2);
        assertEq(oracle.getTier(wallet1), 2);
    }

    function test_SetTierAllValues() public {
        for (uint8 i = 0; i <= 4; i++) {
            oracle.setTier(wallet1, i);
            assertEq(oracle.getTier(wallet1), i);
        }
    }

    // Declare event locally so we can emit it in the test
    event TierUpdated(address indexed wallet, uint8 oldTier, uint8 newTier);

    function test_SetTierEmitsEvent() public {
        // Expect TierUpdated event with these values
        vm.expectEmit(true, false, false, true);
        emit TierUpdated(wallet1, 0, 3);

        oracle.setTier(wallet1, 3);
    }

    function test_RevertSetTierNotOwner() public {
        // Impersonate a stranger
        vm.prank(stranger);
        vm.expectRevert("RiskOracle: caller is not owner");
        oracle.setTier(wallet1, 2);
    }

    function test_RevertSetTierOutOfRange() public {
        vm.expectRevert("RiskOracle: tier out of range");
        oracle.setTier(wallet1, 5);
    }

    function test_RevertSetTierZeroAddress() public {
        vm.expectRevert("RiskOracle: zero address");
        oracle.setTier(address(0), 2);
    }

    // ─────────────────────────────────────────
    // setTierBatch tests
    // ─────────────────────────────────────────

    function test_SetTierBatch() public {
        address[] memory wallets = new address[](3);
        wallets[0] = wallet1;
        wallets[1] = wallet2;
        wallets[2] = wallet3;

        uint8[] memory newTiers = new uint8[](3);
        newTiers[0] = 1;
        newTiers[1] = 2;
        newTiers[2] = 4;

        oracle.setTierBatch(wallets, newTiers);

        assertEq(oracle.getTier(wallet1), 1);
        assertEq(oracle.getTier(wallet2), 2);
        assertEq(oracle.getTier(wallet3), 4);
    }

    function test_RevertSetTierBatchLengthMismatch() public {
        address[] memory wallets = new address[](2);
        wallets[0] = wallet1;
        wallets[1] = wallet2;

        uint8[] memory newTiers = new uint8[](3);
        newTiers[0] = 1;
        newTiers[1] = 2;
        newTiers[2] = 3;

        vm.expectRevert("RiskOracle: length mismatch");
        oracle.setTierBatch(wallets, newTiers);
    }

    function test_RevertSetTierBatchNotOwner() public {
        address[] memory wallets = new address[](1);
        wallets[0] = wallet1;

        uint8[] memory newTiers = new uint8[](1);
        newTiers[0] = 2;

        vm.prank(stranger);
        vm.expectRevert("RiskOracle: caller is not owner");
        oracle.setTierBatch(wallets, newTiers);
    }

    // ─────────────────────────────────────────
    // can() tests
    // ─────────────────────────────────────────

    function test_CanBasicAlwaysAllowed() public {
        // Even Tier 0 can do basic actions
        assertEq(oracle.can(wallet1, oracle.ACTION_BASIC()), true);
    }

    function test_CanTradeRequiresTier2() public {
        // Tier 0 cannot trade
        oracle.setTier(wallet1, 0);
        assertEq(oracle.can(wallet1, oracle.ACTION_TRADE()), false);

        // Tier 1 cannot trade
        oracle.setTier(wallet1, 1);
        assertEq(oracle.can(wallet1, oracle.ACTION_TRADE()), false);

        // Tier 2 can trade
        oracle.setTier(wallet1, 2);
        assertEq(oracle.can(wallet1, oracle.ACTION_TRADE()), true);

        // Tier 3 can trade
        oracle.setTier(wallet1, 3);
        assertEq(oracle.can(wallet1, oracle.ACTION_TRADE()), true);

        // Tier 4 can trade
        oracle.setTier(wallet1, 4);
        assertEq(oracle.can(wallet1, oracle.ACTION_TRADE()), true);
    }

    function test_CanLeverageRequiresTier3() public {
        oracle.setTier(wallet1, 2);
        assertEq(oracle.can(wallet1, oracle.ACTION_LEVERAGE()), false);

        oracle.setTier(wallet1, 3);
        assertEq(oracle.can(wallet1, oracle.ACTION_LEVERAGE()), true);

        oracle.setTier(wallet1, 4);
        assertEq(oracle.can(wallet1, oracle.ACTION_LEVERAGE()), true);
    }

    function test_CanGovernRequiresTier3() public {
        oracle.setTier(wallet1, 2);
        assertEq(oracle.can(wallet1, oracle.ACTION_GOVERN()), false);

        oracle.setTier(wallet1, 3);
        assertEq(oracle.can(wallet1, oracle.ACTION_GOVERN()), true);
    }

    function test_CanWithdrawRequiresTier2() public {
        oracle.setTier(wallet1, 1);
        assertEq(oracle.can(wallet1, oracle.ACTION_WITHDRAW()), false);

        oracle.setTier(wallet1, 2);
        assertEq(oracle.can(wallet1, oracle.ACTION_WITHDRAW()), true);
    }

    function test_CanUnknownActionDenied() public {
        // Unknown action type should be denied
        oracle.setTier(wallet1, 4);
        assertEq(oracle.can(wallet1, 99), false);
    }

    function test_Tier1CannotTrade() public {
        // Restricted wallets cannot trade even with Tier 1
        oracle.setTier(wallet1, 1);
        assertEq(oracle.can(wallet1, oracle.ACTION_TRADE()), false);
        assertEq(oracle.can(wallet1, oracle.ACTION_LEVERAGE()), false);
        assertEq(oracle.can(wallet1, oracle.ACTION_GOVERN()), false);
        assertEq(oracle.can(wallet1, oracle.ACTION_WITHDRAW()), false);
    }

    // ─────────────────────────────────────────
    // Ownership tests
    // ─────────────────────────────────────────

    function test_TransferOwnership() public {
        oracle.transferOwnership(wallet1);
        assertEq(oracle.owner(), wallet1);
    }

    function test_RevertTransferOwnershipNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert("RiskOracle: caller is not owner");
        oracle.transferOwnership(stranger);
    }

    function test_RevertTransferOwnershipZeroAddress() public {
        vm.expectRevert("RiskOracle: zero address");
        oracle.transferOwnership(address(0));
    }

    function test_NewOwnerCanSetTier() public {
        oracle.transferOwnership(wallet1);

        // Old owner can no longer set tiers
        vm.expectRevert("RiskOracle: caller is not owner");
        oracle.setTier(wallet2, 2);

        // New owner can set tiers
        vm.prank(wallet1);
        oracle.setTier(wallet2, 2);
        assertEq(oracle.getTier(wallet2), 2);
    }
}
