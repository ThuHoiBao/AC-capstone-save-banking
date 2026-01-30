import { run } from "hardhat";

/**
 * Verify all deployed contracts on Sepolia Etherscan
 * 
 * Usage:
 * 1. Deploy contracts first: npx hardhat run deploy/deploy-v2-sepolia.ts --network sepolia
 * 2. Update addresses below
 * 3. Run: npx hardhat run scripts/verify-all-contracts.ts --network sepolia
 */

async function main() {
  console.log("\n🔍 Verifying contracts on Sepolia Etherscan...\n");

  // ===== UPDATE THESE ADDRESSES AFTER DEPLOYMENT =====
  const DEPLOYER_ADDRESS = "YOUR_DEPLOYER_ADDRESS";
  const USDC_ADDRESS = "YOUR_USDC_ADDRESS";
  const CERTIFICATE_ADDRESS = "YOUR_CERTIFICATE_ADDRESS";
  const DEPOSIT_VAULT_ADDRESS = "YOUR_DEPOSIT_VAULT_ADDRESS";
  const VAULT_MANAGER_ADDRESS = "YOUR_VAULT_MANAGER_ADDRESS";
  const SAVING_LOGIC_ADDRESS = "YOUR_SAVING_LOGIC_ADDRESS";

  if (USDC_ADDRESS === "YOUR_USDC_ADDRESS") {
    console.error("❌ Error: Please update contract addresses in this script");
    console.log("   Get addresses from deployment output\n");
    process.exit(1);
  }

  // ========== 1. Verify MockUSDC ==========
  console.log("1️⃣ Verifying MockUSDC...");
  try {
    await run("verify:verify", {
      address: USDC_ADDRESS,
      constructorArguments: [DEPLOYER_ADDRESS],
    });
    console.log("   ✅ MockUSDC verified\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ℹ️  MockUSDC already verified\n");
    } else {
      console.error("   ❌ Error:", error.message, "\n");
    }
  }

  // ========== 2. Verify DepositCertificate ==========
  console.log("2️⃣ Verifying DepositCertificate...");
  try {
    await run("verify:verify", {
      address: CERTIFICATE_ADDRESS,
      constructorArguments: [
        DEPLOYER_ADDRESS,
        "https://metadata.example.com/deposit/"
      ],
    });
    console.log("   ✅ DepositCertificate verified\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ℹ️  DepositCertificate already verified\n");
    } else {
      console.error("   ❌ Error:", error.message, "\n");
    }
  }

  // ========== 3. Verify DepositVault ==========
  console.log("3️⃣ Verifying DepositVault...");
  try {
    await run("verify:verify", {
      address: DEPOSIT_VAULT_ADDRESS,
      constructorArguments: [
        USDC_ADDRESS,
        DEPLOYER_ADDRESS
      ],
    });
    console.log("   ✅ DepositVault verified\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ℹ️  DepositVault already verified\n");
    } else {
      console.error("   ❌ Error:", error.message, "\n");
    }
  }

  // ========== 4. Verify VaultManager ==========
  console.log("4️⃣ Verifying VaultManager...");
  try {
    await run("verify:verify", {
      address: VAULT_MANAGER_ADDRESS,
      constructorArguments: [
        USDC_ADDRESS,
        DEPLOYER_ADDRESS, // feeReceiver
        DEPLOYER_ADDRESS  // owner
      ],
    });
    console.log("   ✅ VaultManager verified\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ℹ️  VaultManager already verified\n");
    } else {
      console.error("   ❌ Error:", error.message, "\n");
    }
  }

  // ========== 5. Verify SavingLogic ==========
  console.log("5️⃣ Verifying SavingLogic...");
  try {
    await run("verify:verify", {
      address: SAVING_LOGIC_ADDRESS,
      constructorArguments: [
        USDC_ADDRESS,
        CERTIFICATE_ADDRESS,
        DEPOSIT_VAULT_ADDRESS,
        VAULT_MANAGER_ADDRESS,
        DEPLOYER_ADDRESS
      ],
    });
    console.log("   ✅ SavingLogic verified\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ℹ️  SavingLogic already verified\n");
    } else {
      console.error("   ❌ Error:", error.message, "\n");
    }
  }

  // ========== Summary ==========
  console.log("═══════════════════════════════════════════════════");
  console.log("🎉 Verification complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log("\n📋 Verified Contracts:");
  console.log(`   MockUSDC:           ${USDC_ADDRESS}`);
  console.log(`   DepositCertificate: ${CERTIFICATE_ADDRESS}`);
  console.log(`   DepositVault:       ${DEPOSIT_VAULT_ADDRESS}`);
  console.log(`   VaultManager:       ${VAULT_MANAGER_ADDRESS}`);
  console.log(`   SavingLogic:        ${SAVING_LOGIC_ADDRESS}`);
  
  console.log("\n🔗 View on Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${USDC_ADDRESS}`);
  console.log(`   https://sepolia.etherscan.io/address/${CERTIFICATE_ADDRESS}`);
  console.log(`   https://sepolia.etherscan.io/address/${DEPOSIT_VAULT_ADDRESS}`);
  console.log(`   https://sepolia.etherscan.io/address/${VAULT_MANAGER_ADDRESS}`);
  console.log(`   https://sepolia.etherscan.io/address/${SAVING_LOGIC_ADDRESS}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
