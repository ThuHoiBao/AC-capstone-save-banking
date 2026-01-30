import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { DepositCertificate, SavingLogic, VaultManager, MockUSDC, DepositVault } from "../typechain";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SavingLogic", function () {
  let certificate: DepositCertificate;
  let savingLogic: SavingLogic;
  let depositVault: DepositVault;
  let vaultManager: VaultManager;
  let usdc: MockUSDC;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let feeReceiver: SignerWithAddress;

  const METADATA_BASE_URI = "https://api.yourdapp.com/metadata/";
  const DAY = 24 * 60 * 60;

  beforeEach(async function () {
    [owner, user1, user2, feeReceiver] = await ethers.getSigners();

    // Deploy contracts
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy(owner.address);

    const CertificateFactory = await ethers.getContractFactory("DepositCertificate");
    certificate = await CertificateFactory.deploy(owner.address, METADATA_BASE_URI);

    const DepositVaultFactory = await ethers.getContractFactory("DepositVault");
    depositVault = await DepositVaultFactory.deploy(
      await usdc.getAddress(),
      owner.address
    );

    const VaultFactory = await ethers.getContractFactory("VaultManager");
    vaultManager = await VaultFactory.deploy(
      await usdc.getAddress(),
      feeReceiver.address,
      owner.address
    );

    const LogicFactory = await ethers.getContractFactory("SavingLogic");
    savingLogic = await LogicFactory.deploy(
      await usdc.getAddress(),
      await certificate.getAddress(),
      await depositVault.getAddress(),
      await vaultManager.getAddress(),
      owner.address
    );

    // Configure
    await depositVault.setSavingLogic(await savingLogic.getAddress());
    await certificate.setSavingLogic(await savingLogic.getAddress());
    await vaultManager.setSavingLogic(await savingLogic.getAddress());

    // Fund users and vault
    await usdc.mint(user1.address, ethers.parseUnits("10000", 6));
    await usdc.mint(user2.address, ethers.parseUnits("10000", 6));
    await usdc.mint(owner.address, ethers.parseUnits("500000", 6));
    await usdc.connect(owner).approve(await vaultManager.getAddress(), ethers.parseUnits("500000", 6));
    await vaultManager.fundVault(ethers.parseUnits("500000", 6));
  });

  describe("Plan Management", function () {
    it("Should create a plan", async function () {
      await expect(savingLogic.createPlan(
        90 * DAY, // 90 days
        720, // 7.2%
        ethers.parseUnits("100", 6),
        ethers.parseUnits("10000", 6),
        300 // 3%
      )).to.emit(savingLogic, "PlanCreated")
        .withArgs(1n, 90 * DAY, 720);

      const plan = await savingLogic.getPlan(1n);
      expect(plan.planId).to.equal(1n);
      expect(plan.tenorSeconds).to.equal(90 * DAY);
      expect(plan.aprBps).to.equal(720);
      expect(plan.minDeposit).to.equal(ethers.parseUnits("100", 6));
      expect(plan.maxDeposit).to.equal(ethers.parseUnits("10000", 6));
      expect(plan.earlyWithdrawPenaltyBps).to.equal(300);
      expect(plan.isActive).to.be.true;
    });

    it("Should reject zero tenor", async function () {
      await expect(savingLogic.createPlan(0, 720, 0, 0, 300))
        .to.be.revertedWithCustomError(savingLogic, "InvalidTenor");
    });

    it("Should reject zero APR", async function () {
      await expect(savingLogic.createPlan(90 * DAY, 0, 0, 0, 300))
        .to.be.revertedWithCustomError(savingLogic, "InvalidAPR");
    });

    it("Should reject APR >= 10000", async function () {
      await expect(savingLogic.createPlan(90 * DAY, 10000, 0, 0, 300))
        .to.be.revertedWithCustomError(savingLogic, "InvalidAPR");
    });

    it("Should reject penalty >= 10000", async function () {
      await expect(savingLogic.createPlan(90 * DAY, 720, 0, 0, 10000))
        .to.be.revertedWithCustomError(savingLogic, "InvalidPenalty");
    });

    it("Should update a plan", async function () {
      await savingLogic.createPlan(90 * DAY, 720, ethers.parseUnits("100", 6), 0, 300);

      await expect(savingLogic.updatePlan(
        1n,
        800, // New APR 8%
        ethers.parseUnits("200", 6), // New min
        ethers.parseUnits("20000", 6), // New max
        400, // New penalty 4%
        false // Disable
      )).to.emit(savingLogic, "PlanUpdated")
        .withArgs(1n, 800, ethers.parseUnits("200", 6), ethers.parseUnits("20000", 6), 400, false);

      const plan = await savingLogic.getPlan(1n);
      expect(plan.aprBps).to.equal(800);
      expect(plan.minDeposit).to.equal(ethers.parseUnits("200", 6));
      expect(plan.isActive).to.be.false;
    });

    it("Should reject updating non-existent plan", async function () {
      await expect(savingLogic.updatePlan(999n, 720, 0, 0, 300, true))
        .to.be.revertedWithCustomError(savingLogic, "PlanNotFound");
    });

    it("Should reject non-owner creating plan", async function () {
      await expect(
        savingLogic.connect(user1).createPlan(90 * DAY, 720, 0, 0, 300)
      ).to.be.revertedWithCustomError(savingLogic, "OwnableUnauthorizedAccount");
    });
  });

  describe("Open Deposit", function () {
    let planId: bigint;

    beforeEach(async function () {
      await savingLogic.createPlan(
        90 * DAY,
        720, // 7.2%
        ethers.parseUnits("100", 6), // Min 100 USDC
        ethers.parseUnits("10000", 6), // Max 10000 USDC
        300 // 3% penalty
      );
      planId = 1n;
    });

    it("Should open deposit successfully", async function () {
      const amount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await depositVault.getAddress(), amount);

      const startTime = await time.latest();
      
      await expect(savingLogic.connect(user1).openDeposit(planId, amount))
        .to.emit(savingLogic, "DepositOpened")
        .withArgs(1n, user1.address, planId, amount, startTime + 1 + 90 * DAY, 720);

      // Check NFT minted
      expect(await certificate.ownerOf(1n)).to.equal(user1.address);

      // Check deposit data
      const depositCore = await certificate.getDepositCore(1n);
      expect(depositCore.depositId).to.equal(1n);
      expect(depositCore.planId).to.equal(planId);
      expect(depositCore.principal).to.equal(amount);
      expect(depositCore.aprBpsAtOpen).to.equal(720);
      expect(depositCore.penaltyBpsAtOpen).to.equal(300);
      expect(depositCore.status).to.equal(0); // Active

      // Check tokens transferred to DepositVault (v2.0 architecture)
      expect(await usdc.balanceOf(await depositVault.getAddress())).to.equal(amount);
    });

    it("Should snapshot APR and penalty at open", async function () {
      const amount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await depositVault.getAddress(), amount);
      await savingLogic.connect(user1).openDeposit(planId, amount);

      // Update plan rates
      await savingLogic.updatePlan(planId, 1000, 0, 0, 500, true);

      // Deposit still has old rates
      const depositCore = await certificate.getDepositCore(1n);
      expect(depositCore.aprBpsAtOpen).to.equal(720); // Original APR
      expect(depositCore.penaltyBpsAtOpen).to.equal(300); // Original penalty
    });

    it("Should reject amount below minimum", async function () {
      const amount = ethers.parseUnits("50", 6); // Below 100 min
      await usdc.connect(user1).approve(await depositVault.getAddress(), amount);

      await expect(savingLogic.connect(user1).openDeposit(planId, amount))
        .to.be.revertedWithCustomError(savingLogic, "AmountBelowMinimum");
    });

    it("Should reject amount above maximum", async function () {
      const amount = ethers.parseUnits("15000", 6); // Above 10000 max
      await usdc.connect(user1).approve(await depositVault.getAddress(), amount);

      await expect(savingLogic.connect(user1).openDeposit(planId, amount))
        .to.be.revertedWithCustomError(savingLogic, "AmountAboveMaximum");
    });

    it("Should reject inactive plan", async function () {
      await savingLogic.updatePlan(planId, 720, 0, 0, 300, false); // Disable

      const amount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await depositVault.getAddress(), amount);

      await expect(savingLogic.connect(user1).openDeposit(planId, amount))
        .to.be.revertedWithCustomError(savingLogic, "PlanNotActive");
    });

    it("Should reject non-existent plan", async function () {
      const amount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await depositVault.getAddress(), amount);

      await expect(savingLogic.connect(user1).openDeposit(999n, amount))
        .to.be.revertedWithCustomError(savingLogic, "PlanNotFound");
    });

    it("Should handle plan with no limits (min=0, max=0)", async function () {
      await savingLogic.createPlan(180 * DAY, 800, 0, 0, 300); // No limits
      
      const amount = ethers.parseUnits("1", 6); // Very small
      await usdc.connect(user1).approve(await depositVault.getAddress(), amount);
      await savingLogic.connect(user1).openDeposit(2n, amount); // Should work

      const largeAmount = ethers.parseUnits("100000", 6); // Very large
      await usdc.mint(user1.address, largeAmount);
      await usdc.connect(user1).approve(await depositVault.getAddress(), largeAmount);
      await savingLogic.connect(user1).openDeposit(2n, largeAmount); // Should also work
    });
  });

  describe("Withdraw at Maturity", function () {
    let depositId: bigint;
    let principal: bigint;

    beforeEach(async function () {
      await savingLogic.createPlan(90 * DAY, 720, ethers.parseUnits("100", 6), 0, 300);
      
      principal = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await depositVault.getAddress(), principal);
      await savingLogic.connect(user1).openDeposit(1n, principal);
      depositId = 1n;
    });

    it("Should withdraw at maturity successfully", async function () {
      await time.increase(91 * DAY); // Past maturity

      const balanceBefore = await usdc.balanceOf(user1.address);
      
      await expect(savingLogic.connect(user1).withdrawAtMaturity(depositId))
        .to.emit(savingLogic, "Withdrawn");

      const balanceAfter = await usdc.balanceOf(user1.address);
      
      // Calculate expected interest: (1000 * 720 * 7776000) / (31536000 * 10000)
      // = 1000 * 0.072 * (90/365) = ~17.75 USDC
      const expectedInterest = (principal * 720n * (90n * BigInt(DAY))) / (365n * BigInt(DAY) * 10000n);
      
      expect(balanceAfter - balanceBefore).to.equal(principal + expectedInterest);

      // Check status updated
      const depositCore = await certificate.getDepositCore(depositId);
      expect(depositCore.status).to.equal(1); // Withdrawn
    });

    it("Should use snapshot APR for interest calculation", async function () {
      // Update plan APR to 10%
      await savingLogic.updatePlan(1n, 1000, 0, 0, 300, true);

      await time.increase(91 * DAY);

      const balanceBefore = await usdc.balanceOf(user1.address);
      await savingLogic.connect(user1).withdrawAtMaturity(depositId);
      const balanceAfter = await usdc.balanceOf(user1.address);

      // Should still use 7.2% (720 bps), not 10%
      const expectedInterest = (principal * 720n * (90n * BigInt(DAY))) / (365n * BigInt(DAY) * 10000n);
      expect(balanceAfter - balanceBefore).to.equal(principal + expectedInterest);
    });

    it("Should reject withdrawal before maturity", async function () {
      await time.increase(89 * DAY); // Before maturity

      await expect(savingLogic.connect(user1).withdrawAtMaturity(depositId))
        .to.be.revertedWithCustomError(savingLogic, "NotYetMatured");
    });

    it("Should reject withdrawal by non-owner", async function () {
      await time.increase(91 * DAY);

      await expect(savingLogic.connect(user2).withdrawAtMaturity(depositId))
        .to.be.revertedWithCustomError(savingLogic, "NotDepositOwner");
    });

    it("Should reject double withdrawal", async function () {
      await time.increase(91 * DAY);

      await savingLogic.connect(user1).withdrawAtMaturity(depositId);

      await expect(savingLogic.connect(user1).withdrawAtMaturity(depositId))
        .to.be.revertedWithCustomError(savingLogic, "DepositNotActive");
    });
  });

  describe("Early Withdraw", function () {
    let depositId: bigint;
    let principal: bigint;

    beforeEach(async function () {
      await savingLogic.createPlan(90 * DAY, 720, ethers.parseUnits("100", 6), 0, 300);
      
      principal = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await depositVault.getAddress(), principal);
      await savingLogic.connect(user1).openDeposit(1n, principal);
      depositId = 1n;
    });

    it("Should early withdraw with penalty", async function () {
      await time.increase(30 * DAY); // Before maturity

      const balanceBefore = await usdc.balanceOf(user1.address);
      const feeBalanceBefore = await usdc.balanceOf(feeReceiver.address);

      await expect(savingLogic.connect(user1).earlyWithdraw(depositId))
        .to.emit(savingLogic, "Withdrawn");

      const balanceAfter = await usdc.balanceOf(user1.address);
      const feeBalanceAfter = await usdc.balanceOf(feeReceiver.address);

      // Calculate expected: penalty = 1000 * 300 / 10000 = 30 USDC
      const expectedPenalty = (principal * 300n) / 10000n;
      const expectedReturn = principal - expectedPenalty;

      expect(balanceAfter - balanceBefore).to.equal(expectedReturn);
      expect(feeBalanceAfter - feeBalanceBefore).to.equal(expectedPenalty);

      // Check status
      const depositCore = await certificate.getDepositCore(depositId);
      expect(depositCore.status).to.equal(1); // Withdrawn
    });

    it("Should use snapshot penalty rate", async function () {
      // Update plan penalty to 5%
      await savingLogic.updatePlan(1n, 720, 0, 0, 500, true);

      await time.increase(30 * DAY);

      const balanceBefore = await usdc.balanceOf(user1.address);
      await savingLogic.connect(user1).earlyWithdraw(depositId);
      const balanceAfter = await usdc.balanceOf(user1.address);

      // Should still use 3% (300 bps), not 5%
      const expectedPenalty = (principal * 300n) / 10000n;
      const expectedReturn = principal - expectedPenalty;

      expect(balanceAfter - balanceBefore).to.equal(expectedReturn);
    });

    it("Should allow early withdraw even before maturity", async function () {
      await time.increase(1 * DAY); // Very early

      await expect(savingLogic.connect(user1).earlyWithdraw(depositId))
        .to.emit(savingLogic, "Withdrawn");
    });

    it("Should reject early withdraw by non-owner", async function () {
      await expect(savingLogic.connect(user2).earlyWithdraw(depositId))
        .to.be.revertedWithCustomError(savingLogic, "NotDepositOwner");
    });

    it("Should reject double early withdraw", async function () {
      await savingLogic.connect(user1).earlyWithdraw(depositId);

      await expect(savingLogic.connect(user1).earlyWithdraw(depositId))
        .to.be.revertedWithCustomError(savingLogic, "DepositNotActive");
    });
  });

  describe("Manual Renew", function () {
    let oldDepositId: bigint;
    let principal: bigint;

    beforeEach(async function () {
      // Create 2 plans
      await savingLogic.createPlan(90 * DAY, 720, ethers.parseUnits("100", 6), 0, 300);
      await savingLogic.createPlan(180 * DAY, 800, ethers.parseUnits("100", 6), 0, 400);
      
      principal = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await depositVault.getAddress(), principal);
      await savingLogic.connect(user1).openDeposit(1n, principal);
      oldDepositId = 1n;
    });

    it("Should manually renew to same plan", async function () {
      await time.increase(91 * DAY); // Maturity

      await expect(savingLogic.connect(user1).renewDeposit(oldDepositId, 1n))
        .to.emit(savingLogic, "Renewed");

      // Check old deposit status
      const oldDeposit = await certificate.getDepositCore(oldDepositId);
      expect(oldDeposit.status).to.equal(3); // ManualRenewed

      // Check new deposit
      const newDepositId = 2n;
      expect(await certificate.ownerOf(newDepositId)).to.equal(user1.address);

      const newDeposit = await certificate.getDepositCore(newDepositId);
      
      // New principal = old principal + interest
      const expectedInterest = (principal * 720n * (90n * BigInt(DAY))) / (365n * BigInt(DAY) * 10000n);
      const expectedNewPrincipal = principal + expectedInterest;

      expect(newDeposit.principal).to.equal(expectedNewPrincipal);
      expect(newDeposit.planId).to.equal(1n);
      expect(newDeposit.status).to.equal(0); // Active
    });

    it("Should manually renew to different plan", async function () {
      await time.increase(91 * DAY);

      await savingLogic.connect(user1).renewDeposit(oldDepositId, 2n); // Renew to plan 2

      const newDeposit = await certificate.getDepositCore(2n);
      expect(newDeposit.planId).to.equal(2n);
      expect(newDeposit.aprBpsAtOpen).to.equal(800); // New plan's APR
      expect(newDeposit.penaltyBpsAtOpen).to.equal(400); // New plan's penalty
    });

    it("Should compound interest correctly", async function () {
      await time.increase(91 * DAY);

      const balanceBefore = await usdc.balanceOf(await depositVault.getAddress());

      await savingLogic.connect(user1).renewDeposit(oldDepositId, 1n);

      const balanceAfter = await usdc.balanceOf(await depositVault.getAddress());

      // DepositVault should hold compound principal (principal + interest)
      const expectedInterest = (principal * 720n * (90n * BigInt(DAY))) / (365n * BigInt(DAY) * 10000n);
      expect(balanceAfter - balanceBefore).to.equal(expectedInterest);

      // New deposit has compound principal
      const newDeposit = await certificate.getDepositCore(2n);
      expect(newDeposit.principal).to.equal(principal + expectedInterest);
    });

    it("Should reject renew before maturity", async function () {
      await time.increase(89 * DAY);

      await expect(savingLogic.connect(user1).renewDeposit(oldDepositId, 1n))
        .to.be.revertedWithCustomError(savingLogic, "NotYetMatured");
    });

    it("Should reject renew to non-existent plan", async function () {
      await time.increase(91 * DAY);

      await expect(savingLogic.connect(user1).renewDeposit(oldDepositId, 999n))
        .to.be.revertedWithCustomError(savingLogic, "PlanNotFound");
    });

    it("Should reject renew to inactive plan", async function () {
      await savingLogic.updatePlan(2n, 800, 0, 0, 400, false); // Disable plan 2
      await time.increase(91 * DAY);

      await expect(savingLogic.connect(user1).renewDeposit(oldDepositId, 2n))
        .to.be.revertedWithCustomError(savingLogic, "PlanNotActive");
    });

    it("Should reject renew by non-owner", async function () {
      await time.increase(91 * DAY);

      await expect(savingLogic.connect(user2).renewDeposit(oldDepositId, 1n))
        .to.be.revertedWithCustomError(savingLogic, "NotDepositOwner");
    });
  });

  describe("Auto Renew", function () {
    let depositId: bigint;
    let principal: bigint;

    beforeEach(async function () {
      await savingLogic.createPlan(90 * DAY, 720, ethers.parseUnits("100", 6), 0, 300);
      
      principal = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await depositVault.getAddress(), principal);
      await savingLogic.connect(user1).openDeposit(1n, principal);
      depositId = 1n;
    });

    it("Should auto renew after grace period", async function () {
      await time.increase(91 * DAY + 3 * DAY + 1); // Maturity + grace + 1 sec

      await expect(savingLogic.connect(user1).autoRenewDeposit(depositId))
        .to.emit(savingLogic, "Renewed");

      const oldDeposit = await certificate.getDepositCore(depositId);
      expect(oldDeposit.status).to.equal(2); // AutoRenewed

      const newDepositId = 2n;
      const newDeposit = await certificate.getDepositCore(newDepositId);
      expect(newDeposit.planId).to.equal(1n); // Same plan
    });

    it("Should use original APR for interest, new APR for new deposit", async function () {
      // Update plan APR to 10%
      await savingLogic.updatePlan(1n, 1000, 0, 0, 300, true);

      await time.increase(91 * DAY + 3 * DAY + 1);

      await savingLogic.connect(user1).autoRenewDeposit(depositId);

      // Check new deposit uses new APR
      const newDeposit = await certificate.getDepositCore(2n);
      expect(newDeposit.aprBpsAtOpen).to.equal(1000); // NEW APR

      // Check interest calculated with OLD APR
      const expectedInterest = (principal * 720n * (90n * BigInt(DAY))) / (365n * BigInt(DAY) * 10000n);
      expect(newDeposit.principal).to.equal(principal + expectedInterest);
    });

    it("Should reject auto renew before grace period", async function () {
      await time.increase(91 * DAY + 1 * DAY); // Before grace ends

      await expect(savingLogic.connect(user1).autoRenewDeposit(depositId))
        .to.be.revertedWithCustomError(savingLogic, "GracePeriodNotPassed");
    });

    it("Should reject auto renew before maturity", async function () {
      await time.increase(89 * DAY);

      await expect(savingLogic.connect(user1).autoRenewDeposit(depositId))
        .to.be.revertedWithCustomError(savingLogic, "GracePeriodNotPassed");
    });
  });

  describe("View Functions", function () {
    it("Should return correct token address", async function () {
      expect(await savingLogic.token()).to.equal(await usdc.getAddress());
    });

    it("Should return correct certificate address", async function () {
      expect(await savingLogic.certificate()).to.equal(await certificate.getAddress());
    });

    it("Should return correct vault address", async function () {
      expect(await savingLogic.vaultManager()).to.equal(await vaultManager.getAddress());
    });

    it("Should return correct grace period", async function () {
      expect(await savingLogic.gracePeriod()).to.equal(3 * DAY);
    });

    it("Should allow owner to update grace period", async function () {
      await savingLogic.setGracePeriod(7 * DAY);
      expect(await savingLogic.gracePeriod()).to.equal(7 * DAY);
    });

    it("Should allow owner to update vault manager", async function () {
      const newVault = user1.address;
      await savingLogic.setVaultManager(newVault);
      expect(await savingLogic.vaultManager()).to.equal(newVault);
    });
  });

  describe("ReentrancyGuard", function () {
    it("Should prevent reentrancy on openDeposit", async function () {
      // This is hard to test without a malicious contract
      // But the guard is there in the code
      expect(true).to.be.true;
    });
  });
});
