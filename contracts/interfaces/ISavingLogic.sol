// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Types} from "../types/Types.sol";

/// @title ISavingLogic
/// @notice Interface for the business logic contract
/// @dev Separates business logic from NFT ownership (SOLID principles)
interface ISavingLogic {
    // Events
    event PlanCreated(uint256 indexed planId, uint32 tenorSeconds, uint16 aprBps);
    event PlanUpdated(
        uint256 indexed planId,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 penaltyBps,
        bool isActive
    );
    event DepositOpened(
        uint256 indexed depositId,
        address indexed owner,
        uint256 indexed planId,
        uint256 principal,
        uint256 maturityAt,
        uint16 aprBps
    );
    event Withdrawn(
        uint256 indexed depositId,
        address indexed owner,
        uint256 principal,
        uint256 interest,
        bool isEarly
    );
    event Renewed(
        uint256 indexed oldDepositId,
        uint256 indexed newDepositId,
        uint256 indexed newPlanId,
        uint256 newPrincipal,
        bool isAuto
    );

    // Errors
    error InvalidTenor();
    error InvalidAPR();
    error InvalidPenalty();
    error PlanNotFound();
    error PlanNotActive();
    error AmountBelowMinimum();
    error AmountAboveMaximum();
    error DepositNotFound();
    error NotDepositOwner();
    error DepositNotActive();
    error NotYetMatured();
    error GracePeriodNotPassed();

    /// @notice Create a new savings plan
    function createPlan(
        uint32 tenorSeconds,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 earlyWithdrawPenaltyBps
    ) external returns (uint256 planId);

    /// @notice Update an existing plan
    function updatePlan(
        uint256 planId,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 earlyWithdrawPenaltyBps,
        bool isActive
    ) external;

    /// @notice Open a new deposit
    function openDeposit(uint256 planId, uint256 amount) external returns (uint256 depositId);

    /// @notice Withdraw at maturity (principal + interest)
    function withdrawAtMaturity(uint256 depositId) external returns (uint256 principal, uint256 interest);

    /// @notice Early withdraw (principal - penalty, no interest)
    function earlyWithdraw(uint256 depositId) external returns (uint256 principalAfterPenalty, uint256 penalty);

    /// @notice Manual renew (user chooses new plan)
    function renewDeposit(uint256 oldDepositId, uint256 newPlanId) external returns (uint256 newDepositId);

    /// @notice Auto renew (after grace period, same plan)
    function autoRenewDeposit(uint256 oldDepositId) external returns (uint256 newDepositId);

    /// @notice Get plan details
    function getPlan(uint256 planId) external view returns (Types.PlanCore memory);

    /// @notice Get deposit details
    function getDepositCore(uint256 depositId) external view returns (Types.DepositCore memory);

    /// @notice Get grace period
    function gracePeriod() external view returns (uint256);

    /// @notice Get token address
    function token() external view returns (address);

    // Note: certificate() and vaultManager() removed to avoid return type conflicts
    // with public immutable variables in implementation
}
