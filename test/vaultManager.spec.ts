import { expect } from "chai";
import { ethers } from "hardhat";
import { VaultManager, MockUSDC } from "../typechain";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("VaultManager - Day 3 Tests", function () {
  let vaultManager: VaultManager;
  let token: MockUSDC;
  let owner: SignerWithAddress;
  let feeReceiver: SignerWithAddress;
  let savingCore: SignerWithAddress;
  let user: SignerWithAddress;

  const USDC_DECIMALS = 6;
  const ONE_USDC = 10n ** BigInt(USDC_DECIMALS);

  beforeEach(async function () {
    [owner, feeReceiver, savingCore, user] = await ethers.getSigners();

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

    // Set SavingCore address
    await vaultManager.setSavingCore(savingCore.address);
  });

  describe("fundVault", function () {
    it("Should fund vault with tokens", async function () {
      const fundAmount = 10_000n * ONE_USDC;

      await token.approve(await vaultManager.getAddress(), fundAmount);
      const tx = await vaultManager.fundVault(fundAmount);

      await expect(tx)
        .to.emit(vaultManager, "VaultFunded")
        .withArgs(fundAmount, fundAmount);

      expect(await vaultManager.totalBalance()).to.equal(fundAmount);
      expect(await token.balanceOf(await vaultManager.getAddress())).to.equal(fundAmount);
    });

    it("Should accumulate funds correctly", async function () {
      const firstFund = 5_000n * ONE_USDC;
      const secondFund = 3_000n * ONE_USDC;

      await token.approve(await vaultManager.getAddress(), firstFund + secondFund);
      await vaultManager.fundVault(firstFund);
      await vaultManager.fundVault(secondFund);

      expect(await vaultManager.totalBalance()).to.equal(firstFund + secondFund);
    });

    it("Should only allow owner to fund vault", async function () {
      await expect(
        vaultManager.connect(user).fundVault(1000n * ONE_USDC)
      ).to.be.revertedWithCustomError(vaultManager, "OwnableUnauthorizedAccount");
    });

    it("Should revert if amount is zero", async function () {
      await expect(vaultManager.fundVault(0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });
  });

  describe("withdrawVault", function () {
    beforeEach(async function () {
      const fundAmount = 10_000n * ONE_USDC;
      await token.approve(await vaultManager.getAddress(), fundAmount);
      await vaultManager.fundVault(fundAmount);
    });

    it("Should withdraw tokens from vault", async function () {
      const withdrawAmount = 5_000n * ONE_USDC;

      const tx = await vaultManager.withdrawVault(withdrawAmount);

      await expect(tx)
        .to.emit(vaultManager, "VaultWithdrawn")
        .withArgs(withdrawAmount, 5_000n * ONE_USDC);

      expect(await vaultManager.totalBalance()).to.equal(5_000n * ONE_USDC);
    });

    it("Should revert if insufficient balance", async function () {
      const withdrawAmount = 15_000n * ONE_USDC;

      await expect(
        vaultManager.withdrawVault(withdrawAmount)
      ).to.be.revertedWithCustomError(vaultManager, "InsufficientBalance");
    });

    it("Should only allow owner to withdraw", async function () {
      await expect(
        vaultManager.connect(user).withdrawVault(1000n * ONE_USDC)
      ).to.be.revertedWithCustomError(vaultManager, "OwnableUnauthorizedAccount");
    });
  });

  describe("setFeeReceiver", function () {
    it("Should update fee receiver address", async function () {
      const newFeeReceiver = user.address;

      const tx = await vaultManager.setFeeReceiver(newFeeReceiver);

      await expect(tx)
        .to.emit(vaultManager, "FeeReceiverUpdated")
        .withArgs(newFeeReceiver);

      expect(await vaultManager.feeReceiver()).to.equal(newFeeReceiver);
    });

    it("Should revert if address is zero", async function () {
      await expect(
        vaultManager.setFeeReceiver(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(vaultManager, "InvalidAddress");
    });

    it("Should only allow owner to set fee receiver", async function () {
      await expect(
        vaultManager.connect(user).setFeeReceiver(user.address)
      ).to.be.revertedWithCustomError(vaultManager, "OwnableUnauthorizedAccount");
    });
  });

  describe("pause/unpause", function () {
    it("Should pause the vault", async function () {
      const tx = await vaultManager.pause();

      await expect(tx).to.emit(vaultManager, "Paused").withArgs(owner.address);

      expect(await vaultManager.isPaused()).to.be.true;
    });

    it("Should unpause the vault", async function () {
      await vaultManager.pause();
      const tx = await vaultManager.unpause();

      await expect(tx).to.emit(vaultManager, "Unpaused").withArgs(owner.address);

      expect(await vaultManager.isPaused()).to.be.false;
    });

    it("Should only allow owner to pause", async function () {
      await expect(
        vaultManager.connect(user).pause()
      ).to.be.revertedWithCustomError(vaultManager, "OwnableUnauthorizedAccount");
    });

    it("Should only allow owner to unpause", async function () {
      await vaultManager.pause();

      await expect(
        vaultManager.connect(user).unpause()
      ).to.be.revertedWithCustomError(vaultManager, "OwnableUnauthorizedAccount");
    });
  });

  describe("payoutInterest", function () {
    beforeEach(async function () {
      const fundAmount = 10_000n * ONE_USDC;
      await token.approve(await vaultManager.getAddress(), fundAmount);
      await vaultManager.fundVault(fundAmount);
    });

    it("Should payout interest when called by SavingCore", async function () {
      const payoutAmount = 100n * ONE_USDC;

      await vaultManager.connect(savingCore).payoutInterest(user.address, payoutAmount);

      expect(await token.balanceOf(user.address)).to.equal(payoutAmount);
      expect(await vaultManager.totalBalance()).to.equal(9_900n * ONE_USDC);
    });

    it("Should revert if not called by SavingCore", async function () {
      await expect(
        vaultManager.connect(user).payoutInterest(user.address, 100n * ONE_USDC)
      ).to.be.revertedWithCustomError(vaultManager, "OnlySavingCore");
    });

    it("Should revert if insufficient balance", async function () {
      const payoutAmount = 15_000n * ONE_USDC;

      await expect(
        vaultManager.connect(savingCore).payoutInterest(user.address, payoutAmount)
      ).to.be.revertedWithCustomError(vaultManager, "InsufficientBalance");
    });

    it("Should revert when paused", async function () {
      await vaultManager.pause();

      await expect(
        vaultManager.connect(savingCore).payoutInterest(user.address, 100n * ONE_USDC)
      ).to.be.revertedWithCustomError(vaultManager, "EnforcedPause");
    });
  });

  describe("distributePenalty", function () {
    beforeEach(async function () {
      // Mint some tokens to VaultManager for penalty distribution
      await token.mint(await vaultManager.getAddress(), 10_000n * ONE_USDC);
    });

    it("Should distribute penalty to fee receiver when called by SavingCore", async function () {
      const penaltyAmount = 50n * ONE_USDC;

      await vaultManager.connect(savingCore).distributePenalty(penaltyAmount);

      expect(await token.balanceOf(feeReceiver.address)).to.equal(penaltyAmount);
    });

    it("Should revert if not called by SavingCore", async function () {
      await expect(
        vaultManager.connect(user).distributePenalty(50n * ONE_USDC)
      ).to.be.revertedWithCustomError(vaultManager, "OnlySavingCore");
    });

    it("Should revert when paused", async function () {
      await vaultManager.pause();

      await expect(
        vaultManager.connect(savingCore).distributePenalty(50n * ONE_USDC)
      ).to.be.revertedWithCustomError(vaultManager, "EnforcedPause");
    });
  });

  describe("setSavingCore", function () {
    it("Should set SavingCore address", async function () {
      const newSavingCore = user.address;

      await vaultManager.setSavingCore(newSavingCore);

      expect(await vaultManager.savingCore()).to.equal(newSavingCore);
    });

    it("Should revert if address is zero", async function () {
      await expect(
        vaultManager.setSavingCore(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(vaultManager, "InvalidAddress");
    });

    it("Should only allow owner to set SavingCore", async function () {
      await expect(
        vaultManager.connect(user).setSavingCore(user.address)
      ).to.be.revertedWithCustomError(vaultManager, "OwnableUnauthorizedAccount");
    });
  });

  describe("View functions", function () {
    it("Should return correct token address", async function () {
      expect(await vaultManager.token()).to.equal(await token.getAddress());
    });

    it("Should return correct fee receiver", async function () {
      expect(await vaultManager.feeReceiver()).to.equal(feeReceiver.address);
    });

    it("Should return correct pause status", async function () {
      expect(await vaultManager.isPaused()).to.be.false;

      await vaultManager.pause();
      expect(await vaultManager.isPaused()).to.be.true;
    });

    it("Should return correct total balance", async function () {
      const fundAmount = 5_000n * ONE_USDC;
      await token.approve(await vaultManager.getAddress(), fundAmount);
      await vaultManager.fundVault(fundAmount);

      expect(await vaultManager.totalBalance()).to.equal(fundAmount);
    });
  });
});
