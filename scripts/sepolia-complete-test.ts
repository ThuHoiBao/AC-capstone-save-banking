import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * Complete Sepolia Test - Full workflow on real testnet
 * User wallet: 0xF7227428Ef0e2F73560Ce6Da5EaFcff0bbBE109f
 * Tests: View plans, check balance, open deposit, view deposit details
 * 
 * Run: npx hardhat run scripts/sepolia-complete-test.ts --network sepolia
 */

async function main() {
  console.log("\n🌐 SEPOLIA COMPLETE TEST - Real Testnet\n");
  console.log("═══════════════════════════════════════════════════════════");

  // ===== Load ABIs and Addresses (Frontend-style) =====
  console.log("\n📦 Step 1: Load contracts from deployments");
  
  const mockUSDCDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/MockUSDC.json", "utf8")
  );
  const savingCoreDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/SavingCore.json", "utf8")
  );
  const vaultManagerDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/VaultManager.json", "utf8")
  );

  console.log(`   MockUSDC: ${mockUSDCDeployment.address}`);
  console.log(`   SavingCore: ${savingCoreDeployment.address}`);
  console.log(`   VaultManager: ${vaultManagerDeployment.address}`);

  // ===== Connect to contracts using ABIs =====
  const [deployer] = await ethers.getSigners();
  const userAddress = "0xF7227428Ef0e2F73560Ce6Da5EaFcff0bbBE109f";

  const mockUSDC = new ethers.Contract(
    mockUSDCDeployment.address,
    mockUSDCDeployment.abi,
    deployer
  );

  const savingCore = new ethers.Contract(
    savingCoreDeployment.address,
    savingCoreDeployment.abi,
    deployer
  );

  console.log("\n✅ Step 2: Connected to contracts via ABI");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Target User: ${userAddress}`);

  // ===== Check balances =====
  console.log("\n💰 Step 3: Check USDC balances");
  
  const deployerBalance = await mockUSDC.balanceOf(deployer.address);
  const vaultBalance = await mockUSDC.balanceOf(vaultManagerDeployment.address);
  
  console.log(`   Deployer balance: ${ethers.formatUnits(deployerBalance, 6)} USDC`);
  console.log(`   Vault liquidity: ${ethers.formatUnits(vaultBalance, 6)} USDC`);

  // ===== View all saving plans =====
  console.log("\n📋 Step 4: View available saving plans");
  console.log("\n   ┌──────┬──────────┬──────────┬──────────┐");
  console.log("   │  ID  │  Tenor   │   APR    │ Penalty  │");
  console.log("   ├──────┼──────────┼──────────┼──────────┤");
  
  const activePlans = [];
  for (let i = 0; i < 10; i++) {
    try {
      const plan = await savingCore.getPlan(i);
      const tenor = Number(plan.tenorDays);
      
      if (tenor > 0) {
        const apr = Number(plan.aprBps) / 100;
        const penalty = Number(plan.earlyWithdrawPenaltyBps) / 100;
        
        activePlans.push({ id: i, tenor, apr, penalty });
        
        console.log(`   │  ${String(i).padStart(2)}  │ ${String(tenor).padStart(5)} days │ ${String(apr).padStart(6)}%  │ ${String(penalty).padStart(6)}%  │`);
      }
    } catch {}
  }
  console.log("   └──────┴──────────┴──────────┴──────────┘");
  console.log(`\n   Total active plans: ${activePlans.length}`);

  // ===== View user's existing deposits =====
  console.log("\n📊 Step 5: Check user's deposits");
  
  let userDeposits = 0;
  console.log("\n   User deposits:");
  for (let i = 0; i < 20; i++) {
    try {
      const deposit = await savingCore.getDeposit(i);
      if (deposit.owner.toLowerCase() === deployer.address.toLowerCase()) {
        userDeposits++;
        const principal = ethers.formatUnits(deposit.principal, 6);
        const apr = Number(deposit.aprBpsAtOpen) / 100;
        const status = ["Active", "MaturityWithdrawn", "EarlyWithdrawn"][Number(deposit.status)];
        const maturity = new Date(Number(deposit.maturityAt) * 1000);
        
        console.log(`   • Deposit #${i}:`);
        console.log(`     - Principal: ${principal} USDC`);
        console.log(`     - APR: ${apr}%`);
        console.log(`     - Status: ${status}`);
        console.log(`     - Maturity: ${maturity.toLocaleString()}`);
      }
    } catch {}
  }
  
  if (userDeposits === 0) {
    console.log(`   No active deposits found for ${deployer.address.slice(0, 6)}...${deployer.address.slice(-4)}`);
  }

  // ===== Test opening a new deposit =====
  console.log("\n📝 Step 6: Test opening a new deposit");
  
  if (activePlans.length > 0 && deployerBalance > 0) {
    // Select first active plan
    const selectedPlan = activePlans[0];
    const depositAmount = ethers.parseUnits("500", 6); // 500 USDC
    
    console.log(`\n   Selected plan: ${selectedPlan.tenor} days @ ${selectedPlan.apr}% APR`);
    console.log(`   Deposit amount: ${ethers.formatUnits(depositAmount, 6)} USDC`);
    
    if (deployerBalance >= depositAmount) {
      try {
        // Approve
        console.log("\n   → Approving USDC...");
        const approveTx = await mockUSDC.approve(savingCoreDeployment.address, depositAmount);
        await approveTx.wait();
        console.log("   ✓ Approved");

        // Open deposit
        console.log("   → Opening deposit...");
        const depositTx = await savingCore.openDeposit(selectedPlan.id, depositAmount);
        const receipt = await depositTx.wait();
        
        // Get deposit ID from event
        let newDepositId = 0;
        for (const log of receipt.logs) {
          try {
            const parsed = savingCore.interface.parseLog(log);
            if (parsed?.name === "DepositOpened") {
              newDepositId = Number(parsed.args.depositId);
              break;
            }
          } catch {}
        }
        
        console.log(`   ✓ Deposit opened! Deposit ID: ${newDepositId}`);

        // ===== View new deposit details =====
        console.log("\n🔍 Step 7: View new deposit details");
        
        const newDeposit = await savingCore.getDeposit(newDepositId);
        const principal = ethers.formatUnits(newDeposit.principal, 6);
        const apr = Number(newDeposit.aprBpsAtOpen) / 100;
        const openedAt = new Date(Number(newDeposit.openedAt) * 1000);
        const maturityAt = new Date(Number(newDeposit.maturityAt) * 1000);
        
        console.log(`\n   Deposit #${newDepositId} Details:`);
        console.log(`   ┌────────────────────────────────────────────────┐`);
        console.log(`   │ Owner: ${newDeposit.owner.slice(0, 10)}...${newDeposit.owner.slice(-8)} │`);
        console.log(`   │ Principal: ${String(principal).padEnd(29)} USDC │`);
        console.log(`   │ APR: ${String(apr).padEnd(37)}% │`);
        console.log(`   │ Opened: ${openedAt.toLocaleDateString().padEnd(33)} │`);
        console.log(`   │ Maturity: ${maturityAt.toLocaleDateString().padEnd(31)} │`);
        console.log(`   │ Status: Active                                 │`);
        console.log(`   └────────────────────────────────────────────────┘`);

        // Calculate expected returns
        console.log("\n💹 Step 8: Expected returns at maturity");
        
        const expectedInterest = (Number(principal) * apr * selectedPlan.tenor) / (365 * 100);
        const totalAtMaturity = Number(principal) + expectedInterest;
        
        console.log(`\n   Investment: ${principal} USDC`);
        console.log(`   Duration: ${selectedPlan.tenor} days`);
        console.log(`   APR: ${apr}%`);
        console.log(`   ─────────────────────────────────────────`);
        console.log(`   Expected interest: ${expectedInterest.toFixed(6)} USDC`);
        console.log(`   Total at maturity: ${totalAtMaturity.toFixed(6)} USDC`);
        console.log(`   ROI: ${((expectedInterest / Number(principal)) * 100).toFixed(3)}%`);

        // Early withdrawal simulation
        console.log("\n⚠️  Step 9: Early withdrawal impact (simulation)");
        
        const penaltyAmount = (Number(principal) * selectedPlan.penalty) / 100;
        const afterPenalty = Number(principal) - penaltyAmount;
        
        console.log(`\n   If withdrawn early:`);
        console.log(`   Penalty: ${selectedPlan.penalty}%`);
        console.log(`   Penalty amount: -${penaltyAmount.toFixed(6)} USDC`);
        console.log(`   You would receive: ${afterPenalty.toFixed(6)} USDC`);
        console.log(`   Loss: -${penaltyAmount.toFixed(6)} USDC (-${selectedPlan.penalty}%)`);

        // Check updated balances
        console.log("\n💰 Step 10: Updated balances");
        
        const newDeployerBalance = await mockUSDC.balanceOf(deployer.address);
        const newVaultBalance = await mockUSDC.balanceOf(vaultManagerDeployment.address);
        
        console.log(`   Deployer balance: ${ethers.formatUnits(newDeployerBalance, 6)} USDC`);
        console.log(`   Vault liquidity: ${ethers.formatUnits(newVaultBalance, 6)} USDC`);

      } catch (error: any) {
        console.log(`   ⚠️ Transaction failed: ${error.message?.split('\n')[0] || 'Unknown error'}`);
      }
    } else {
      console.log(`   ⚠️ Insufficient balance. Need ${ethers.formatUnits(depositAmount, 6)} USDC`);
    }
  } else {
    console.log("   ⚠️ No active plans available or insufficient balance");
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ SEPOLIA TEST COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");

  // ===== Summary =====
  console.log("\n📊 Summary:");
  console.log(`   Network: Sepolia Testnet`);
  console.log(`   Contracts: ${activePlans.length > 0 ? 'Working ✓' : 'Not working ✗'}`);
  console.log(`   Active plans: ${activePlans.length}`);
  console.log(`   Vault liquidity: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
  console.log(`   User deposits: ${userDeposits}`);

  console.log("\n🎯 Next steps for frontend:");
  console.log("   1. Copy deployments/sepolia/*.json to your React app");
  console.log("   2. Connect MetaMask to Sepolia testnet");
  console.log(`   3. Use deployer wallet or ${userAddress}`);
  console.log("   4. Import ABIs and addresses from deployment files");
  console.log("   5. Build UI for: view plans, open deposit, view deposits, withdraw");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
