import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * User Dashboard - View user account information
 * - User balances (USDC, ETH)
 * - All user deposits
 * - Expected returns
 * - Total portfolio value
 * 
 * Run: npx hardhat run scripts/user-dashboard.ts --network sepolia
 */

async function main() {
  console.log("\n👤 USER DASHBOARD\n");
  console.log("═══════════════════════════════════════════════════════════");

  // Load contracts
  const mockUSDCDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/MockUSDC.json", "utf8")
  );
  const savingCoreDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/SavingCore.json", "utf8")
  );
  const vaultManagerDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/VaultManager.json", "utf8")
  );

  const [user] = await ethers.getSigners();

  const mockUSDC = new ethers.Contract(
    mockUSDCDeployment.address,
    mockUSDCDeployment.abi,
    user
  );

  const savingCore = new ethers.Contract(
    savingCoreDeployment.address,
    savingCoreDeployment.abi,
    user
  );

  // ===== 1. User Information =====
  console.log("\n📋 1. USER INFORMATION");
  console.log("   ┌────────────────────────────────────────────────────────┐");
  console.log(`   │ Address: ${user.address.slice(0, 22)}...${user.address.slice(-10)} │`);
  
  const usdcBalance = await mockUSDC.balanceOf(user.address);
  const ethBalance = await ethers.provider.getBalance(user.address);
  
  console.log(`   │ USDC Balance:  ${String(ethers.formatUnits(usdcBalance, 6)).padEnd(38)} USDC │`);
  console.log(`   │ ETH Balance:   ${String(ethers.formatEther(ethBalance)).slice(0, 38).padEnd(38)} ETH  │`);
  console.log("   └────────────────────────────────────────────────────────┘");

  // ===== 2. User's Active Deposits =====
  console.log("\n💼 2. YOUR ACTIVE DEPOSITS");
  
  let userDeposits = [];
  let totalInvested = 0n;
  let totalExpectedInterest = 0;
  
  for (let i = 1; i < 200; i++) {
    try {
      const deposit = await savingCore.getDeposit(i);
      if (deposit.owner.toLowerCase() === user.address.toLowerCase() && Number(deposit.status) === 0) {
        const plan = await savingCore.getPlan(deposit.planId);
        
        // Calculate expected interest
        const principal = Number(ethers.formatUnits(deposit.principal, 6));
        const apr = Number(deposit.aprBpsAtOpen) / 100;
        const tenor = Number(plan.tenorDays);
        const expectedInterest = (principal * apr * tenor) / (365 * 100);
        
        userDeposits.push({
          id: i,
          principal: principal,
          apr: apr,
          tenor: tenor,
          maturity: new Date(Number(deposit.maturityAt) * 1000),
          expectedInterest: expectedInterest,
          totalAtMaturity: principal + expectedInterest
        });
        
        totalInvested += deposit.principal;
        totalExpectedInterest += expectedInterest;
      }
    } catch {
      break;
    }
  }

  if (userDeposits.length === 0) {
    console.log("   No active deposits found.");
    console.log("   💡 Open a deposit to start earning interest!");
  } else {
    console.log("   ┌────┬──────────────┬────────┬──────────┬─────────────────┐");
    console.log("   │ ID │   Principal  │  APR   │  Tenor   │    Maturity     │");
    console.log("   ├────┼──────────────┼────────┼──────────┼─────────────────┤");
    
    for (const deposit of userDeposits) {
      const maturityStr = deposit.maturity.toLocaleDateString();
      console.log(`   │ ${String(deposit.id).padStart(2)} │ ${String(deposit.principal).padStart(10)} │ ${String(deposit.apr).padStart(5)}% │ ${String(deposit.tenor).padStart(5)} days │ ${maturityStr.padEnd(15)} │`);
    }
    
    console.log("   └────┴──────────────┴────────┴──────────┴─────────────────┘");

    // ===== 3. Expected Returns Detail =====
    console.log("\n💰 3. EXPECTED RETURNS AT MATURITY");
    
    for (const deposit of userDeposits) {
      console.log(`\n   Deposit #${deposit.id}:`);
      console.log(`   ┌────────────────────────────────────────┐`);
      console.log(`   │ Principal:         ${String(deposit.principal.toFixed(2)).padEnd(18)} USDC │`);
      console.log(`   │ Expected Interest: ${String(deposit.expectedInterest.toFixed(6)).padEnd(18)} USDC │`);
      console.log(`   │ Total at Maturity: ${String(deposit.totalAtMaturity.toFixed(6)).padEnd(18)} USDC │`);
      console.log(`   │ ROI:               ${String(((deposit.expectedInterest / deposit.principal) * 100).toFixed(3)).padEnd(18)}% │`);
      console.log(`   │ Maturity Date:     ${deposit.maturity.toLocaleDateString().padEnd(18)} │`);
      
      // Days until maturity
      const daysLeft = Math.ceil((deposit.maturity.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const daysStr = daysLeft > 0 ? `${daysLeft} days left` : "Matured ✓";
      console.log(`   │ Status:            ${daysStr.padEnd(18)} │`);
      console.log(`   └────────────────────────────────────────┘`);
    }
  }

  // ===== 4. Portfolio Summary =====
  console.log("\n📊 4. PORTFOLIO SUMMARY");
  console.log("   ┌────────────────────────────────────────────────────────┐");
  console.log(`   │ Available Balance:     ${String(ethers.formatUnits(usdcBalance, 6)).padEnd(30)} USDC │`);
  console.log(`   │ Total Invested:        ${String(ethers.formatUnits(totalInvested, 6)).padEnd(30)} USDC │`);
  console.log(`   │ Expected Interest:     ${String(totalExpectedInterest.toFixed(6)).padEnd(30)} USDC │`);
  console.log(`   │ Total Value (Future):  ${String((Number(ethers.formatUnits(totalInvested, 6)) + totalExpectedInterest).toFixed(6)).padEnd(30)} USDC │`);
  console.log(`   │ Number of Deposits:    ${String(userDeposits.length).padEnd(38)} │`);
  console.log("   └────────────────────────────────────────────────────────┘");

  // ===== 5. Total Net Worth =====
  const totalNetWorth = Number(ethers.formatUnits(usdcBalance, 6)) + 
                        Number(ethers.formatUnits(totalInvested, 6)) + 
                        totalExpectedInterest;
  
  console.log("\n💎 5. NET WORTH");
  console.log("   ┌────────────────────────────────────────────────────────┐");
  console.log(`   │ Current Net Worth:     ${String(totalNetWorth.toFixed(6)).padEnd(30)} USDC │`);
  console.log(`   │ Liquid (Available):    ${String(ethers.formatUnits(usdcBalance, 6)).padEnd(30)} USDC │`);
  console.log(`   │ Locked (Deposits):     ${String(ethers.formatUnits(totalInvested, 6)).padEnd(30)} USDC │`);
  console.log("   └────────────────────────────────────────────────────────┘");

  // ===== 6. Withdrawn History =====
  console.log("\n📜 6. WITHDRAWAL HISTORY (Last 5)");
  
  let withdrawnCount = 0;
  for (let i = 1; i < 200 && withdrawnCount < 5; i++) {
    try {
      const deposit = await savingCore.getDeposit(i);
      if (deposit.owner.toLowerCase() === user.address.toLowerCase() && Number(deposit.status) !== 0) {
        const statusNames = ["Active", "Withdrawn", "Auto-Renewed", "Manual-Renewed"];
        const status = statusNames[Number(deposit.status)];
        
        console.log(`   • Deposit #${i}:`);
        console.log(`     Principal: ${ethers.formatUnits(deposit.principal, 6)} USDC`);
        console.log(`     Status: ${status}`);
        withdrawnCount++;
      }
    } catch {}
  }
  
  if (withdrawnCount === 0) {
    console.log("   No withdrawal history yet.");
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ USER DASHBOARD COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");

  // ===== 7. Quick Actions =====
  console.log("\n🚀 QUICK ACTIONS:");
  console.log("   1. View all plans: npx hardhat run scripts/view-plans.ts --network sepolia");
  console.log("   2. Open deposit: npx hardhat run scripts/open-deposit.ts --network sepolia");
  console.log("   3. Withdraw: savingCore.withdrawAtMaturity(depositId)");
  console.log("   4. Early withdraw: savingCore.earlyWithdraw(depositId)");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
