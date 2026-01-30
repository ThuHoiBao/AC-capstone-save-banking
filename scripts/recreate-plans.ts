import { ethers } from "hardhat";

/**
 * RECREATE PLANS: Tạo lại plans với tenor đúng
 * Note: Plans cũ vẫn tồn tại nhưng sẽ disable chúng
 */

async function main() {
  console.log("\n🔧 RECREATE PLANS WITH CORRECT TENOR\n");
  console.log("═".repeat(80));

  const [admin] = await ethers.getSigners();
  console.log(`👤 Admin: ${admin.address}\n`);

  // Load contract
  const SavingLogic = await ethers.getContractAt(
    "SavingLogic",
    "0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb"
  );

  // Disable old plans first
  console.log("📴 Step 1: Disable old plans\n");
  
  for (let planId = 1; planId <= 4; planId++) {
    try {
      const plan = await SavingLogic.plans(planId);
      if (plan.isActive) {
        console.log(`  Disabling Plan #${planId}...`);
        const tx = await SavingLogic.updatePlan(
          planId,
          plan.aprBps,
          plan.minDeposit,
          plan.maxDeposit,
          plan.earlyWithdrawPenaltyBps,
          false  // Disable
        );
        await tx.wait();
        console.log(`  ✅ Plan #${planId} disabled`);
      }
    } catch (error: any) {
      console.log(`  ⚠️  Could not disable Plan #${planId}: ${error.message}`);
    }
  }

  // Create new plans with correct tenor
  console.log("\n\n✨ Step 2: Create new plans with correct tenor\n");

  const newPlans = [
    {
      name: "Flexible Saver (7d)",
      tenorSeconds: 7 * 24 * 60 * 60,      // 604800 seconds
      aprBps: 500,                          // 5%
      minDeposit: ethers.parseUnits("100", 6),
      maxDeposit: ethers.parseUnits("10000", 6),
      penaltyBps: 300,                      // 3%
    },
    {
      name: "Growth Builder (30d)",
      tenorSeconds: 30 * 24 * 60 * 60,     // 2592000 seconds
      aprBps: 800,                          // 8%
      minDeposit: ethers.parseUnits("500", 6),
      maxDeposit: ethers.parseUnits("50000", 6),
      penaltyBps: 500,                      // 5%
    },
    {
      name: "Wealth Maximizer (90d)",
      tenorSeconds: 90 * 24 * 60 * 60,     // 7776000 seconds
      aprBps: 1200,                         // 12%
      minDeposit: ethers.parseUnits("1000", 6),
      maxDeposit: ethers.parseUnits("100000", 6),
      penaltyBps: 800,                      // 8%
    },
    {
      name: "Premium Plus (180d)",
      tenorSeconds: 180 * 24 * 60 * 60,    // 15552000 seconds
      aprBps: 1500,                         // 15%
      minDeposit: ethers.parseUnits("5000", 6),
      maxDeposit: ethers.parseUnits("500000", 6),
      penaltyBps: 1000,                     // 10%
    },
  ];

  let newPlanIds: number[] = [];

  for (const config of newPlans) {
    try {
      console.log(`📋 Creating: ${config.name}`);
      console.log(`   Tenor: ${config.tenorSeconds} seconds (${config.tenorSeconds / (24*60*60)} days)`);
      console.log(`   APR: ${config.aprBps / 100}%`);
      console.log(`   Min: ${ethers.formatUnits(config.minDeposit, 6)} USDC`);
      console.log(`   Max: ${ethers.formatUnits(config.maxDeposit, 6)} USDC`);
      console.log(`   Penalty: ${config.penaltyBps / 100}%`);

      const tx = await SavingLogic.createPlan(
        config.tenorSeconds,
        config.aprBps,
        config.minDeposit,
        config.maxDeposit,
        config.penaltyBps
      );

      const receipt = await tx.wait();
      
      // Get PlanCreated event
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = SavingLogic.interface.parseLog(log);
          return parsed?.name === "PlanCreated";
        } catch { return false; }
      });

      if (event) {
        const parsedEvent = SavingLogic.interface.parseLog(event);
        const planId = Number(parsedEvent?.args[0]);
        newPlanIds.push(planId);
        console.log(`   ✅ Created as Plan #${planId}`);
        console.log(`   📝 TX: ${tx.hash}\n`);
      } else {
        console.log(`   ✅ Created successfully`);
        console.log(`   📝 TX: ${tx.hash}\n`);
      }

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  // Verify new plans
  console.log("\n" + "═".repeat(80));
  console.log("\n✅ VERIFICATION\n");

  for (const planId of newPlanIds) {
    try {
      const plan = await SavingLogic.plans(planId);
      const tenorSeconds = Number(plan.tenorSeconds);
      console.log(`Plan #${planId}:`);
      console.log(`  Tenor: ${tenorSeconds} seconds = ${tenorSeconds / (24*60*60)} days`);
      console.log(`  APR: ${Number(plan.aprBps) / 100}%`);
      console.log(`  Active: ${plan.isActive}`);
      console.log(``);
    } catch (error: any) {
      console.log(`❌ Could not verify Plan #${planId}`);
    }
  }

  console.log("═".repeat(80));
  console.log("\n💡 Next Steps:\n");
  console.log("1. Update frontend to use new plan IDs:", newPlanIds.join(", "));
  console.log("2. Run: npx hardhat run scripts/debug-plan-details.ts --network sepolia");
  console.log("3. Test opening deposits with new plans");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
