import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type {
  MockUSDC,
  DepositVault,
  DepositCertificate,
  VaultManager,
  SavingLogic,
} from "../typechain";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DepositVault - Refactored Architecture", function () {
  let usdc: MockUSDC;
  let depositVault: DepositVault;
  let depositCertificate: DepositCertificate;
  let vaultManager: VaultManager;
  let savingLogic: SavingLogic;

  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let feeReceiver: SignerWithAddress;

  const INITIAL_BALANCE = ethers.parseUnits("100000", 6); // 100k USDC
  const DEPOSIT_AMOUNT = ethers.parseUnits("1000", 6); // 1k USDC
  const INTEREST_FUND = ethers.parseUnits("50000", 6); // 50k USDC for interest pool

  beforeEach(async function () {
    [owner, admin, user1, user2, feeReceiver] = await ethers.getSigners();

    // 1. Deploy MockUSDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy(await owner.getAddress());
    await usdc.waitForDeployment();

    // 2. Deploy DepositVault (holds user funds)
    const DepositVaultFactory = await ethers.getContractFactory("DepositVault");
    depositVault = await DepositVaultFactory.deploy(
      await usdc.getAddress(),
      await admin.getAddress()
    );
    await depositVault.waitForDeployment();

    // 3. Deploy DepositCertificate (NFT)
    const DepositCertificateFactory = await ethers.getContractFactory(
      "DepositCertificate"
    );
    depositCertificate = await DepositCertificateFactory.deploy(
      await admin.getAddress(),
      "https://api.test.com/metadata/"
    );
    await depositCertificate.waitForDeployment();

    // 4. Deploy VaultManager (holds interest funds)
    const VaultManagerFactory = await ethers.getContractFactory("VaultManager");
    vaultManager = await VaultManagerFactory.deploy(
      await usdc.getAddress(),
      await feeReceiver.getAddress(),
      await admin.getAddress()
    );
    await vaultManager.waitForDeployment();

    // 5. Deploy SavingLogic (business logic only, NO token storage)
    const SavingLogicFactory = await ethers.getContractFactory("SavingLogic");
    savingLogic = await SavingLogicFactory.deploy(
      await usdc.getAddress(),
      await depositCertificate.getAddress(),
      await depositVault.getAddress(),
      await vaultManager.getAddress(),
      await admin.getAddress()
    );
    await savingLogic.waitForDeployment();

    // 6. Connect contracts
    await depositVault.connect(admin).setSavingLogic(await savingLogic.getAddress());
    await depositCertificate.connect(admin).setSavingLogic(await savingLogic.getAddress());
    await vaultManager.connect(admin).setSavingLogic(await savingLogic.getAddress());

    // 7. Mint USDC to users
    await usdc.mint(await user1.getAddress(), INITIAL_BALANCE);
    await usdc.mint(await user2.getAddress(), INITIAL_BALANCE);
    await usdc.mint(await admin.getAddress(), INTEREST_FUND);

    // 8. Fund VaultManager with interest reserves
    await usdc.connect(admin).approve(await vaultManager.getAddress(), INTEREST_FUND);
    await vaultManager.connect(admin).fundVault(INTEREST_FUND);

    // 9. Create a default plan (7 days @ 5% APR)
    const SEVEN_DAYS = 7 * 24 * 60 * 60;
    const APR_5_PERCENT = 500; // 5% in basis points
    const MIN_DEPOSIT = ethers.parseUnits("100", 6);
    const MAX_DEPOSIT = ethers.parseUnits("10000", 6);
    const PENALTY = 300; // 3% early withdrawal penalty

    await savingLogic
      .connect(admin)
      .createPlan(SEVEN_DAYS, APR_5_PERCENT, MIN_DEPOSIT, MAX_DEPOSIT, PENALTY);
  });

  describe("Deployment", function () {
    it("Should deploy all contracts with correct addresses", async function () {
      expect(await depositVault.getAddress()).to.properAddress;
      expect(await savingLogic.getAddress()).to.properAddress;
      expect(await depositCertificate.getAddress()).to.properAddress;
      expect(await vaultManager.getAddress()).to.properAddress;
    });

    it("Should set correct token address in DepositVault", async function () {
      expect(await depositVault.token()).to.equal(await usdc.getAddress());
    });

    it("Should set correct savingLogic in DepositVault", async function () {
      expect(await depositVault.savingLogic()).to.equal(await savingLogic.getAddress());
    });

    it("Should have zero initial deposits in DepositVault", async function () {
      expect(await depositVault.totalDeposits()).to.equal(0);
    });

    it("SavingLogic should NOT hold any USDC", async function () {
      const balance = await usdc.balanceOf(await savingLogic.getAddress());
      expect(balance).to.equal(0);
    });
  });

  describe("Open Deposit - User Funds Go to DepositVault", function () {
    it("Should transfer user funds to DepositVault (NOT SavingLogic)", async function () {
      const planId = 1;

      // Approve USDC
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);

      // Open deposit
      const tx = await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);
      await tx.wait();

      // Check: DepositVault should have the funds
      const vaultBalance = await usdc.balanceOf(await depositVault.getAddress());
      expect(vaultBalance).to.equal(DEPOSIT_AMOUNT);

      // Check: SavingLogic should have ZERO balance
      const logicBalance = await usdc.balanceOf(await savingLogic.getAddress());
      expect(logicBalance).to.equal(0);

      // Check: totalDeposits tracked correctly
      expect(await depositVault.totalDeposits()).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should mint NFT to user", async function () {
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      // User1 should own NFT tokenId 1
      const depositId = 1;
      expect(await depositCertificate.ownerOf(depositId)).to.equal(await user1.getAddress());
    });

    it("Should track deposit data in Certificate contract", async function () {
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      const depositId = 1;
      const depositCore = await depositCertificate.getDepositCore(depositId);

      expect(depositCore.depositId).to.equal(depositId);
      expect(depositCore.planId).to.equal(planId);
      expect(depositCore.principal).to.equal(DEPOSIT_AMOUNT);
      expect(depositCore.status).to.equal(0); // Active
    });

    it("Should revert if user tries to deposit directly to DepositVault", async function () {
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);

      // Try to call depositVault.deposit() directly
      await expect(
        depositVault.connect(user1).deposit(await user1.getAddress(), DEPOSIT_AMOUNT)
      ).to.be.revertedWithCustomError(depositVault, "OnlySavingLogic");
    });
  });

  describe("Withdraw at Maturity", function () {
    it("Should return principal from DepositVault to user", async function () {
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      const tx = await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);
      await tx.wait();

      const depositId = 1;

      // Fast forward 7 days
      await time.increase(7 * 24 * 60 * 60);

      const userBalanceBefore = await usdc.balanceOf(await user1.getAddress());

      // Withdraw
      await savingLogic.connect(user1).withdrawAtMaturity(depositId);

      const userBalanceAfter = await usdc.balanceOf(await user1.getAddress());

      // User should receive principal + interest
      expect(userBalanceAfter).to.be.greaterThan(userBalanceBefore);
      expect(userBalanceAfter - userBalanceBefore).to.be.greaterThanOrEqual(DEPOSIT_AMOUNT);
    });

    it("Should pay interest from VaultManager", async function () {
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      const depositId = 1;
      await time.increase(7 * 24 * 60 * 60);

      const vaultBalanceBefore = await vaultManager.totalBalance();

      await savingLogic.connect(user1).withdrawAtMaturity(depositId);

      const vaultBalanceAfter = await vaultManager.totalBalance();

      // VaultManager balance should decrease (interest paid out)
      expect(vaultBalanceBefore).to.be.greaterThan(vaultBalanceAfter);
    });

    it("Should decrease totalDeposits in DepositVault", async function () {
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      const depositId = 1;
      await time.increase(7 * 24 * 60 * 60);

      expect(await depositVault.totalDeposits()).to.equal(DEPOSIT_AMOUNT);

      await savingLogic.connect(user1).withdrawAtMaturity(depositId);

      expect(await depositVault.totalDeposits()).to.equal(0);
    });

    it("SavingLogic should still have ZERO balance after withdrawal", async function () {
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      const depositId = 1;
      await time.increase(7 * 24 * 60 * 60);
      await savingLogic.connect(user1).withdrawAtMaturity(depositId);

      // SavingLogic should NEVER hold funds
      const logicBalance = await usdc.balanceOf(await savingLogic.getAddress());
      expect(logicBalance).to.equal(0);
    });
  });

  describe("Early Withdrawal with Penalty", function () {
    it("Should transfer penalty through VaultManager to feeReceiver", async function () {
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      const depositId = 1;

      // Early withdraw immediately (before maturity)
      const feeReceiverBalanceBefore = await usdc.balanceOf(await feeReceiver.getAddress());

      await savingLogic.connect(user1).earlyWithdraw(depositId);

      const feeReceiverBalanceAfter = await usdc.balanceOf(await feeReceiver.getAddress());

      // FeeReceiver should receive penalty (3% of 1000 = 30 USDC)
      const expectedPenalty = (DEPOSIT_AMOUNT * 3n) / 100n;
      expect(feeReceiverBalanceAfter - feeReceiverBalanceBefore).to.equal(expectedPenalty);
    });

    it("Should send penalty to feeReceiver", async function () {
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      const depositId = 1;

      const feeReceiverBalanceBefore = await usdc.balanceOf(await feeReceiver.getAddress());

      await savingLogic.connect(user1).earlyWithdraw(depositId);

      const feeReceiverBalanceAfter = await usdc.balanceOf(await feeReceiver.getAddress());

      // FeeReceiver should receive penalty (3% of 1000 = 30 USDC)
      const expectedPenalty = (DEPOSIT_AMOUNT * 3n) / 100n;
      expect(feeReceiverBalanceAfter - feeReceiverBalanceBefore).to.equal(expectedPenalty);
    });

    it("User should receive principal minus penalty", async function () {
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      const depositId = 1;

      const userBalanceBefore = await usdc.balanceOf(await user1.getAddress());

      await savingLogic.connect(user1).earlyWithdraw(depositId);

      const userBalanceAfter = await usdc.balanceOf(await user1.getAddress());

      // User receives principal - penalty (1000 - 30 = 970 USDC)
      const expectedAmount = DEPOSIT_AMOUNT - (DEPOSIT_AMOUNT * 3n) / 100n;
      expect(userBalanceAfter - userBalanceBefore).to.equal(expectedAmount);
    });
  });

  describe("Renew Deposit (Compounding)", function () {
    it("Should compound interest - new principal includes old principal + interest", async function () {
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      const oldDepositId = 1;
      // Use 90 days to generate meaningful interest (90 days * 5% APR = ~1.23% interest)
      await time.increase(90 * 24 * 60 * 60);

      const vaultBalanceBefore = await usdc.balanceOf(await depositVault.getAddress());

      // Renew deposit
      await savingLogic.connect(user1).renewDeposit(oldDepositId, planId);

      const vaultBalanceAfter = await usdc.balanceOf(await depositVault.getAddress());

      // DepositVault balance should increase by interest (principal stays, interest added)
      expect(vaultBalanceAfter).to.be.greaterThan(vaultBalanceBefore);
    });

    it("Should create new NFT with compounded principal", async function () {
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      const oldDepositId = 1;
      // Use 90 days to generate meaningful interest
      await time.increase(90 * 24 * 60 * 60);

      await savingLogic.connect(user1).renewDeposit(oldDepositId, planId);

      const newDepositId = 2;
      const newDepositCore = await depositCertificate.getDepositCore(newDepositId);

      // New principal should be greater than old principal
      expect(newDepositCore.principal).to.be.greaterThan(DEPOSIT_AMOUNT);
    });

    it("Interest should come from VaultManager", async function () {
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      const oldDepositId = 1;
      await time.increase(7 * 24 * 60 * 60);

      const vaultBalanceBefore = await vaultManager.totalBalance();

      await savingLogic.connect(user1).renewDeposit(oldDepositId, planId);

      const vaultBalanceAfter = await vaultManager.totalBalance();

      // VaultManager balance should decrease (interest paid)
      expect(vaultBalanceBefore).to.be.greaterThan(vaultBalanceAfter);
    });
  });

  describe("Security - Access Control", function () {
    it("Only SavingLogic can call DepositVault.deposit()", async function () {
      await expect(
        depositVault.connect(user1).deposit(await user1.getAddress(), DEPOSIT_AMOUNT)
      ).to.be.revertedWithCustomError(depositVault, "OnlySavingLogic");
    });

    it("Only SavingLogic can call DepositVault.withdraw()", async function () {
      await expect(
        depositVault.connect(user1).withdraw(await user1.getAddress(), DEPOSIT_AMOUNT)
      ).to.be.revertedWithCustomError(depositVault, "OnlySavingLogic");
    });

    it("Only admin can upgrade SavingLogic in DepositVault", async function () {
      await expect(
        depositVault.connect(user1).setSavingLogic(await user2.getAddress())
      ).to.be.revertedWithCustomError(depositVault, "OwnableUnauthorizedAccount");
    });

    it("Only admin can pause DepositVault", async function () {
      await expect(
        depositVault.connect(user1).pause()
      ).to.be.revertedWithCustomError(depositVault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Emergency Upgrade Scenario", function () {
    it("Should allow admin to upgrade SavingLogic without moving funds", async function () {
      // 1. User deposits
      const planId = 1;
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      const vaultBalanceBefore = await usdc.balanceOf(await depositVault.getAddress());
      expect(vaultBalanceBefore).to.equal(DEPOSIT_AMOUNT);

      // 2. Admin deploys new SavingLogic (simulate bug fix)
      const SavingLogicV2Factory = await ethers.getContractFactory("SavingLogic");
      const savingLogicV2 = await SavingLogicV2Factory.deploy(
        await usdc.getAddress(),
        await depositCertificate.getAddress(),
        await depositVault.getAddress(),
        await vaultManager.getAddress(),
        await admin.getAddress()
      );
      await savingLogicV2.waitForDeployment();

      // 3. Admin upgrades DepositVault to use new SavingLogic
      await depositVault.connect(admin).setSavingLogic(await savingLogicV2.getAddress());

      // 4. Check: Funds NEVER moved from DepositVault
      const vaultBalanceAfter = await usdc.balanceOf(await depositVault.getAddress());
      expect(vaultBalanceAfter).to.equal(DEPOSIT_AMOUNT);

      // 5. Old SavingLogic should be disabled (calls will fail)
      const depositId = 1;
      await time.increase(7 * 24 * 60 * 60);
      await expect(
        savingLogic.connect(user1).withdrawAtMaturity(depositId)
      ).to.be.revertedWithCustomError(depositVault, "OnlySavingLogic");
    });
  });

  describe("Multiple Users", function () {
    it("Should handle multiple deposits from different users", async function () {
      const planId = 1;

      // User1 deposits
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      // User2 deposits
      await usdc.connect(user2).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user2).openDeposit(planId, DEPOSIT_AMOUNT);

      // Check: DepositVault holds both deposits
      const totalDeposits = await depositVault.totalDeposits();
      expect(totalDeposits).to.equal(DEPOSIT_AMOUNT * 2n);

      // Check: SavingLogic still has ZERO balance
      const logicBalance = await usdc.balanceOf(await savingLogic.getAddress());
      expect(logicBalance).to.equal(0);
    });

    it("Should correctly withdraw for different users", async function () {
      const planId = 1;

      // Both users deposit
      await usdc.connect(user1).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user1).openDeposit(planId, DEPOSIT_AMOUNT);

      await usdc.connect(user2).approve(await depositVault.getAddress(), DEPOSIT_AMOUNT);
      await savingLogic.connect(user2).openDeposit(planId, DEPOSIT_AMOUNT);

      await time.increase(7 * 24 * 60 * 60);

      // User1 withdraws
      const user1BalanceBefore = await usdc.balanceOf(await user1.getAddress());
      await savingLogic.connect(user1).withdrawAtMaturity(1);
      const user1BalanceAfter = await usdc.balanceOf(await user1.getAddress());

      expect(user1BalanceAfter).to.be.greaterThan(user1BalanceBefore);

      // User2 withdraws
      const user2BalanceBefore = await usdc.balanceOf(await user2.getAddress());
      await savingLogic.connect(user2).withdrawAtMaturity(2);
      const user2BalanceAfter = await usdc.balanceOf(await user2.getAddress());

      expect(user2BalanceAfter).to.be.greaterThan(user2BalanceBefore);

      // DepositVault should be empty
      expect(await depositVault.totalDeposits()).to.equal(0);
    });
  });
});
