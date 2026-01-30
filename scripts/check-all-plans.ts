/**
 * Check All Plans Script
 * Verify how many plans exist on blockchain and their details
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('🔍 Checking all plans on Sepolia...\n');

  const SAVING_LOGIC_ADDRESS = '0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb';
  
  const savingLogic = await ethers.getContractAt('SavingLogic', SAVING_LOGIC_ADDRESS);

  // Query plans until we find one that doesn't exist
  // Contract doesn't expose planCount, so we try sequentially
  let planCount = 0;
  const MAX_PLANS_TO_CHECK = 20; // Safety limit
  
  console.log(`📊 Querying plans (max ${MAX_PLANS_TO_CHECK})...`);
  console.log('=' .repeat(80));

  // Check each plan
  for (let i = 1; i <= MAX_PLANS_TO_CHECK; i++) {
    try {
      const plan = await savingLogic.plans(i);
      
      // Check if plan exists (planId will be 0 if not exists)
      if (plan.planId === 0n) {
        console.log(`\n⏹️  Plan #${i}: Does not exist (stopping search)`);
        break;
      }
      
      planCount = i; // Update count
      
      console.log(`\n📋 Plan #${i}:`);
      console.log(`   Tenor: ${plan.tenorSeconds.toString()} seconds`);
      
      // Convert to human readable
      const seconds = Number(plan.tenorSeconds);
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      let humanReadable = '';
      if (days > 0) humanReadable += `${days} days `;
      if (hours > 0) humanReadable += `${hours}h `;
      if (minutes > 0) humanReadable += `${minutes}m `;
      if (secs > 0 || humanReadable === '') humanReadable += `${secs}s`;
      
      console.log(`   Duration: ${humanReadable.trim()}`);
      console.log(`   APR: ${Number(plan.aprBps) / 100}%`);
      console.log(`   Min Deposit: ${ethers.formatUnits(plan.minDeposit, 6)} USDC`);
      console.log(`   Max Deposit: ${plan.maxDeposit > 0 ? ethers.formatUnits(plan.maxDeposit, 6) : 'No limit'} USDC`);
      console.log(`   Penalty: ${Number(plan.earlyWithdrawPenaltyBps) / 100}%`);
      console.log(`   Enabled: ${plan.isActive ? '✅' : '❌'}`);
      
    } catch (error: any) {
      console.log(`\n❌ Plan #${i}: Error reading plan - ${error.message}`);
      break; // Stop if we hit an error
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`✅ Found ${planCount} plans on blockchain\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
