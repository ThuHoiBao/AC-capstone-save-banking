/**
 * Test Plan Loading Script
 * Quick test to verify getPlanCount and getAllPlans work correctly
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('🧪 Testing plan loading functions...\n');

  const SAVING_LOGIC_ADDRESS = '0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb';
  
  const savingLogic = await ethers.getContractAt('SavingLogic', SAVING_LOGIC_ADDRESS);

  // Test 1: Query each plan using getPlan()
  console.log('📋 Test 1: Using getPlan() function');
  console.log('='.repeat(80));
  
  for (let i = 1; i <= 10; i++) {
    try {
      const plan = await savingLogic.getPlan(i);
      
      if (plan.planId === 0n) {
        console.log(`Plan ${i}: Not found (planId = 0)`);
        break;
      }
      
      const seconds = Number(plan.tenorSeconds);
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      let duration = '';
      if (days > 0) duration += `${days}d `;
      if (hours > 0) duration += `${hours}h `;
      if (minutes > 0) duration += `${minutes}m`;
      
      console.log(`Plan ${i}: ${duration.trim() || seconds + 's'} | ${Number(plan.aprBps)/100}% APR | Active: ${plan.isActive ? '✅' : '❌'}`);
    } catch (error: any) {
      console.log(`Plan ${i}: Error - ${error.message}`);
      break;
    }
  }

  // Test 2: Query using plans() mapping
  console.log('\n📋 Test 2: Using plans() mapping');
  console.log('='.repeat(80));
  
  for (let i = 1; i <= 10; i++) {
    try {
      const plan = await savingLogic.plans(i);
      
      if (plan.planId === 0n) {
        console.log(`Plan ${i}: Not found (planId = 0)`);
        break;
      }
      
      const seconds = Number(plan.tenorSeconds);
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      let duration = '';
      if (days > 0) duration += `${days}d `;
      if (hours > 0) duration += `${hours}h `;
      if (minutes > 0) duration += `${minutes}m`;
      
      console.log(`Plan ${i}: ${duration.trim() || seconds + 's'} | ${Number(plan.aprBps)/100}% APR | Active: ${plan.isActive ? '✅' : '❌'}`);
    } catch (error: any) {
      console.log(`Plan ${i}: Error - ${error.message}`);
      break;
    }
  }

  console.log('\n✅ Test complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
