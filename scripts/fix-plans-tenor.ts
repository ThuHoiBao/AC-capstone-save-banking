import { ethers } from "hardhat";

/**
 * FIX SCRIPT: Update Plans với tenor đúng (seconds)
 * Nếu plans hiện tại có tenor sai, script này sẽ update lại
 */

async function main() {
  console.log("\n🔧 FIX PLAN TENOR VALUES\n");
  console.log("═".repeat(80));

  const [owner] = await ethers.getSigners();
  console.log(`👤 Admin: ${owner.address}\n`);

  // Load contract
  const SavingLogic = await ethers.getContractAt(
    "SavingLogic",
    "0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb"
  );

  // Correct plan configurations
  const correctPlans = [
    {
      id: 1,
      name: "Flexible Saver (7d)",
      tenorSeconds: 7 * 24 * 60 * 60,      // 604800
      aprBps: 500,                          // 5%
      minDeposit: ethers.parseUnits("100", 6),
      maxDeposit: ethers.parseUnits("10000", 6),
      penaltyBps: 300,                      // 3%
    },
    {
      id: 2,
      name: "Growth Builder (30d)",
      tenorSeconds: 30 * 24 * 60 * 60,     // 2592000
      aprBps: 800,                          // 8%
      minDeposit: ethers.parseUnits("500", 6),
      maxDeposit: ethers.parseUnits("50000", 6),
      penaltyBps: 500,                      // 5%
    },
    {
      id: 3,
      name: "Wealth Maximizer (90d)",
      tenorSeconds: 90 * 24 * 60 * 60,     // 7776000
      aprBps: 1200,                         // 12%
      minDeposit: ethers.parseUnits("1000", 6),
      maxDeposit: ethers.parseUnits("100000", 6),
      penaltyBps: 800,                      // 8%
    },
    {
      id: 4,
      name: "Premium Plus (180d)",
      tenorSeconds: 180 * 24 * 60 * 60,    // 15552000
      aprBps: 1500,                         // 15%
      minDeposit: ethers.parseUnits("5000", 6),
      maxDeposit: ethers.parseUnits("500000", 6),
      penaltyBps: 1000,                     // 10%
    },
  ];

  for (const config of correctPlans) {
    try {
      console.log(`\n📋 Checking Plan #${config.id}: ${config.name}`);
      console.log("─".repeat(80));

      // Read current plan
      const currentPlan = await SavingLogic.plans(config.id);
      const currentTenor = Number(currentPlan.tenorSeconds);

      console.log(`Current tenor:  ${currentTenor} seconds (${currentTenor / (24*60*60)} days)`);
      console.log(`Expected tenor: ${config.tenorSeconds} seconds (${config.tenorSeconds / (24*60*60)} days)`);

      if (currentTenor === config.tenorSeconds) {
        console.log(`✅ Plan #${config.id} tenor is CORRECT - no update needed`);
        continue;
      }

      console.log(`\n🔄 Updating Plan #${config.id}...`);
      
      // Update plan
      const tx = await SavingLogic.updatePlan(
        config.id,
        config.aprBps,
        config.minDeposit,
        config.maxDeposit,
        config.penaltyBps,
        true  // isActive
      );

      console.log(`📝 Transaction: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Updated in block ${receipt?.blockNumber}`);

      // Verify update
      const updatedPlan = await SavingLogic.plans(config.id);
      const newTenor = Number(updatedPlan.tenorSeconds);
      console.log(`\n✔️  Verification:`);
      console.log(`   New tenor: ${newTenor} seconds (${newTenor / (24*60*60)} days)`);
      console.log(`   Status: ${newTenor === config.tenorSeconds ? "✅ SUCCESS" : "❌ FAILED"}`);

    } catch (error: any) {
      console.log(`\n❌ Error updating Plan #${config.id}:`);
      console.log(`   ${error.message}`);
    }
  }

  console.log("\n" + "═".repeat(80));
  console.log("\n✅ Plan tenor fix complete!\n");
  console.log("Next steps:");
  console.log("1. Run: npx hardhat run scripts/debug-plan-details.ts --network sepolia");
  console.log("2. Refresh frontend to see correct durations");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
