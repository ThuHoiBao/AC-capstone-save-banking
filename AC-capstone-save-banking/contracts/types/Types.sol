// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Types {
    struct Plan {
        uint256 planId;
        uint32 tenorDays;
        uint16 aprBps;
        uint256 minDeposit;
        uint256 maxDeposit;
        uint16 earlyWithdrawPenaltyBps;
        bool enabled;
        uint256 createdAt;
    }

    enum DepositStatus {
        Active,
        Withdrawn,
        AutoRenewed,
        ManualRenewed
    }

    struct Deposit {
        uint256 depositId;
        address owner;
        uint256 planId;
        uint256 principal;
        uint256 startAt;
        uint256 maturityAt;
        DepositStatus status;
        uint16 aprBpsAtOpen;
        uint16 penaltyBpsAtOpen;
    }
}
