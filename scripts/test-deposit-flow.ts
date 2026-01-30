import { ethers } from "hardhat";

/**
 * TEST SCRIPT: Test toàn bộ deposit flow
 * 1. Create deposit
 * 2. Check state before maturity
 * 3. Fast forward to maturity
 * 4. Check withdraw/renew options
 */

async function main() {
  console.log("\n🧪 TEST DEPOSIT LIFECYCLE\n");
  console.log("═".repeat(100));

  const [signer] = await ethers.getSigners();
  
  // Load contracts
  const SavingLogic = await ethers.getContractAt(
    "SavingLogic",
    "0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb"
  );

  const DepositVault = await ethers.getContractAt(
    "DepositVault",
    "0x0C8cFf298Da75dE2f88a00D970DD0cF23FF1cE45"
  );

  const USDC = await ethers.getContractAt(
    "MockUSDC",
    "0x73a9bEc9B836007904A19C30B2FD9B2f7A6720BA"
  );

  const Certificate = await ethers.getContractAt(
    "DepositCertificate",
    "0xE6C9dc8Ac77e8C2caFA3029C85EA980B72Ad5D21"
  );

  console.log(`👤 User: ${signer.address}`);
  console.log(`💼 USDC Balance: ${ethers.formatUnits(await USDC.balanceOf(signer.address), 6)} USDC\n`);

  // Test with Plan #1 (7 days)
  const planId = 1n;
  const depositAmount = ethers.parseUnits("1000", 6);

  console.log(`\n📋 TEST 1: Create Deposit`);
  console.log("─".repeat(100));
  
  try {
    // Check plan details
    const plan = await SavingLogic.plans(planId);
    console.log(`Plan #${planId}:`);
    console.log(`  Tenor: ${plan.tenorSeconds.toString()} seconds (${Number(plan.tenorSeconds) / (24*60*60)} days)`);
    console.log(`  APR: ${Number(plan.aprBps) / 100}%`);
    console.log(`  Penalty: ${Number(plan.earlyWithdrawPenaltyBps) / 100}%`);

    // Approve USDC to DepositVault
    console.log(`\n🔓 Approving ${ethers.formatUnits(depositAmount, 6)} USDC to DepositVault...`);
    const approveTx = await USDC.approve(await DepositVault.getAddress(), depositAmount);
    await approveTx.wait();
    console.log(`✅ Approved`);

    // Open deposit
    console.log(`\n💰 Opening deposit...`);
    const tx = await SavingLogic.openDeposit(planId, depositAmount);
    const receipt = await tx.wait();
    
    // Get depositId from event
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = SavingLogic.interface.parseLog(log);
        return parsed?.name === "DepositOpened";
      } catch { return false; }
    });
    
    const depositId = event ? SavingLogic.interface.parseLog(event)?.args[0] : 1n;
    console.log(`✅ Deposit created! ID: ${depositId}`);
    console.log(`📝 Transaction: ${tx.hash}`);

    // Read deposit details
    console.log(`\n📊 Deposit Details:`);
    const deposit = await Certificate.getDepositCore(depositId);
    const now = Math.floor(Date.now() / 1000);
    const timeToMaturity = Number(deposit.maturityAt) - now;
    
    console.log(`  Principal: ${ethers.formatUnits(deposit.principal, 6)} USDC`);
    console.log(`  Start: ${new Date(Number(deposit.startAt) * 1000).toLocaleString()}`);
    console.log(`  Maturity: ${new Date(Number(deposit.maturityAt) * 1000).toLocaleString()}`);
    console.log(`  Time to maturity: ${(timeToMaturity / (24*60*60)).toFixed(2)} days`);
    console.log(`  Status: ${["Active", "Withdrawn", "ManualRenewed", "AutoRenewed"][Number(deposit.status)]}`);

    // Calculate potential returns
    const tenorSeconds = Number(deposit.maturityAt) - Number(deposit.startAt);
    const interest = (deposit.principal * deposit.aprBpsAtOpen * BigInt(tenorSeconds)) 
                    / (BigInt(365 * 24 * 60 * 60) * 10000n);
    const penalty = (deposit.principal * deposit.penaltyBpsAtOpen) / 10000n;
    const afterPenalty = deposit.principal - penalty;

    console.log(`\n💵 Potential Returns:`);
    console.log(`  If hold to maturity:`);
    console.log(`    Principal:  ${ethers.formatUnits(deposit.principal, 6)} USDC`);
    console.log(`    Interest:   ${ethers.formatUnits(interest, 6)} USDC`);
    console.log(`    Total:      ${ethers.formatUnits(deposit.principal + interest, 6)} USDC`);
    console.log(`\n  If withdraw early now:`);
    console.log(`    Principal:  ${ethers.formatUnits(deposit.principal, 6)} USDC`);
    console.log(`    Penalty:    ${ethers.formatUnits(penalty, 6)} USDC (${Number(deposit.penaltyBpsAtOpen)/100}%)`);
    console.log(`    You get:    ${ethers.formatUnits(afterPenalty, 6)} USDC`);

    console.log(`\n🎯 Current State: BEFORE MATURITY`);
    console.log(`   Available action: Early Withdraw (with penalty)`);
    console.log(`   Cannot withdraw at maturity yet (${(timeToMaturity / 60).toFixed(0)} minutes left)`);

  } catch (error: any) {
    console.log(`\n❌ Error: ${error.message}`);
    if (error.data) {
      console.log(`   Data: ${error.data}`);
    }
  }

  console.log("\n" + "═".repeat(100));
  console.log("\n💡 To test full lifecycle:");
  console.log("1. Wait until maturity time passes");
  console.log("2. Run debug-deposit-states.ts to see 'At Maturity' state");
  console.log("3. Test withdrawAtMaturity() or renewDeposit()");
  console.log("4. Wait grace period (3 days) to test autoRenew()");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
