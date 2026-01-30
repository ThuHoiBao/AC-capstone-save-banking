import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * Create Missing Plans on Sepolia
 * Run: npx hardhat run scripts/create-plans-sepolia.ts --network sepolia
 */

async function main() {
  console.log("\n🔧 CREATING SAVING PLANS ON SEPOLIA\n");
  console.log("═══════════════════════════════════════════════════════════");

  // Load deployment
  const savingCoreDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/SavingCore.json", "utf8")
  );

  const savingCoreAddress = savingCoreDeployment.address;
  console.log(`\nSavingCore: ${savingCoreAddress}`);

  // Connect
  const savingCore = await ethers.getContractAt("SavingCore", savingCoreAddress);
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Check existing plans
  console.log("\n1️⃣ Checking existing plans...");
  let existingPlans = 0;
  for (let i = 0; i < 10; i++) {
    try {
      const plan = await savingCore.getPlan(i);
      const tenorDays = Number(plan.tenorSeconds) / (24 * 60 * 60);
      if (tenorDays > 0) {
        existingPlans++;
        console.log(`   Plan ${i}: ${tenorDays} days @ ${Number(plan.aprBps) / 100}% APR`);
      }
    } catch {}
  }
  console.log(`   Found ${existingPlans} existing plans`);

  // Create 5 plans
  console.log("\n2️⃣ Creating saving plans...");
  const plansToCreate = [
    { tenor: 7, apr: 300, min: 0, max: 0, penalty: 1000 },      // 7 days, 3%, 10% penalty
    { tenor: 30, apr: 500, min: 0, max: 0, penalty: 800 },      // 30 days, 5%, 8% penalty
    { tenor: 90, apr: 800, min: 0, max: 0, penalty: 500 },      // 90 days, 8%, 5% penalty
    { tenor: 180, apr: 1000, min: 0, max: 0, penalty: 300 },    // 180 days, 10%, 3% penalty
    { tenor: 365, apr: 1200, min: 0, max: 0, penalty: 100 },    // 365 days, 12%, 1% penalty
  ];

  let successCount = 0;
  for (const plan of plansToCreate) {
    try {
      console.log(`\n   Creating: ${plan.tenor} days @ ${plan.apr / 100}% APR...`);
      
      // Estimate gas
      const gasEstimate = await savingCore.createPlan.estimateGas(
        plan.tenor,
        plan.apr,
        plan.min,
        plan.max,
        plan.penalty
      );
      
      const tx = await savingCore.createPlan(
        plan.tenor,
        plan.apr,
        plan.min,
        plan.max,
        plan.penalty,
        {
          gasLimit: gasEstimate * 120n / 100n, // +20%
        }
      );
      
      await tx.wait();
      successCount++;
      console.log(`   ✅ Created successfully`);
      
      // Delay 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error: any) {
      const errorMsg = error.message?.split('\n')[0] || 'Unknown error';
      console.log(`   ⚠️ Failed: ${errorMsg}`);
      
      // If already exists, continue
      if (errorMsg.includes('AlreadyExists') || errorMsg.includes('already')) {
        console.log(`   ℹ️  Plan already exists, skipping...`);
      }
    }
  }

  // Verify final state
  console.log("\n3️⃣ Final verification...");
  let finalPlans = [];
  for (let i = 0; i < 10; i++) {
    try {
      const plan = await savingCore.getPlan(i);
      if (Number(plan.tenorDays) > 0) {
        finalPlans.push({
          id: i,
          tenor: Number(plan.tenorDays),
          apr: Number(plan.aprBps) / 100,
          penalty: Number(plan.earlyWithdrawPenaltyBps) / 100
        });
      }
    } catch {}
  }

  console.log("\n   Final plans:");
  console.log("   ┌────┬──────────┬────────┬──────────┬────────┐");
  console.log("   │ ID │  Tenor   │  APR   │ Penalty  ┐");
  console.log("   │ ID │  Tenor   │  APR   │ Penalty  │");
  console.log("   ├────┼──────────┼────────┼──────────┤");
  for (const plan of finalPlans) {
    console.log(`   │ ${String(plan.id).padStart(2)} │ ${String(plan.tenor).padStart(5)} days │ ${String(plan.apr).padStart(5)}% │ ${String(plan.penalty).padStart(7)}% │`);
  }
  console.log("   └────┴──────────┴────────┴──────────┘");

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`✅ COMPLETE - ${finalPlans.length} plans available`);
  console.log("═══════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
