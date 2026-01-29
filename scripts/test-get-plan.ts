import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing SavingLogic.getPlan() on Sepolia...\n");

  // Load deployed contract
  const savingLogicAddress = "0x81B8b301ff4193e0DFD8b6044552B621830B6a44";
  const SavingLogic = await ethers.getContractFactory("SavingLogic");
  const savingLogic = SavingLogic.attach(savingLogicAddress);

  // Test plans 1-6
  for (let planId = 1; planId <= 6; planId++) {
    try {
      console.log(`\n📋 Plan ${planId}:`);
      const plan = await savingLogic.plans(planId);
      
      console.log(`   - planId: ${plan.planId}`);
      console.log(`   - tenorSeconds: ${plan.tenorSeconds}`);
      console.log(`   - aprBps: ${plan.aprBps}`);
      console.log(`   - minDeposit: ${ethers.formatUnits(plan.minDeposit, 6)} USDC`);
      console.log(`   - maxDeposit: ${ethers.formatUnits(plan.maxDeposit, 6)} USDC`);
      console.log(`   - penalty: ${plan.earlyWithdrawPenaltyBps} bps`);
      console.log(`   ✅ SUCCESS`);
    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }

  console.log("\n✅ Test complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
