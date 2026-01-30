import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useContracts } from '../context/ContractContext';
import { parseUSDC } from '../utils/formatters';

export const useAdmin = () => {
  const { provider } = useWallet();
  const { savingLogicContract, vaultManagerContract } = useContracts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Create new saving plan
  const createPlan = async(
    tenorDays: number,
    aprBps: number,
    minDeposit: string,
    maxDeposit: string,
    penaltyBps: number
  ) => {
    if (!provider || !savingLogicContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const contract = savingLogicContract.connect(signer) as any;

      const minDepositWei = parseUSDC(minDeposit);
      const maxDepositWei = parseUSDC(maxDeposit);
      const tenorSeconds = tenorDays * 24 * 3600;

      const tx = await contract.createPlan(
        tenorSeconds,
        aprBps,
        minDepositWei,
        maxDepositWei,
        penaltyBps
      );

      setTxHash(tx.hash);
      await tx.wait();
      
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Create plan error:', err);
      setError(err.message || 'Failed to create plan');
      setLoading(false);
      return false;
    }
  };

  // Update existing plan
  const updatePlan = async (
    planId: number,
    aprBps: number,
    minDeposit: string,
    maxDeposit: string,
    penaltyBps: number,
    isActive: boolean
  ) => {
    if (!provider || !savingLogicContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const contract = savingLogicContract.connect(signer) as any;

      const minDepositWei = parseUSDC(minDeposit);
      const maxDepositWei = parseUSDC(maxDeposit);

      console.log('🔧 [useAdmin] Updating plan onchain:', {
        planId,
        aprBps,
        minDepositWei: minDepositWei.toString(),
        maxDepositWei: maxDepositWei.toString(),
        penaltyBps,
        isActive
      });

      const tx = await contract.updatePlan(
        planId,
        aprBps,
        minDepositWei,
        maxDepositWei,
        penaltyBps,
        isActive
      );

      setTxHash(tx.hash);
      console.log('✅ [useAdmin] Update transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ [useAdmin] Update confirmed');
      
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Update plan error:', err);
      setError(err.message || 'Failed to update plan');
      setLoading(false);
      return false;
    }
  };

  // Toggle plan enabled status using updatePlan with isActive parameter
  const togglePlan = async (planId: number, enabled: boolean) => {
    if (!provider || !savingLogicContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const signer = await provider.getSigner();
      const contract = savingLogicContract.connect(signer) as any;

      // Get current plan data
      const plan = await contract.plans(planId);
      
      console.log('🔧 [useAdmin] Toggling plan:', {
        planId,
        currentActive: plan.isActive,
        newActive: enabled
      });

      // Update plan with same values but change isActive
      const tx = await contract.updatePlan(
        planId,
        plan.aprBps,
        plan.minDeposit,
        plan.maxDeposit,
        plan.earlyWithdrawPenaltyBps,
        enabled
      );

      setTxHash(tx.hash);
      console.log('✅ [useAdmin] Toggle transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ [useAdmin] Toggle confirmed');
      
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Toggle plan error:', err);
      setError(err.message || 'Failed to toggle plan');
      setLoading(false);
      return false;
    }
  };

  // Set fee receiver address for penalties
  const setFeeReceiver = async (newReceiverAddress: string) => {
    if (!provider || !vaultManagerContract) {
      setError('Provider or VaultManager contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const contract = vaultManagerContract.connect(signer) as any;

      console.log('🔧 [useAdmin] Setting fee receiver:', newReceiverAddress);

      const tx = await contract.setFeeReceiver(newReceiverAddress);
      
      setTxHash(tx.hash);
      console.log('✅ [useAdmin] SetFeeReceiver transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ [useAdmin] SetFeeReceiver confirmed');
      
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Set fee receiver error:', err);
      setError(err.message || 'Failed to set fee receiver');
      setLoading(false);
      return false;
    }
  };

  // Get vault statistics
  const getVaultStats = async () => {
    if (!vaultManagerContract) return null;

    try {
      // Get vault stats from VaultManager contract
      const [totalBalance, feeReceiver, savingLogic, isPaused] = await Promise.all([
        vaultManagerContract.totalBalance(),
        vaultManagerContract.feeReceiver(),
        vaultManagerContract.savingLogic(),
        vaultManagerContract.isPaused()
      ]);

      console.log('📊 [useAdmin] Vault stats:', {
        totalBalance: totalBalance.toString(),
        feeReceiver,
        savingLogic,
        isPaused
      });

      return {
        totalBalance,
        feeReceiver,
        savingLogic,
        isPaused
      };
    } catch (err) {
      console.error('Get vault stats error:', err);
      return {
        totalBalance: 0n,
        feeReceiver: '',
        savingLogic: '',
        isPaused: false
      };
    }
  };

  // Emergency pause (Note: Pause/unpause moved to SavingLogic contract)
  const emergencyPause = async () => {
    if (!provider || !savingLogicContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const signer = await provider.getSigner();
      const contract = savingLogicContract.connect(signer) as any;

      const tx = await contract.pause();
      await tx.wait();
      
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Emergency pause error:', err);
      setError(err.message || 'Failed to pause contract');
      setLoading(false);
      return false;
    }
  };

  // Unpause
  const unpause = async () => {
    if (!provider || !savingLogicContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const signer = await provider.getSigner();
      const contract = savingLogicContract.connect(signer) as any;

      const tx = await contract.unpause();
      await tx.wait();
      
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Unpause error:', err);
      setError(err.message || 'Failed to unpause contract');
      setLoading(false);
      return false;
    }
  };

  return {
    createPlan,
    updatePlan,
    togglePlan,
    getVaultStats,
    setFeeReceiver,
    emergencyPause,
    unpause,
    loading,
    error,
    txHash,
  };
};
