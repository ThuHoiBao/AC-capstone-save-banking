import { ethers } from "hardhat";

/**
 * Script 1: Admin tạo các saving plans
 * Run: npx hardhat run scripts/1-admin-create-plans.ts --network sepolia
 */
async function main() {
  console.log("\n👨‍💼 Admin: Creating Saving Plans\n");

  const [admin] = await ethers.getSigners();
  console.log("Admin address:", admin.address);
  console.log("Admin balance:", ethers.formatEther(await ethers.provider.getBalance(admin.address)), "ETH\n");

  // Deployed contract addresses on Sepolia
  const SAVING_LOGIC_ADDRESS = "0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb";

  console.log("📍 SavingLogic address:", SAVING_LOGIC_ADDRESS);

  const savingLogic = await ethers.getContractAt("SavingLogic", SAVING_LOGIC_ADDRESS);

  // ========== Create Plans ==========
  console.log("\n📋 Creating 3 saving plans...\n");

  // Plan 1: 30 days @ 5% APR, 3% penalty
  console.log("1️⃣ Creating Plan 1: 30-Day Term");
  const tx1 = await savingLogic.createPlan(
    30 * 24 * 60 * 60,  // 30 days in seconds
    500,   // 5% APR (500 bps)
    ethers.parseUnits("100", 6),   // min 100 USDC
    ethers.parseUnits("10000", 6), // max 10,000 USDC
    300    // 3% early withdrawal penalty
  );
  await tx1.wait();
  console.log("   ✅ Plan ID 1 created");
  console.log("      Tenor: 30 days");
  console.log("      APR: 5%");
  console.log("      Min: 100 USDC");
  console.log("      Max: 10,000 USDC");
  console.log("      Penalty: 3%");

  // Plan 2: 90 days @ 8% APR, 5% penalty
  console.log("\n2️⃣ Creating Plan 2: 90-Day Term");
  const tx2 = await savingLogic.createPlan(
    90 * 24 * 60 * 60,  // 90 days in seconds
    800,   // 8% APR (800 bps)
    ethers.parseUnits("500", 6),   // min 500 USDC
    ethers.parseUnits("50000", 6), // max 50,000 USDC
    500    // 5% early withdrawal penalty
  );
  await tx2.wait();
  console.log("   ✅ Plan ID 2 created");
  console.log("      Tenor: 90 days");
  console.log("      APR: 8%");
  console.log("      Min: 500 USDC");
  console.log("      Max: 50,000 USDC");
  console.log("      Penalty: 5%");

  // Plan 3: 180 days @ 12% APR, 8% penalty
  console.log("\n3️⃣ Creating Plan 3: 180-Day Term");
  const tx3 = await savingLogic.createPlan(
    180 * 24 * 60 * 60,  // 180 days in seconds
    1200,  // 12% APR (1200 bps)
    ethers.parseUnits("1000", 6),   // min 1,000 USDC
    ethers.parseUnits("100000", 6), // max 100,000 USDC
    800    // 8% early withdrawal penalty
  );
  await tx3.wait();
  console.log("   ✅ Plan ID 3 created");
  console.log("      Tenor: 180 days");
  console.log("      APR: 12%");
  console.log("      Min: 1,000 USDC");
  console.log("      Max: 100,000 USDC");
  console.log("      Penalty: 8%");

  // ========== Verify Plans ==========
  console.log("\n\n📊 Verifying created plans...\n");

  for (let planId = 1; planId <= 3; planId++) {
    const plan = await savingLogic.getPlan(planId);
    const apr = Number(plan.aprBps) / 100;
    const penalty = Number(plan.earlyWithdrawPenaltyBps) / 100;
    const minDeposit = ethers.formatUnits(plan.minDeposit, 6);
    const maxDeposit = ethers.formatUnits(plan.maxDeposit, 6);
    const tenorDays = Number(plan.tenorSeconds) / (24 * 60 * 60);

    console.log(`Plan ${planId}:`);
    console.log(`   Tenor:     ${tenorDays} days`);
    console.log(`   APR:       ${apr}%`);
    console.log(`   Range:     ${minDeposit} - ${maxDeposit} USDC`);
    console.log(`   Penalty:   ${penalty}%`);
    console.log(`   Status:    ${plan.isActive ? "Active ✅" : "Inactive"}\n`);
  }

  console.log("═══════════════════════════════════════════════════");
  console.log("🎉 Plans created successfully!");
  console.log("═══════════════════════════════════════════════════");
  console.log("\n✅ Next step: Run script 2 to open deposits");
  console.log("   npx hardhat run scripts/2-user-open-deposit.ts --network sepolia\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
