/**
 * Test Frontend Data Flow
 * Verifies on-chain + off-chain data integration
 */

import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('\n🧪 TESTING FRONTEND DATA FLOW\n');
  console.log('=' .repeat(60));

  // Load deployed contracts
  const deploymentsPath = path.join(__dirname, '../deployments/sepolia');
  
  // Check which file exists (SavingCore or SavingLogic)
  let savingLogicDeployment;
  const coreFile = path.join(deploymentsPath, 'SavingCore.json');
  const logicFile = path.join(deploymentsPath, 'SavingLogic.json');
  
  if (fs.existsSync(coreFile)) {
    savingLogicDeployment = JSON.parse(fs.readFileSync(coreFile, 'utf8'));
  } else if (fs.existsSync(logicFile)) {
    savingLogicDeployment = JSON.parse(fs.readFileSync(logicFile, 'utf8'));
  } else {
    throw new Error('No SavingCore.json or SavingLogic.json found in deployments/sepolia');
  }

  const savingLogicAddress = savingLogicDeployment.address;
  console.log(`\n📍 SavingLogic: ${savingLogicAddress}`);

  // Connect to contract (use SavingLogic, not SavingCore)
  const savingLogic = await ethers.getContractAt('SavingLogic', savingLogicAddress);

  // Test on-chain plans
  console.log('\n\n📊 ON-CHAIN PLANS:');
  console.log('─'.repeat(60));

  const plans = [];
  for (let i = 1; i <= 6; i++) {
    try {
      const plan = await savingLogic.getPlan(i);
      const days = Number(plan.tenorSeconds) / 86400;
      const apr = Number(plan.aprBps) / 100;

      plans.push({
        id: Number(plan.planId),
        days,
        apr,
        minDeposit: ethers.formatUnits(plan.minDeposit, 6),
        maxDeposit: ethers.formatUnits(plan.maxDeposit, 6),
        penalty: Number(plan.earlyWithdrawPenaltyBps) / 100,
      });

      console.log(`\n✅ Plan ${i}:`);
      console.log(`   Days: ${days}d`);
      console.log(`   APR: ${apr}%`);
      console.log(`   Range: $${plans[i-1].minDeposit} - $${plans[i-1].maxDeposit}`);
      console.log(`   Penalty: ${plans[i-1].penalty}%`);
    } catch (error: any) {
      console.log(`\n❌ Plan ${i}: Not found`);
    }
  }

  // Test metadata files
  console.log('\n\n📁 OFF-CHAIN METADATA:');
  console.log('─'.repeat(60));

  const metadataPath = path.join(__dirname, '../metadata-api/public/plans');
  
  for (let i = 1; i <= 6; i++) {
    const filePath = path.join(metadataPath, `plan-${i}.json`);
    
    if (fs.existsSync(filePath)) {
      const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`\n✅ plan-${i}.json:`);
      console.log(`   Name: ${metadata.name}`);
      console.log(`   Icon: ${metadata.icon}`);
      console.log(`   Risk: ${metadata.riskLevel}`);
      console.log(`   Features: ${metadata.features.length} items`);
    } else {
      console.log(`\n❌ plan-${i}.json: Missing`);
    }
  }

  // Test API endpoint
  console.log('\n\n🌐 METADATA API TEST:');
  console.log('─'.repeat(60));

  try {
    const response = await fetch('http://localhost:3002/api/plans');
    if (response.ok) {
      const apiPlans = await response.json();
      console.log(`\n✅ API Response: ${apiPlans.length} plans`);
      
      apiPlans.forEach((plan: any, index: number) => {
        console.log(`\n   Plan ${plan.id}:`);
        console.log(`   ├─ Name: ${plan.name}`);
        console.log(`   ├─ Icon: ${plan.icon}`);
        console.log(`   └─ On-chain APR: ${Number(plan.onchain?.aprBps || 0) / 100}%`);
      });
    } else {
      console.log(`\n❌ API Error: ${response.status}`);
    }
  } catch (error: any) {
    console.log(`\n❌ API Connection Failed: ${error.message}`);
    console.log('   Make sure metadata-api is running on port 3002');
  }

  // Summary
  console.log('\n\n📋 SUMMARY:');
  console.log('─'.repeat(60));
  console.log(`On-chain plans: ${plans.length}`);
  console.log(`Metadata files: ${plans.filter((_, i) => 
    fs.existsSync(path.join(metadataPath, `plan-${i + 1}.json`))
  ).length}`);
  console.log('\n✅ Frontend should display:');
  plans.forEach(plan => {
    console.log(`   • ${plan.days}d @ ${plan.apr}% APR (${plan.minDeposit}-${plan.maxDeposit} USDC)`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('🎯 EXPECTED RESULT:');
  console.log('   - Plans page shows 6 cards');
  console.log('   - Each card shows correct APR (5%, 8%, 12%)');
  console.log('   - Days display correctly (7, 90, 180)');
  console.log('   - Min/Max deposits visible');
  console.log('   - Icons and colors from metadata');
  console.log('='.repeat(60) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
