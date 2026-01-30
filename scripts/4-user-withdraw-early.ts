import { ethers } from "hardhat";

/**
 * Script 4: User rút tiền trước hạn (early withdrawal with penalty)
 * Run: npx hardhat run scripts/4-user-withdraw-early.ts --network sepolia
 */
async function main() {
  console.log("\n⚠️  User: Early Withdrawal (with penalty)\n");

  const [user] = await ethers.getSigners();
  console.log("User address:", user.address);

  // Deployed contract addresses on Sepolia
  const USDC_ADDRESS = "0x73a9bEc9B836007904A19C30B2FD9B2f7A6720BA";
  const SAVING_LOGIC_ADDRESS = "0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb";
  const CERTIFICATE_ADDRESS = "0x2A4A34e3C69D862e1dAA94C64C5747f022160AB4";

  const usdc = await ethers.getContractAt("MockUSDC", USDC_ADDRESS);
  const savingLogic = await ethers.getContractAt("SavingLogic", SAVING_LOGIC_ADDRESS);
  const certificate = await ethers.getContractAt("DepositCertificate", CERTIFICATE_ADDRESS);

  // ========== Get Deposit Info ==========
  console.log("1️⃣ Getting deposit information...");
  const depositId = 1; // Change this if testing different deposit
  
  try {
    const deposit = await certificate.getDepositCore(depositId);
    
    console.log(`\n   Deposit ID: ${depositId}`);
    console.log(`   Principal:  ${ethers.formatUnits(deposit.principal, 6)} USDC`);
    console.log(`   APR:        ${Number(deposit.aprBpsAtOpen) / 100}%`);
    console.log(`   Penalty:    ${Number(deposit.penaltyBpsAtOpen) / 100}%`);
    console.log(`   Status:     ${["Active", "Withdrawn", "AutoRenewed", "ManualRenewed"][Number(deposit.status)]}`);
    
    const startDate = new Date(Number(deposit.startAt) * 1000);
    const maturityDate = new Date(Number(deposit.maturityAt) * 1000);
    const now = new Date();
    
    console.log(`   Start:      ${startDate.toLocaleString()}`);
    console.log(`   Maturity:   ${maturityDate.toLocaleString()}`);
    console.log(`   Now:        ${now.toLocaleString()}`);

    const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`   Days elapsed:   ${daysElapsed} days`);
    console.log(`   Days remaining: ${daysRemaining > 0 ? daysRemaining : 0} days`);

    if (deposit.status !== 0n) {
      console.log(`\n   ❌ Deposit already processed (status: ${deposit.status})`);
      return;
    }

    if (now >= maturityDate) {
      console.log(`\n   ℹ️  Deposit has matured. Consider using withdrawAtMaturity instead`);
      console.log(`   Run: scripts/3-user-withdraw-maturity.ts`);
      console.log(`\n   Continuing with early withdrawal anyway...\n`);
    }

    // ========== Calculate Penalty ==========
    console.log("\n2️⃣ Calculating penalty...");
    
    const principal = Number(ethers.formatUnits(deposit.principal, 6));
    const penaltyPercent = Number(deposit.penaltyBpsAtOpen) / 100;
    const penaltyAmount = (principal * penaltyPercent) / 100;
    const amountAfterPenalty = principal - penaltyAmount;
    
    console.log(`   Principal:          ${principal} USDC`);
    console.log(`   Penalty rate:       ${penaltyPercent}%`);
    console.log(`   Penalty amount:     ${penaltyAmount.toFixed(2)} USDC ❌`);
    console.log(`   You will receive:   ${amountAfterPenalty.toFixed(2)} USDC`);
    console.log(`   Interest:           0 USDC (no interest on early withdrawal)`);

    // Calculate what you would have earned if waited
    const tenorSeconds = Number(deposit.maturityAt - deposit.startAt);
    const tenorDays = tenorSeconds / (24 * 60 * 60);
    const apr = Number(deposit.aprBpsAtOpen) / 100;
    const potentialInterest = (principal * apr * tenorDays) / (365 * 100);
    const totalLoss = penaltyAmount + potentialInterest;

    console.log(`\n   📊 Opportunity cost:`);
    console.log(`   Potential interest (if waited): ${potentialInterest.toFixed(2)} USDC`);
    console.log(`   Total loss:                     ${totalLoss.toFixed(2)} USDC`);
    console.log(`   Total if matured:               ${(principal + potentialInterest).toFixed(2)} USDC`);

    // ========== Confirmation ==========
    console.log(`\n⚠️  WARNING: You are about to withdraw early!`);
    console.log(`   - You will lose ${penaltyAmount.toFixed(2)} USDC (${penaltyPercent}% penalty)`);
    console.log(`   - You will not receive any interest`);
    console.log(`   - Total loss: ${totalLoss.toFixed(2)} USDC`);
    
    // In production, you might want to add a confirmation step
    console.log(`\n   Proceeding in 3 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ========== Check Balances Before ==========
    console.log("\n3️⃣ Checking balances before withdrawal...");
    const balanceBefore = await usdc.balanceOf(user.address);
    console.log(`   User balance: ${ethers.formatUnits(balanceBefore, 6)} USDC`);

    // ========== Early Withdraw ==========
    console.log("\n4️⃣ Executing early withdrawal...");
    const withdrawTx = await savingLogic.earlyWithdraw(depositId);
    const receipt = await withdrawTx.wait();
    console.log("   ✅ Early withdrawal completed!");
    console.log("   Transaction:", receipt?.hash);

    // ========== Verify Results ==========
    console.log("\n5️⃣ Verifying results...");
    
    const balanceAfter = await usdc.balanceOf(user.address);
    const actualReceived = balanceAfter - balanceBefore;
    
    console.log(`   Balance before: ${ethers.formatUnits(balanceBefore, 6)} USDC`);
    console.log(`   Balance after:  ${ethers.formatUnits(balanceAfter, 6)} USDC`);
    console.log(`   Received:       ${ethers.formatUnits(actualReceived, 6)} USDC`);
    console.log(`   Expected:       ${amountAfterPenalty.toFixed(2)} USDC`);
    
    const difference = Number(ethers.formatUnits(actualReceived, 6)) - amountAfterPenalty;
    console.log(`   Difference:     ${difference.toFixed(6)} USDC ${Math.abs(difference) < 0.01 ? "✅" : "⚠️"}`);

    // Check deposit status
    const updatedDeposit = await certificate.getDepositCore(depositId);
    console.log(`   New status:     ${["Active", "Withdrawn", "AutoRenewed", "ManualRenewed"][Number(updatedDeposit.status)]}`);

    // ========== Summary ==========
    console.log("\n═══════════════════════════════════════════════════");
    console.log("⚠️  Early withdrawal completed");
    console.log("═══════════════════════════════════════════════════");
    console.log(`\n💰 Transaction Summary:`);
    console.log(`   Principal:           ${principal} USDC`);
    console.log(`   Penalty:             -${penaltyAmount.toFixed(2)} USDC (${penaltyPercent}%)`);
    console.log(`   Interest:            0 USDC (early withdrawal)`);
    console.log(`   Received:            ${ethers.formatUnits(actualReceived, 6)} USDC`);
    console.log(`   Net loss:            -${(principal - Number(ethers.formatUnits(actualReceived, 6))).toFixed(2)} USDC`);
    console.log(`\n   If you had waited ${daysRemaining} more days:`);
    console.log(`   You would receive:   ${(principal + potentialInterest).toFixed(2)} USDC`);
    console.log(`   Opportunity loss:    ${totalLoss.toFixed(2)} USDC`);

  } catch (error: any) {
    if (error.message.includes("DepositNotFound")) {
      console.error(`\n❌ Deposit ID ${depositId} not found`);
      console.log(`   Please check the deposit ID or run script 2 first`);
    } else if (error.message.includes("NotDepositOwner")) {
      console.error(`\n❌ You are not the owner of this deposit`);
    } else if (error.message.includes("DepositNotActive")) {
      console.error(`\n❌ Deposit is not active (already withdrawn or renewed)`);
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
