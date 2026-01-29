import { expect } from "chai";
import { ethers } from "hardhat";
import { SavingCore, VaultManager, MockUSDC } from "../typechain";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("SavingCore - Day 3 Tests", function () {
  let savingCore: SavingCore;
  let vaultManager: VaultManager;
  let token: MockUSDC;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let feeReceiver: SignerWithAddress;

  const USDC_DECIMALS = 6;
  const ONE_USDC = 10n ** BigInt(USDC_DECIMALS);

  beforeEach(async function () {
    [owner, user1, user2, feeReceiver] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    token = await MockUSDCFactory.deploy(owner.address);
    await token.waitForDeployment();

    // Deploy VaultManager
    const VaultManagerFactory = await ethers.getContractFactory("VaultManager");
    vaultManager = await VaultManagerFactory.deploy(
      await token.getAddress(),
      feeReceiver.address,
      owner.address
    );
    await vaultManager.waitForDeployment();

    // Deploy SavingCore
    const SavingCoreFactory = await ethers.getContractFactory("SavingCore");
    savingCore = await SavingCoreFactory.deploy(
      await token.getAddress(),
      await vaultManager.getAddress(),
      owner.address
    );
    await savingCore.waitForDeployment();

    // Set SavingCore in VaultManager
    await vaultManager.setSavingLogic(await savingCore.getAddress());

    // Fund vault with 100,000 USDC
    const fundAmount = 100_000n * ONE_USDC;
    await token.approve(await vaultManager.getAddress(), fundAmount);
    await vaultManager.fundVault(fundAmount);

    // Mint tokens to users
    await token.mint(user1.address, 10_000n * ONE_USDC);
    await token.mint(user2.address, 10_000n * ONE_USDC);
  });

  describe("createPlan", function () {
    it("Should create a plan with valid parameters", async function () {
      const tenorDays = 90;
      const aprBps = 250; // 2.5%
      const minDeposit = 100n * ONE_USDC;
      const maxDeposit = 10_000n * ONE_USDC;
      const penaltyBps = 500; // 5%

      const tx = await savingCore.createPlan(
        tenorDays,
        aprBps,
        minDeposit,
        maxDeposit,
        penaltyBps
      );

      await expect(tx)
        .to.emit(savingCore, "PlanCreated")
        .withArgs(1, tenorDays, aprBps);

      const plan = await savingCore.getPlan(1);
      expect(plan.planId).to.equal(1);
      expect(plan.tenorDays).to.equal(tenorDays);
      expect(plan.aprBps).to.equal(aprBps);
      expect(plan.minDeposit).to.equal(minDeposit);
      expect(plan.maxDeposit).to.equal(maxDeposit);
      expect(plan.earlyWithdrawPenaltyBps).to.equal(penaltyBps);
      expect(plan.enabled).to.be.true;
    });

    it("Should revert if tenor is zero", async function () {
      await expect(
        savingCore.createPlan(0, 250, 100n * ONE_USDC, 10_000n * ONE_USDC, 500)
      ).to.be.revertedWithCustomError(savingCore, "InvalidTenor");
    });

    it("Should revert if APR is >= 10000 bps", async function () {
      await expect(
        savingCore.createPlan(90, 10000, 100n * ONE_USDC, 10_000n * ONE_USDC, 500)
      ).to.be.revertedWithCustomError(savingCore, "InvalidAPR");
    });

    it("Should only allow owner to create plans", async function () {
      await expect(
        savingCore.connect(user1).createPlan(90, 250, 0, 0, 500)
      ).to.be.revertedWithCustomError(savingCore, "OwnableUnauthorizedAccount");
    });

    it("Should create multiple plans with auto-increment IDs", async function () {
      await savingCore.createPlan(30, 150, 0, 0, 300);
      await savingCore.createPlan(90, 250, 0, 0, 500);
      await savingCore.createPlan(180, 350, 0, 0, 700);

      const plan1 = await savingCore.getPlan(1);
      const plan2 = await savingCore.getPlan(2);
      const plan3 = await savingCore.getPlan(3);

      expect(plan1.tenorDays).to.equal(30);
      expect(plan2.tenorDays).to.equal(90);
      expect(plan3.tenorDays).to.equal(180);
    });
  });

  describe("updatePlan", function () {
    beforeEach(async function () {
      // Create a plan first
      await savingCore.createPlan(90, 250, 100n * ONE_USDC, 10_000n * ONE_USDC, 500);
    });

    it("Should update plan parameters", async function () {
      const newAprBps = 300;
      const newMinDeposit = 200n * ONE_USDC;
      const newMaxDeposit = 20_000n * ONE_USDC;
      const newPenaltyBps = 600;

      const tx = await savingCore.updatePlan(
        1,
        newAprBps,
        newMinDeposit,
        newMaxDeposit,
        newPenaltyBps,
        true
      );

      await expect(tx)
        .to.emit(savingCore, "PlanUpdated")
        .withArgs(1, 90, newAprBps, newMinDeposit, newMaxDeposit, newPenaltyBps, true);

      const plan = await savingCore.getPlan(1);
      expect(plan.aprBps).to.equal(newAprBps);
      expect(plan.minDeposit).to.equal(newMinDeposit);
      expect(plan.maxDeposit).to.equal(newMaxDeposit);
      expect(plan.earlyWithdrawPenaltyBps).to.equal(newPenaltyBps);
    });

    it("Should disable a plan", async function () {
      await savingCore.updatePlan(1, 250, 0, 0, 500, false);

      const plan = await savingCore.getPlan(1);
      expect(plan.enabled).to.be.false;
    });

    it("Should revert if plan not found", async function () {
      await expect(
        savingCore.updatePlan(999, 250, 0, 0, 500, true)
      ).to.be.revertedWithCustomError(savingCore, "PlanNotFound");
    });

    it("Should revert if APR is invalid", async function () {
      await expect(
        savingCore.updatePlan(1, 10000, 0, 0, 500, true)
      ).to.be.revertedWithCustomError(savingCore, "InvalidAPR");
    });

    it("Should only allow owner to update plans", async function () {
      await expect(
        savingCore.connect(user1).updatePlan(1, 300, 0, 0, 500, true)
      ).to.be.revertedWithCustomError(savingCore, "OwnableUnauthorizedAccount");
    });
  });

  describe("openDeposit", function () {
    beforeEach(async function () {
      // Create a 90-day plan with 2.5% APR
      await savingCore.createPlan(
        90,
        250,
        100n * ONE_USDC,
        10_000n * ONE_USDC,
        500
      );
    });

    it("Should open a deposit and mint NFT", async function () {
      const depositAmount = 1000n * ONE_USDC;

      // Approve token transfer
      await token.connect(user1).approve(await savingCore.getAddress(), depositAmount);

      const tx = await savingCore.connect(user1).openDeposit(1, depositAmount);

      await expect(tx).to.emit(savingCore, "DepositOpened");

      // Check deposit details
      const deposit = await savingCore.getDeposit(1);
      expect(deposit.depositId).to.equal(1);
      expect(deposit.owner).to.equal(user1.address);
      expect(deposit.planId).to.equal(1);
      expect(deposit.principal).to.equal(depositAmount);
      expect(deposit.status).to.equal(0); // Active
      expect(deposit.aprBpsAtOpen).to.equal(250);
      expect(deposit.penaltyBpsAtOpen).to.equal(500);

      // Check NFT ownership
      const nftOwner = await savingCore.ownerOf(1);
      expect(nftOwner).to.equal(user1.address);

      // Check token transfer
      const userBalance = await token.balanceOf(user1.address);
      expect(userBalance).to.equal(9_000n * ONE_USDC);
    });

    it("Should snapshot APR and penalty at open", async function () {
      const depositAmount = 1000n * ONE_USDC;

      await token.connect(user1).approve(await savingCore.getAddress(), depositAmount);
      await savingCore.connect(user1).openDeposit(1, depositAmount);

      // Admin updates plan to lower APR
      await savingCore.updatePlan(1, 200, 100n * ONE_USDC, 10_000n * ONE_USDC, 400, true);

      // Open another deposit
      await token.connect(user2).approve(await savingCore.getAddress(), depositAmount);
      await savingCore.connect(user2).openDeposit(1, depositAmount);

      const deposit1 = await savingCore.getDeposit(1);
      const deposit2 = await savingCore.getDeposit(2);

      // First deposit should keep original APR
      expect(deposit1.aprBpsAtOpen).to.equal(250);
      expect(deposit1.penaltyBpsAtOpen).to.equal(500);

      // Second deposit should use new APR
      expect(deposit2.aprBpsAtOpen).to.equal(200);
      expect(deposit2.penaltyBpsAtOpen).to.equal(400);
    });

    it("Should revert if plan not found", async function () {
      await token.connect(user1).approve(await savingCore.getAddress(), 1000n * ONE_USDC);

      await expect(
        savingCore.connect(user1).openDeposit(999, 1000n * ONE_USDC)
      ).to.be.revertedWithCustomError(savingCore, "PlanNotFound");
    });

    it("Should revert if plan is disabled", async function () {
      await savingCore.updatePlan(1, 250, 0, 0, 500, false);

      await token.connect(user1).approve(await savingCore.getAddress(), 1000n * ONE_USDC);

      await expect(
        savingCore.connect(user1).openDeposit(1, 1000n * ONE_USDC)
      ).to.be.revertedWithCustomError(savingCore, "PlanNotEnabled");
    });

    it("Should revert if amount below minimum", async function () {
      const depositAmount = 50n * ONE_USDC; // Below 100 USDC minimum

      await token.connect(user1).approve(await savingCore.getAddress(), depositAmount);

      await expect(
        savingCore.connect(user1).openDeposit(1, depositAmount)
      ).to.be.revertedWithCustomError(savingCore, "AmountBelowMinimum");
    });

    it("Should revert if amount above maximum", async function () {
      const depositAmount = 15_000n * ONE_USDC; // Above 10,000 USDC maximum

      await token.connect(user1).approve(await savingCore.getAddress(), depositAmount);

      await expect(
        savingCore.connect(user1).openDeposit(1, depositAmount)
      ).to.be.revertedWithCustomError(savingCore, "AmountAboveMaximum");
    });

    it("Should calculate correct maturity timestamp", async function () {
      const depositAmount = 1000n * ONE_USDC;

      await token.connect(user1).approve(await savingCore.getAddress(), depositAmount);

      const beforeTimestamp = await time.latest();
      await savingCore.connect(user1).openDeposit(1, depositAmount);

      const deposit = await savingCore.getDeposit(1);
      const expectedMaturity = BigInt(beforeTimestamp) + 90n * 24n * 60n * 60n;

      // Allow 1 second tolerance for block timestamp
      expect(deposit.maturityAt).to.be.closeTo(expectedMaturity, 1);
    });

    it("Should mint multiple NFTs with auto-increment IDs", async function () {
      const depositAmount = 1000n * ONE_USDC;

      await token.connect(user1).approve(await savingCore.getAddress(), depositAmount * 2n);
      await savingCore.connect(user1).openDeposit(1, depositAmount);
      await savingCore.connect(user1).openDeposit(1, depositAmount);

      expect(await savingCore.ownerOf(1)).to.equal(user1.address);
      expect(await savingCore.ownerOf(2)).to.equal(user1.address);
    });
  });

  describe("VaultManager Integration", function () {
    it("Should set grace period", async function () {
      const newGracePeriod = 5 * 24 * 60 * 60; // 5 days
      await savingCore.setGracePeriod(newGracePeriod);

      const gracePeriod = await savingCore.gracePeriod();
      expect(gracePeriod).to.equal(newGracePeriod);
    });

    it("Should update vault manager address", async function () {
      const MockVaultManagerFactory = await ethers.getContractFactory("VaultManager");
      const newVaultManager = await MockVaultManagerFactory.deploy(
        await token.getAddress(),
        feeReceiver.address,
        owner.address
      );

      await savingCore.setVaultManager(await newVaultManager.getAddress());

      const updatedVaultManager = await savingCore.vaultManager();
      expect(updatedVaultManager).to.equal(await newVaultManager.getAddress());
    });
  });
});
