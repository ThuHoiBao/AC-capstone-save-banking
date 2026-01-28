import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * Open Deposit - Interactive deposit opening
 * - Select plan
 * - Enter amount
 * - Approve and open deposit
 * - View confirmation
 * 
 * Run: npx hardhat run scripts/open-deposit.ts --network sepolia
 */

async function main() {
  console.log("\n💳 OPEN NEW DEPOSIT\n");
  console.log("═══════════════════════════════════════════════════════════");

  // Load contracts
  const mockUSDCDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/MockUSDC.json", "utf8")
  );
  const savingCoreDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/SavingCore.json", "utf8")
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

  // ===== 1. Check User Balance =====
  console.log("\n💰 1. YOUR BALANCE");
  
  const balance = await mockUSDC.balanceOf(user.address);
  console.log(`   Address: ${user.address}`);
  console.log(`   USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  if (balance === 0n) {
    console.log("\n   ⚠️  You don't have any USDC!");
    console.log("   Please get some USDC first to open a deposit.");
    return;
  }

  // ===== 2. Display Available Plans =====
  console.log("\n📋 2. AVAILABLE SAVING PLANS");
  console.log("   ┌──────┬───────────┬─────────┬────────────┬──────────┐");
  console.log("   │  ID  │   Tenor   │   APR   │  Min (USD) │ Penalty  │");
  console.log("   ├──────┼───────────┼─────────┼────────────┼──────────┤");
  
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
        console.log(`   │  ${String(i).padStart(2)}  │ ${String(plan.tenorDays).padStart(6)} days │ ${String(planData.apr).padStart(6)}% │ ${minStr.padStart(10)} │ ${String(planData.penalty).padStart(7)}% │`);
      }
    } catch {}
  }
  console.log("   └──────┴───────────┴─────────┴────────────┴──────────┘");

  // ===== 3. Select Plan and Amount =====
  console.log("\n📝 3. DEPOSIT DETAILS");
  
  if (plans.length === 0) {
    console.log("   ❌ No plans available!");
    return;
  }
  
  // For this example, we'll use predefined values
  // In a real interactive script, you'd use readline or similar
  const selectedPlanId = plans[0].id; // Select first available plan
  const depositAmount = 1000; // 1000 USDC
  
  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  
  if (!selectedPlan) {
    console.log("   ❌ Selected plan not found!");
    return;
  }
  
  console.log(`   Selected Plan: Plan ${selectedPlanId}`);
  console.log(`   Tenor: ${selectedPlan.tenor} days`);
  console.log(`   APR: ${selectedPlan.apr}%`);
  console.log(`   Deposit Amount: ${depositAmount} USDC`);

  // ===== 4. Validate =====
  console.log("\n✅ 4. VALIDATION");
  
  const amountWei = ethers.parseUnits(depositAmount.toString(), 6);
  
  if (balance < amountWei) {
    console.log(`   ❌ Insufficient balance!`);
    console.log(`   Required: ${depositAmount} USDC`);
    console.log(`   Available: ${ethers.formatUnits(balance, 6)} USDC`);
    return;
  }
  
  if (selectedPlan.minDeposit > 0 && depositAmount < selectedPlan.minDeposit) {
    console.log(`   ❌ Amount below minimum!`);
    console.log(`   Minimum: ${selectedPlan.minDeposit} USDC`);
    return;
  }
  
  if (selectedPlan.maxDeposit > 0 && depositAmount > selectedPlan.maxDeposit) {
    console.log(`   ❌ Amount above maximum!`);
    console.log(`   Maximum: ${selectedPlan.maxDeposit} USDC`);
    return;
  }
  
  console.log(`   ✓ Balance sufficient`);
  console.log(`   ✓ Amount within limits`);

  // ===== 5. Calculate Expected Returns =====
  console.log("\n💹 5. EXPECTED RETURNS");
  
  const expectedInterest = (depositAmount * selectedPlan.apr * selectedPlan.tenor) / (365 * 100);
  const totalAtMaturity = depositAmount + expectedInterest;
  const maturityDate = new Date(Date.now() + selectedPlan.tenor * 24 * 60 * 60 * 1000);
  
  console.log("   ┌────────────────────────────────────────────────────┐");
  console.log(`   │ Deposit Amount:        ${String(depositAmount).padEnd(24)} USDC │`);
  console.log(`   │ Duration:              ${String(selectedPlan.tenor).padEnd(24)} days │`);
  console.log(`   │ APR:                   ${String(selectedPlan.apr).padEnd(24)}% │`);
  console.log(`   │ ──────────────────────────────────────────────────── │`);
  console.log(`   │ Expected Interest:     ${String(expectedInterest.toFixed(6)).padEnd(24)} USDC │`);
  console.log(`   │ Total at Maturity:     ${String(totalAtMaturity.toFixed(6)).padEnd(24)} USDC │`);
  console.log(`   │ ROI:                   ${String(((expectedInterest / depositAmount) * 100).toFixed(3)).padEnd(24)}% │`);
  console.log(`   │ Maturity Date:         ${maturityDate.toLocaleDateString().padEnd(24)} │`);
  console.log("   └────────────────────────────────────────────────────┘");

  // ===== 6. Warning about Early Withdrawal =====
  console.log("\n⚠️  6. EARLY WITHDRAWAL NOTICE");
  console.log(`   If you withdraw before maturity:`);
  console.log(`   • You will lose ${selectedPlan.penalty}% of your principal`);
  console.log(`   • Penalty amount: ${(depositAmount * selectedPlan.penalty / 100).toFixed(2)} USDC`);
  console.log(`   • You will receive: ${(depositAmount - (depositAmount * selectedPlan.penalty / 100)).toFixed(2)} USDC`);
  console.log(`   • No interest will be paid`);

  // ===== 7. Execute Transaction =====
  console.log("\n🔄 7. EXECUTING TRANSACTION");
  
  try {
    // Check allowance
    const currentAllowance = await mockUSDC.allowance(user.address, savingCoreDeployment.address);
    
    if (currentAllowance < amountWei) {
      console.log("   Step 1/2: Approving USDC...");
      const approveTx = await mockUSDC.approve(savingCoreDeployment.address, amountWei);
      await approveTx.wait();
      console.log("   ✓ USDC approved");
    } else {
      console.log("   ✓ USDC already approved");
    }

    console.log("   Step 2/2: Opening deposit...");
    const depositTx = await savingCore.openDeposit(selectedPlanId, amountWei);
    const receipt = await depositTx.wait();
    
    // Extract deposit ID from event
    let depositId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = savingCore.interface.parseLog(log);
        if (parsed?.name === "DepositOpened") {
          depositId = Number(parsed.args.depositId);
          break;
        }
      } catch {}
    }
    
    console.log("   ✓ Deposit opened successfully!");

    // ===== 8. Confirmation =====
    console.log("\n🎉 8. DEPOSIT CONFIRMATION");
    console.log("   ┌────────────────────────────────────────────────────┐");
    console.log(`   │ ✅ DEPOSIT SUCCESSFULLY OPENED                     │`);
    console.log("   ├────────────────────────────────────────────────────┤");
    console.log(`   │ Deposit ID:            ${String(depositId).padEnd(28)} │`);
    console.log(`   │ Amount:                ${String(depositAmount).padEnd(20)} USDC │`);
    console.log(`   │ Plan:                  ${String(selectedPlan.tenor).padEnd(13)} days @ ${String(selectedPlan.apr).padEnd(4)}% │`);
    console.log(`   │ Expected Interest:     ${String(expectedInterest.toFixed(6)).padEnd(20)} USDC │`);
    console.log(`   │ Maturity Date:         ${maturityDate.toLocaleDateString().padEnd(28)} │`);
    console.log(`   │ Transaction Hash:      ${receipt.hash.slice(0, 20)}... │`);
    console.log("   └────────────────────────────────────────────────────┘");

    // Updated balance
    const newBalance = await mockUSDC.balanceOf(user.address);
    console.log(`\n   Updated Balance: ${ethers.formatUnits(newBalance, 6)} USDC`);

    // View on Etherscan
    console.log(`\n   🔗 View on Etherscan:`);
    console.log(`   https://sepolia.etherscan.io/tx/${receipt.hash}`);

  } catch (error: any) {
    console.log("\n   ❌ Transaction failed!");
    console.log(`   Error: ${error.message?.split('\n')[0]}`);
    return;
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ DEPOSIT OPENING COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");

  console.log("\n📱 NEXT STEPS:");
  console.log("   1. View your deposit: npx hardhat run scripts/user-dashboard.ts --network sepolia");
  console.log("   2. Wait until maturity date to withdraw with interest");
  console.log("   3. Or withdraw early (with penalty) anytime");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
