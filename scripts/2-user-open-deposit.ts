import { ethers } from "hardhat";

/**
 * Script 2: User mở sổ tiết kiệm
 * Run: npx hardhat run scripts/2-user-open-deposit.ts --network sepolia
 */
async function main() {
  console.log("\n💰 User: Opening Deposit\n");

  const [user] = await ethers.getSigners();
  console.log("User address:", user.address);
  console.log("User balance:", ethers.formatEther(await ethers.provider.getBalance(user.address)), "ETH\n");

  // Deployed contract addresses on Sepolia
  const USDC_ADDRESS = "0x73a9bEc9B836007904A19C30B2FD9B2f7A6720BA";
  const DEPOSIT_VAULT_ADDRESS = "0x077a4941565e0194a00Cd8DABE1acA09111F7B06";
  const SAVING_LOGIC_ADDRESS = "0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb";
  const CERTIFICATE_ADDRESS = "0x2A4A34e3C69D862e1dAA94C64C5747f022160AB4";

  const usdc = await ethers.getContractAt("MockUSDC", USDC_ADDRESS);
  const depositVault = await ethers.getContractAt("DepositVault", DEPOSIT_VAULT_ADDRESS);
  const savingLogic = await ethers.getContractAt("SavingLogic", SAVING_LOGIC_ADDRESS);
  const certificate = await ethers.getContractAt("DepositCertificate", CERTIFICATE_ADDRESS);

  // ========== Check USDC Balance ==========
  console.log("1️⃣ Checking USDC balance...");
  let usdcBalance = await usdc.balanceOf(user.address);
  console.log("   Current balance:", ethers.formatUnits(usdcBalance, 6), "USDC");

  // Mint USDC if needed (only works with MockUSDC)
  if (usdcBalance < ethers.parseUnits("1000", 6)) {
    console.log("   💸 Minting 10,000 USDC...");
    await usdc.mint(user.address, ethers.parseUnits("10000", 6));
    usdcBalance = await usdc.balanceOf(user.address);
    console.log("   ✅ New balance:", ethers.formatUnits(usdcBalance, 6), "USDC");
  }

  // ========== Select Plan ==========
  console.log("\n2️⃣ Selecting plan...");
  const planId = 2; // 90-day plan
  const plan = await savingLogic.getPlan(planId);
  
  const tenorDays = Number(plan.tenorSeconds) / (24 * 60 * 60);
  console.log(`   Selected Plan ${planId}:`);
  console.log(`      Tenor:   ${tenorDays} days`);
  console.log(`      APR:     ${Number(plan.aprBps) / 100}%`);
  console.log(`      Penalty: ${Number(plan.earlyWithdrawPenaltyBps) / 100}%`);

  // ========== Prepare Deposit ==========
  console.log("\n3️⃣ Preparing deposit...");
  const depositAmount = ethers.parseUnits("1000", 6); // 1,000 USDC
  console.log("   Amount:", ethers.formatUnits(depositAmount, 6), "USDC");

  // Calculate expected interest
  const principal = Number(ethers.formatUnits(depositAmount, 6));
  const apr = Number(plan.aprBps) / 100;
  const tenor = tenorDays;
  const expectedInterest = (principal * apr * tenor) / (365 * 100);
  const totalAtMaturity = principal + expectedInterest;

  console.log(`   Expected interest: ${expectedInterest.toFixed(2)} USDC`);
  console.log(`   Total at maturity: ${totalAtMaturity.toFixed(2)} USDC`);

  // ========== Approve DepositVault (CRITICAL v2.0 Change) ==========
  console.log("\n4️⃣ Approving DepositVault...");
  console.log("   ⚠️  CRITICAL: Approving DepositVault, NOT SavingLogic");
  console.log("   DepositVault:", DEPOSIT_VAULT_ADDRESS);
  
  const approveTx = await usdc.approve(DEPOSIT_VAULT_ADDRESS, depositAmount);
  await approveTx.wait();
  console.log("   ✅ Approved");

  // ========== Open Deposit ==========
  console.log("\n5️⃣ Opening deposit...");
  const openTx = await savingLogic.openDeposit(planId, depositAmount);
  const receipt = await openTx.wait();
  console.log("   ✅ Deposit opened!");
  console.log("   Transaction:", receipt?.hash);

  // Get deposit ID from events
  const depositId = 1; // First deposit
  console.log("   Deposit ID:", depositId);

  // ========== Verify Deposit ==========
  console.log("\n6️⃣ Verifying deposit...");
  
  // Check NFT ownership
  const nftOwner = await certificate.ownerOf(depositId);
  console.log("   NFT owner:", nftOwner);
  console.log("   Match user:", nftOwner.toLowerCase() === user.address.toLowerCase() ? "✅" : "❌");

  // Check deposit details
  const deposit = await certificate.getDepositCore(depositId);
  console.log(`   Principal: ${ethers.formatUnits(deposit.principal, 6)} USDC`);
  console.log(`   APR: ${Number(deposit.aprBpsAtOpen) / 100}%`);
  console.log(`   Status: ${["Active", "Withdrawn", "AutoRenewed", "ManualRenewed"][Number(deposit.status)]}`);
  
  const maturityDate = new Date(Number(deposit.maturityAt) * 1000);
  console.log(`   Maturity: ${maturityDate.toLocaleString()}`);

  // Check funds location
  const vaultBalance = await usdc.balanceOf(DEPOSIT_VAULT_ADDRESS);
  const logicBalance = await usdc.balanceOf(SAVING_LOGIC_ADDRESS);
  console.log(`\n   📍 Funds location:`);
  console.log(`      DepositVault: ${ethers.formatUnits(vaultBalance, 6)} USDC ✅`);
  console.log(`      SavingLogic:  ${ethers.formatUnits(logicBalance, 6)} USDC (should be 0)`);

  // ========== Summary ==========
  console.log("\n═══════════════════════════════════════════════════");
  console.log("🎉 Deposit opened successfully!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`\n💰 Deposit Summary:`);
  console.log(`   Deposit ID:        ${depositId}`);
  console.log(`   Principal:         ${principal} USDC`);
  console.log(`   Tenor:             ${tenor} days`);
  console.log(`   APR:               ${apr}%`);
  console.log(`   Expected Interest: ${expectedInterest.toFixed(2)} USDC`);
  console.log(`   Total at Maturity: ${totalAtMaturity.toFixed(2)} USDC`);
  console.log(`   Maturity Date:     ${maturityDate.toLocaleDateString()}`);

  console.log("\n✅ Next steps:");
  console.log("   - Wait until maturity, then run: scripts/3-user-withdraw-maturity.ts");
  console.log("   - Or withdraw early (with penalty): scripts/4-user-withdraw-early.ts\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
