import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useContracts } from '../context/ContractContext';
import type { PlanFormData } from '../components/Admin/AdminPlanForm/AdminPlanForm';
import type { Plan } from '../types';

const METADATA_API_URL = import.meta.env.VITE_METADATA_API_URL || 'http://localhost:3002';

export const useAdminPlans = () => {
  const { provider } = useWallet();
  const { savingLogicContract } = useContracts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create new plan (on-chain + off-chain)
   */
  const createPlan = async (planData: PlanFormData): Promise<boolean> => {
    if (!provider || !savingLogicContract) {
      setError('Provider or contract not initialized');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const signer = await provider.getSigner();
      const contractWithSigner = savingLogicContract.connect(signer) as any;

      // 1. Create plan on-chain
      console.log('Creating plan on-chain...', planData);
      const tenorSeconds = planData.tenorDays * 24 * 3600;
      const minDepositWei = BigInt(Math.floor(planData.minDeposit * 1e6));
      const maxDepositWei = BigInt(Math.floor(planData.maxDeposit * 1e6));

      const tx = await contractWithSigner.createPlan(
        tenorSeconds,
        planData.aprBps,
        minDepositWei,
        maxDepositWei,
        planData.earlyWithdrawPenaltyBps
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Parse event to get new plan ID
      let newPlanId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contractWithSigner.interface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });
          if (parsed && parsed.name === 'PlanCreated') {
            newPlanId = Number(parsed.args.planId);
            console.log('New plan ID:', newPlanId);
            break;
          }
        } catch {}
      }

      if (!newPlanId) {
        throw new Error('Could not get new plan ID from transaction');
      }

      // 2. Save off-chain metadata
      console.log('Saving metadata to API...');
      const metadata = {
        id: newPlanId,
        name: planData.name,
        description: planData.description,
        features: planData.features.filter(f => f.trim() !== ''),
        riskLevel: planData.riskLevel,
        recommended: planData.recommended.filter(r => r.trim() !== ''),
        image: planData.image,
        color: planData.color,
        enabled: planData.enabled
      };

      const response = await fetch(`${METADATA_API_URL}/api/plans/${newPlanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) throw new Error('Failed to save metadata');

      console.log('✅ Plan created successfully');
      return true;
    } catch (err: any) {
      console.error('Create plan error:', err);
      setError(err.message || 'Failed to create plan');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update existing plan (on-chain data is immutable, only update off-chain metadata)
   */
  const updatePlan = async (planId: number, planData: PlanFormData): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      console.log('Updating plan metadata...', planId);
      
      const metadata = {
        id: planId,
        name: planData.name,
        description: planData.description,
        features: planData.features.filter(f => f.trim() !== ''),
        riskLevel: planData.riskLevel,
        recommended: planData.recommended.filter(r => r.trim() !== ''),
        image: planData.image,
        color: planData.color,
        enabled: planData.enabled
      };

      const response = await fetch(`${METADATA_API_URL}/api/plans/${planId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) throw new Error('Failed to update metadata');

      console.log('✅ Plan metadata updated successfully');
      return true;
    } catch (err: any) {
      console.error('Update plan error:', err);
      setError(err.message || 'Failed to update plan');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle plan enabled/disabled status (off-chain only)
   */
  const togglePlanStatus = async (plan: Plan): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const planId = Number(plan.planId);
      const currentEnabled = plan.metadata?.enabled ?? true;
      const newEnabled = !currentEnabled;

      console.log(`Toggling plan ${planId} to ${newEnabled ? 'enabled' : 'disabled'}`);

      // Update just the enabled field
      const metadata = {
        ...plan.metadata,
        id: planId,
        enabled: newEnabled
      };

      const response = await fetch(`${METADATA_API_URL}/api/plans/${planId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) throw new Error('Failed to toggle plan status');

      console.log(`✅ Plan ${planId} ${newEnabled ? 'enabled' : 'disabled'}`);
      return true;
    } catch (err: any) {
      console.error('Toggle plan error:', err);
      setError(err.message || 'Failed to toggle plan status');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPlan,
    updatePlan,
    togglePlanStatus,
    loading,
    error
  };
};
