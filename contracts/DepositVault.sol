// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IDepositVault} from "./interfaces/IDepositVault.sol";

/// @title DepositVault
/// @notice Secure custody contract for user deposit funds
/// @dev Follows Single Responsibility Principle: ONLY stores user principals
/// @dev NO business logic - only deposit/withdraw based on SavingLogic instructions
/// @custom:security-critical This contract holds ALL user funds
contract DepositVault is IDepositVault, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 private immutable _token;
    address public savingLogic;
    uint256 public totalDeposits;

    // Errors
    error OnlySavingLogic();
    error InvalidAddress();
    error InsufficientBalance();
    error InvalidAmount();

    // Modifiers
    modifier onlySavingLogic() {
        if (msg.sender != savingLogic) revert OnlySavingLogic();
        _;
    }

    /// @notice Constructor
    /// @param tokenAddress USDC token address (immutable)
    /// @param initialOwner Admin address (for emergency upgrades only)
    constructor(address tokenAddress, address initialOwner) Ownable(initialOwner) {
        require(tokenAddress != address(0), "Invalid token address");
        _token = IERC20(tokenAddress);
    }

    /// @inheritdoc IDepositVault
    function deposit(address from, uint256 amount) 
        external 
        onlySavingLogic 
        whenNotPaused 
    {
        if (from == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        // Transfer tokens from user to this vault
        _token.safeTransferFrom(from, address(this), amount);
        
        // Track total deposits
        totalDeposits += amount;

        emit Deposited(from, amount, totalDeposits);
    }

    /// @inheritdoc IDepositVault
    function withdraw(address to, uint256 amount) 
        external 
        onlySavingLogic 
        whenNotPaused 
    {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (amount > totalDeposits) revert InsufficientBalance();

        // Decrease total deposits BEFORE transfer (CEI pattern)
        totalDeposits -= amount;

        // Transfer principal back to user
        _token.safeTransfer(to, amount);

        emit Withdrawn(to, amount, totalDeposits);
    }

    // ❌ REMOVED: withdrawWithPenalty() - SavingLogic handles penalty logic
    // ❌ REMOVED: compound() - SavingLogic handles compounding logic
    // ✅ DepositVault is now a SIMPLE custody contract

    /// @inheritdoc IDepositVault
    function setSavingLogic(address newLogic) external onlyOwner {
        if (newLogic == address(0)) revert InvalidAddress();
        
        address oldLogic = savingLogic;
        savingLogic = newLogic;
        
        emit SavingLogicUpdated(oldLogic, newLogic);
    }

    /// @notice Admin pauses the vault (emergency stop)
    /// @dev Prevents all deposits and withdrawals
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Admin unpauses the vault
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @inheritdoc IDepositVault
    function token() external view returns (address) {
        return address(_token);
    }

    /// @inheritdoc IDepositVault
    function getBalance() external view returns (uint256) {
        return _token.balanceOf(address(this));
    }

    /// @notice Check if vault is paused
    function isPaused() external view returns (bool) {
        return paused();
    }
}
