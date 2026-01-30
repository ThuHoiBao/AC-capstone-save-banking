import { ethers } from "hardhat";

/**
 * DEBUG SCRIPT: Kiểm tra trạng thái của Deposits
 * Mục đích: Xem deposit nào đang Active, Withdrawn, Renewed, etc.
 */

async function main() {
  console.log("\n🔍 DEBUG DEPOSIT STATES\n");
  console.log("═".repeat(100));

  const [signer] = await ethers.getSigners();
  const userAddress = "0xF7227428Ef0e2F73560Ce6Da5EaFcff0bbBE109f";

  // Load contracts
  const SavingLogic = await ethers.getContractAt(
    "SavingLogic",
    "0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb"
  );

  const Certificate = await ethers.getContractAt(
    "DepositCertificate",
    "0xe6c9dc8ac77e8c2cafa3029c85ea980b72ad5d21"
  );

  console.log(`📍 User Address: ${userAddress}`);
  console.log(`📜 Certificate:  ${await Certificate.getAddress()}`);
  console.log(`💼 SavingLogic:  ${await SavingLogic.getAddress()}\n`);

  // Get NFT balance
  const balance = await Certificate.balanceOf(userAddress);
  console.log(`💳 Total NFTs owned: ${balance.toString()}\n`);

  if (balance === 0n) {
    console.log("⚠️  User has no deposits yet\n");
    return;
  }

  // Status enum mapping
  const statusNames = ["Active", "Withdrawn", "ManualRenewed", "AutoRenewed"];

  // Check each deposit
  for (let i = 0; i < Number(balance); i++) {
    try {
      const tokenId = await Certificate.tokenOfOwnerByIndex(userAddress, i);
      console.log(`\n📋 DEPOSIT #${tokenId}`);
      console.log("─".repeat(100));

      // Get deposit core data
      const deposit = await Certificate.getDepositCore(tokenId);
      
      const now = Math.floor(Date.now() / 1000);
      const startAt = Number(deposit.startAt);
      const maturityAt = Number(deposit.maturityAt);
      const gracePeriod = Number(await SavingLogic.gracePeriod());

      // Calculate time differences
      const elapsed = now - startAt;
      const timeToMaturity = maturityAt - now;
      const daysToMaturity = timeToMaturity / (24 * 60 * 60);
      const timeAfterMaturity = now - maturityAt;
      const graceTimeLeft = gracePeriod - timeAfterMaturity;

      console.log(`Status:           ${statusNames[Number(deposit.status)] || "Unknown"}`);
      console.log(`Plan ID:          ${deposit.planId}`);
      console.log(`Principal:        ${ethers.formatUnits(deposit.principal, 6)} USDC`);
      console.log(`APR (at open):    ${Number(deposit.aprBpsAtOpen) / 100}%`);
      console.log(`Penalty (at open): ${Number(deposit.penaltyBpsAtOpen) / 100}%`);

      console.log(`\n⏱️  TIME INFO:`);
      console.log(`  Start Time:     ${new Date(startAt * 1000).toLocaleString()}`);
      console.log(`  Maturity Time:  ${new Date(maturityAt * 1000).toLocaleString()}`);
      console.log(`  Current Time:   ${new Date(now * 1000).toLocaleString()}`);
      console.log(`  Elapsed:        ${Math.floor(elapsed / (24*60*60))} days`);

      // Determine deposit state
      console.log(`\n🎯 DEPOSIT STATE:`);
      
      if (deposit.status !== 0n) {
        // Not active
        console.log(`  ⛔ Status: ${statusNames[Number(deposit.status)]}`);
        console.log(`  ❌ No actions available`);
      } else if (now < maturityAt) {
        // Before maturity - can early withdraw
        console.log(`  ⏳ Status: Before Maturity`);
        console.log(`  📊 Time to maturity: ${daysToMaturity.toFixed(2)} days`);
        console.log(`  🔴 Action: Early Withdraw (penalty: ${Number(deposit.penaltyBpsAtOpen)/100}%)`);
        
        // Calculate penalty
        const penalty = (deposit.principal * deposit.penaltyBpsAtOpen) / 10000n;
        const afterPenalty = deposit.principal - penalty;
        console.log(`  💰 If withdraw now:`);
        console.log(`     Principal:      ${ethers.formatUnits(deposit.principal, 6)} USDC`);
        console.log(`     Penalty:        ${ethers.formatUnits(penalty, 6)} USDC`);
        console.log(`     You receive:    ${ethers.formatUnits(afterPenalty, 6)} USDC`);
        
      } else if (timeAfterMaturity < gracePeriod) {
        // In grace period - can withdraw or renew
        console.log(`  ✅ Status: Matured (in grace period)`);
        console.log(`  ⏰ Grace period left: ${(graceTimeLeft / (24*60*60)).toFixed(2)} days`);
        console.log(`  🟢 Action 1: Withdraw at Maturity (no penalty)`);
        console.log(`  🔵 Action 2: Manual Renew to new plan`);
        
        // Calculate interest
        const tenorSeconds = maturityAt - startAt;
        const interest = (deposit.principal * deposit.aprBpsAtOpen * BigInt(tenorSeconds)) 
                        / (BigInt(365 * 24 * 60 * 60) * 10000n);
        console.log(`  💰 If withdraw now:`);
        console.log(`     Principal:      ${ethers.formatUnits(deposit.principal, 6)} USDC`);
        console.log(`     Interest:       ${ethers.formatUnits(interest, 6)} USDC`);
        console.log(`     Total:          ${ethers.formatUnits(deposit.principal + interest, 6)} USDC`);
        
      } else {
        // After grace period - must auto renew
        console.log(`  ⚠️  Status: Grace Period Expired`);
        console.log(`  🔄 Action: Auto Renew (required)`);
        console.log(`  ⏱️  Overdue by: ${(timeAfterMaturity / (24*60*60)).toFixed(2)} days`);
      }

    } catch (error: any) {
      console.log(`❌ Error reading deposit: ${error.message}`);
    }
  }

  console.log("\n" + "═".repeat(100));
  console.log("\n💡 SUMMARY:\n");
  console.log("Deposit States:");
  console.log("  1. Before Maturity    → Show 'Early Withdraw' button");
  console.log("  2. At Maturity        → Show 'Withdraw' and 'Renew' buttons");
  console.log("  3. After Grace Period → Show 'Auto Renew' button");
  console.log("  4. Withdrawn/Renewed  → Show status only (no actions)");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
