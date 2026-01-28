// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IVaultManager} from "./interfaces/IVaultManager.sol";

/// @title VaultManager
contract VaultManager is IVaultManager, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 private immutable _token;
    address public feeReceiver;
    address public savingCore;
    uint256 public totalBalance;

    // Errors
    error InsufficientBalance();
    error OnlySavingCore();
    error InvalidAddress();

    // Modifiers
    modifier onlySavingCore() {
        if (msg.sender != savingCore) revert OnlySavingCore();
        _;
    }

    // Constructor
    constructor(address tokenAddress, address _feeReceiver, address initialOwner)
        Ownable(initialOwner)
    {
        require(tokenAddress != address(0), "Invalid token address");
        require(_feeReceiver != address(0), "Invalid fee receiver");
        _token = IERC20(tokenAddress);
        feeReceiver = _feeReceiver;
    }

    /// @notice Admin funds the vault with tokens for interest payouts
    function fundVault(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");

        _token.safeTransferFrom(msg.sender, address(this), amount);
        totalBalance += amount;

        emit VaultFunded(amount, totalBalance);
    }

    /// @notice Admin withdraws tokens from vault
    function withdrawVault(uint256 amount) external onlyOwner {
        if (amount > totalBalance) revert InsufficientBalance();

        totalBalance -= amount;
        _token.safeTransfer(msg.sender, amount);

        emit VaultWithdrawn(amount, totalBalance);
    }

    /// @notice Admin sets the fee receiver address for penalties
    function setFeeReceiver(address newReceiver) external onlyOwner {
        if (newReceiver == address(0)) revert InvalidAddress();
        feeReceiver = newReceiver;
        emit FeeReceiverUpdated(newReceiver);
    }

    /// @notice Admin sets the SavingCore contract address
    function setSavingCore(address _savingCore) external onlyOwner {
        if (_savingCore == address(0)) revert InvalidAddress();
        savingCore = _savingCore;
    }

    /// @notice Admin pauses the vault (blocks payouts)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Admin unpauses the vault
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Get token address
    function token() external view returns (address) {
        return address(_token);
    }

    /// @notice SavingCore calls to pay interest to user

    function payoutInterest(address to, uint256 amount)
        external
        onlySavingCore
        whenNotPaused
    {
        if (amount > totalBalance) revert InsufficientBalance();

        totalBalance -= amount;
        _token.safeTransfer(to, amount);
    }

    /// @notice SavingCore calls to distribute penalty to feeReceiver
    function distributePenalty(uint256 amount)
        external
        onlySavingCore
        whenNotPaused
    {
        _token.safeTransfer(feeReceiver, amount);
    }

    /// @notice Check if vault is paused
    function isPaused() external view returns (bool) {
        return paused();
    }
}
