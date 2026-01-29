// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Types {
    /// @notice Plan struct (kept for backward compatibility, but logic will use PlanCore)
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

    /// @notice Deposit status enum
    enum DepositStatus {
        Active,
        Withdrawn,
        AutoRenewed,
        ManualRenewed
    }

    /// @notice Full deposit struct (kept for backward compatibility)
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

    // ============================================
    // NEW STRUCTS FOR SEPARATED ARCHITECTURE
    // ============================================

    /// @notice Minimal on-chain data stored in DepositCertificate.sol (~180 bytes)
    /// @dev Off-chain metadata (names, images) fetched from JSON API
    struct DepositCore {
        uint256 depositId;
        uint256 planId;
        uint256 principal;        // Amount deposited (USDC with 6 decimals)
        uint256 startAt;          // Timestamp when deposit opened
        uint256 maturityAt;       // Timestamp when deposit matures
        uint16 aprBpsAtOpen;      // APR snapshot at open (basis points)
        uint16 penaltyBpsAtOpen;  // Penalty snapshot at open (basis points)
        DepositStatus status;     // Current status
    }

    /// @notice Minimal on-chain plan rules stored in SavingLogic.sol
    /// @dev Off-chain metadata (names, descriptions, images) in JSON files
    struct PlanCore {
        uint256 planId;
        uint32 tenorSeconds;              // Duration in seconds
        uint16 aprBps;                    // Annual Percentage Rate (basis points)
        uint256 minDeposit;               // Minimum deposit amount
        uint256 maxDeposit;               // Maximum deposit amount (0 = unlimited)
        uint16 earlyWithdrawPenaltyBps;  // Early withdrawal penalty (basis points)
        bool isActive;                    // Plan enabled/disabled
        uint256 createdAt;                // Creation timestamp
    }
}
