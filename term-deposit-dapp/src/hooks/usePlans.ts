import { useState, useCallback } from 'react';
import { useContracts } from '../context/ContractContext';
import { DataAggregator } from '../services/dataAggregator';
import type { Plan } from '../types';

export const usePlans = () => {
  const { savingLogicContract } = useContracts();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!savingLogicContract) return;

    try {
      setLoading(true);
      setError(null);

      console.log('📋 [usePlans] Fetching plans...');
      // Use DataAggregator to fetch plans with metadata
      const allPlans = await DataAggregator.getAllPlans(savingLogicContract);

      console.log('✅ [usePlans] Received plans from aggregator:', allPlans.length);
      console.log('📊 [usePlans] First plan sample:', allPlans[0]);

      setPlans(allPlans);
      console.log('✅ [usePlans] State updated with plans');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch plans');
      console.error('❌ [usePlans] Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  }, [savingLogicContract]);

  const getPlan = useCallback(async (planId: number): Promise<Plan | null> => {
    if (!savingLogicContract) return null;

    try {
      // Use DataAggregator to fetch single plan with metadata
      const plan = await DataAggregator.getFullPlan(savingLogicContract, planId);
      
      if (!plan || plan.planId === 0n) return null;
      
      return plan;
    } catch (err: any) {
      console.error('Error fetching plan:', err);
      return null;
    }
  }, [savingLogicContract]);

  return {
    plans,
    loading,
    error,
    fetchPlans,
    getPlan,
  };
};
