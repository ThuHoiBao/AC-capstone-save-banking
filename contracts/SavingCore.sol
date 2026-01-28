// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Types} from "./types/Types.sol";
import {ISavingCore} from "./interfaces/ISavingCore.sol";
import {IVaultManager} from "./interfaces/IVaultManager.sol";
import {InterestMath} from "./libs/InterestMath.sol";

/// @title SavingCore
/// @notice Core logic for term deposit savings with NFT certificates
/// @dev Manages plans, deposits (ERC721), snapshots APR/penalty, integrates with VaultManager
contract SavingCore is ERC721, Ownable, ISavingCore {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 private immutable _token; //immutable: Biến này chỉ được gán giá trị một lần duy nhất lúc deploy (trong Constructor) và không bao giờ đổi được nữa. Giúp tiết kiệm Gas và bảo mật (không ai đổi được token của ngân hàng).
    IVaultManager public vaultManager;
    uint256 public gracePeriod = 3 days;

    uint256 private _nextPlanId = 1;
    uint256 private _nextDepositId = 1;

    mapping(uint256 => Types.Plan) public plans;
    mapping(uint256 => Types.Deposit) public deposits;

    // Errors
    error InvalidTenor();
    error InvalidAPR();
    error PlanNotFound();
    error PlanNotEnabled();
    error AmountBelowMinimum();
    error AmountAboveMaximum();
    error DepositNotFound();
    error NotDepositOwner();
    error DepositNotActive();
    error NotYetMatured();

    // Constructor
    constructor(
        address tokenAddress,
        address _vaultManager,
        address initialOwner
    ) ERC721("Term Deposit Certificate", "TDC") Ownable(initialOwner) {
        require(tokenAddress != address(0), "Invalid token address");
        require(_vaultManager != address(0), "Invalid vault address");
        _token = IERC20(tokenAddress);
        vaultManager = IVaultManager(_vaultManager);
    }

    /// @notice Admin creates a new saving plan
    function createPlan(
        uint32 tenorDays,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 earlyWithdrawPenaltyBps
    ) external onlyOwner returns (uint256 planId) {
        if (tenorDays == 0) revert InvalidTenor();
        if (aprBps >= 10000) revert InvalidAPR(); // Max 99.99%

        planId = _nextPlanId++;

        plans[planId] = Types.Plan({
            planId: planId,
            tenorDays: tenorDays,
            aprBps: aprBps,
            minDeposit: minDeposit,
            maxDeposit: maxDeposit,
            earlyWithdrawPenaltyBps: earlyWithdrawPenaltyBps,
            enabled: true,
            createdAt: block.timestamp
        });

        emit PlanCreated(planId, tenorDays, aprBps);
    }

    /// @notice Admin updates an existing plan (does not affect existing deposits)
    function updatePlan(
        uint256 planId,
        uint16 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint16 earlyWithdrawPenaltyBps,
        bool enabled
    ) external onlyOwner {
        Types.Plan storage plan = plans[planId];
        if (plan.planId == 0) revert PlanNotFound();
        if (aprBps >= 10000) revert InvalidAPR();

        plan.aprBps = aprBps;
        plan.minDeposit = minDeposit;
        plan.maxDeposit = maxDeposit;
        plan.earlyWithdrawPenaltyBps = earlyWithdrawPenaltyBps;
        plan.enabled = enabled;

        emit PlanUpdated(
            planId,
            plan.tenorDays,
            aprBps,
            minDeposit,
            maxDeposit,
            earlyWithdrawPenaltyBps,
            enabled
        );
    }

    /// @notice User opens a term deposit and receives an NFT certificate
    function openDeposit(uint256 planId, uint256 amount)
        external
        returns (uint256 depositId)
    {
        Types.Plan memory plan = plans[planId];
        if (plan.planId == 0) revert PlanNotFound();
        if (!plan.enabled) revert PlanNotEnabled();
        if (plan.minDeposit > 0 && amount < plan.minDeposit) {
            revert AmountBelowMinimum();
        }
        if (plan.maxDeposit > 0 && amount > plan.maxDeposit) {
            revert AmountAboveMaximum();
        }

        depositId = _nextDepositId++;
        uint256 tenorSeconds = uint256(plan.tenorDays) * 1 days;
        uint256 maturityAt = block.timestamp + tenorSeconds;

        deposits[depositId] = Types.Deposit({
            depositId: depositId,
            owner: msg.sender,
            planId: planId,
            principal: amount,
            startAt: block.timestamp,
            maturityAt: maturityAt,
            status: Types.DepositStatus.Active,
            aprBpsAtOpen: plan.aprBps,
            penaltyBpsAtOpen: plan.earlyWithdrawPenaltyBps
        });

        // Transfer tokens from user to this contract
        _token.safeTransferFrom(msg.sender, address(this), amount);

        // Mint NFT certificate to user
        _safeMint(msg.sender, depositId);

        emit DepositOpened(
            depositId,
            msg.sender,
            planId,
            amount,
            maturityAt,
            plan.aprBps
        );
    }

    /// @notice Get token address
    function token() external view returns (address) {
        return address(_token);
    }

    /// @notice Get vault manager address
    function vault() external view returns (address) {
        return address(vaultManager);
    }

    /// @notice Set the grace period for auto-renewal
    function setGracePeriod(uint256 newGracePeriod) external onlyOwner {
        gracePeriod = newGracePeriod;
    }

    /// @notice Update the vault manager address
    function setVaultManager(address newVaultManager) external onlyOwner {
        require(newVaultManager != address(0), "Invalid vault address");
        vaultManager = IVaultManager(newVaultManager);
    }

    /// @notice Get plan details
    function getPlan(uint256 planId) external view returns (Types.Plan memory) {
        return plans[planId];
    }

    /// @notice Get deposit details
    function getDeposit(uint256 depositId)
        external
        view
        returns (Types.Deposit memory)
    {
        return deposits[depositId];
    }

    /// @notice Withdraw at maturity - receives principal + interest
    function withdrawAtMaturity(uint256 depositId) external returns (uint256 principal, uint256 interest) {
        Types.Deposit storage deposit = deposits[depositId];
        
        if (deposit.depositId == 0) revert DepositNotFound();
        if (ownerOf(depositId) != msg.sender) revert NotDepositOwner();
        if (deposit.status != Types.DepositStatus.Active) revert DepositNotActive();
        if (block.timestamp < deposit.maturityAt) revert NotYetMatured();

        principal = deposit.principal;
        Types.Plan memory plan = plans[deposit.planId];
        uint256 tenorSeconds = uint256(plan.tenorDays) * 1 days;
        
        // Calculate interest using snapshot APR
        interest = InterestMath.simpleInterest(
            principal,
            deposit.aprBpsAtOpen,
            tenorSeconds
        );

        // Update status
        deposit.status = Types.DepositStatus.Withdrawn;

        // Get interest from vault
        vaultManager.payoutInterest(msg.sender, interest);

        // Transfer principal back to user
        _token.safeTransfer(msg.sender, principal);

        emit Withdrawn(depositId, msg.sender, principal, interest, false);
    }

    /// @notice Early withdraw - receives principal minus penalty, no interest
    function earlyWithdraw(uint256 depositId) external returns (uint256 principalAfterPenalty, uint256 penalty) {
        Types.Deposit storage deposit = deposits[depositId];
        
        if (deposit.depositId == 0) revert DepositNotFound();
        if (ownerOf(depositId) != msg.sender) revert NotDepositOwner();
        if (deposit.status != Types.DepositStatus.Active) revert DepositNotActive();

        uint256 principal = deposit.principal;
        
        // Calculate penalty using snapshot penalty rate
        penalty = (principal * uint256(deposit.penaltyBpsAtOpen)) / 10_000;
        principalAfterPenalty = principal - penalty;

        // Update status
        deposit.status = Types.DepositStatus.Withdrawn;

        // Transfer penalty to fee receiver via vault manager
        _token.safeTransfer(address(vaultManager), penalty);
        vaultManager.distributePenalty(penalty);

        // Transfer principal minus penalty to user
        _token.safeTransfer(msg.sender, principalAfterPenalty);

        emit Withdrawn(depositId, msg.sender, principal, 0, true);
    }

    /// @notice Manual renewal - renew to a new plan with interest compounded
    function renewDeposit(uint256 depositId, uint256 newPlanId) external returns (uint256 newDepositId) {
        Types.Deposit storage oldDeposit = deposits[depositId];
        
        if (oldDeposit.depositId == 0) revert DepositNotFound();
        if (ownerOf(depositId) != msg.sender) revert NotDepositOwner();
        if (oldDeposit.status != Types.DepositStatus.Active) revert DepositNotActive();
        if (block.timestamp < oldDeposit.maturityAt) revert NotYetMatured();

        Types.Plan memory oldPlan = plans[oldDeposit.planId];
        Types.Plan memory newPlan = plans[newPlanId];
        
        if (newPlan.planId == 0) revert PlanNotFound();
        if (!newPlan.enabled) revert PlanNotEnabled();

        // Calculate interest from old deposit
        uint256 tenorSeconds = uint256(oldPlan.tenorDays) * 1 days;
        uint256 interest = InterestMath.simpleInterest(
            oldDeposit.principal,
            oldDeposit.aprBpsAtOpen,
            tenorSeconds
        );

        // Get interest from vault
        vaultManager.payoutInterest(address(this), interest);

        // New principal = old principal + interest (compound)
        uint256 newPrincipal = oldDeposit.principal + interest;

        // Check new plan constraints
        if (newPlan.minDeposit > 0 && newPrincipal < newPlan.minDeposit) {
            revert AmountBelowMinimum();
        }
        if (newPlan.maxDeposit > 0 && newPrincipal > newPlan.maxDeposit) {
            revert AmountAboveMaximum();
        }

        // Update old deposit status
        oldDeposit.status = Types.DepositStatus.ManualRenewed;

        // Create new deposit
        newDepositId = _nextDepositId++;
        uint256 newTenorSeconds = uint256(newPlan.tenorDays) * 1 days;
        uint256 newMaturityAt = block.timestamp + newTenorSeconds;

        deposits[newDepositId] = Types.Deposit({
            depositId: newDepositId,
            owner: msg.sender,
            planId: newPlanId,
            principal: newPrincipal,
            startAt: block.timestamp,
            maturityAt: newMaturityAt,
            status: Types.DepositStatus.Active,
            aprBpsAtOpen: newPlan.aprBps,
            penaltyBpsAtOpen: newPlan.earlyWithdrawPenaltyBps
        });

        // Mint new NFT
        _safeMint(msg.sender, newDepositId);

        emit Renewed(depositId, newDepositId, newPrincipal, newPlanId);
    }

    /// @notice Auto renewal - triggered after grace period, uses same plan with original APR
    function autoRenewDeposit(uint256 depositId) external returns (uint256 newDepositId) {
        Types.Deposit storage oldDeposit = deposits[depositId];
        
        if (oldDeposit.depositId == 0) revert DepositNotFound();
        if (oldDeposit.status != Types.DepositStatus.Active) revert DepositNotActive();
        if (block.timestamp < oldDeposit.maturityAt + gracePeriod) revert NotYetMatured();

        address owner = ownerOf(depositId);
        Types.Plan memory oldPlan = plans[oldDeposit.planId];

        // Calculate interest from old deposit
        uint256 tenorSeconds = uint256(oldPlan.tenorDays) * 1 days;
        uint256 interest = InterestMath.simpleInterest(
            oldDeposit.principal,
            oldDeposit.aprBpsAtOpen,
            tenorSeconds
        );

        // Get interest from vault
        vaultManager.payoutInterest(address(this), interest);

        // New principal = old principal + interest (compound)
        uint256 newPrincipal = oldDeposit.principal + interest;

        // Update old deposit status
        oldDeposit.status = Types.DepositStatus.AutoRenewed;

        // Create new deposit with SAME plan and ORIGINAL APR (snapshot protection)
        newDepositId = _nextDepositId++;
        uint256 newMaturityAt = block.timestamp + tenorSeconds;

        deposits[newDepositId] = Types.Deposit({
            depositId: newDepositId,
            owner: owner,
            planId: oldDeposit.planId,
            principal: newPrincipal,
            startAt: block.timestamp,
            maturityAt: newMaturityAt,
            status: Types.DepositStatus.Active,
            aprBpsAtOpen: oldDeposit.aprBpsAtOpen, // Keep original APR!
            penaltyBpsAtOpen: oldDeposit.penaltyBpsAtOpen // Keep original penalty!
        });

        // Mint new NFT to original owner
        _safeMint(owner, newDepositId);

        emit Renewed(depositId, newDepositId, newPrincipal, oldDeposit.planId);
    }
}
