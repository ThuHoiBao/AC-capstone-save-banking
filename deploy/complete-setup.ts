import { ethers } from "hardhat";

/**
 * Complete contract connections for already deployed contracts
 * Use this if deployment failed at connection step
 */
async function main() {
  console.log("\n🔗 Completing Contract Connections...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Already deployed addresses
  const USDC_ADDRESS = "0x73a9bEc9B836007904A19C30B2FD9B2f7A6720BA";
  const CERTIFICATE_ADDRESS = "0x2A4A34e3C69D862e1dAA94C64C5747f022160AB4";
  const DEPOSIT_VAULT_ADDRESS = "0x077a4941565e0194a00Cd8DABE1acA09111F7B06";
  const VAULT_MANAGER_ADDRESS = "0xFf586ADCE68Ed8f0FcfbFA268Ba81E438900e136";
  const SAVING_LOGIC_ADDRESS = "0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb";

  // Get contract instances
  const usdc = await ethers.getContractAt("MockUSDC", USDC_ADDRESS);
  const depositVault = await ethers.getContractAt("DepositVault", DEPOSIT_VAULT_ADDRESS);
  const depositCertificate = await ethers.getContractAt("DepositCertificate", CERTIFICATE_ADDRESS);
  const vaultManager = await ethers.getContractAt("VaultManager", VAULT_MANAGER_ADDRESS);

  // Get gas price
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ? feeData.gasPrice * 120n / 100n : undefined; // +20%
  
  console.log("Gas price:", ethers.formatUnits(gasPrice || 0n, "gwei"), "gwei\n");

  // ========== 1. DepositVault.setSavingLogic() ==========
  console.log("1️⃣ Setting SavingLogic in DepositVault...");
  try {
    const currentLogic = await depositVault.savingLogic();
    if (currentLogic === SAVING_LOGIC_ADDRESS) {
      console.log("   ℹ️  Already set correctly");
    } else {
      const tx1 = await depositVault.setSavingLogic(SAVING_LOGIC_ADDRESS, { gasPrice });
      await tx1.wait();
      console.log("   ✅ Done");
    }
  } catch (error: any) {
    console.error("   ❌ Error:", error.message);
  }

  // ========== 2. DepositCertificate.setSavingLogic() ==========
  console.log("\n2️⃣ Setting SavingLogic in DepositCertificate...");
  try {
    const currentLogic = await depositCertificate.savingLogic();
    if (currentLogic === SAVING_LOGIC_ADDRESS) {
      console.log("   ℹ️  Already set correctly");
    } else {
      const tx2 = await depositCertificate.setSavingLogic(SAVING_LOGIC_ADDRESS, { gasPrice });
      await tx2.wait();
      console.log("   ✅ Done");
    }
  } catch (error: any) {
    console.error("   ❌ Error:", error.message);
  }

  // ========== 3. VaultManager.setSavingLogic() ==========
  console.log("\n3️⃣ Setting SavingLogic in VaultManager...");
  try {
    const currentLogic = await vaultManager.savingLogic();
    if (currentLogic === SAVING_LOGIC_ADDRESS) {
      console.log("   ℹ️  Already set correctly");
    } else {
      const tx3 = await vaultManager.setSavingLogic(SAVING_LOGIC_ADDRESS, { gasPrice });
      await tx3.wait();
      console.log("   ✅ Done");
    }
  } catch (error: any) {
    console.error("   ❌ Error:", error.message);
  }

  // ========== 4. Fund VaultManager ==========
  console.log("\n4️⃣ Funding VaultManager with interest pool...");
  try {
    const vaultBalance = await usdc.balanceOf(VAULT_MANAGER_ADDRESS);
    console.log("   Current balance:", ethers.formatUnits(vaultBalance, 6), "USDC");

    if (vaultBalance < ethers.parseUnits("10000", 6)) {
      const fundAmount = ethers.parseUnits("50000", 6);
      
      // Check deployer balance
      const deployerBalance = await usdc.balanceOf(deployer.address);
      console.log("   Deployer balance:", ethers.formatUnits(deployerBalance, 6), "USDC");
      
      if (deployerBalance < fundAmount) {
        console.log("   Minting USDC to deployer...");
        const mintTx = await usdc.mint(deployer.address, fundAmount, { gasPrice });
        await mintTx.wait();
        console.log("   ✅ Minted");
      }

      console.log("   Approving VaultManager...");
      const approveTx = await usdc.approve(VAULT_MANAGER_ADDRESS, fundAmount, { gasPrice });
      await approveTx.wait();
      
      console.log("   Funding...");
      const fundTx = await vaultManager.fundVault(fundAmount, { gasPrice });
      await fundTx.wait();
      
      const newBalance = await usdc.balanceOf(VAULT_MANAGER_ADDRESS);
      console.log("   ✅ VaultManager funded:", ethers.formatUnits(newBalance, 6), "USDC");
    } else {
      console.log("   ℹ️  Already funded");
    }
  } catch (error: any) {
    console.error("   ❌ Error:", error.message);
  }

  // ========== Summary ==========
  console.log("\n\n═══════════════════════════════════════════════════");
  console.log("✅ Setup Complete!");
  console.log("═══════════════════════════════════════════════════\n");

  console.log("📋 Contract Addresses:");
  console.log("   MockUSDC:           ", USDC_ADDRESS);
  console.log("   DepositCertificate: ", CERTIFICATE_ADDRESS);
  console.log("   DepositVault:       ", DEPOSIT_VAULT_ADDRESS);
  console.log("   VaultManager:       ", VAULT_MANAGER_ADDRESS);
  console.log("   SavingLogic:        ", SAVING_LOGIC_ADDRESS);

  console.log("\n✅ Next steps:");
  console.log("   1. Verify contracts: npx hardhat run scripts/verify-all-contracts.ts --network sepolia");
  console.log("   2. Create plans: npx hardhat run scripts/1-admin-create-plans.ts --network sepolia\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
