import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * ABI Import Test - Demonstrates different ways to import and use ABIs
 * Shows how frontend should load contract ABIs
 * User: 0xF7227428Ef0e2F73560Ce6Da5EaFcff0bbBE109f
 * 
 * Run: npx hardhat run scripts/abi-import-test.ts --network sepolia
 */

async function main() {
  console.log("\n📚 ABI IMPORT TEST - Frontend Integration Patterns\n");
  console.log("═══════════════════════════════════════════════════════════");

  const userWalletAddress = "0xF7227428Ef0e2F73560Ce6Da5EaFcff0bbBE109f";

  // ===== Method 1: Import from deployments folder (RECOMMENDED) =====
  console.log("\n✅ Method 1: Import from deployments/sepolia/*.json");
  console.log("   (This is how frontend should do it)");
  console.log("");
  console.log("   ```typescript");
  console.log("   import MockUSDC from './deployments/sepolia/MockUSDC.json';");
  console.log("   import SavingCore from './deployments/sepolia/SavingCore.json';");
  console.log("   import VaultManager from './deployments/sepolia/VaultManager.json';");
  console.log("   ```");

  const mockUSDCDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/MockUSDC.json", "utf8")
  );
  const savingCoreDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/SavingCore.json", "utf8")
  );
  const vaultManagerDeployment = JSON.parse(
    fs.readFileSync("deployments/sepolia/VaultManager.json", "utf8")
  );

  console.log("\n   ✓ Loaded 3 contracts");
  console.log(`     - MockUSDC: ${mockUSDCDeployment.address}`);
  console.log(`     - SavingCore: ${savingCoreDeployment.address}`);
  console.log(`     - VaultManager: ${vaultManagerDeployment.address}`);

  // ===== Method 2: Import from data/abi folder (Alternative) =====
  console.log("\n✅ Method 2: Import from data/abi/*.json (ABI only)");
  console.log("");
  console.log("   ```typescript");
  console.log("   import MockUSDCAbi from './data/abi/MockUSDC.json';");
  console.log("   import SavingCoreAbi from './data/abi/SavingCore.json';");
  console.log("   // Then load addresses from deployment.json");
  console.log("   ```");

  const mockUSDCAbiOnly = JSON.parse(
    fs.readFileSync("data/abi/contracts/tokens/MockUSDC.sol/MockUSDC.json", "utf8")
  );
  const savingCoreAbiOnly = JSON.parse(
    fs.readFileSync("data/abi/contracts/SavingCore.sol/SavingCore.json", "utf8")
  );

  console.log("\n   ✓ Loaded ABIs");
  console.log(`     - MockUSDC ABI: ${mockUSDCAbiOnly.length} functions`);
  console.log(`     - SavingCore ABI: ${savingCoreAbiOnly.length} functions`);

  // ===== Demonstrate contract instantiation =====
  console.log("\n✅ Creating Contract Instances");
  console.log("");
  console.log("   Frontend code:");
  console.log("   ```typescript");
  console.log("   // 1. Get provider and signer from MetaMask");
  console.log("   const provider = new ethers.BrowserProvider(window.ethereum);");
  console.log("   const signer = await provider.getSigner();");
  console.log("");
  console.log("   // 2. Create contract instances");
  console.log(`   const mockUSDC = new ethers.Contract(`);
  console.log(`     "${mockUSDCDeployment.address}",`);
  console.log(`     MockUSDC.abi,  // From deployments/sepolia/MockUSDC.json`);
  console.log(`     signer`);
  console.log(`   );`);
  console.log("");
  console.log(`   const savingCore = new ethers.Contract(`);
  console.log(`     "${savingCoreDeployment.address}",`);
  console.log(`     SavingCore.abi,  // From deployments/sepolia/SavingCore.json`);
  console.log(`     signer`);
  console.log(`   );`);
  console.log("   ```");

  // ===== Test actual contract connection =====
  console.log("\n✅ Testing Contract Connection");

  const [signer] = await ethers.getSigners();
  
  const mockUSDC = new ethers.Contract(
    mockUSDCDeployment.address,
    mockUSDCDeployment.abi,
    signer
  );

  const savingCore = new ethers.Contract(
    savingCoreDeployment.address,
    savingCoreDeployment.abi,
    signer
  );

  const vaultManager = new ethers.Contract(
    vaultManagerDeployment.address,
    vaultManagerDeployment.abi,
    signer
  );

  console.log("\n   Calling contract view functions:");

  // Test MockUSDC
  const name = await mockUSDC.name();
  const symbol = await mockUSDC.symbol();
  const decimals = await mockUSDC.decimals();
  console.log(`   • MockUSDC.name(): "${name}"`);
  console.log(`   • MockUSDC.symbol(): "${symbol}"`);
  console.log(`   • MockUSDC.decimals(): ${decimals}`);

  // Test SavingCore
  const token = await savingCore.token();
  const vault = await savingCore.vaultManager();
  console.log(`   • SavingCore.token(): ${token}`);
  console.log(`   • SavingCore.vaultManager(): ${vault}`);

  // Test plan reading
  try {
    const plan0 = await savingCore.getPlan(0);
    console.log(`   • SavingCore.getPlan(0): ${plan0.tenorInDays} days`);
  } catch {
    console.log(`   • SavingCore.getPlan(0): No plan found`);
  }

  // ===== Common frontend operations =====
  console.log("\n✅ Common Frontend Operations");
  console.log("");
  console.log("   1. Check user balance:");
  console.log("   ```typescript");
  console.log(`   const userAddress = "${userWalletAddress}";`);
  console.log("   const balance = await mockUSDC.balanceOf(userAddress);");
  console.log('   console.log(`Balance: ${ethers.formatUnits(balance, 6)} USDC`);');
  console.log("   ```");

  console.log("");
  console.log("   2. Get all saving plans:");
  console.log("   ```typescript");
  console.log("   const plans = [];");
  console.log("   for (let i = 0; i < 10; i++) {");
  console.log("     try {");
  console.log("       const plan = await savingCore.getPlan(i);");
  console.log("       if (plan.tenorInDays > 0 && plan.isActive) {");
  console.log("         plans.push({");
  console.log("           id: i,");
  console.log("           tenor: plan.tenorInDays,");
  console.log("           apr: plan.aprBps / 100,");
  console.log("           penalty: plan.earlyWithdrawPenaltyBps / 100");
  console.log("         });");
  console.log("       }");
  console.log("     } catch { break; }");
  console.log("   }");
  console.log("   ```");

  console.log("");
  console.log("   3. Open a deposit:");
  console.log("   ```typescript");
  console.log("   // Step 1: Approve USDC");
  console.log("   const amount = ethers.parseUnits('1000', 6); // 1000 USDC");
  console.log("   const approveTx = await mockUSDC.approve(");
  console.log(`     "${savingCoreDeployment.address}",`);
  console.log("     amount");
  console.log("   );");
  console.log("   await approveTx.wait();");
  console.log("");
  console.log("   // Step 2: Open deposit");
  console.log("   const planId = 0; // 7-day plan");
  console.log("   const depositTx = await savingCore.openDeposit(planId, amount);");
  console.log("   const receipt = await depositTx.wait();");
  console.log("");
  console.log("   // Step 3: Get deposit ID from event");
  console.log("   const event = receipt.logs.find(log => {");
  console.log("     const parsed = savingCore.interface.parseLog(log);");
  console.log("     return parsed?.name === 'DepositOpened';");
  console.log("   });");
  console.log("   const depositId = event.args.depositId;");
  console.log("   ```");

  console.log("");
  console.log("   4. View deposit details:");
  console.log("   ```typescript");
  console.log("   const deposit = await savingCore.getDeposit(depositId);");
  console.log("   console.log({");
  console.log("     owner: deposit.owner,");
  console.log("     principal: ethers.formatUnits(deposit.principal, 6),");
  console.log("     apr: deposit.aprBpsAtOpen / 100,");
  console.log("     maturityAt: new Date(deposit.maturityAt * 1000),");
  console.log("     status: ['Active', 'MaturityWithdrawn', 'EarlyWithdrawn'][deposit.status]");
  console.log("   });");
  console.log("   ```");

  console.log("");
  console.log("   5. Withdraw at maturity:");
  console.log("   ```typescript");
  console.log("   const withdrawTx = await savingCore.withdrawAtMaturity(depositId);");
  console.log("   const receipt = await withdrawTx.wait();");
  console.log("");
  console.log("   // Get amounts from event");
  console.log("   const event = receipt.logs.find(log => {");
  console.log("     const parsed = savingCore.interface.parseLog(log);");
  console.log("     return parsed?.name === 'WithdrawnAtMaturity';");
  console.log("   });");
  console.log("   const principal = event.args.principal;");
  console.log("   const interest = event.args.interest;");
  console.log("   ```");

  // ===== React component example =====
  console.log("\n✅ React Component Example");
  console.log("");
  console.log("   ```tsx");
  console.log("   import { useState, useEffect } from 'react';");
  console.log("   import { ethers } from 'ethers';");
  console.log("   import SavingCore from './deployments/sepolia/SavingCore.json';");
  console.log("   import MockUSDC from './deployments/sepolia/MockUSDC.json';");
  console.log("");
  console.log("   export function DepositForm() {");
  console.log("     const [plans, setPlans] = useState([]);");
  console.log("     const [selectedPlan, setSelectedPlan] = useState(0);");
  console.log("     const [amount, setAmount] = useState('');");
  console.log("");
  console.log("     useEffect(() => {");
  console.log("       loadPlans();");
  console.log("     }, []);");
  console.log("");
  console.log("     async function loadPlans() {");
  console.log("       const provider = new ethers.BrowserProvider(window.ethereum);");
  console.log("       const core = new ethers.Contract(");
  console.log("         SavingCore.address,");
  console.log("         SavingCore.abi,");
  console.log("         provider");
  console.log("       );");
  console.log("");
  console.log("       const loadedPlans = [];");
  console.log("       for (let i = 0; i < 10; i++) {");
  console.log("         try {");
  console.log("           const plan = await core.getPlan(i);");
  console.log("           if (plan.tenorInDays > 0) loadedPlans.push(plan);");
  console.log("         } catch { break; }");
  console.log("       }");
  console.log("       setPlans(loadedPlans);");
  console.log("     }");
  console.log("");
  console.log("     async function handleDeposit() {");
  console.log("       const provider = new ethers.BrowserProvider(window.ethereum);");
  console.log("       const signer = await provider.getSigner();");
  console.log("       ");
  console.log("       const usdc = new ethers.Contract(MockUSDC.address, MockUSDC.abi, signer);");
  console.log("       const core = new ethers.Contract(SavingCore.address, SavingCore.abi, signer);");
  console.log("       ");
  console.log("       const amt = ethers.parseUnits(amount, 6);");
  console.log("       await usdc.approve(SavingCore.address, amt);");
  console.log("       await core.openDeposit(selectedPlan, amt);");
  console.log("     }");
  console.log("");
  console.log("     return (");
  console.log("       <form onSubmit={handleDeposit}>");
  console.log("         <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}>");
  console.log("           {plans.map((plan, i) => (");
  console.log("             <option key={i} value={i}>");
  console.log("               {plan.tenorInDays} days @ {plan.aprBps/100}%");
  console.log("             </option>");
  console.log("           ))}");
  console.log("         </select>");
  console.log("         <input value={amount} onChange={e => setAmount(e.target.value)} />");
  console.log("         <button>Deposit</button>");
  console.log("       </form>");
  console.log("     );");
  console.log("   }");
  console.log("   ```");

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("✅ ABI IMPORT TEST COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");

  console.log("\n📁 Files to use in frontend:");
  console.log("   ✓ deployments/sepolia/MockUSDC.json");
  console.log("   ✓ deployments/sepolia/SavingCore.json");
  console.log("   ✓ deployments/sepolia/VaultManager.json");
  console.log("");
  console.log("📝 Each file contains:");
  console.log("   • address: Contract address on Sepolia");
  console.log("   • abi: Complete ABI array");
  console.log("   • args: Constructor arguments");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
