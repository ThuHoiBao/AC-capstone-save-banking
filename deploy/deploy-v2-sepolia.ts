import { ethers } from "hardhat";

/**
 * Deploy v2.0 Architecture to Sepolia
 * Separation of Concerns: DepositVault (custody) + SavingLogic (business logic)
 */
async function main() {
  console.log("\n🚀 Deploying v2.0 Architecture to Sepolia...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // ========== 1. Deploy MockUSDC (for Sepolia testing) ==========
  console.log("1️⃣ Deploying MockUSDC...");
  const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDCFactory.deploy(deployer.address);
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("   ✅ MockUSDC deployed:", usdcAddress);

  // ========== 2. Deploy DepositCertificate (NFT) ==========
  console.log("\n2️⃣ Deploying DepositCertificate...");
  const DepositCertificateFactory = await ethers.getContractFactory("DepositCertificate");
  const depositCertificate = await DepositCertificateFactory.deploy(
    deployer.address,
    "https://metadata.example.com/deposit/" // Placeholder metadata URI
  );
  await depositCertificate.waitForDeployment();
  const certificateAddress = await depositCertificate.getAddress();
  console.log("   ✅ DepositCertificate deployed:", certificateAddress);

  // ========== 3. Deploy DepositVault (Custody Contract) ==========
  console.log("\n3️⃣ Deploying DepositVault (custody)...");
  const DepositVaultFactory = await ethers.getContractFactory("DepositVault");
  const depositVault = await DepositVaultFactory.deploy(
    usdcAddress,
    deployer.address
  );
  await depositVault.waitForDeployment();
  const vaultAddress = await depositVault.getAddress();
  console.log("   ✅ DepositVault deployed:", vaultAddress);
  console.log("   ⚠️  This contract holds ALL user funds");

  // ========== 4. Deploy VaultManager (Interest Pool) ==========
  console.log("\n4️⃣ Deploying VaultManager...");
  const VaultManagerFactory = await ethers.getContractFactory("VaultManager");
  const vaultManager = await VaultManagerFactory.deploy(
    usdcAddress,
    deployer.address, // feeReceiver (for penalties)
    deployer.address  // owner
  );
  await vaultManager.waitForDeployment();
  const vaultManagerAddress = await vaultManager.getAddress();
  console.log("   ✅ VaultManager deployed:", vaultManagerAddress);

  // ========== 5. Deploy SavingLogic (Business Logic) ==========
  console.log("\n5️⃣ Deploying SavingLogic...");
  const SavingLogicFactory = await ethers.getContractFactory("SavingLogic");
  const savingLogic = await SavingLogicFactory.deploy(
    usdcAddress,
    certificateAddress,
    vaultAddress,
    vaultManagerAddress,
    deployer.address
  );
  await savingLogic.waitForDeployment();
  const logicAddress = await savingLogic.getAddress();
  console.log("   ✅ SavingLogic deployed:", logicAddress);
  console.log("   ⚠️  This contract does NOT hold user funds");

  // ========== 6. Connect Contracts ==========
  console.log("\n6️⃣ Connecting contracts...");

  // 6.1 DepositVault.setSavingLogic()
  console.log("   → Setting SavingLogic in DepositVault...");
  await depositVault.setSavingLogic(logicAddress);
  console.log("   ✅ DepositVault authorized SavingLogic");

  // 6.2 DepositCertificate.setSavingLogic()
  console.log("   → Setting SavingLogic in DepositCertificate...");
  await depositCertificate.setSavingLogic(logicAddress);
  console.log("   ✅ DepositCertificate authorized SavingLogic");

  // 6.3 VaultManager.setSavingLogic()
  console.log("   → Setting SavingLogic in VaultManager...");
  await vaultManager.setSavingLogic(logicAddress);
  console.log("   ✅ VaultManager authorized SavingLogic");

  // ========== 7. Fund VaultManager for Interest ==========
  console.log("\n7️⃣ Funding VaultManager with interest pool...");
  const interestFund = ethers.parseUnits("50000", 6); // 50,000 USDC
  await mockUSDC.approve(vaultManagerAddress, interestFund);
  await vaultManager.fundVault(interestFund);
  console.log("   ✅ VaultManager funded with 50,000 USDC");

  // ========== 8. Summary ==========
  console.log("\n\n═══════════════════════════════════════════════════");
  console.log("🎉 DEPLOYMENT COMPLETE - v2.0 Architecture");
  console.log("═══════════════════════════════════════════════════\n");

  console.log("📋 Contract Addresses:");
  console.log("   MockUSDC:           ", usdcAddress);
  console.log("   DepositCertificate: ", certificateAddress);
  console.log("   DepositVault:       ", vaultAddress, "← USER FUNDS HERE");
  console.log("   VaultManager:       ", vaultManagerAddress);
  console.log("   SavingLogic:        ", logicAddress);

  console.log("\n🔗 Connections:");
  console.log("   ✅ DepositVault      ↔ SavingLogic");
  console.log("   ✅ DepositCertificate ↔ SavingLogic");
  console.log("   ✅ VaultManager       ↔ SavingLogic");

  console.log("\n⚠️  CRITICAL for Frontend:");
  console.log("   User must approve:  ", vaultAddress);
  console.log("   NOT:                ", logicAddress);

  console.log("\n📝 Save these addresses to .env:");
  console.log(`
VITE_USDC_ADDRESS=${usdcAddress}
VITE_DEPOSIT_CERTIFICATE_ADDRESS=${certificateAddress}
VITE_DEPOSIT_VAULT_ADDRESS=${vaultAddress}
VITE_VAULT_MANAGER_ADDRESS=${vaultManagerAddress}
VITE_SAVING_LOGIC_ADDRESS=${logicAddress}
  `);

  console.log("\n🔍 Verify contracts with:");
  console.log(`npx hardhat verify --network sepolia ${usdcAddress} ${deployer.address}`);
  console.log(`npx hardhat verify --network sepolia ${certificateAddress} ${deployer.address} "https://metadata.example.com/deposit/"`);
  console.log(`npx hardhat verify --network sepolia ${vaultAddress} ${usdcAddress} ${deployer.address}`);
  console.log(`npx hardhat verify --network sepolia ${vaultManagerAddress} ${usdcAddress} ${deployer.address} ${deployer.address}`);
  console.log(`npx hardhat verify --network sepolia ${logicAddress} ${usdcAddress} ${certificateAddress} ${vaultAddress} ${vaultManagerAddress} ${deployer.address}`);

  console.log("\n✅ Ready for testing!");
  console.log("   Run: npx hardhat run scripts/1-admin-create-plans.ts --network sepolia\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
