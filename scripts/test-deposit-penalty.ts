import { ethers } from 'hardhat';

/**
 * Test script to verify deposit penalty data
 * Checks if penaltyBpsAtOpen is stored correctly in DepositCore
 */
async function main() {
  console.log('\n🔍 Testing Deposit Penalty Data...\n');

  // Contract addresses
  const DEPOSIT_CERTIFICATE_ADDRESS = '0xd50edbc6973d891B95Eb2087a1a13b620440B3e3';
  const SAVING_LOGIC_ADDRESS = '0x81B8b301ff4193e0DFD8b6044552B621830B6a44';
  
  // Get contracts
  const DepositCertificate = await ethers.getContractAt('DepositCertificate', DEPOSIT_CERTIFICATE_ADDRESS);
  const SavingLogic = await ethers.getContractAt('SavingLogic', SAVING_LOGIC_ADDRESS);
  
  // Test deposit ID (from your screenshot)
  const depositId = 1;
  
  console.log(`📊 Fetching deposit #${depositId}...\n`);
  
  try {
    // Get deposit core data
    const depositCore = await DepositCertificate.getDepositCore(depositId);
    
    console.log('✅ DepositCore Structure:');
    console.log('  depositId:', depositCore.depositId.toString());
    console.log('  planId:', depositCore.planId.toString());
    console.log('  principal:', ethers.formatUnits(depositCore.principal, 6), 'USDC');
    console.log('  startAt:', new Date(Number(depositCore.startAt) * 1000).toLocaleString());
    console.log('  maturityAt:', new Date(Number(depositCore.maturityAt) * 1000).toLocaleString());
    console.log('  aprBpsAtOpen:', depositCore.aprBpsAtOpen.toString(), 'bps =', (Number(depositCore.aprBpsAtOpen) / 100).toFixed(2) + '%');
    console.log('  penaltyBpsAtOpen:', depositCore.penaltyBpsAtOpen.toString(), 'bps =', (Number(depositCore.penaltyBpsAtOpen) / 100).toFixed(2) + '%');
    console.log('  status:', depositCore.status.toString());
    
    // Get plan info to compare
    const planId = depositCore.planId;
    const plan = await SavingLogic.plans(planId);
    
    console.log('\n📋 Plan #' + planId + ' Current Data:');
    console.log('  earlyWithdrawPenaltyBps:', plan.earlyWithdrawPenaltyBps.toString(), 'bps =', (Number(plan.earlyWithdrawPenaltyBps) / 100).toFixed(2) + '%');
    
    // Calculate penalty
    const penaltyBps = depositCore.penaltyBpsAtOpen;
    const principal = depositCore.principal;
    const penalty = (principal * penaltyBps) / 10000n;
    
    console.log('\n💰 Penalty Calculation:');
    console.log('  Principal:', ethers.formatUnits(principal, 6), 'USDC');
    console.log('  Penalty Rate:', (Number(penaltyBps) / 100).toFixed(2) + '%');
    console.log('  Penalty Amount:', ethers.formatUnits(penalty, 6), 'USDC');
    console.log('  Amount After Penalty:', ethers.formatUnits(principal - penalty, 6), 'USDC');
    
    // Get NFT owner
    const owner = await DepositCertificate.ownerOf(depositId);
    console.log('\n👤 Deposit Owner:', owner);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
