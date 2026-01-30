import { ethers } from "hardhat";

/**
 * Script to check and activate all plans
 * This will enable all disabled plans so users can open deposits
 */

async function main() {
  console.log("\n🔍 CHECKING AND ACTIVATING PLANS\n");
  console.log("═".repeat(80));

  const [signer] = await ethers.getSigners();
  console.log(`📝 Using signer: ${signer.address}\n`);

  // Load SavingLogic contract
  const savingLogic = await ethers.getContractAt(
    "SavingLogic",
    "0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb"
  );

  console.log(`💼 SavingLogic: ${await savingLogic.getAddress()}\n`);

  // Check first 10 plans
  const MAX_PLANS = 10;
  const inactivePlans: number[] = [];
  const activePlans: number[] = [];

  console.log("📊 Checking plans...\n");

  for (let i = 1; i <= MAX_PLANS; i++) {
    try {
      const plan = await savingLogic.plans(i);
      
      if (plan.planId === 0n) {
        console.log(`Plan ${i}: Does not exist`);
        break; // No more plans
      }

      const tenorDays = Number(plan.tenorSeconds) / (24 * 3600);
      const aprPercent = Number(plan.aprBps) / 100;
      const minDeposit = ethers.formatUnits(plan.minDeposit, 6);
      const maxDeposit = ethers.formatUnits(plan.maxDeposit, 6);
      const penaltyPercent = Number(plan.earlyWithdrawPenaltyBps) / 100;

      if (plan.isActive) {
        activePlans.push(i);
        console.log(`✅ Plan ${i}: ACTIVE`);
      } else {
        inactivePlans.push(i);
        console.log(`❌ Plan ${i}: INACTIVE`);
      }

      console.log(`   Tenor: ${tenorDays.toFixed(2)} days | APR: ${aprPercent}% | Min: ${minDeposit} USDC | Max: ${maxDeposit} USDC | Penalty: ${penaltyPercent}%`);
      
    } catch (error) {
      console.log(`Plan ${i}: Error checking - ${error}`);
      break;
    }
  }

  console.log("\n" + "═".repeat(80));
  console.log(`\n📈 Summary:`);
  console.log(`   Active plans: ${activePlans.length} - [${activePlans.join(", ")}]`);
  console.log(`   Inactive plans: ${inactivePlans.length} - [${inactivePlans.join(", ")}]`);

  // Activate inactive plans
  if (inactivePlans.length > 0) {
    console.log(`\n🔧 Activating ${inactivePlans.length} inactive plan(s)...\n`);

    for (const planId of inactivePlans) {
      try {
        console.log(`⏳ Activating Plan ${planId}...`);
        
        // Get current plan details
        const plan = await savingLogic.plans(planId);
        
        // Use updatePlan to set isActive = true
        // updatePlan(planId, aprBps, minDeposit, maxDeposit, earlyWithdrawPenaltyBps, isActive)
        const tx = await savingLogic.updatePlan(
          planId,
          plan.aprBps,
          plan.minDeposit,
          plan.maxDeposit,
          plan.earlyWithdrawPenaltyBps,
          true  // isActive = true
        );
        console.log(`   Transaction sent: ${tx.hash}`);
        
        await tx.wait();
        console.log(`✅ Plan ${planId} activated successfully!\n`);
      } catch (error: any) {
        console.error(`❌ Failed to activate Plan ${planId}:`, error.message);
      }
    }

    // Verify activation
    console.log("\n" + "═".repeat(80));
    console.log("🔍 Verifying activation...\n");

    for (const planId of inactivePlans) {
      const plan = await savingLogic.plans(planId);
      if (plan.isActive) {
        console.log(`✅ Plan ${planId}: Now ACTIVE`);
      } else {
        console.log(`❌ Plan ${planId}: Still INACTIVE`);
      }
    }
  } else {
    console.log(`\n✅ All plans are already active! No action needed.`);
  }

  console.log("\n" + "═".repeat(80));
  console.log("✅ Script completed!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
