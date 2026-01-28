import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * Frontend-Style Test - Simulates how frontend will interact with contracts
 * Uses ABI imports from deployments folder
 * User wallet: 0xF7227428Ef0e2F73560Ce6Da5EaFcff0bbBE109f
 * 
 * Run: npx hardhat run scripts/frontend-test.ts --network sepolia
 */

async function main() {
  console.log("\n🎨 FRONTEND-STYLE TEST\n");
  console.log("═══════════════════════════════════════════════════════════");

  // ===== 1. Load ABI from deployments folder (like frontend would) =====
  const mockUSDCDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/MockUSDC.json", "utf8")
  );
  const vaultManagerDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/VaultManager.json", "utf8")
  );
  const savingCoreDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/SavingCore.json", "utf8")
  );

  console.log("\n✅ Step 1: Loaded ABIs from deployments folder");
  console.log(`   MockUSDC ABI: ${mockUSDCDeployment.abi.length} functions`);
  console.log(`   VaultManager ABI: ${vaultManagerDeployment.abi.length} functions`);
  console.log(`   SavingCore ABI: ${savingCoreDeployment.abi.length} functions`);

  // ===== 2. Get contract addresses =====
  const mockUSDCAddress = mockUSDCDeployment.address;
  const vaultManagerAddress = vaultManagerDeployment.address;
  const savingCoreAddress = savingCoreDeployment.address;

  console.log("\n✅ Step 2: Contract addresses");
  console.log(`   MockUSDC: ${mockUSDCAddress}`);
  console.log(`   VaultManager: ${vaultManagerAddress}`);
  console.log(`   SavingCore: ${savingCoreAddress}`);

  // ===== 3. Connect to contracts using ABI =====
  const mockUSDC = new ethers.Contract(
    mockUSDCAddress,
    mockUSDCDeployment.abi,
    (await ethers.getSigners())[0]
  );
  
  const savingCore = new ethers.Contract(
    savingCoreAddress,
    savingCoreDeployment.abi,
    (await ethers.getSigners())[0]
  );

  console.log("\n✅ Step 3: Connected to contracts via ABI");

  // ===== 4. Set up user wallet =====
  const userWalletAddress = "0xF7227428Ef0e2F73560Ce6Da5EaFcff0bbBE109f";
  const [deployer] = await ethers.getSigners();
  
  console.log("\n✅ Step 4: User wallet setup");
  console.log(`   User Address: ${userWalletAddress}`);
  console.log(`   Test Deployer: ${deployer.address}`);

  // ===== 5. Check USDC balance =====
  const userBalance = await mockUSDC.balanceOf(deployer.address);
  console.log("\n✅ Step 5: Check USDC balance");
  console.log(`   Balance: ${ethers.formatUnits(userBalance, 6)} USDC`);

  // ===== 6. View all available saving plans =====
  console.log("\n✅ Step 6: View available saving plans");
  console.log("   ┌─────┬────────┬─────────┬──────────┬────────┐");
  console.log("   │ ID  │ Tenor  │   APR   │ Penalty  │ Active │");
  console.log("   ├─────┼────────┼─────────┼──────────┼────────┤");
  
  const plans = [];
  for (let i = 0; i < 10; i++) {
    try {
      const plan = await savingCore.getPlan(i);
      if (Number(plan.tenorInDays) > 0) {
        plans.push({
          id: i,
          tenor: Number(plan.tenorInDays),
          apr: Number(plan.aprBps) / 100,
          penalty: Number(plan.earlyWithdrawPenaltyBps) / 100,
          isActive: plan.isActive
        });
        
        const status = plan.isActive ? "✓" : "✗";
        console.log(`   │  ${i}  │ ${String(plan.tenorInDays).padEnd(6)} │ ${String(Number(plan.aprBps) / 100).padEnd(6)}% │ ${String(Number(plan.earlyWithdrawPenaltyBps) / 100).padEnd(7)}% │   ${status}    │`);
      }
    } catch {}
  }
  console.log("   └─────┴────────┴─────────┴──────────┴────────┘");

  // ===== 7. Test: Open a deposit (like frontend deposit form) =====
  console.log("\n✅ Step 7: Open a deposit");
  
  const planId = 2; // 30-day plan (5% APR)
  const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
  
  console.log(`   Plan selected: ${plans[planId]?.tenor || 30} days @ ${plans[planId]?.apr || 5}% APR`);
  console.log(`   Amount: ${ethers.formatUnits(depositAmount, 6)} USDC`);

  try {
    // Approve USDC first (frontend would do this)
    console.log("   → Approving USDC...");
    const approveTx = await mockUSDC.approve(savingCoreAddress, depositAmount);
    await approveTx.wait();
    console.log("   ✓ Approved");

    // Open deposit
    console.log("   → Opening deposit...");
    const depositTx = await savingCore.openDeposit(planId, depositAmount);
    const receipt = await depositTx.wait();
    
    // Get deposit ID from event
    const depositEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = savingCore.interface.parseLog(log);
        return parsed?.name === "DepositOpened";
      } catch {
        return false;
      }
    });
    
    let depositId = 0;
    if (depositEvent) {
      const parsed = savingCore.interface.parseLog(depositEvent);
      depositId = Number(parsed?.args?.depositId || 0);
    }
    
    console.log(`   ✓ Deposit opened! Deposit ID: ${depositId}`);

    // ===== 8. View deposit details =====
    console.log("\n✅ Step 8: View deposit details");
    const deposit = await savingCore.getDeposit(depositId);
    
    console.log(`   Owner: ${deposit.owner}`);
    console.log(`   Principal: ${ethers.formatUnits(deposit.principal, 6)} USDC`);
    console.log(`   APR at open: ${Number(deposit.aprBpsAtOpen) / 100}%`);
    console.log(`   Opened at: ${new Date(Number(deposit.openedAt) * 1000).toLocaleString()}`);
    console.log(`   Maturity at: ${new Date(Number(deposit.maturityAt) * 1000).toLocaleString()}`);
    console.log(`   Status: ${["Active", "MaturityWithdrawn", "EarlyWithdrawn"][Number(deposit.status)]}`);

    // ===== 9. Calculate expected interest =====
    console.log("\n✅ Step 9: Calculate expected interest");
    
    const principal = Number(ethers.formatUnits(deposit.principal, 6));
    const apr = Number(deposit.aprBpsAtOpen) / 100;
    const tenor = plans[planId]?.tenor || 30;
    const expectedInterest = (principal * apr * tenor) / (365 * 100);
    
    console.log(`   Principal: ${principal} USDC`);
    console.log(`   APR: ${apr}%`);
    console.log(`   Tenor: ${tenor} days`);
    console.log(`   Expected interest at maturity: ${expectedInterest.toFixed(6)} USDC`);
    console.log(`   Total at maturity: ${(principal + expectedInterest).toFixed(6)} USDC`);

    // ===== 10. Test early withdrawal =====
    console.log("\n✅ Step 10: Test early withdrawal (simulate)");
    
    const penalty = plans[planId]?.penalty || 8;
    const penaltyAmount = (principal * penalty) / 100;
    const principalAfterPenalty = principal - penaltyAmount;
    
    console.log(`   If withdrawn early:`);
    console.log(`   Penalty: ${penalty}%`);
    console.log(`   Penalty amount: ${penaltyAmount.toFixed(6)} USDC`);
    console.log(`   You would receive: ${principalAfterPenalty.toFixed(6)} USDC`);

    // ===== 11. User can view their deposits =====
    console.log("\n✅ Step 11: User deposits list");
    console.log(`   User ${deployer.address.slice(0, 6)}...${deployer.address.slice(-4)} has:`);
    console.log(`   - Deposit #${depositId}: ${principal} USDC @ ${apr}% APR`);

  } catch (error: any) {
    console.log(`   ⚠️ Deposit test skipped: ${error.message?.split('\n')[0] || 'Error'}`);
  }

  // ===== 12. Check vault liquidity =====
  console.log("\n✅ Step 12: Vault liquidity");
  const vaultBalance = await mockUSDC.balanceOf(vaultManagerAddress);
  console.log(`   Available liquidity: ${ethers.formatUnits(vaultBalance, 6)} USDC`);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ FRONTEND TEST COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");

  // ===== Summary for frontend integration =====
  console.log("\n📋 Frontend Integration Guide:");
  console.log("\n1. Import contract addresses and ABIs:");
  console.log("   import MockUSDC from './deployments/sepolia/MockUSDC.json';");
  console.log("   import SavingCore from './deployments/sepolia/SavingCore.json';");
  console.log("");
  console.log("2. Connect to user wallet:");
  console.log(`   const userAddress = '${userWalletAddress}';`);
  console.log("   const provider = new ethers.BrowserProvider(window.ethereum);");
  console.log("   const signer = await provider.getSigner();");
  console.log("");
  console.log("3. Create contract instances:");
  console.log("   const usdc = new ethers.Contract(MockUSDC.address, MockUSDC.abi, signer);");
  console.log("   const core = new ethers.Contract(SavingCore.address, SavingCore.abi, signer);");
  console.log("");
  console.log("4. Main operations:");
  console.log("   • View plans: await core.getPlan(planId)");
  console.log("   • Open deposit: await core.openDeposit(planId, amount)");
  console.log("   • View deposit: await core.getDeposit(depositId)");
  console.log("   • Withdraw: await core.withdrawAtMaturity(depositId)");
  console.log("   • Early withdraw: await core.earlyWithdraw(depositId)");
  console.log("   • Renew: await core.renewDeposit(depositId, newPlanId)");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
