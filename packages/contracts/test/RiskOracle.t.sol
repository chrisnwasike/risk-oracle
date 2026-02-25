// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {RiskOracle} from "../src/RiskOracle.sol";

/**
 * @title RiskOracleTest
 * @notice Tests for the updated RiskOracle contract with updater role
 */
contract RiskOracleTest is Test {

    RiskOracle public oracle;

    // Test addresses
    address public owner = address(this);
    address public updater = address(0xAAAA);
    address public newUpdater = address(0xBBBB);
    address public wallet1 = address(0x1111);
    address public wallet2 = address(0x2222);
    address public wallet3 = address(0x3333);
    address public stranger = address(0x9999);

    // Declare events for testing
    event TierUpdated(address indexed wallet, uint8 oldTier, uint8 newTier);
    event TierDeleted(address indexed wallet, uint8 oldTier);
    event UpdaterChanged(address indexed oldUpdater, address indexed newUpdater);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event OwnershipTransferProposed(address indexed currentOwner, address indexed pendingOwner);

    function setUp() public {
        oracle = new RiskOracle(updater);
    }

    // ─────────────────────────────────────────
    // Deployment tests
    // ─────────────────────────────────────────

    function test_OwnerIsDeployer() public view {
        assertEq(oracle.owner(), address(this));
    }

    function test_UpdaterIsSet() public view {
        assertEq(oracle.updater(), updater);
    }

    function test_DefaultTierIsZero() public view {
        assertEq(oracle.getTier(wallet1), 0);
        assertEq(oracle.getTier(wallet2), 0);
    }

    // ─────────────────────────────────────────
    // Updater role tests
    // ─────────────────────────────────────────

    function test_OwnerCanChangeUpdater() public {
        oracle.setUpdater(newUpdater);
        assertEq(oracle.updater(), newUpdater);
    }

    function test_RevertNonOwnerCannotChangeUpdater() public {
        vm.prank(stranger);
        vm.expectRevert(RiskOracle.NotOwner.selector);
        oracle.setUpdater(newUpdater);
    }

    function test_OwnerCanRevokeUpdater() public {
        oracle.setUpdater(address(0));
        assertEq(oracle.updater(), address(0));
    }

    // ─────────────────────────────────────────
    // setTier tests
    // ─────────────────────────────────────────

    function test_UpdaterCanSetTier() public {
        vm.prank(updater);
        oracle.setTier(wallet1, 2);
        assertEq(oracle.getTier(wallet1), 2);
    }

    function test_RevertOwnerCannotSetTier() public {
        vm.expectRevert(RiskOracle.NotUpdater.selector);
        oracle.setTier(wallet1, 2);
    }

    function test_RevertStrangerCannotSetTier() public {
        vm.prank(stranger);
        vm.expectRevert(RiskOracle.NotUpdater.selector);
        oracle.setTier(wallet1, 2);
    }

function test_SetTierAllValues() public {
    vm.startPrank(updater);

    // seed to a non-zero tier so setting 0 is a change (avoids NoChange)
    oracle.setTier(wallet1, 1);

    for (uint8 i = 0; i <= 4; i++) {
        oracle.setTier(wallet1, i);
        assertEq(oracle.getTier(wallet1), i);
    }

    vm.stopPrank();
}

    function test_SetTierEmitsEvent() public {
        vm.prank(updater);
        vm.expectEmit(true, false, false, true);
        emit TierUpdated(wallet1, 0, 3);
        oracle.setTier(wallet1, 3);
    }

    function test_RevertSetTierOutOfRange() public {
        vm.prank(updater);
        vm.expectRevert(abi.encodeWithSelector(RiskOracle.TierOutOfRange.selector, 5));
        oracle.setTier(wallet1, 5);
    }

    function test_RevertSetTierZeroAddress() public {
        vm.prank(updater);
        vm.expectRevert(RiskOracle.ZeroAddress.selector);
        oracle.setTier(address(0), 2);
    }

    function test_RevertSetTierNoChange() public {
        vm.startPrank(updater);
        oracle.setTier(wallet1, 2);
        
        vm.expectRevert(RiskOracle.NoChange.selector);
        oracle.setTier(wallet1, 2);
        vm.stopPrank();
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

        vm.prank(updater);
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

        vm.prank(updater);
        vm.expectRevert(RiskOracle.LengthMismatch.selector);
        oracle.setTierBatch(wallets, newTiers);
    }

    function test_RevertSetTierBatchNotUpdater() public {
        address[] memory wallets = new address[](1);
        wallets[0] = wallet1;

        uint8[] memory newTiers = new uint8[](1);
        newTiers[0] = 2;

        vm.prank(stranger);
        vm.expectRevert(RiskOracle.NotUpdater.selector);
        oracle.setTierBatch(wallets, newTiers);
    }

    // ─────────────────────────────────────────
    // deleteTier tests
    // ─────────────────────────────────────────

    function test_DeleteTier() public {
        vm.startPrank(updater);
        oracle.setTier(wallet1, 3);
        assertEq(oracle.getTier(wallet1), 3);
        
        oracle.deleteTier(wallet1);
        assertEq(oracle.getTier(wallet1), 0);
        vm.stopPrank();
    }

    function test_DeleteTierEmitsEvent() public {
        vm.startPrank(updater);
        oracle.setTier(wallet1, 3);
        
        vm.expectEmit(true, false, false, true);
        emit TierDeleted(wallet1, 3);
        oracle.deleteTier(wallet1);
        vm.stopPrank();
    }

    function test_RevertDeleteTierNotSet() public {
        vm.prank(updater);
        vm.expectRevert(RiskOracle.TierNotSet.selector);
        oracle.deleteTier(wallet1);
    }

    function test_RevertDeleteTierZeroAddress() public {
        vm.prank(updater);
        vm.expectRevert(RiskOracle.ZeroAddress.selector);
        oracle.deleteTier(address(0));
    }

    // ─────────────────────────────────────────
    // getTierBatch tests
    // ─────────────────────────────────────────

    function test_GetTierBatch() public {
        vm.startPrank(updater);
        oracle.setTier(wallet1, 2);
        oracle.setTier(wallet2, 3);
        oracle.setTier(wallet3, 1);
        vm.stopPrank();

        address[] memory wallets = new address[](3);
        wallets[0] = wallet1;
        wallets[1] = wallet2;
        wallets[2] = wallet3;

        uint8[] memory tiers = oracle.getTierBatch(wallets);
        
        assertEq(tiers[0], 2);
        assertEq(tiers[1], 3);
        assertEq(tiers[2], 1);
    }

    // ─────────────────────────────────────────
    // can() tests - NEW RULES
    // ─────────────────────────────────────────

    function test_CanBasicRequiresTier2() public {
        // Tier 0 cannot do basic
        assertEq(oracle.can(wallet1, oracle.ACTION_BASIC()), false);

        // Tier 1 cannot do basic
        vm.prank(updater);
        oracle.setTier(wallet1, 1);
        assertEq(oracle.can(wallet1, oracle.ACTION_BASIC()), false);

        // Tier 2 can do basic
        vm.prank(updater);
        oracle.setTier(wallet1, 2);
        assertEq(oracle.can(wallet1, oracle.ACTION_BASIC()), true);
    }

function test_CanTradeRequiresTier2() public {
    // Default tier is 0, should not allow trade
    assertEq(oracle.can(wallet1, oracle.ACTION_TRADE()), false);

    vm.startPrank(updater);

    oracle.setTier(wallet1, 1);
    assertEq(oracle.can(wallet1, oracle.ACTION_TRADE()), false);

    oracle.setTier(wallet1, 2);
    assertEq(oracle.can(wallet1, oracle.ACTION_TRADE()), true);

    oracle.setTier(wallet1, 3);
    assertEq(oracle.can(wallet1, oracle.ACTION_TRADE()), true);

    oracle.setTier(wallet1, 4);
    assertEq(oracle.can(wallet1, oracle.ACTION_TRADE()), true);

    vm.stopPrank();
}

    function test_CanLeverageRequiresTier3() public {
        vm.startPrank(updater);
        
        oracle.setTier(wallet1, 2);
        assertEq(oracle.can(wallet1, oracle.ACTION_LEVERAGE()), false);

        oracle.setTier(wallet1, 3);
        assertEq(oracle.can(wallet1, oracle.ACTION_LEVERAGE()), true);

        oracle.setTier(wallet1, 4);
        assertEq(oracle.can(wallet1, oracle.ACTION_LEVERAGE()), true);
        
        vm.stopPrank();
    }

    function test_Tier1CannotDoAnything() public {
        vm.prank(updater);
        oracle.setTier(wallet1, 1);
        
        assertEq(oracle.can(wallet1, oracle.ACTION_BASIC()), false);
        assertEq(oracle.can(wallet1, oracle.ACTION_TRADE()), false);
        assertEq(oracle.can(wallet1, oracle.ACTION_LEVERAGE()), false);
        assertEq(oracle.can(wallet1, oracle.ACTION_GOVERN()), false);
        assertEq(oracle.can(wallet1, oracle.ACTION_WITHDRAW()), false);
    }

    // ─────────────────────────────────────────
    // Ownership tests (two-step transfer)
    // ─────────────────────────────────────────

    function test_ProposeOwner() public {
        oracle.proposeOwner(stranger);
        assertEq(oracle.pendingOwner(), stranger);
    }

    function test_AcceptOwnership() public {
        oracle.proposeOwner(stranger);
        
        vm.prank(stranger);
        oracle.acceptOwnership();
        
        assertEq(oracle.owner(), stranger);
        assertEq(oracle.pendingOwner(), address(0));
    }

    function test_RevertAcceptOwnershipNotPending() public {
        oracle.proposeOwner(stranger);
        
        vm.prank(wallet1);
        vm.expectRevert(RiskOracle.NotPendingOwner.selector);
        oracle.acceptOwnership();
    }

    function test_CancelOwnershipTransfer() public {
        oracle.proposeOwner(stranger);
        oracle.cancelOwnershipTransfer();
        assertEq(oracle.pendingOwner(), address(0));
    }

    function test_RevertCancelWhenNoPending() public {
        vm.expectRevert(RiskOracle.NoPendingTransfer.selector);
        oracle.cancelOwnershipTransfer();
    }

    function test_RevertProposeOwnerZeroAddress() public {
        vm.expectRevert(RiskOracle.ZeroAddress.selector);
        oracle.proposeOwner(address(0));
    }

    function test_NewOwnerCanSetUpdater() public {
        oracle.proposeOwner(stranger);
        
        vm.prank(stranger);
        oracle.acceptOwnership();

        // Old owner can no longer set updater
        vm.expectRevert(RiskOracle.NotOwner.selector);
        oracle.setUpdater(newUpdater);

        // New owner can set updater
        vm.prank(stranger);
        oracle.setUpdater(newUpdater);
        assertEq(oracle.updater(), newUpdater);
    }
}
