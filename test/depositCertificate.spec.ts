import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { DepositCertificate, SavingLogic, VaultManager, MockUSDC } from "../typechain";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DepositCertificate", function () {
  let certificate: DepositCertificate;
  let savingLogic: SavingLogic;
  let vaultManager: VaultManager;
  let usdc: MockUSDC;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let feeReceiver: SignerWithAddress;

  const METADATA_BASE_URI = "https://api.yourdapp.com/metadata/";

  beforeEach(async function () {
    [owner, user1, user2, feeReceiver] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy(owner.address);
    await usdc.waitForDeployment();

    // Deploy DepositCertificate
    const CertificateFactory = await ethers.getContractFactory("DepositCertificate");
    certificate = await CertificateFactory.deploy(owner.address, METADATA_BASE_URI);
    await certificate.waitForDeployment();

    // Deploy VaultManager
    const VaultFactory = await ethers.getContractFactory("VaultManager");
    vaultManager = await VaultFactory.deploy(
      await usdc.getAddress(),
      feeReceiver.address,
      owner.address
    );
    await vaultManager.waitForDeployment();

    // Deploy SavingLogic
    const LogicFactory = await ethers.getContractFactory("SavingLogic");
    savingLogic = await LogicFactory.deploy(
      await usdc.getAddress(),
      await certificate.getAddress(),
      await vaultManager.getAddress(),
      owner.address
    );
    await savingLogic.waitForDeployment();

    // Configure permissions
    await certificate.setSavingLogic(await savingLogic.getAddress());
    await vaultManager.setSavingLogic(await savingLogic.getAddress());

    // Mint USDC to users
    await usdc.mint(user1.address, ethers.parseUnits("10000", 6));
    await usdc.mint(user2.address, ethers.parseUnits("10000", 6));
    
    // Fund vault
    await usdc.mint(owner.address, ethers.parseUnits("100000", 6));
    await usdc.connect(owner).approve(await vaultManager.getAddress(), ethers.parseUnits("100000", 6));
    await vaultManager.connect(owner).fundVault(ethers.parseUnits("100000", 6));
  });

  describe("Deployment", function () {
    it("Should set correct name and symbol", async function () {
      expect(await certificate.name()).to.equal("Term Deposit Certificate");
      expect(await certificate.symbol()).to.equal("TDC");
    });

    it("Should set correct owner", async function () {
      expect(await certificate.owner()).to.equal(owner.address);
    });

    it("Should set correct savingLogic after configuration", async function () {
      // savingLogic is set in beforeEach via setSavingLogic
      expect(await certificate.savingLogic()).to.equal(await savingLogic.getAddress());
    });

    it("Should allow owner to set SavingLogic", async function () {
      const newLogicAddress = user1.address; // Just for testing
      await expect(certificate.setSavingLogic(newLogicAddress))
        .to.emit(certificate, "SavingLogicUpdated")
        .withArgs(await savingLogic.getAddress(), newLogicAddress);
      
      expect(await certificate.savingLogic()).to.equal(newLogicAddress);
    });

    it("Should reject zero address for SavingLogic", async function () {
      await expect(certificate.setSavingLogic(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(certificate, "InvalidAddress");
    });

    it("Should allow owner to update base URI", async function () {
      const newURI = "https://newapi.com/metadata/";
      await expect(certificate.setBaseURI(newURI))
        .to.emit(certificate, "BaseURIUpdated")
        .withArgs(newURI);
    });

    it("Should reject non-owner setting SavingLogic", async function () {
      await expect(certificate.connect(user1).setSavingLogic(user2.address))
        .to.be.revertedWithCustomError(certificate, "OwnableUnauthorizedAccount");
    });
  });

  describe("Minting", function () {
    let planId: bigint;
    let depositAmount: bigint;

    beforeEach(async function () {
      // Create a plan via SavingLogic
      const tx = await savingLogic.createPlan(
        90 * 24 * 60 * 60, // 90 days in seconds
        720, // 7.2% APR
        ethers.parseUnits("100", 6), // min 100 USDC
        ethers.parseUnits("10000", 6), // max 10000 USDC
        300 // 3% penalty
      );
      const receipt = await tx.wait();
      planId = 1n; // First plan
      depositAmount = ethers.parseUnits("1000", 6);

      // User approves SavingLogic
      await usdc.connect(user1).approve(await savingLogic.getAddress(), depositAmount);
    });

    it("Should mint NFT when deposit is opened", async function () {
      const tx = await savingLogic.connect(user1).openDeposit(planId, depositAmount);
      const receipt = await tx.wait();
      
      const depositId = 1n;

      // Check NFT was minted
      expect(await certificate.ownerOf(depositId)).to.equal(user1.address);
      
      // Check deposit core data
      const depositCore = await certificate.getDepositCore(depositId);
      expect(depositCore.depositId).to.equal(depositId);
      expect(depositCore.planId).to.equal(planId);
      expect(depositCore.principal).to.equal(depositAmount);
      expect(depositCore.aprBpsAtOpen).to.equal(720);
      expect(depositCore.penaltyBpsAtOpen).to.equal(300);
      expect(depositCore.status).to.equal(0); // Active
    });

    it("Should emit CertificateMinted event", async function () {
      await expect(savingLogic.connect(user1).openDeposit(planId, depositAmount))
        .to.emit(certificate, "CertificateMinted")
        .withArgs(1n, user1.address, planId);
    });

    it("Should generate correct tokenURI", async function () {
      await savingLogic.connect(user1).openDeposit(planId, depositAmount);
      
      const depositId = 1n;
      const expectedURI = METADATA_BASE_URI + depositId.toString();
      
      expect(await certificate.tokenURI(depositId)).to.equal(expectedURI);
    });

    it("Should reject mint from non-SavingLogic", async function () {
      const depositCore = {
        depositId: 999n,
        planId: 1n,
        principal: depositAmount,
        startAt: await time.latest(),
        maturityAt: (await time.latest()) + 90 * 24 * 60 * 60,
        aprBpsAtOpen: 720,
        penaltyBpsAtOpen: 300,
        status: 0
      };

      await expect(
        certificate.connect(user1).mint(user1.address, 999n, depositCore)
      ).to.be.revertedWithCustomError(certificate, "OnlySavingLogic");
    });

    it("Should mint multiple NFTs to same user", async function () {
      await savingLogic.connect(user1).openDeposit(planId, depositAmount);
      await usdc.connect(user1).approve(await savingLogic.getAddress(), depositAmount);
      await savingLogic.connect(user1).openDeposit(planId, depositAmount);

      expect(await certificate.balanceOf(user1.address)).to.equal(2);
      expect(await certificate.ownerOf(1n)).to.equal(user1.address);
      expect(await certificate.ownerOf(2n)).to.equal(user1.address);
    });
  });

  describe("Status Updates", function () {
    let depositId: bigint;

    beforeEach(async function () {
      // Create plan and deposit
      await savingLogic.createPlan(
        90 * 24 * 60 * 60,
        720,
        ethers.parseUnits("100", 6),
        ethers.parseUnits("10000", 6),
        300
      );

      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await savingLogic.getAddress(), depositAmount);
      await savingLogic.connect(user1).openDeposit(1n, depositAmount);
      
      depositId = 1n;
    });

    it("Should update status to Withdrawn", async function () {
      // Fast forward to maturity
      await time.increase(91 * 24 * 60 * 60);

      await expect(savingLogic.connect(user1).withdrawAtMaturity(depositId))
        .to.emit(certificate, "DepositStatusUpdated")
        .withArgs(depositId, 1); // Withdrawn = 1

      const depositCore = await certificate.getDepositCore(depositId);
      expect(depositCore.status).to.equal(1); // Withdrawn
    });

    it("Should update status to ManualRenewed", async function () {
      await time.increase(91 * 24 * 60 * 60);

      await savingLogic.connect(user1).renewDeposit(depositId, 1n);

      const oldDeposit = await certificate.getDepositCore(depositId);
      expect(oldDeposit.status).to.equal(3); // ManualRenewed
    });

    it("Should update status to AutoRenewed", async function () {
      await time.increase(91 * 24 * 60 * 60 + 3 * 24 * 60 * 60 + 1); // Maturity + grace + 1 sec

      await savingLogic.connect(user1).autoRenewDeposit(depositId);

      const oldDeposit = await certificate.getDepositCore(depositId);
      expect(oldDeposit.status).to.equal(2); // AutoRenewed
    });

    it("Should reject status update from non-SavingLogic", async function () {
      await expect(
        certificate.connect(user1).updateStatus(depositId, 1)
      ).to.be.revertedWithCustomError(certificate, "OnlySavingLogic");
    });
  });

  describe("View Functions", function () {
    it("Should return correct deposit existence", async function () {
      expect(await certificate.exists(999n)).to.be.false;

      // Create deposit
      await savingLogic.createPlan(90 * 24 * 60 * 60, 720, ethers.parseUnits("100", 6), 0, 300);
      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await savingLogic.getAddress(), depositAmount);
      await savingLogic.connect(user1).openDeposit(1n, depositAmount);

      expect(await certificate.exists(1n)).to.be.true;
    });

    it("Should revert getDepositCore for non-existent deposit", async function () {
      await expect(certificate.getDepositCore(999n))
        .to.be.revertedWithCustomError(certificate, "DepositNotFound");
    });

    it("Should revert tokenURI for non-existent token", async function () {
      await expect(certificate.tokenURI(999n))
        .to.be.revertedWithCustomError(certificate, "ERC721NonexistentToken");
    });
  });

  describe("Upgradeability", function () {
    it("Should allow owner to switch SavingLogic contract", async function () {
      // Deploy new mock logic
      const newLogic = user2.address; // Just a placeholder

      await expect(certificate.setSavingLogic(newLogic))
        .to.emit(certificate, "SavingLogicUpdated")
        .withArgs(await savingLogic.getAddress(), newLogic);

      expect(await certificate.savingLogic()).to.equal(newLogic);
    });

    it("Should preserve NFTs when switching logic", async function () {
      // Create deposit with old logic
      await savingLogic.createPlan(90 * 24 * 60 * 60, 720, ethers.parseUnits("100", 6), 0, 300);
      const depositAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await savingLogic.getAddress(), depositAmount);
      await savingLogic.connect(user1).openDeposit(1n, depositAmount);

      // Switch to new logic
      const newLogic = user2.address;
      await certificate.setSavingLogic(newLogic);

      // NFT still owned by user1
      expect(await certificate.ownerOf(1n)).to.equal(user1.address);
      
      // Data still intact
      const depositCore = await certificate.getDepositCore(1n);
      expect(depositCore.principal).to.equal(depositAmount);
    });
  });
});
