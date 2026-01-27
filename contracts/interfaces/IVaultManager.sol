// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVaultManager {
    // Events
    event VaultFunded(uint256 amount, uint256 newBalance);
    event VaultWithdrawn(uint256 amount, uint256 newBalance);
    event FeeReceiverUpdated(address indexed newReceiver);

    // Admin Ops
    function fundVault(uint256 amount) external;
    function withdrawVault(uint256 amount) external;
    function setFeeReceiver(address newReceiver) external;
    function pause() external;
    function unpause() external;

    // SavingCore interactions
    function payoutInterest(address to, uint256 amount) external;
    function distributePenalty(uint256 amount) external;

    // Views
    function token() external view returns (address);
    function feeReceiver() external view returns (address);
    function isPaused() external view returns (bool);
    function totalBalance() external view returns (uint256);
}
