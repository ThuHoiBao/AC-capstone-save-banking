import { ethers } from "hardhat";

/**
 * Script 3: User rút tiền đúng hạn (withdraw at maturity)
 * Run: npx hardhat run scripts/3-user-withdraw-maturity.ts --network sepolia
 */
async function main() {
  console.log("\n💸 User: Withdrawing at Maturity\n");

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
  const depositId = 2; // Latest deposit
  
  try {
    const deposit = await certificate.getDepositCore(depositId);
    
    console.log(`\n   Deposit ID: ${depositId}`);
    console.log(`   Principal:  ${ethers.formatUnits(deposit.principal, 6)} USDC`);
    console.log(`   APR:        ${Number(deposit.aprBpsAtOpen) / 100}%`);
    console.log(`   Status:     ${["Active", "Withdrawn", "AutoRenewed", "ManualRenewed"][Number(deposit.status)]}`);
    
    const startDate = new Date(Number(deposit.startAt) * 1000);
    const maturityDate = new Date(Number(deposit.maturityAt) * 1000);
    const now = new Date();
    
    console.log(`   Start:      ${startDate.toLocaleString()}`);
    console.log(`   Maturity:   ${maturityDate.toLocaleString()}`);
    console.log(`   Now:        ${now.toLocaleString()}`);

    // Check if matured
    if (now < maturityDate) {
      const daysLeft = Math.ceil((maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`\n   ⚠️  Deposit not yet matured!`);
      console.log(`   Days remaining: ${daysLeft} days`);
      console.log(`\n   Options:`);
      console.log(`   1. Wait ${daysLeft} days until maturity`);
      console.log(`   2. Or run: scripts/4-user-withdraw-early.ts (with penalty)`);
      
      // For testing on local/sepolia, offer to fast-forward
      console.log(`\n   📝 Note: On local testnet, you can fast-forward time:`);
      console.log(`      await time.increase(${daysLeft} * 24 * 60 * 60);`);
      return;
    }

    if (deposit.status !== 0n) {
      console.log(`\n   ❌ Deposit already processed (status: ${deposit.status})`);
      return;
    }

    // ========== Calculate Expected Returns ==========
    console.log("\n2️⃣ Calculating returns...");
    
    const principal = Number(ethers.formatUnits(deposit.principal, 6));
    const apr = Number(deposit.aprBpsAtOpen) / 100;
    const tenorSeconds = Number(deposit.maturityAt - deposit.startAt);
    const tenorDays = tenorSeconds / (24 * 60 * 60);
    
    const expectedInterest = (principal * apr * tenorDays) / (365 * 100);
    const totalExpected = principal + expectedInterest;
    
    console.log(`   Principal:         ${principal} USDC`);
    console.log(`   Interest:          ${expectedInterest.toFixed(2)} USDC`);
    console.log(`   Total:             ${totalExpected.toFixed(2)} USDC`);
    console.log(`   ROI:               ${((expectedInterest / principal) * 100).toFixed(2)}%`);

    // ========== Check Balances Before ==========
    console.log("\n3️⃣ Checking balances before withdrawal...");
    const balanceBefore = await usdc.balanceOf(user.address);
    console.log(`   User balance: ${ethers.formatUnits(balanceBefore, 6)} USDC`);

    // ========== Withdraw ==========
    console.log("\n4️⃣ Withdrawing at maturity...");
    const withdrawTx = await savingLogic.withdrawAtMaturity(depositId);
    const receipt = await withdrawTx.wait();
    console.log("   ✅ Withdrawal successful!");
    console.log("   Transaction:", receipt?.hash);

    // ========== Verify Results ==========
    console.log("\n5️⃣ Verifying results...");
    
    const balanceAfter = await usdc.balanceOf(user.address);
    const actualReceived = balanceAfter - balanceBefore;
    
    console.log(`   Balance before: ${ethers.formatUnits(balanceBefore, 6)} USDC`);
    console.log(`   Balance after:  ${ethers.formatUnits(balanceAfter, 6)} USDC`);
    console.log(`   Received:       ${ethers.formatUnits(actualReceived, 6)} USDC`);
    console.log(`   Expected:       ${totalExpected.toFixed(2)} USDC`);
    
    const difference = Number(ethers.formatUnits(actualReceived, 6)) - totalExpected;
    console.log(`   Difference:     ${difference.toFixed(6)} USDC ${Math.abs(difference) < 0.01 ? "✅" : "⚠️"}`);

    // Check deposit status
    const updatedDeposit = await certificate.getDepositCore(depositId);
    console.log(`   New status:     ${["Active", "Withdrawn", "AutoRenewed", "ManualRenewed"][Number(updatedDeposit.status)]}`);

    // Check NFT still exists but deposit is marked withdrawn
    try {
      const owner = await certificate.ownerOf(depositId);
      console.log(`   NFT owner:      ${owner} (still exists)`);
    } catch {
      console.log(`   NFT:            Burned`);
    }

    // ========== Summary ==========
    console.log("\n═══════════════════════════════════════════════════");
    console.log("🎉 Withdrawal at maturity completed!");
    console.log("═══════════════════════════════════════════════════");
    console.log(`\n💰 Transaction Summary:`);
    console.log(`   Principal returned:  ${principal} USDC`);
    console.log(`   Interest paid:       ${expectedInterest.toFixed(2)} USDC`);
    console.log(`   Total received:      ${ethers.formatUnits(actualReceived, 6)} USDC`);
    console.log(`   Penalty:             0 USDC (on-time withdrawal)`);
    console.log(`   Net gain:            +${expectedInterest.toFixed(2)} USDC`);

  } catch (error: any) {
    if (error.message.includes("DepositNotFound")) {
      console.error(`\n❌ Deposit ID ${depositId} not found`);
      console.log(`   Please check the deposit ID or run script 2 first`);
    } else if (error.message.includes("NotYetMatured")) {
      console.error(`\n❌ Deposit not yet matured`);
      console.log(`   Wait until maturity date or use early withdrawal`);
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
