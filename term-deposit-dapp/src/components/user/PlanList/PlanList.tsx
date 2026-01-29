import React, { useEffect, useState } from 'react';
import { usePlans } from '../../../hooks/usePlans';
import { useDeposit } from '../../../hooks/useDeposit';
import { DataAggregator } from '../../../services/dataAggregator';
import type { Plan } from '../../../types';
import { formatUSDC, formatAPR, formatPenalty } from '../../../utils/formatters';
import { calculateMaturityAmount } from '../../../utils/calculator';
import { Button } from '../../common/Button/Button';
import styles from './PlanList.module.scss';

export const PlanList: React.FC = () => {
  const { plans, loading, fetchPlans } = usePlans();
  const { openDeposit, loading: depositLoading, error, txHash } = useDeposit();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [amount, setAmount] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleDeposit = async () => {
    if (!selectedPlan || !amount) return;

    const success = await openDeposit(Number(selectedPlan.planId), amount);
    if (success) {
      setShowModal(false);
      setAmount('');
      setSelectedPlan(null);
      alert('Deposit opened successfully!');
    }
  };

  const openDepositModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  if (loading) {
    return <div className={styles.loading}>Loading plans...</div>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Available Saving Plans</h2>
      
      <div className={styles.grid}>
        {plans.map((plan) => (
          <div key={plan.planId.toString()} className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{DataAggregator.tenorSecondsToDays(Number(plan.tenorSeconds))} Days</h3>
              <div className={styles.apr}>{formatAPR(plan.aprBps)}</div>
            </div>
            
            <div className={styles.cardBody}>
              <div className={styles.info}>
                <span className={styles.label}>Min Deposit:</span>
                <span className={styles.value}>
                  {plan.minDeposit > 0 ? `${formatUSDC(plan.minDeposit)} USDC` : 'No minimum'}
                </span>
              </div>
              
              <div className={styles.info}>
                <span className={styles.label}>Max Deposit:</span>
                <span className={styles.value}>
                  {plan.maxDeposit > 0 ? `${formatUSDC(plan.maxDeposit)} USDC` : 'No maximum'}
                </span>
              </div>
              
              <div className={styles.info}>
                <span className={styles.label}>Early Penalty:</span>
                <span className={styles.value}>{formatPenalty(plan.earlyWithdrawPenaltyBps)}</span>
              </div>
            </div>
            
            <Button
              fullWidth
              onClick={() => openDepositModal(plan)}
            >
              Deposit
            </Button>
          </div>
        ))}
      </div>

      {showModal && selectedPlan && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Open Deposit - {DataAggregator.tenorSecondsToDays(Number(selectedPlan.tenorSeconds))} Days</h3>
            
            <div className={styles.form}>
              <div className={styles.field}>
                <label>Amount (USDC)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  step="0.01"
                  min="0"
                />
              </div>
              
              {amount && (
                <div className={styles.preview}>
                  <p>Expected at maturity:</p>
                  <p className={styles.maturityAmount}>
                    {formatUSDC(
                      calculateMaturityAmount(
                        BigInt(Math.floor(parseFloat(amount) * 1000000)),
                        selectedPlan.aprBps,
                        DataAggregator.tenorSecondsToDays(Number(selectedPlan.tenorSeconds))
                      )
                    )} USDC
                  </p>
                </div>
              )}
              
              {error && <p className={styles.error}>{error}</p>}
              {txHash && (
                <p className={styles.success}>
                  Transaction: {txHash.slice(0, 10)}...
                </p>
              )}
              
              <div className={styles.actions}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setAmount('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeposit}
                  disabled={!amount || depositLoading}
                  loading={depositLoading}
                >
                  Confirm Deposit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
