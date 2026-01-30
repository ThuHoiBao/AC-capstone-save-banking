// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IDepositVault
/// @notice Interface for DepositVault contract
interface IDepositVault {
    // Events
    event Deposited(address indexed from, uint256 amount, uint256 totalDeposits);
    event Withdrawn(address indexed to, uint256 amount, uint256 totalDeposits);
    // ❌ REMOVED: WithdrawnWithPenalty event
    // ❌ REMOVED: Compounded event
    // Reason: SavingLogic handles these operations, not DepositVault
    event SavingLogicUpdated(address indexed oldLogic, address indexed newLogic);

    /// @notice Receive deposit from user (called by SavingLogic)
    /// @param from User address
    /// @param amount Amount to deposit
    function deposit(address from, uint256 amount) external;

    /// @notice Withdraw principal to user (called by SavingLogic)
    /// @dev SavingLogic handles all business logic (penalties, interest, etc.)
    /// @param to User address
    /// @param amount Amount to withdraw
    function withdraw(address to, uint256 amount) external;

    /// @notice Update SavingLogic address (emergency upgrade)
    /// @param newLogic New SavingLogic contract address
    function setSavingLogic(address newLogic) external;

    /// @notice Get token address
    /// @return Token address (USDC)
    function token() external view returns (address);

    /// @notice Get total deposits held
    /// @return Total user funds in vault
    function totalDeposits() external view returns (uint256);

    /// @notice Get current balance of vault
    /// @return Actual token balance
    function getBalance() external view returns (uint256);
}
