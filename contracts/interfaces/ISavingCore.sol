// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Types} from "../types/Types.sol";

interface ISavingCore {
    // Events
    event PlanCreated(uint256 indexed planId, uint32 tenorDays, uint16 aprBps);
    event PlanUpdated(
        uint256 indexed planId,
        uint32 tenorDays,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 earlyWithdrawPenaltyBps,
        bool enabled
    );
    event DepositOpened(
        uint256 indexed depositId,
        address indexed owner,
        uint256 planId,
        uint256 principal,
        uint256 maturityAt,
        uint16 aprBpsAtOpen
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
        uint256 newPrincipal,
        uint256 newPlanId
    );

    // Admin functions
    function createPlan(
        uint32 tenorDays,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 earlyWithdrawPenaltyBps
    ) external returns (uint256 planId);

    function updatePlan(
        uint256 planId,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 earlyWithdrawPenaltyBps,
        bool enabled
    ) external;

    // User functions
    function openDeposit(uint256 planId, uint256 amount) external returns (uint256 depositId);
    function withdrawAtMaturity(uint256 depositId) external returns (uint256 principal, uint256 interest);
    function earlyWithdraw(uint256 depositId) external returns (uint256 principalAfterPenalty, uint256 penalty);
    function renewDeposit(uint256 depositId, uint256 newPlanId) external returns (uint256 newDepositId);
    function autoRenewDeposit(uint256 depositId) external returns (uint256 newDepositId);

    // Views
    function token() external view returns (address);
    function vault() external view returns (address);
    function gracePeriod() external view returns (uint256);
    function getPlan(uint256 planId) external view returns (Types.Plan memory);
    function getDeposit(uint256 depositId) external view returns (Types.Deposit memory);
}
