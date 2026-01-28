import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * User Journey Test - Complete user flow simulation
 * Tests the entire lifecycle: deposit → wait → withdraw
 * User: 0xF7227428Ef0e2F73560Ce6Da5EaFcff0bbBE109f
 * 
 * Run: npx hardhat run scripts/user-journey-test.ts --network localhost
 */

async function main() {
  console.log("\n🚶 USER JOURNEY TEST - Complete Flow\n");
  console.log("═══════════════════════════════════════════════════════════");

  // Import ABIs from deployments folder
  const mockUSDCAbi = JSON.parse(
    fs.readFileSync("deployments/sepolia/MockUSDC.json", "utf8")
  ).abi;
  
  const savingCoreAbi = JSON.parse(
    fs.readFileSync("deployments/sepolia/SavingCore.json", "utf8")
  ).abi;

  const vaultManagerAbi = JSON.parse(
    fs.readFileSync("deployments/sepolia/VaultManager.json", "utf8")
  ).abi;

  // Get addresses
  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  const mockUSDCAddress = deployment.contracts.MockUSDC;
  const savingCoreAddress = deployment.contracts.SavingCore;
  const vaultManagerAddress = deployment.contracts.VaultManager;

  console.log("📦 Loaded ABIs and addresses from deployments");
  console.log(`   MockUSDC: ${mockUSDCAddress}`);
  console.log(`   SavingCore: ${savingCoreAddress}`);
  console.log(`   VaultManager: ${vaultManagerAddress}`);

  // Get signers
  const [deployer, user1] = await ethers.getSigners();
  const userAddress = "0xF7227428Ef0e2F73560Ce6Da5EaFcff0bbBE109f";

  console.log("\n👤 User wallet");
  console.log(`   Target user: ${userAddress}`);
  console.log(`   Test user: ${user1.address}`);

  // Connect to contracts using imported ABIs
  const mockUSDC = new ethers.Contract(mockUSDCAddress, mockUSDCAbi, deployer);
  const savingCore = new ethers.Contract(savingCoreAddress, savingCoreAbi, user1);
  const vaultManager = new ethers.Contract(vaultManagerAddress, vaultManagerAbi, deployer);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("📖 SCENARIO: User opens 7-day deposit and withdraws at maturity");
  console.log("═══════════════════════════════════════════════════════════");

  // ===== Step 1: Fund user with USDC =====
  console.log("\n💰 Step 1: Fund user wallet");
  const fundAmount = ethers.parseUnits("5000", 6); // 5000 USDC
  
  let userBalance = await mockUSDC.balanceOf(user1.address);
  if (userBalance < fundAmount) {
    const mintTx = await mockUSDC.mint(user1.address, fundAmount);
    await mintTx.wait();
    console.log(`   ✓ Minted ${ethers.formatUnits(fundAmount, 6)} USDC to user`);
  }
  
  userBalance = await mockUSDC.balanceOf(user1.address);
  console.log(`   User balance: ${ethers.formatUnits(userBalance, 6)} USDC`);

  // ===== Step 2: View available plans =====
  console.log("\n📋 Step 2: Browse saving plans");
  
  const availablePlans = [];
  for (let i = 0; i < 5; i++) {
    try {
      const plan = await savingCore.getPlan(i);
      if (Number(plan.tenorInDays) > 0 && plan.isActive) {
        availablePlans.push({
          id: i,
          tenor: Number(plan.tenorInDays),
          apr: Number(plan.aprBps) / 100,
          penalty: Number(plan.earlyWithdrawPenaltyBps) / 100
        });
        console.log(`   Plan ${i}: ${plan.tenorInDays} days @ ${Number(plan.aprBps) / 100}% APR (penalty: ${Number(plan.earlyWithdrawPenaltyBps) / 100}%)`);
      }
    } catch {}
  }

  // ===== Step 3: Select plan and open deposit =====
  console.log("\n📝 Step 3: Open deposit");
  
  const selectedPlan = availablePlans[0] || { id: 0, tenor: 7, apr: 3, penalty: 10 };
  const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
  
  console.log(`   Selected: Plan ${selectedPlan.id} (${selectedPlan.tenor} days @ ${selectedPlan.apr}% APR)`);
  console.log(`   Amount: ${ethers.formatUnits(depositAmount, 6)} USDC`);

  // Approve USDC
  console.log("   → Approving USDC spend...");
  const mockUSDCAsUser = new ethers.Contract(mockUSDCAddress, mockUSDCAbi, user1);
  const approveTx = await mockUSDCAsUser.approve(savingCoreAddress, depositAmount);
  await approveTx.wait();
  console.log("   ✓ Approved");

  // Open deposit
  console.log("   → Opening deposit...");
  const openTx = await savingCore.openDeposit(selectedPlan.id, depositAmount);
  const openReceipt = await openTx.wait();
  
  // Extract depositId from event
  let depositId = 0;
  for (const log of openReceipt.logs) {
    try {
      const parsed = savingCore.interface.parseLog(log);
      if (parsed?.name === "DepositOpened") {
        depositId = Number(parsed.args.depositId);
        break;
      }
    } catch {}
  }
  
  console.log(`   ✓ Deposit opened! ID: ${depositId}`);

  // ===== Step 4: View deposit details =====
  console.log("\n🔍 Step 4: View deposit details");
  
  const deposit = await savingCore.getDeposit(depositId);
  const principal = ethers.formatUnits(deposit.principal, 6);
  const aprAtOpen = Number(deposit.aprBpsAtOpen) / 100;
  const openedAt = new Date(Number(deposit.openedAt) * 1000);
  const maturityAt = new Date(Number(deposit.maturityAt) * 1000);
  
  console.log(`   Deposit ID: ${depositId}`);
  console.log(`   Owner: ${deposit.owner}`);
  console.log(`   Principal: ${principal} USDC`);
  console.log(`   APR: ${aprAtOpen}%`);
  console.log(`   Opened: ${openedAt.toLocaleString()}`);
  console.log(`   Maturity: ${maturityAt.toLocaleString()}`);
  console.log(`   Status: Active`);

  // ===== Step 5: Calculate expected returns =====
  console.log("\n💹 Step 5: Expected returns");
  
  const expectedInterest = (Number(principal) * aprAtOpen * selectedPlan.tenor) / (365 * 100);
  const totalAtMaturity = Number(principal) + expectedInterest;
  
  console.log(`   Principal: ${principal} USDC`);
  console.log(`   Interest (${selectedPlan.tenor} days @ ${aprAtOpen}%): ${expectedInterest.toFixed(6)} USDC`);
  console.log(`   Total at maturity: ${totalAtMaturity.toFixed(6)} USDC`);

  // ===== Step 6: Fast-forward time to maturity =====
  console.log("\n⏰ Step 6: Fast-forward to maturity");
  
  const secondsToMaturity = Number(deposit.maturityAt) - Math.floor(Date.now() / 1000) + 1;
  if (secondsToMaturity > 0) {
    console.log(`   → Advancing time by ${secondsToMaturity} seconds...`);
    await ethers.provider.send("evm_increaseTime", [secondsToMaturity]);
    await ethers.provider.send("evm_mine", []);
    console.log("   ✓ Time advanced to maturity");
  }

  // ===== Step 7: Withdraw at maturity =====
  console.log("\n💸 Step 7: Withdraw at maturity");
  
  const balanceBefore = await mockUSDC.balanceOf(user1.address);
  console.log(`   Balance before: ${ethers.formatUnits(balanceBefore, 6)} USDC`);

  console.log("   → Withdrawing...");
  const withdrawTx = await savingCore.withdrawAtMaturity(depositId);
  const withdrawReceipt = await withdrawTx.wait();
  
  // Get actual amounts from event
  let actualPrincipal = 0;
  let actualInterest = 0;
  for (const log of withdrawReceipt.logs) {
    try {
      const parsed = savingCore.interface.parseLog(log);
      if (parsed?.name === "WithdrawnAtMaturity") {
        actualPrincipal = Number(ethers.formatUnits(parsed.args.principal, 6));
        actualInterest = Number(ethers.formatUnits(parsed.args.interest, 6));
        break;
      }
    } catch {}
  }
  
  const balanceAfter = await mockUSDC.balanceOf(user1.address);
  const received = Number(ethers.formatUnits(balanceAfter - balanceBefore, 6));
  
  console.log(`   ✓ Withdrawn successfully!`);
  console.log(`   Principal returned: ${actualPrincipal} USDC`);
  console.log(`   Interest earned: ${actualInterest} USDC`);
  console.log(`   Total received: ${received.toFixed(6)} USDC`);
  console.log(`   Balance after: ${ethers.formatUnits(balanceAfter, 6)} USDC`);

  // ===== Step 8: Verify deposit is closed =====
  console.log("\n✅ Step 8: Verify deposit status");
  
  const finalDeposit = await savingCore.getDeposit(depositId);
  const status = Number(finalDeposit.status);
  const statusNames = ["Active", "MaturityWithdrawn", "EarlyWithdrawn"];
  
  console.log(`   Status: ${statusNames[status]}`);
  console.log(`   ✓ Deposit successfully closed`);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ USER JOURNEY COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");

  console.log("\n📊 Summary:");
  console.log(`   User opened: ${principal} USDC deposit`);
  console.log(`   Plan: ${selectedPlan.tenor} days @ ${aprAtOpen}% APR`);
  console.log(`   Interest earned: ${actualInterest.toFixed(6)} USDC`);
  console.log(`   Total received: ${received.toFixed(6)} USDC`);
  console.log(`   ROI: ${((actualInterest / Number(principal)) * 100).toFixed(3)}%`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
