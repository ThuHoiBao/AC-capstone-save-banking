import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * Admin Dashboard - View all admin information
 * - Admin address and balances
 * - All saving plans
 * - Vault status and liquidity
 * - Total deposits and statistics
 * 
 * Run: npx hardhat run scripts/admin-dashboard.ts --network sepolia
 */

async function main() {
  console.log("\n👑 ADMIN DASHBOARD\n");
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

  const [admin] = await ethers.getSigners();

  const mockUSDC = new ethers.Contract(
    mockUSDCDeployment.address,
    mockUSDCDeployment.abi,
    admin
  );

  const savingCore = new ethers.Contract(
    savingCoreDeployment.address,
    savingCoreDeployment.abi,
    admin
  );

  const vaultManager = new ethers.Contract(
    vaultManagerDeployment.address,
    vaultManagerDeployment.abi,
    admin
  );

  // ===== 1. Admin Information =====
  console.log("\n📋 1. ADMIN INFORMATION");
  console.log("   ┌────────────────────────────────────────────────────────┐");
  console.log(`   │ Admin Address: ${admin.address.slice(0, 20)}...${admin.address.slice(-10)} │`);
  
  const adminUSDCBalance = await mockUSDC.balanceOf(admin.address);
  const adminETHBalance = await ethers.provider.getBalance(admin.address);
  
  console.log(`   │ USDC Balance:  ${String(ethers.formatUnits(adminUSDCBalance, 6)).padEnd(38)} USDC │`);
  console.log(`   │ ETH Balance:   ${String(ethers.formatEther(adminETHBalance)).slice(0, 38).padEnd(38)} ETH  │`);
  console.log("   └────────────────────────────────────────────────────────┘");

  // ===== 2. Contract Addresses =====
  console.log("\n📍 2. CONTRACT ADDRESSES");
  console.log(`   MockUSDC:      ${mockUSDCDeployment.address}`);
  console.log(`   SavingCore:    ${savingCoreDeployment.address}`);
  console.log(`   VaultManager:  ${vaultManagerDeployment.address}`);

  // ===== 3. Saving Plans =====
  console.log("\n📊 3. SAVING PLANS");
  console.log("   ┌────┬──────────┬────────┬───────────┬───────────┬──────────┐");
  console.log("   │ ID │  Tenor   │  APR   │    Min    │    Max    │ Penalty  │");
  console.log("   ├────┼──────────┼────────┼───────────┼───────────┼──────────┤");
  
  const plans = [];
  for (let i = 0; i < 20; i++) {
    try {
      const plan = await savingCore.getPlan(i);
      const tenorDays = Number(plan.tenorSeconds) / (24 * 60 * 60);
      if (tenorDays > 0) {
        plans.push({
          id: i,
          tenor: tenorDays,
          apr: Number(plan.aprBps) / 100,
          min: ethers.formatUnits(plan.minDeposit, 6),
          max: plan.maxDeposit > 0 ? ethers.formatUnits(plan.maxDeposit, 6) : "∞",
          penalty: Number(plan.earlyWithdrawPenaltyBps) / 100,
          enabled: plan.enabled
        });
        
        const minStr = plan.minDeposit > 0 ? String(ethers.formatUnits(plan.minDeposit, 6)).slice(0, 7) : "0";
        const maxStr = plan.maxDeposit > 0 ? String(ethers.formatUnits(plan.maxDeposit, 6)).slice(0, 7) : "∞";
        
        console.log(`   │ ${String(i).padStart(2)} │ ${String(plan.tenorDays).padStart(5)} days │ ${String(Number(plan.aprBps) / 100).padStart(5)}% │ ${minStr.padStart(7)} │ ${maxStr.padStart(7)} │ ${String(Number(plan.earlyWithdrawPenaltyBps) / 100).padStart(7)}% │`);
      }
    } catch {}
  }
  console.log("   └────┴──────────┴────────┴───────────┴───────────┴──────────┘");
  console.log(`   Total Plans: ${plans.length}`);

  // ===== 4. Vault Information =====
  console.log("\n🏦 4. VAULT INFORMATION");
  
  const vaultBalance = await mockUSDC.balanceOf(vaultManagerDeployment.address);
  const token = await vaultManager.token();
  const feeReceiver = await vaultManager.feeReceiver();
  const owner = await vaultManager.owner();
  
  console.log("   ┌────────────────────────────────────────────────────────┐");
  console.log(`   │ Total Liquidity: ${String(ethers.formatUnits(vaultBalance, 6)).padEnd(38)} USDC │`);
  console.log(`   │ Token:          ${token.slice(0, 42)} │`);
  console.log(`   │ Fee Receiver:   ${feeReceiver.slice(0, 42)} │`);
  console.log(`   │ Owner:          ${owner.slice(0, 42)} │`);
  console.log("   └────────────────────────────────────────────────────────┘");

  // ===== 5. Deposit Statistics =====
  console.log("\n📈 5. DEPOSIT STATISTICS");
  
  let totalDeposits = 0;
  let activeDeposits = 0;
  let withdrawnDeposits = 0;
  let totalPrincipal = 0n;
  
  for (let i = 1; i < 100; i++) {
    try {
      const deposit = await savingCore.getDeposit(i);
      if (deposit.depositId > 0) {
        totalDeposits++;
        if (Number(deposit.status) === 0) {
          activeDeposits++;
          totalPrincipal += deposit.principal;
        } else {
          withdrawnDeposits++;
        }
      }
    } catch {
      break;
    }
  }
  
  console.log("   ┌────────────────────────────────────────────────────────┐");
  console.log(`   │ Total Deposits:     ${String(totalDeposits).padEnd(38)} │`);
  console.log(`   │ Active Deposits:    ${String(activeDeposits).padEnd(38)} │`);
  console.log(`   │ Withdrawn Deposits: ${String(withdrawnDeposits).padEnd(38)} │`);
  console.log(`   │ Total Locked:       ${String(ethers.formatUnits(totalPrincipal, 6)).padEnd(30)} USDC │`);
  console.log("   └────────────────────────────────────────────────────────┘");

  // ===== 6. System Health =====
  console.log("\n💚 6. SYSTEM HEALTH");
  
  const utilizationRate = totalPrincipal > 0n ? 
    (Number(totalPrincipal) / Number(ethers.formatUnits(vaultBalance, 6))) * 100 : 0;
  
  const health = utilizationRate < 50 ? "Excellent ✓" : 
                 utilizationRate < 75 ? "Good ✓" : 
                 utilizationRate < 90 ? "Warning ⚠" : "Critical ⚠⚠";
  
  console.log("   ┌────────────────────────────────────────────────────────┐");
  console.log(`   │ Utilization Rate: ${String(utilizationRate.toFixed(2)).padEnd(38)}% │`);
  console.log(`   │ System Status:    ${health.padEnd(38)} │`);
  console.log(`   │ Available:        ${String(ethers.formatUnits(vaultBalance - totalPrincipal, 6)).padEnd(30)} USDC │`);
  console.log("   └────────────────────────────────────────────────────────┘");

  // ===== 7. Recent Activity =====
  console.log("\n🕐 7. RECENT DEPOSITS (Last 5)");
  
  let recentCount = 0;
  for (let i = totalDeposits; i > 0 && recentCount < 5; i--) {
    try {
      const deposit = await savingCore.getDeposit(i);
      if (deposit.depositId > 0) {
        const plan = await savingCore.getPlan(deposit.planId);
        const status = ["Active", "Withdrawn", "Auto-Renewed", "Manual-Renewed"][Number(deposit.status)];
        
        console.log(`   • Deposit #${i}:`);
        console.log(`     Owner: ${deposit.owner.slice(0, 10)}...${deposit.owner.slice(-8)}`);
        console.log(`     Amount: ${ethers.formatUnits(deposit.principal, 6)} USDC`);
        console.log(`     Plan: ${plan.tenorDays} days @ ${Number(deposit.aprBpsAtOpen) / 100}%`);
        console.log(`     Status: ${status}`);
        recentCount++;
      }
    } catch {}
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ ADMIN DASHBOARD COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");

  // ===== 8. Admin Actions Available =====
  console.log("\n🔧 ADMIN ACTIONS AVAILABLE:");
  console.log("   1. Create new saving plan: savingCore.createPlan(...)");
  console.log("   2. Update existing plan: savingCore.updatePlan(...)");
  console.log("   3. Set grace period: savingCore.setGracePeriod(...)");
  console.log("   4. Fund vault: mockUSDC.transfer(vaultAddress, amount)");
  console.log("   5. Change fee receiver: vaultManager.setFeeReceiver(...)");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
