import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * Create Plans on Sepolia (New Architecture)
 * Run: npx hardhat run scripts/create-plans-new.ts --network sepolia
 */

async function main() {
  console.log("\n🔧 CREATING SAVING PLANS (NEW ARCHITECTURE)\n");
  console.log("═══════════════════════════════════════════════════════════");

  // Load deployment
  const savingLogicDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/SavingLogic.json", "utf8")
  );

  const savingLogicAddress = savingLogicDeployment.address;
  console.log(`\nSavingLogic: ${savingLogicAddress}`);

  // Connect
  const savingLogic = await ethers.getContractAt("SavingLogic", savingLogicAddress);
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Check existing plans
  console.log("\n1️⃣ Checking existing plans...");
  let existingPlans = 0;
  for (let i = 1; i <= 5; i++) {
    try {
      const plan = await savingLogic.getPlan(i);
      if (Number(plan.tenorSeconds) > 0) {
        existingPlans++;
        const days = Number(plan.tenorSeconds) / 86400;
        console.log(`   Plan ${i}: ${days} days @ ${Number(plan.aprBps) / 100}% APR`);
      }
    } catch {
      console.log(`   Plan ${i}: Not found`);
    }
  }
  console.log(`   Found ${existingPlans} existing plans`);

  if (existingPlans >= 3) {
    console.log("\n✅ Sufficient plans already exist!");
    return;
  }

  // Create 3 plans
  console.log("\n2️⃣ Creating saving plans...");
  const plansToCreate = [
    { 
      name: "Flexible Saver",
      tenorDays: 30, 
      aprBps: 600,        // 6% APR
      minDeposit: ethers.parseUnits("100", 6),     // 100 USDC
      maxDeposit: ethers.parseUnits("100000", 6),  // 100,000 USDC
      penaltyBps: 300     // 3% penalty
    },
    { 
      name: "Growth Builder",
      tenorDays: 90, 
      aprBps: 800,        // 8% APR
      minDeposit: ethers.parseUnits("500", 6),     // 500 USDC
      maxDeposit: ethers.parseUnits("500000", 6),  // 500,000 USDC
      penaltyBps: 200     // 2% penalty
    },
    { 
      name: "Wealth Maximizer",
      tenorDays: 180, 
      aprBps: 1000,       // 10% APR
      minDeposit: ethers.parseUnits("1000", 6),    // 1,000 USDC
      maxDeposit: ethers.parseUnits("1000000", 6), // 1,000,000 USDC
      penaltyBps: 100     // 1% penalty
    },
  ];

  let successCount = 0;
  for (let i = 0; i < plansToCreate.length; i++) {
    const plan = plansToCreate[i];
    const planId = existingPlans + i + 1;
    
    try {
      console.log(`\n   Creating Plan ${planId}: ${plan.name}...`);
      console.log(`   - Tenor: ${plan.tenorDays} days`);
      console.log(`   - APR: ${plan.aprBps / 100}%`);
      console.log(`   - Min: ${ethers.formatUnits(plan.minDeposit, 6)} USDC`);
      console.log(`   - Max: ${ethers.formatUnits(plan.maxDeposit, 6)} USDC`);
      console.log(`   - Penalty: ${plan.penaltyBps / 100}%`);
      
      const tenorSeconds = plan.tenorDays * 24 * 3600;
      
      // Estimate gas
      const gasEstimate = await savingLogic.createPlan.estimateGas(
        tenorSeconds,
        plan.aprBps,
        plan.minDeposit,
        plan.maxDeposit,
        plan.penaltyBps
      );
      
      console.log(`   - Gas estimate: ${gasEstimate.toString()}`);
      
      const tx = await savingLogic.createPlan(
        tenorSeconds,
        plan.aprBps,
        plan.minDeposit,
        plan.maxDeposit,
        plan.penaltyBps,
        {
          gasLimit: gasEstimate * 120n / 100n, // +20%
        }
      );
      
      console.log(`   - TX: ${tx.hash}`);
      const receipt = await tx.wait();
      
      successCount++;
      console.log(`   ✅ Created successfully! (Block: ${receipt?.blockNumber})`);
      
      // Delay 5 seconds between transactions
      if (i < plansToCreate.length - 1) {
        console.log(`   ⏳ Waiting 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error: any) {
      console.error(`   ❌ Failed to create plan ${planId}:`, error.message);
    }
  }

  console.log(`\n3️⃣ Summary`);
  console.log(`   Created: ${successCount}/${plansToCreate.length} plans`);
  
  // Verify created plans
  console.log("\n4️⃣ Verifying plans...");
  for (let i = 1; i <= existingPlans + successCount; i++) {
    try {
      const plan = await savingLogic.getPlan(i);
      const days = Number(plan.tenorSeconds) / 86400;
      console.log(`   ✓ Plan ${i}: ${days} days @ ${Number(plan.aprBps) / 100}% APR`);
    } catch {
      console.log(`   ✗ Plan ${i}: Not found`);
    }
  }

  console.log("\n✅ DONE!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
