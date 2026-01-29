import { expect } from "chai";
import { ethers } from "hardhat";
import { SavingCore, VaultManager, MockUSDC } from "../typechain";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Day 4: Withdrawals & Renewals", function () {
  let savingCore: SavingCore;
  let vaultManager: VaultManager;
  let mockUSDC: MockUSDC;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let feeReceiver: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 6); // 1M USDC
  const VAULT_LIQUIDITY = ethers.parseUnits("500000", 6); // 500K USDC
  const DEPOSIT_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC

  beforeEach(async function () {
    [owner, user1, user2, feeReceiver] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDCFactory.deploy(owner.address);
    await mockUSDC.waitForDeployment();

    // Deploy VaultManager
    const VaultManagerFactory = await ethers.getContractFactory("VaultManager");
    vaultManager = await VaultManagerFactory.deploy(
      await mockUSDC.getAddress(),
      feeReceiver.address,
      owner.address
    );
    await vaultManager.waitForDeployment();

    // Deploy SavingCore
    const SavingCoreFactory = await ethers.getContractFactory("SavingCore");
    savingCore = await SavingCoreFactory.deploy(
      await mockUSDC.getAddress(),
      await vaultManager.getAddress(),
      owner.address
    );
    await savingCore.waitForDeployment();

    // Set SavingCore in VaultManager
    await vaultManager.setSavingLogic(await savingCore.getAddress());

    // Set grace period to 3 days
    await savingCore.setGracePeriod(259200); // 3 days = 259200 seconds

    // Set fee receiver (already set in constructor, but keep for clarity)
    // await vaultManager.setFeeReceiver(feeReceiver.address);

    // Mint tokens to users
    await mockUSDC.mint(user1.address, INITIAL_SUPPLY);
    await mockUSDC.mint(user2.address, INITIAL_SUPPLY);
    await mockUSDC.mint(owner.address, VAULT_LIQUIDITY);

    // Fund vault
    await mockUSDC.connect(owner).approve(await vaultManager.getAddress(), VAULT_LIQUIDITY);
    await vaultManager.connect(owner).fundVault(VAULT_LIQUIDITY);

    // Approve SavingCore
    await mockUSDC.connect(user1).approve(await savingCore.getAddress(), INITIAL_SUPPLY);
    await mockUSDC.connect(user2).approve(await savingCore.getAddress(), INITIAL_SUPPLY);
  });

  describe("withdrawAtMaturity", function () {
    it("Should successfully withdraw at maturity with correct interest", async function () {
      // Create plan: 30 days @ 10% APR
      await savingCore.createPlan(30, 1000, 0, 0, 500);

      // Open deposit
      const tx = await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);
      const receipt = await tx.wait();
      const depositId = 1n;

      // Fast forward past maturity
      await time.increase(30 * 24 * 60 * 60 + 1);

      // Calculate expected interest: (1000 * 1000 * 30 days in seconds) / (365 days * 10_000)
      const principal = DEPOSIT_AMOUNT;
      const tenorSeconds = 30 * 24 * 60 * 60;
      const expectedInterest = (principal * 1000n * BigInt(tenorSeconds)) / (31536000n * 10000n);

      const balanceBefore = await mockUSDC.balanceOf(user1.address);

      // Withdraw
      const withdrawTx = await savingCore.connect(user1).withdrawAtMaturity(depositId);
      const withdrawReceipt = await withdrawTx.wait();

      const balanceAfter = await mockUSDC.balanceOf(user1.address);

      // User should receive principal + interest
      expect(balanceAfter - balanceBefore).to.equal(principal + expectedInterest);

      // Check deposit status
      const deposit = await savingCore.getDeposit(depositId);
      expect(deposit.status).to.equal(1); // Withdrawn

      // Check event
      await expect(withdrawTx)
        .to.emit(savingCore, "Withdrawn")
        .withArgs(depositId, user1.address, principal, expectedInterest, false);
    });

    it("Should revert if not matured yet", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      // Try to withdraw immediately
      await expect(
        savingCore.connect(user1).withdrawAtMaturity(1)
      ).to.be.revertedWithCustomError(savingCore, "NotYetMatured");
    });

    it("Should revert if not deposit owner", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      await time.increase(30 * 24 * 60 * 60 + 1);

      await expect(
        savingCore.connect(user2).withdrawAtMaturity(1)
      ).to.be.revertedWithCustomError(savingCore, "NotDepositOwner");
    });

    it("Should revert if deposit not active", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      await time.increase(30 * 24 * 60 * 60 + 1);

      // Withdraw once
      await savingCore.connect(user1).withdrawAtMaturity(1);

      // Try to withdraw again
      await expect(
        savingCore.connect(user1).withdrawAtMaturity(1)
      ).to.be.revertedWithCustomError(savingCore, "DepositNotActive");
    });

    it("Should calculate correct interest for different APRs", async function () {
      // Plan 1: 90 days @ 15% APR
      await savingCore.createPlan(90, 1500, 0, 0, 500);

      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      await time.increase(90 * 24 * 60 * 60 + 1);

      const principal = DEPOSIT_AMOUNT;
      const tenorSeconds = 90 * 24 * 60 * 60;
      const expectedInterest = (principal * 1500n * BigInt(tenorSeconds)) / (31536000n * 10000n);

      const balanceBefore = await mockUSDC.balanceOf(user1.address);
      await savingCore.connect(user1).withdrawAtMaturity(1);
      const balanceAfter = await mockUSDC.balanceOf(user1.address);

      expect(balanceAfter - balanceBefore).to.equal(principal + expectedInterest);
    });
  });

  describe("earlyWithdraw", function () {
    it("Should successfully early withdraw with penalty", async function () {
      // Create plan: 30 days @ 10% APR, 5% penalty
      await savingCore.createPlan(30, 1000, 0, 0, 500);

      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      // Withdraw early (immediately)
      const principal = DEPOSIT_AMOUNT;
      const expectedPenalty = (principal * 500n) / 10000n; // 5% penalty
      const expectedAmount = principal - expectedPenalty;

      const user1BalanceBefore = await mockUSDC.balanceOf(user1.address);
      const feeReceiverBalanceBefore = await mockUSDC.balanceOf(feeReceiver.address);

      const tx = await savingCore.connect(user1).earlyWithdraw(1);

      const user1BalanceAfter = await mockUSDC.balanceOf(user1.address);
      const feeReceiverBalanceAfter = await mockUSDC.balanceOf(feeReceiver.address);

      // User receives principal - penalty
      expect(user1BalanceAfter - user1BalanceBefore).to.equal(expectedAmount);

      // Fee receiver gets penalty
      expect(feeReceiverBalanceAfter - feeReceiverBalanceBefore).to.equal(expectedPenalty);

      // Check deposit status
      const deposit = await savingCore.getDeposit(1);
      expect(deposit.status).to.equal(1); // Withdrawn

      // Check event (interest should be 0 for early withdrawal)
      await expect(tx)
        .to.emit(savingCore, "Withdrawn")
        .withArgs(1, user1.address, principal, 0, true);
    });

    it("Should allow early withdraw before maturity", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      // Fast forward halfway
      await time.increase(15 * 24 * 60 * 60);

      // Should not revert
      await expect(savingCore.connect(user1).earlyWithdraw(1)).to.not.be.reverted;
    });

    it("Should revert if not deposit owner", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      await expect(
        savingCore.connect(user2).earlyWithdraw(1)
      ).to.be.revertedWithCustomError(savingCore, "NotDepositOwner");
    });

    it("Should work with zero penalty", async function () {
      // Create plan with 0% penalty
      await savingCore.createPlan(30, 1000, 0, 0, 0);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      const balanceBefore = await mockUSDC.balanceOf(user1.address);
      await savingCore.connect(user1).earlyWithdraw(1);
      const balanceAfter = await mockUSDC.balanceOf(user1.address);

      // User gets full principal back (no penalty)
      expect(balanceAfter - balanceBefore).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should apply snapshot penalty rate even if plan changes", async function () {
      // Create plan: 5% penalty
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      // Admin changes plan penalty to 10%
      await savingCore.updatePlan(1, 1000, 0, 0, 1000, true);

      // Early withdraw should still use 5% (snapshot)
      const expectedPenalty = (DEPOSIT_AMOUNT * 500n) / 10000n;
      const expectedAmount = DEPOSIT_AMOUNT - expectedPenalty;

      const balanceBefore = await mockUSDC.balanceOf(user1.address);
      await savingCore.connect(user1).earlyWithdraw(1);
      const balanceAfter = await mockUSDC.balanceOf(user1.address);

      expect(balanceAfter - balanceBefore).to.equal(expectedAmount);
    });
  });

  describe("renewDeposit (Manual)", function () {
    it("Should successfully renew deposit with interest compounded", async function () {
      // Plan 1: 30 days @ 10% APR
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      // Plan 2: 60 days @ 12% APR
      await savingCore.createPlan(60, 1200, 0, 0, 400);

      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      // Fast forward to maturity
      await time.increase(30 * 24 * 60 * 60 + 1);

      // Calculate expected interest
      const tenorSeconds = 30 * 24 * 60 * 60;
      const expectedInterest = (DEPOSIT_AMOUNT * 1000n * BigInt(tenorSeconds)) / (31536000n * 10000n);
      const newPrincipal = DEPOSIT_AMOUNT + expectedInterest;

      // Renew to plan 2
      const tx = await savingCore.connect(user1).renewDeposit(1, 2);

      // Check old deposit status
      const oldDeposit = await savingCore.getDeposit(1);
      expect(oldDeposit.status).to.equal(3); // ManualRenewed

      // Check new deposit
      const newDeposit = await savingCore.getDeposit(2);
      expect(newDeposit.depositId).to.equal(2);
      expect(newDeposit.principal).to.equal(newPrincipal);
      expect(newDeposit.planId).to.equal(2);
      expect(newDeposit.aprBpsAtOpen).to.equal(1200); // New plan APR
      expect(newDeposit.status).to.equal(0); // Active

      // User should own new NFT
      expect(await savingCore.ownerOf(2)).to.equal(user1.address);

      // Check event
      await expect(tx)
        .to.emit(savingCore, "Renewed")
        .withArgs(1, 2, newPrincipal, 2);
    });

    it("Should revert if not matured yet", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      await expect(
        savingCore.connect(user1).renewDeposit(1, 1)
      ).to.be.revertedWithCustomError(savingCore, "NotYetMatured");
    });

    it("Should revert if new plan not enabled", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.createPlan(60, 1200, 0, 0, 400); // Create plan 2
      await savingCore.updatePlan(2, 1200, 0, 0, 400, false); // Then disable it

      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);
      await time.increase(30 * 24 * 60 * 60 + 1);

      await expect(
        savingCore.connect(user1).renewDeposit(1, 2)
      ).to.be.revertedWithCustomError(savingCore, "PlanNotEnabled");
    });

    it("Should revert if new plan not found", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);
      await time.increase(30 * 24 * 60 * 60 + 1);

      await expect(
        savingCore.connect(user1).renewDeposit(1, 99)
      ).to.be.revertedWithCustomError(savingCore, "PlanNotFound");
    });

    it("Should respect new plan min/max constraints", async function () {
      // Plan 1: 30 days, no constraints
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      // Plan 2: min 100,000 USDC
      const minDeposit = ethers.parseUnits("100000", 6);
      await savingCore.createPlan(60, 1200, minDeposit, 0, 400);

      // Small deposit
      const smallAmount = ethers.parseUnits("100", 6);
      await savingCore.connect(user1).openDeposit(1, smallAmount);

      await time.increase(30 * 24 * 60 * 60 + 1);

      // Try to renew to plan with high minimum (will fail)
      await expect(
        savingCore.connect(user1).renewDeposit(1, 2)
      ).to.be.revertedWithCustomError(savingCore, "AmountBelowMinimum");
    });

    it("Should allow renewing to same plan", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      await time.increase(30 * 24 * 60 * 60 + 1);

      // Renew to same plan
      await expect(savingCore.connect(user1).renewDeposit(1, 1)).to.not.be.reverted;

      const newDeposit = await savingCore.getDeposit(2);
      expect(newDeposit.planId).to.equal(1);
    });
  });

  describe("autoRenewDeposit", function () {
    it("Should successfully auto-renew after grace period", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      // Fast forward past maturity + grace period
      await time.increase(30 * 24 * 60 * 60 + 259200 + 1); // 30 days + 3 days + 1 sec

      // Calculate expected interest
      const tenorSeconds = 30 * 24 * 60 * 60;
      const expectedInterest = (DEPOSIT_AMOUNT * 1000n * BigInt(tenorSeconds)) / (31536000n * 10000n);
      const newPrincipal = DEPOSIT_AMOUNT + expectedInterest;

      // Anyone can trigger auto-renew
      const tx = await savingCore.connect(user2).autoRenewDeposit(1);

      // Check old deposit status
      const oldDeposit = await savingCore.getDeposit(1);
      expect(oldDeposit.status).to.equal(2); // AutoRenewed

      // Check new deposit
      const newDeposit = await savingCore.getDeposit(2);
      expect(newDeposit.depositId).to.equal(2);
      expect(newDeposit.principal).to.equal(newPrincipal);
      expect(newDeposit.planId).to.equal(1); // Same plan!
      expect(newDeposit.aprBpsAtOpen).to.equal(1000); // Original APR preserved!
      expect(newDeposit.penaltyBpsAtOpen).to.equal(500); // Original penalty preserved!
      expect(newDeposit.owner).to.equal(user1.address);

      // Original owner should own new NFT
      expect(await savingCore.ownerOf(2)).to.equal(user1.address);

      await expect(tx).to.emit(savingCore, "Renewed").withArgs(1, 2, newPrincipal, 1);
    });

    it("Should preserve original APR even if plan changes", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      // Admin changes plan to 2% APR
      await savingCore.updatePlan(1, 200, 0, 0, 500, true);

      // Fast forward past grace period
      await time.increase(30 * 24 * 60 * 60 + 259200 + 1);

      await savingCore.connect(user2).autoRenewDeposit(1);

      const newDeposit = await savingCore.getDeposit(2);
      // Should still have original 10% APR, not 2%!
      expect(newDeposit.aprBpsAtOpen).to.equal(1000);
    });

    it("Should revert if grace period not elapsed", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      // Fast forward to maturity but not past grace period
      await time.increase(30 * 24 * 60 * 60 + 1);

      await expect(
        savingCore.connect(user2).autoRenewDeposit(1)
      ).to.be.revertedWithCustomError(savingCore, "NotYetMatured");
    });

    it("Should revert if deposit not active", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      await time.increase(30 * 24 * 60 * 60 + 1);

      // Withdraw manually
      await savingCore.connect(user1).withdrawAtMaturity(1);

      // Try to auto-renew
      await time.increase(259200 + 1);
      await expect(
        savingCore.connect(user2).autoRenewDeposit(1)
      ).to.be.revertedWithCustomError(savingCore, "DepositNotActive");
    });

    it("Should compound interest correctly across multiple auto-renewals", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      // First auto-renew
      await time.increase(30 * 24 * 60 * 60 + 259200 + 1);
      await savingCore.connect(user2).autoRenewDeposit(1);

      const firstRenewal = await savingCore.getDeposit(2);
      const firstPrincipal = firstRenewal.principal;

      // Second auto-renew
      await time.increase(30 * 24 * 60 * 60 + 259200 + 1);
      await savingCore.connect(user2).autoRenewDeposit(2);

      const secondRenewal = await savingCore.getDeposit(3);
      const secondPrincipal = secondRenewal.principal;

      // Second principal should be greater (compounding effect)
      expect(secondPrincipal).to.be.gt(firstPrincipal);
      expect(secondPrincipal).to.be.gt(DEPOSIT_AMOUNT);
    });
  });

  describe("Pause mechanism integration", function () {
    it("Should block withdrawAtMaturity when paused", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      await time.increase(30 * 24 * 60 * 60 + 1);

      // Pause vault
      await vaultManager.pause();

      // Should revert with Pausable error
      await expect(
        savingCore.connect(user1).withdrawAtMaturity(1)
      ).to.be.revertedWithCustomError(vaultManager, "EnforcedPause");
    });

    it("Should allow withdrawal after unpause", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);
      await savingCore.connect(user1).openDeposit(1, DEPOSIT_AMOUNT);

      await time.increase(30 * 24 * 60 * 60 + 1);

      await vaultManager.pause();
      await vaultManager.unpause();

      // Should work now
      await expect(savingCore.connect(user1).withdrawAtMaturity(1)).to.not.be.reverted;
    });
  });

  describe("Edge cases", function () {
    it("Should handle very small interest amounts correctly", async function () {
      // 1 day @ 1% APR
      await savingCore.createPlan(1, 100, 0, 0, 500);

      const smallAmount = ethers.parseUnits("1", 6); // 1 USDC
      await savingCore.connect(user1).openDeposit(1, smallAmount);

      await time.increase(24 * 60 * 60 + 1);

      await expect(savingCore.connect(user1).withdrawAtMaturity(1)).to.not.be.reverted;
    });

    it("Should handle deposits with different decimals correctly", async function () {
      await savingCore.createPlan(30, 1000, 0, 0, 500);

      // Odd amount with decimals
      const oddAmount = ethers.parseUnits("1234.56", 6);
      await savingCore.connect(user1).openDeposit(1, oddAmount);

      await time.increase(30 * 24 * 60 * 60 + 1);

      const balanceBefore = await mockUSDC.balanceOf(user1.address);
      await savingCore.connect(user1).withdrawAtMaturity(1);
      const balanceAfter = await mockUSDC.balanceOf(user1.address);

      // Should receive at least principal back
      expect(balanceAfter - balanceBefore).to.be.gte(oddAmount);
    });
  });
});



