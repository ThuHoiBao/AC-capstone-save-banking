import { ethers } from "hardhat";

/**
 * DEBUG SCRIPT: Kiểm tra chi tiết Plans onchain
 * Mục đích: Tìm ra tại sao Duration hiển thị "0 days"
 */

async function main() {
  console.log("\n🔍 DEBUG PLAN DETAILS\n");
  console.log("═".repeat(80));

  // Load deployment
  const SavingLogic = await ethers.getContractAt(
    "SavingLogic",
    "0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb"
  );

  console.log("📍 SavingLogic:", await SavingLogic.getAddress());
  console.log("\n");

  // Check plans 1, 2, 3, 4
  for (let planId = 1; planId <= 4; planId++) {
    try {
      const plan = await SavingLogic.plans(planId);
      
      console.log(`\n📋 PLAN #${planId}`);
      console.log("─".repeat(80));
      console.log(`Plan ID:          ${plan.planId}`);
      console.log(`Tenor Seconds:    ${plan.tenorSeconds.toString()}`);
      console.log(`APR (bps):        ${plan.aprBps}`);
      console.log(`Min Deposit:      ${ethers.formatUnits(plan.minDeposit, 6)} USDC`);
      console.log(`Max Deposit:      ${ethers.formatUnits(plan.maxDeposit, 6)} USDC`);
      console.log(`Early Penalty:    ${Number(plan.earlyWithdrawPenaltyBps) / 100}%`);
      console.log(`Is Active:        ${plan.isActive}`);

      // Convert tenor to human readable
      const tenorSeconds = Number(plan.tenorSeconds);
      const days = Math.floor(tenorSeconds / (24 * 60 * 60));
      const hours = Math.floor((tenorSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((tenorSeconds % (60 * 60)) / 60);
      const seconds = tenorSeconds % 60;

      console.log("\n📊 TENOR BREAKDOWN:");
      console.log(`  Raw Value:      ${tenorSeconds} seconds`);
      console.log(`  Days:           ${days} days`);
      console.log(`  Hours:          ${hours} hours`);
      console.log(`  Minutes:        ${minutes} minutes`);
      console.log(`  Seconds:        ${seconds} seconds`);

      // Expected values
      const expectedValues: { [key: number]: number } = {
        1: 7 * 24 * 60 * 60,      // 7 days = 604800
        2: 30 * 24 * 60 * 60,     // 30 days = 2592000
        3: 90 * 24 * 60 * 60,     // 90 days = 7776000
        4: 180 * 24 * 60 * 60,    // 180 days = 15552000
      };

      if (expectedValues[planId]) {
        const expected = expectedValues[planId];
        const isCorrect = tenorSeconds === expected;
        console.log(`\n✅ VALIDATION:`);
        console.log(`  Expected:       ${expected} seconds (${expected / (24*60*60)} days)`);
        console.log(`  Actual:         ${tenorSeconds} seconds`);
        console.log(`  Status:         ${isCorrect ? "✅ CORRECT" : "❌ WRONG!"}`);
        
        if (!isCorrect) {
          console.log(`\n🚨 ERROR: Plan ${planId} has wrong tenor value!`);
          console.log(`   Current:  ${tenorSeconds}`);
          console.log(`   Should be: ${expected}`);
          console.log(`   Difference: ${Math.abs(tenorSeconds - expected)} seconds`);
        }
      }

    } catch (error: any) {
      console.log(`\n❌ Plan #${planId}: ${error.message}`);
    }
  }

  console.log("\n" + "═".repeat(80));
  console.log("\n💡 RECOMMENDATIONS:\n");
  console.log("If tenor values are wrong, you need to:");
  console.log("1. Create new plans with correct tenor values");
  console.log("2. Or update existing plans using updatePlan()");
  console.log("3. Correct format: tenorSeconds = days * 24 * 60 * 60");
  console.log("\nExample:");
  console.log("  7 days   = 7 * 86400   = 604800 seconds");
  console.log("  30 days  = 30 * 86400  = 2592000 seconds");
  console.log("  90 days  = 90 * 86400  = 7776000 seconds");
  console.log("  180 days = 180 * 86400 = 15552000 seconds");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
