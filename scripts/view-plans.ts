import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * View All Saving Plans - Display all available saving plans with details
 * - Plan ID, Tenor, APR, Min/Max deposit
 * - Early withdrawal penalty
 * - Expected returns calculation
 * 
 * Run: npx hardhat run scripts/view-plans.ts --network sepolia
 */

async function main() {
  console.log("\n📋 SAVING PLANS\n");
  console.log("═══════════════════════════════════════════════════════════");

  // Load contracts
  const savingCoreDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/SavingCore.json", "utf8")
  );
  const vaultManagerDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/VaultManager.json", "utf8")
  );
  const mockUSDCDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/MockUSDC.json", "utf8")
  );

  const [user] = await ethers.getSigners();

  const savingCore = new ethers.Contract(
    savingCoreDeployment.address,
    savingCoreDeployment.abi,
    user
  );

  const mockUSDC = new ethers.Contract(
    mockUSDCDeployment.address,
    mockUSDCDeployment.abi,
    user
  );

  // Get vault liquidity
  const vaultBalance = await mockUSDC.balanceOf(vaultManagerDeployment.address);

  console.log("\n💰 VAULT STATUS");
  console.log(`   Available Liquidity: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
  console.log(`   Status: ${Number(ethers.formatUnits(vaultBalance, 6)) > 1000 ? "🟢 Healthy" : "🟡 Low"}`);

  // ===== Collect all plans =====
  console.log("\n📊 AVAILABLE SAVING PLANS");
  console.log("\n   ┌──────┬───────────┬─────────┬────────────┬────────────┬──────────┐");
  console.log("   │  ID  │   Tenor   │   APR   │  Min (USD) │  Max (USD) │ Penalty  │");
  console.log("   ├──────┼───────────┼─────────┼────────────┼────────────┼──────────┤");
  
  const plans = [];
  for (let i = 0; i < 30; i++) {
    try {
      const plan = await savingCore.getPlan(i);
      if (Number(plan.tenorDays) > 0 && plan.enabled) {
        const planData = {
          id: i,
          tenor: Number(plan.tenorDays),
          apr: Number(plan.aprBps) / 100,
          minDeposit: Number(ethers.formatUnits(plan.minDeposit, 6)),
          maxDeposit: plan.maxDeposit > 0 ? Number(ethers.formatUnits(plan.maxDeposit, 6)) : 0,
          penalty: Number(plan.earlyWithdrawPenaltyBps) / 100
        };
        
        plans.push(planData);
        
        const minStr = planData.minDeposit > 0 ? String(planData.minDeposit) : "0";
        const maxStr = planData.maxDeposit > 0 ? String(planData.maxDeposit) : "∞";
        
        console.log(`   │  ${String(i).padStart(2)}  │ ${String(plan.tenorDays).padStart(6)} days │ ${String(planData.apr).padStart(6)}% │ ${minStr.padStart(10)} │ ${maxStr.padStart(10)} │ ${String(planData.penalty).padStart(7)}% │`);
      }
    } catch {}
  }
  
  console.log("   └──────┴───────────┴─────────┴────────────┴────────────┴──────────┘");
  console.log(`\n   Total Available Plans: ${plans.length}`);

  // ===== Detailed Plan Information =====
  console.log("\n📈 PLAN DETAILS & RETURNS CALCULATOR");
  
  for (const plan of plans) {
    console.log(`\n   ═══════════════════════════════════════════════════════════`);
    console.log(`   PLAN ${plan.id}: ${plan.tenor} Days Fixed Term`);
    console.log(`   ═══════════════════════════════════════════════════════════`);
    console.log(`   APR: ${plan.apr}% per year`);
    console.log(`   Minimum: ${plan.minDeposit > 0 ? plan.minDeposit + " USDC" : "No minimum"}`);
    console.log(`   Maximum: ${plan.maxDeposit > 0 ? plan.maxDeposit + " USDC" : "No limit"}`);
    console.log(`   Early Withdrawal Penalty: ${plan.penalty}%`);
    
    // Example calculations for common amounts
    console.log(`\n   💡 Returns Calculator:`);
    console.log(`   ┌──────────────┬────────────────┬─────────────────────┐`);
    console.log(`   │   Deposit    │    Interest    │   Total (Maturity)  │`);
    console.log(`   ├──────────────┼────────────────┼─────────────────────┤`);
    
    const amounts = [100, 1000, 5000, 10000];
    for (const amount of amounts) {
      if (plan.minDeposit > 0 && amount < plan.minDeposit) continue;
      if (plan.maxDeposit > 0 && amount > plan.maxDeposit) continue;
      
      const interest = (amount * plan.apr * plan.tenor) / (365 * 100);
      const total = amount + interest;
      
      console.log(`   │ ${String(amount).padStart(8)} USDC │ ${String(interest.toFixed(4)).padStart(10)} USDC │ ${String(total.toFixed(4)).padStart(15)} USDC │`);
    }
    console.log(`   └──────────────┴────────────────┴─────────────────────┘`);
    
    // Early withdrawal impact
    console.log(`\n   ⚠️  Early Withdrawal Impact:`);
    console.log(`      If you withdraw early, you lose ${plan.penalty}% of principal`);
    console.log(`      Example: 1000 USDC → ${1000 - (1000 * plan.penalty / 100)} USDC (loss: ${1000 * plan.penalty / 100} USDC)`);
  }

  // ===== Comparison Table =====
  console.log("\n\n📊 PLAN COMPARISON");
  console.log("   ┌──────┬───────────┬─────────┬────────────────────────────┐");
  console.log("   │  ID  │   Tenor   │   APR   │  1000 USDC Returns         │");
  console.log("   ├──────┼───────────┼─────────┼────────────────────────────┤");
  
  for (const plan of plans) {
    const interest = (1000 * plan.apr * plan.tenor) / (365 * 100);
    const total = 1000 + interest;
    
    console.log(`   │  ${String(plan.id).padStart(2)}  │ ${String(plan.tenor).padStart(6)} days │ ${String(plan.apr).padStart(6)}% │ +${String(interest.toFixed(4)).padStart(8)} → ${String(total.toFixed(2)).padStart(10)} USDC │`);
  }
  console.log("   └──────┴───────────┴─────────┴────────────────────────────┘");

  // ===== Recommendations =====
  console.log("\n💡 RECOMMENDATIONS");
  
  // Find best APR
  const bestAPR = plans.reduce((max, plan) => plan.apr > max.apr ? plan : max, plans[0]);
  console.log(`   🏆 Highest APR: Plan ${bestAPR.id} (${bestAPR.apr}% for ${bestAPR.tenor} days)`);
  
  // Find shortest term
  const shortest = plans.reduce((min, plan) => plan.tenor < min.tenor ? plan : min, plans[0]);
  console.log(`   ⚡ Shortest Term: Plan ${shortest.id} (${shortest.tenor} days @ ${shortest.apr}%)`);
  
  // Find longest term
  const longest = plans.reduce((max, plan) => plan.tenor > max.tenor ? plan : max, plans[0]);
  console.log(`   📅 Longest Term: Plan ${longest.id} (${longest.tenor} days @ ${longest.apr}%)`);
  
  // Find lowest penalty
  const lowestPenalty = plans.reduce((min, plan) => plan.penalty < min.penalty ? plan : min, plans[0]);
  console.log(`   🛡️  Lowest Penalty: Plan ${lowestPenalty.id} (${lowestPenalty.penalty}% penalty)`);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ PLAN VIEW COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");

  console.log("\n🚀 NEXT STEPS:");
  console.log("   1. Open a deposit: npx hardhat run scripts/open-deposit.ts --network sepolia");
  console.log("   2. View your portfolio: npx hardhat run scripts/user-dashboard.ts --network sepolia");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
