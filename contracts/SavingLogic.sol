// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Types} from "./types/Types.sol";
import {ISavingLogic} from "./interfaces/ISavingLogic.sol";
import {IDepositCertificate} from "./interfaces/IDepositCertificate.sol";
import {IVaultManager} from "./interfaces/IVaultManager.sol";
import {IDepositVault} from "./interfaces/IDepositVault.sol";
import {InterestMath} from "./libs/InterestMath.sol";

/// @title SavingLogic
/// @notice Business logic for term deposits - NO TOKEN STORAGE
/// @dev Follows Single Responsibility Principle: ONLY handles business logic
/// @dev Uses dependency injection for Certificate, DepositVault, and VaultManager
/// @custom:security User funds stored in DepositVault, NOT in this contract
contract SavingLogic is ISavingLogic, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 private immutable _token;
    IDepositCertificate public immutable certificate;
    IDepositVault public immutable depositVault;
    IVaultManager public vaultManager;
    
    uint256 public gracePeriod = 3 days;
    uint256 private _nextPlanId = 1;
    uint256 private _nextDepositId = 1;

    /// @dev On-chain plan rules (off-chain metadata in JSON files)
    mapping(uint256 => Types.PlanCore) public plans;

    /// @notice Constructor with dependency injection
    /// @param tokenAddress USDC token address
    /// @param certificateAddress DepositCertificate contract address
    /// @param depositVaultAddress DepositVault contract address (holds user funds)
    /// @param vaultManagerAddress VaultManager contract address (holds interest funds)
    /// @param initialOwner Admin address
    constructor(
        address tokenAddress,
        address certificateAddress,
        address depositVaultAddress,
        address vaultManagerAddress,
        address initialOwner
    ) Ownable(initialOwner) {
        require(tokenAddress != address(0), "Invalid token");
        require(certificateAddress != address(0), "Invalid certificate");
        require(depositVaultAddress != address(0), "Invalid deposit vault");
        require(vaultManagerAddress != address(0), "Invalid vault manager");
        
        _token = IERC20(tokenAddress);
        certificate = IDepositCertificate(certificateAddress);
        depositVault = IDepositVault(depositVaultAddress);
        vaultManager = IVaultManager(vaultManagerAddress);
    }

    /// @inheritdoc ISavingLogic
    function createPlan(
        uint32 tenorSeconds,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 earlyWithdrawPenaltyBps
    ) external onlyOwner returns (uint256 planId) {
        if (tenorSeconds == 0) revert InvalidTenor();
        if (aprBps == 0 || aprBps >= 10000) revert InvalidAPR(); // 0.01% - 99.99%
        if (earlyWithdrawPenaltyBps >= 10000) revert InvalidPenalty(); // Max 99.99%

        planId = _nextPlanId++;

        plans[planId] = Types.PlanCore({
            planId: planId,
            tenorSeconds: tenorSeconds,
            aprBps: aprBps,
            minDeposit: minDeposit,
            maxDeposit: maxDeposit,
            earlyWithdrawPenaltyBps: earlyWithdrawPenaltyBps,
            isActive: true,
            createdAt: block.timestamp
        });

        emit PlanCreated(planId, tenorSeconds, aprBps);
    }

    /// @inheritdoc ISavingLogic
    function updatePlan(
        uint256 planId,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 earlyWithdrawPenaltyBps,
        bool isActive
    ) external onlyOwner {
        Types.PlanCore storage plan = plans[planId];
        if (plan.planId == 0) revert PlanNotFound();
        if (aprBps == 0 || aprBps >= 10000) revert InvalidAPR();
        if (earlyWithdrawPenaltyBps >= 10000) revert InvalidPenalty();

        plan.aprBps = aprBps;
        plan.minDeposit = minDeposit;
        plan.maxDeposit = maxDeposit;
        plan.earlyWithdrawPenaltyBps = earlyWithdrawPenaltyBps;
        plan.isActive = isActive;

        emit PlanUpdated(planId, aprBps, minDeposit, maxDeposit, earlyWithdrawPenaltyBps, isActive);
    }

    /// @inheritdoc ISavingLogic
    function openDeposit(uint256 planId, uint256 amount)
        external
        nonReentrant
        returns (uint256 depositId)
    {
        Types.PlanCore memory plan = plans[planId];
        if (plan.planId == 0) revert PlanNotFound();
        if (!plan.isActive) revert PlanNotActive();
        if (plan.minDeposit > 0 && amount < plan.minDeposit) {
            revert AmountBelowMinimum();
        }
        if (plan.maxDeposit > 0 && amount > plan.maxDeposit) {
            revert AmountAboveMaximum();
        }

        depositId = _nextDepositId++;
        uint256 maturityAt = block.timestamp + uint256(plan.tenorSeconds);

        // Create deposit core data
        Types.DepositCore memory depositCore = Types.DepositCore({
            depositId: depositId,
            planId: planId,
            principal: amount,
            startAt: block.timestamp,
            maturityAt: maturityAt,
            aprBpsAtOpen: plan.aprBps,
            penaltyBpsAtOpen: plan.earlyWithdrawPenaltyBps,
            status: Types.DepositStatus.Active
        });

        // Transfer tokens from user to DepositVault (NOT to this contract)
        depositVault.deposit(msg.sender, amount);

        // Mint NFT certificate (delegate to Certificate contract)
        certificate.mint(msg.sender, depositId, depositCore);

        emit DepositOpened(depositId, msg.sender, planId, amount, maturityAt, plan.aprBps);
    }

    /// @inheritdoc ISavingLogic
    function withdrawAtMaturity(uint256 depositId)
        external
        nonReentrant
        returns (uint256 principal, uint256 interest)
    {
        // Get deposit data from Certificate contract
        Types.DepositCore memory depositCore = certificate.getDepositCore(depositId);
        
        address owner = _getOwner(depositId);
        if (owner != msg.sender) revert NotDepositOwner();
        if (depositCore.status != Types.DepositStatus.Active) revert DepositNotActive();
        if (block.timestamp < depositCore.maturityAt) revert NotYetMatured();

        principal = depositCore.principal;
        
        // Calculate interest using snapshot APR
        uint256 tenorSeconds = depositCore.maturityAt - depositCore.startAt;
        interest = InterestMath.simpleInterest(
            principal,
            depositCore.aprBpsAtOpen,
            tenorSeconds
        );

        // Update status in Certificate contract
        certificate.updateStatus(depositId, Types.DepositStatus.Withdrawn);

        // Get interest from VaultManager
        vaultManager.payoutInterest(msg.sender, interest);

        // Get principal from DepositVault
        depositVault.withdraw(msg.sender, principal);

        emit Withdrawn(depositId, msg.sender, principal, interest, false);
    }

    /// @inheritdoc ISavingLogic
    function earlyWithdraw(uint256 depositId)
        external
        nonReentrant
        returns (uint256 principalAfterPenalty, uint256 penalty)
    {
        // Get deposit data from Certificate contract
        Types.DepositCore memory depositCore = certificate.getDepositCore(depositId);
        
        address owner = _getOwner(depositId);
        if (owner != msg.sender) revert NotDepositOwner();
        if (depositCore.status != Types.DepositStatus.Active) revert DepositNotActive();

        uint256 principal = depositCore.principal;
        
        // Calculate penalty using snapshot penalty rate
        penalty = (principal * uint256(depositCore.penaltyBpsAtOpen)) / 10_000;
        principalAfterPenalty = principal - penalty;

        // Update status in Certificate contract
        certificate.updateStatus(depositId, Types.DepositStatus.Withdrawn);

        // Withdraw full principal from DepositVault
        depositVault.withdraw(address(this), principal);
        
        // Transfer penalty to VaultManager
        _token.safeTransfer(address(vaultManager), penalty);
        vaultManager.distributePenalty(penalty);
        
        // Transfer remaining to user
        _token.safeTransfer(msg.sender, principalAfterPenalty);

        emit Withdrawn(depositId, msg.sender, principal, 0, true);
    }

    /// @inheritdoc ISavingLogic
    function renewDeposit(uint256 oldDepositId, uint256 newPlanId)
        external
        nonReentrant
        returns (uint256 newDepositId)
    {
        // Get old deposit data
        Types.DepositCore memory oldDeposit = certificate.getDepositCore(oldDepositId);
        
        address owner = _getOwner(oldDepositId);
        if (owner != msg.sender) revert NotDepositOwner();
        if (oldDeposit.status != Types.DepositStatus.Active) revert DepositNotActive();
        if (block.timestamp < oldDeposit.maturityAt) revert NotYetMatured();

        // Get new plan
        Types.PlanCore memory newPlan = plans[newPlanId];
        if (newPlan.planId == 0) revert PlanNotFound();
        if (!newPlan.isActive) revert PlanNotActive();

        // Calculate compound principal (principal + interest)
        uint256 oldTenorSeconds = oldDeposit.maturityAt - oldDeposit.startAt;
        uint256 interest = InterestMath.simpleInterest(
            oldDeposit.principal,
            oldDeposit.aprBpsAtOpen,
            oldTenorSeconds
        );
        uint256 newPrincipal = oldDeposit.principal + interest;

        // Validate new principal against new plan limits
        if (newPlan.minDeposit > 0 && newPrincipal < newPlan.minDeposit) {
            revert AmountBelowMinimum();
        }
        if (newPlan.maxDeposit > 0 && newPrincipal > newPlan.maxDeposit) {
            revert AmountAboveMaximum();
        }

        // Update old deposit status
        certificate.updateStatus(oldDepositId, Types.DepositStatus.ManualRenewed);

        // Get interest from VaultManager (sent directly to DepositVault)
        vaultManager.payoutInterest(address(depositVault), interest);
        
        // New principal = old principal (still in vault) + interest (just added)
        newPrincipal = oldDeposit.principal + interest;

        // Create new deposit
        newDepositId = _nextDepositId++;
        uint256 newMaturityAt = block.timestamp + uint256(newPlan.tenorSeconds);

        Types.DepositCore memory newDepositCore = Types.DepositCore({
            depositId: newDepositId,
            planId: newPlanId,
            principal: newPrincipal,  // Already compounded by DepositVault
            startAt: block.timestamp,
            maturityAt: newMaturityAt,
            aprBpsAtOpen: newPlan.aprBps,
            penaltyBpsAtOpen: newPlan.earlyWithdrawPenaltyBps,
            status: Types.DepositStatus.Active
        });

        // Mint new NFT certificate
        certificate.mint(msg.sender, newDepositId, newDepositCore);

        emit Renewed(oldDepositId, newDepositId, newPlanId, newPrincipal, false);
    }

    /// @inheritdoc ISavingLogic
    function autoRenewDeposit(uint256 oldDepositId)
        external
        nonReentrant
        returns (uint256 newDepositId)
    {
        // Get old deposit data
        Types.DepositCore memory oldDeposit = certificate.getDepositCore(oldDepositId);
        
        address owner = _getOwner(oldDepositId);
        if (owner != msg.sender) revert NotDepositOwner();
        if (oldDeposit.status != Types.DepositStatus.Active) revert DepositNotActive();
        
        // Must wait grace period after maturity
        if (block.timestamp < oldDeposit.maturityAt + gracePeriod) {
            revert GracePeriodNotPassed();
        }

        // Get same plan
        Types.PlanCore memory plan = plans[oldDeposit.planId];
        if (plan.planId == 0) revert PlanNotFound();
        if (!plan.isActive) revert PlanNotActive();

        // Calculate compound principal (use ORIGINAL APR snapshot)
        uint256 tenorSeconds = oldDeposit.maturityAt - oldDeposit.startAt;
        uint256 interest = InterestMath.simpleInterest(
            oldDeposit.principal,
            oldDeposit.aprBpsAtOpen, // Use original APR
            tenorSeconds
        );
        uint256 newPrincipal = oldDeposit.principal + interest;

        // Validate new principal
        if (plan.minDeposit > 0 && newPrincipal < plan.minDeposit) {
            revert AmountBelowMinimum();
        }
        if (plan.maxDeposit > 0 && newPrincipal > plan.maxDeposit) {
            revert AmountAboveMaximum();
        }

        // Update old deposit status
        certificate.updateStatus(oldDepositId, Types.DepositStatus.AutoRenewed);

        // Get interest from VaultManager
        vaultManager.payoutInterest(address(this), interest);
        
        // Transfer interest to DepositVault (compound with existing principal)
        _token.safeTransfer(address(depositVault), interest);
        
        // Calculate new principal
        newPrincipal = oldDeposit.principal + interest;

        // Create new deposit (same plan, but new current APR)
        newDepositId = _nextDepositId++;
        uint256 newMaturityAt = block.timestamp + uint256(plan.tenorSeconds);

        Types.DepositCore memory newDepositCore = Types.DepositCore({
            depositId: newDepositId,
            planId: oldDeposit.planId,
            principal: newPrincipal,  // Already compounded by DepositVault
            startAt: block.timestamp,
            maturityAt: newMaturityAt,
            aprBpsAtOpen: plan.aprBps, // Use NEW APR (plan may have been updated)
            penaltyBpsAtOpen: plan.earlyWithdrawPenaltyBps,
            status: Types.DepositStatus.Active
        });

        // Mint new NFT certificate
        certificate.mint(msg.sender, newDepositId, newDepositCore);

        emit Renewed(oldDepositId, newDepositId, oldDeposit.planId, newPrincipal, true);
    }

    /// @inheritdoc ISavingLogic
    function getPlan(uint256 planId) external view returns (Types.PlanCore memory) {
        if (plans[planId].planId == 0) revert PlanNotFound();
        return plans[planId];
    }

    /// @inheritdoc ISavingLogic
    function getDepositCore(uint256 depositId) external view returns (Types.DepositCore memory) {
        return certificate.getDepositCore(depositId);
    }

    /// @inheritdoc ISavingLogic
    function token() external view returns (address) {
        return address(_token);
    }

    /// @notice Set grace period for auto-renewal
    function setGracePeriod(uint256 newGracePeriod) external onlyOwner {
        gracePeriod = newGracePeriod;
    }

    /// @notice Update vault manager (for upgrades)
    function setVaultManager(address newVaultManager) external onlyOwner {
        require(newVaultManager != address(0), "Invalid vault");
        vaultManager = IVaultManager(newVaultManager);
    }

    /// @dev Get owner of deposit from Certificate contract
    function _getOwner(uint256 depositId) private view returns (address) {
        // Call ERC721 ownerOf on Certificate contract
        // Note: Cast to ERC721 instead of interface to avoid conflict
        return IERC721(address(certificate)).ownerOf(depositId);
    }
}
