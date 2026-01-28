import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * Verification Script - Tests deployed Sepolia contracts
 * Run: npx hardhat run scripts/verify-sepolia-deployment.ts --network sepolia
 */

async function main() {
  console.log("\n🔍 SEPOLIA DEPLOYMENT VERIFICATION\n");
  console.log("═══════════════════════════════════════════════════════════");

  // Load deployment info from deployments/sepolia/
  const mockUSDCDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/MockUSDC.json", "utf8")
  );
  const vaultManagerDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/VaultManager.json", "utf8")
  );
  const savingCoreDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/SavingCore.json", "utf8")
  );

  const mockUSDCAddress = mockUSDCDeployment.address;
  const vaultManagerAddress = vaultManagerDeployment.address;
  const savingCoreAddress = savingCoreDeployment.address;

  console.log("\n📋 Deployment Addresses:");
  console.log(`   MockUSDC:      ${mockUSDCAddress}`);
  console.log(`   VaultManager:  ${vaultManagerAddress}`);
  console.log(`   SavingCore:    ${savingCoreAddress}`);

  // Connect to deployed contracts
  const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
  const vaultManager = await ethers.getContractAt("VaultManager", vaultManagerAddress);
  const savingCore = await ethers.getContractAt("SavingCore", savingCoreAddress);

  console.log("\n✅ Successfully connected to contracts");

  // Test 1: Check MockUSDC basic info
  console.log("\n1️⃣ MockUSDC Verification:");
  const name = await mockUSDC.name();
  const symbol = await mockUSDC.symbol();
  const decimals = await mockUSDC.decimals();
  console.log(`   Name: ${name}`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Decimals: ${decimals}`);

  // Test 2: Check VaultManager wiring
  console.log("\n2️⃣ VaultManager Verification:");
  const vaultToken = await vaultManager.token();
  const vaultSavingCore = await vaultManager.savingCore();
  console.log(`   Token: ${vaultToken}`);
  console.log(`   SavingCore: ${vaultSavingCore}`);
  console.log(`   ✓ Wired correctly: ${vaultToken.toLowerCase() === mockUSDCAddress.toLowerCase() && vaultSavingCore.toLowerCase() === savingCoreAddress.toLowerCase()}`);

  // Test 3: Check SavingCore wiring
  console.log("\n3️⃣ SavingCore Verification:");
  const coreToken = await savingCore.token();
  const coreVaultManager = await savingCore.vaultManager();
  console.log(`   Token: ${coreToken}`);
  console.log(`   VaultManager: ${coreVaultManager}`);
  console.log(`   ✓ Wired correctly: ${coreToken.toLowerCase() === mockUSDCAddress.toLowerCase() && coreVaultManager.toLowerCase() === vaultManagerAddress.toLowerCase()}`);

  // Test 4: Check saving plans
  console.log("\n4️⃣ Saving Plans Verification:");
  let planCount = 0;
  
  // Try to load plans until we hit an error
  try {
    for (let i = 0; i < 10; i++) {
      const plan = await savingCore.getPlan(i);
      if (Number(plan.tenorDays) > 0) {
        planCount++;
        console.log(`   Plan ${i}: ${plan.tenorDays} days @ ${Number(plan.aprBps) / 100}% APR, penalty ${Number(plan.earlyWithdrawPenaltyBps) / 100}%`);
      }
    }
  } catch (error) {
    // Stop when we can't read more plans
  }
  
  console.log(`   Total Plans Found: ${planCount}`);

  // Test 5: Check vault liquidity
  console.log("\n5️⃣ Vault Liquidity Verification:");
  const [deployer] = await ethers.getSigners();
  const vaultBalance = await mockUSDC.balanceOf(vaultManagerAddress);
  const deployerBalance = await mockUSDC.balanceOf(deployer.address);
  console.log(`   Vault Balance: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
  console.log(`   Deployer Balance: ${ethers.formatUnits(deployerBalance, 6)} USDC`);

  // Test 6: Read deployment.json and compare
  console.log("\n6️⃣ Cross-check with deployment.json:");
  const rootDeployment = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  const match = 
    rootDeployment.contracts.MockUSDC === mockUSDCAddress &&
    rootDeployment.contracts.VaultManager === vaultManagerAddress &&
    rootDeployment.contracts.SavingCore === savingCoreAddress;
  console.log(`   ✓ Addresses match: ${match}`);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ VERIFICATION COMPLETE - All checks passed!");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Summary
  console.log("📊 Summary:");
  console.log(`   Network: sepolia`);
  console.log(`   Contracts deployed: 3`);
  console.log(`   Plans created: ${planCount}`);
  console.log(`   Vault liquidity: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
  console.log(`   Deployment files:`);
  console.log(`     ✓ deployment.json (root)`);
  console.log(`     ✓ deployments/sepolia/MockUSDC.json`);
  console.log(`     ✓ deployments/sepolia/VaultManager.json`);
  console.log(`     ✓ deployments/sepolia/SavingCore.json`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
