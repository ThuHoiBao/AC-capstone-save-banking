import { ethers } from "hardhat";

/**
 * Debug Plans Script - Check why plans have 0 duration
 * Run: npx hardhat run scripts/debug-plans.ts --network sepolia
 */

async function main() {
  console.log("\n🔍 DEBUG PLANS - Check Duration Issue\n");
  console.log("═══════════════════════════════════════════════════════════");

  // Contract addresses from Sepolia deployment
  const SAVING_LOGIC_ADDRESS = "0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb";

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log();

  // Connect to SavingLogic contract
  const SavingLogic = await ethers.getContractFactory("SavingLogic");
  const savingLogic = SavingLogic.attach(SAVING_LOGIC_ADDRESS);

  console.log("📋 Fetching all plans...\n");

  // Check plans 1, 2, 3
  for (let i = 1; i <= 5; i++) {
    try {
      const plan = await savingLogic.plans(i);
      
      console.log(`Plan #${i}:`);
      console.log(`  planId: ${plan.planId}`);
      console.log(`  tenorSeconds (raw): ${plan.tenorSeconds}`);
      console.log(`  tenorSeconds (number): ${Number(plan.tenorSeconds)}`);
      
      const tenorDays = Number(plan.tenorSeconds) / (24 * 60 * 60);
      console.log(`  Calculated days: ${tenorDays}`);
      console.log(`  Calculated hours: ${tenorDays * 24}`);
      console.log(`  Calculated minutes: ${tenorDays * 24 * 60}`);
      
      console.log(`  APR: ${Number(plan.aprBps) / 100}%`);
      console.log(`  Min Deposit: ${ethers.formatUnits(plan.minDeposit, 6)} USDC`);
      console.log(`  Max Deposit: ${ethers.formatUnits(plan.maxDeposit, 6)} USDC`);
      console.log(`  Penalty: ${Number(plan.earlyWithdrawPenaltyBps) / 100}%`);
      console.log(`  Active: ${plan.isActive}`);
      console.log();
    } catch (error) {
      console.log(`Plan #${i}: Not found or error`);
      console.log();
    }
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("\n💡 Analysis:");
  console.log("If tenorSeconds is very small (like 30, 90, 180):");
  console.log("  → Plans were created with DAYS instead of SECONDS");
  console.log("  → Need to recreate plans with correct values");
  console.log();
  console.log("Correct values should be:");
  console.log("  7 days   = 604800 seconds");
  console.log("  30 days  = 2592000 seconds");
  console.log("  90 days  = 7776000 seconds");
  console.log("  180 days = 15552000 seconds");
  console.log("═══════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
