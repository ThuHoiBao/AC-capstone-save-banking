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

  // Update existing plan (Note: New SavingLogic contract doesn't have updatePlan)
  const updatePlan = async (
    _planId: number,
    _aprBps: number,
    _minDeposit: string,
    _maxDeposit: string,
    _penaltyBps: number,
    _enabled: boolean
  ) => {
    if (!provider || !savingLogicContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      // Note: New SavingLogic contract does NOT support updating plans
      // Plans are immutable once created for security reasons
      // This function is kept for backward compatibility but will fail
      
      setError('Plan updates not supported in new architecture. Plans are immutable.');
      setLoading(false);
      return false;
    } catch (err: any) {
      console.error('Update plan error:', err);
      setError(err.message || 'Failed to update plan');
      setLoading(false);
      return false;
    }
  };

  // Toggle plan enabled status (Note: Not supported in new architecture)
  const togglePlan = async (_planId: number, _enabled: boolean) => {
    if (!provider || !savingLogicContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Note: New SavingLogic contract does NOT support toggling plans
      // Plans are always active once created
      setError('Plan toggle not supported in new architecture. Plans are always active.');
      setLoading(false);
      return false;
    } catch (err: any) {
      console.error('Toggle plan error:', err);
      setError(err.message || 'Failed to toggle plan');
      setLoading(false);
      return false;
    }
  };

  // Get vault statistics
  const getVaultStats = async () => {
    if (!vaultManagerContract || !savingLogicContract) return null;

    try {
      // Try to get vault stats - these might be public variables or view functions
      let totalDepositsValue = BigInt(0);
      let availableCapitalValue = BigInt(0);
      let committedCapitalValue = BigInt(0);

      try {
        // Try as a function first
        if (typeof vaultManagerContract.totalDeposits === 'function') {
          totalDepositsValue = await vaultManagerContract.totalDeposits();
        }
      } catch (e) {
        console.log('totalDeposits not available as function');
      }

      try {
        if (typeof vaultManagerContract.availableCapital === 'function') {
          availableCapitalValue = await vaultManagerContract.availableCapital();
        }
      } catch (e) {
        console.log('availableCapital not available');
      }

      try {
        if (typeof vaultManagerContract.committedCapital === 'function') {
          committedCapitalValue = await vaultManagerContract.committedCapital();
        }
      } catch (e) {
        console.log('committedCapital not available');
      }

      return {
        totalDeposits: totalDepositsValue.toString(),
        availableCapital: availableCapitalValue.toString(),
        committedCapital: committedCapitalValue.toString(),
      };
    } catch (err) {
      console.error('Get vault stats error:', err);
      return {
        totalDeposits: '0',
        availableCapital: '0',
        committedCapital: '0',
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

  // Set penalty recipient address
  const setPenaltyRecipient = async (recipientAddress: string) => {
    if (!provider || !vaultManagerContract) {
      setError('Provider or contract not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const contract = vaultManagerContract.connect(signer) as any;

      const tx = await contract.setPenaltyRecipient(recipientAddress);
      setTxHash(tx.hash);
      await tx.wait();
      
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Set penalty recipient error:', err);
      setError(err.message || 'Failed to set penalty recipient');
      setLoading(false);
      return false;
    }
  };

  return {
    createPlan,
    updatePlan,
    togglePlan,
    getVaultStats,
    emergencyPause,
    unpause,
    setPenaltyRecipient,
    loading,
    error,
    txHash,
  };
};
