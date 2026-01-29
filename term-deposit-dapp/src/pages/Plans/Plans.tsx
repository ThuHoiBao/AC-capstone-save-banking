import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, Percent, DollarSign, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { usePlans } from '../../hooks/usePlans';
import { useDeposit } from '../../hooks/useDeposit';
import { useWallet } from '../../context/WalletContext';
import { Button } from '../../components/common/Button/Button';
import { DataAggregator } from '../../services/dataAggregator';
import { formatUSDC } from '../../utils/formatters';
import type { Plan } from '../../types';
import styles from './Plans.module.scss';

export const Plans: React.FC = () => {
  const { plans, loading: plansLoading, fetchPlans } = usePlans();
  const { openDeposit, loading: depositLoading } = useDeposit();
  const { isConnected } = useWallet();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [amount, setAmount] = useState('');

  console.log('🎨 [Plans Component] Rendering with plans:', plans.length);
  console.log('🎨 [Plans Component] First plan:', plans[0]);

  useEffect(() => {
    if (isConnected) {
      console.log('🔌 [Plans Component] Wallet connected, fetching plans...');
      fetchPlans();
    }
  }, [isConnected, fetchPlans]);

  const handleDeposit = async () => {
    if (!selectedPlan || !amount) return;
    const depositId = await openDeposit(Number(selectedPlan.planId), amount);
    if (depositId) {
      setAmount('');
      setSelectedPlan(null);
    }
  };

  const calculateInterest = (principal: string, aprBps: bigint, tenorSeconds: bigint) => {
    if (!principal || isNaN(Number(principal))) return '0';
    const p = Number(principal);
    const rate = Number(aprBps) / 10000;
    const days = DataAggregator.tenorSecondsToDays(Number(tenorSeconds));
    const interest = (p * rate * days) / 365;
    return interest.toFixed(2);
  };

  const getPlanIcon = (metadata: Plan['metadata']) => {
    if (!metadata) return <Clock size={32} />;
    
    // Return icon based on metadata icon field
    const iconMap: Record<string, React.ReactNode> = {
      '💰': <DollarSign size={32} />,
      '📈': <TrendingUp size={32} />,
      '💎': <Clock size={32} />,
    };
    
    // Use image if available, fallback to icon for backwards compatibility
    const iconKey = (metadata as any).icon || '';
    return metadata.image ? null : (iconMap[iconKey as keyof typeof iconMap] || <Clock size={32} />);
  };

  const getPlanColor = (metadata: Plan['metadata']): string => {
    return metadata?.color || '#3B82F6';
  };

  if (!isConnected) {
    return (
      <div className={styles.container}>
        <div className={styles.notConnected}>
          <AlertCircle size={48} />
          <h2>Connect Your Wallet</h2>
          <p>Please connect your wallet to view available saving plans</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.plans}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <TrendingUp size={40} />
            <span>Savings Plans</span>
          </h1>
          <p className={styles.subtitle}>
            Choose from flexible term deposits with competitive APR rates
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className={styles.container}>
        {plansLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className={styles.empty}>
            <TrendingUp size={64} />
            <h3>No Plans Available</h3>
            <p>Check back later for savings opportunities</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {plans.map((plan, index) => {
              const days = DataAggregator.tenorSecondsToDays(Number(plan.tenorSeconds));
              const planColor = getPlanColor(plan.metadata);
              const isDisabled = plan.metadata?.enabled === false;
              
              return (
              <div
                key={Number(plan.planId)}
                className={`${styles.card} ${
                  selectedPlan?.planId === plan.planId ? styles.selected : ''
                } ${isDisabled ? styles.disabled : ''}`}
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  borderColor: selectedPlan?.planId === plan.planId ? planColor : undefined,
                  opacity: isDisabled ? 0.6 : 1,
                  pointerEvents: isDisabled ? 'none' : 'auto',
                }}
              >
                {/* Plan Image */}
                {plan.metadata?.image ? (
                  <div className={styles.planImageContainer}>
                    <img 
                      src={`http://localhost:3002${plan.metadata.image}`} 
                      alt={plan.metadata.name || 'Plan'}
                      className={styles.planImage}
                      style={{ 
                        width: '100%', 
                        height: '180px', 
                        objectFit: 'cover',
                        borderRadius: '12px 12px 0 0'
                      }}
                    />
                    {isDisabled && (
                      <div className={styles.disabledOverlay}>
                        <span>🔒 DISABLED</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className={styles.iconWrapper}
                    style={{ 
                      backgroundColor: `${planColor}20`, 
                      color: planColor,
                      height: '180px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {getPlanIcon(plan.metadata)}
                  </div>
                )}

                {/* Status Badge */}
                {plan.metadata && (
                  <div 
                    className={styles.badge}
                    style={{ 
                      backgroundColor: planColor,
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      zIndex: 10
                    }}
                  >
                    <span>{plan.metadata.riskLevel}</span>
                  </div>
                )}

                {/* Plan Header */}
                <div className={styles.cardHeader} style={{ padding: '1.5rem' }}>
                  <div>
                    <h3 className={styles.cardTitle}>
                      {plan.metadata?.name || `${days} Days Term`}
                    </h3>
                    <p className={styles.cardSubtitle}>
                      {plan.metadata?.description || 'Term Deposit'}
                    </p>
                  </div>
                </div>

                {/* APR Display */}
                <div className={styles.apr} style={{ padding: '0 1.5rem' }}>
                  <span className={styles.aprValue} style={{ color: planColor }}>
                    {plan.aprBps ? (Number(plan.aprBps) / 100).toFixed(2) : '0.00'}%
                  </span>
                  <span className={styles.aprLabel}>APR</span>
                </div>

                {/* Plan Details */}
                <div className={styles.details} style={{ padding: '0 1.5rem' }}>
                  <div className={styles.detailRow}>
                    <div className={styles.detailLabel}>
                      <Clock size={16} />
                      <span>Duration</span>
                    </div>
                    <div className={styles.detailValue}>
                      {days} days
                    </div>
                  </div>

                  <div className={styles.detailRow}>
                    <div className={styles.detailLabel}>
                      <DollarSign size={16} />
                      <span>Min Deposit</span>
                    </div>
                    <div className={styles.detailValue}>
                      {plan.minDeposit ? formatUSDC(plan.minDeposit) : '0'} USDC
                    </div>
                  </div>

                  <div className={styles.detailRow}>
                    <div className={styles.detailLabel}>
                      <DollarSign size={16} />
                      <span>Max Deposit</span>
                    </div>
                    <div className={styles.detailValue}>
                      {!plan.maxDeposit || plan.maxDeposit === 0n ? 'Unlimited' : `${formatUSDC(plan.maxDeposit)} USDC`}
                    </div>
                  </div>

                  <div className={styles.detailRow}>
                    <div className={styles.detailLabel}>
                      <Percent size={16} />
                      <span>Early Penalty</span>
                    </div>
                    <div className={styles.detailValue}>
                      {plan.earlyWithdrawPenaltyBps ? (Number(plan.earlyWithdrawPenaltyBps) / 100).toFixed(1) : '0'}%
                    </div>
                  </div>
                </div>

                {/* Features */}
                {plan.metadata?.features && plan.metadata.features.length > 0 && (
                  <div className={styles.features} style={{ padding: '0 1.5rem 1.5rem' }}>
                    {plan.metadata.features.map((feature, idx) => (
                      <div key={idx} className={styles.feature}>
                        <CheckCircle2 size={14} style={{ color: planColor }} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Estimated Returns */}
                {selectedPlan?.planId === plan.planId && amount && (
                  <div className={styles.estimate}>
                    <div className={styles.estimateRow}>
                      <span>Principal</span>
                      <strong>{amount} USDC</strong>
                    </div>
                    <div className={styles.estimateRow}>
                      <span>Interest</span>
                      <strong className={styles.success}>
                        +{calculateInterest(amount, plan.aprBps, plan.tenorSeconds)} USDC
                      </strong>
                    </div>
                    <div className={`${styles.estimateRow} ${styles.total}`}>
                      <span>Total at Maturity</span>
                      <strong>
                        {(Number(amount) + Number(calculateInterest(amount, plan.aprBps, plan.tenorSeconds))).toFixed(2)} USDC
                      </strong>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  fullWidth
                  variant={selectedPlan?.planId === plan.planId ? 'primary' : 'outline'}
                  onClick={() => setSelectedPlan(plan)}
                  icon={selectedPlan?.planId === plan.planId ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />}
                  iconPosition="right"
                  style={{ 
                    backgroundColor: selectedPlan?.planId === plan.planId ? planColor : 'transparent',
                    borderColor: planColor,
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    marginBottom: '-40px',
                    color: selectedPlan?.planId === plan.planId ? '#fff' : planColor,
                  }}
                >
                  {selectedPlan?.planId === plan.planId ? 'Selected' : 'Select Plan'}
                </Button>
              </div>
            )})}
          </div>
        )}

        {/* Deposit Form Modal */}
        {selectedPlan && (
          <>
            <div 
              className={styles.modalBackdrop}
              onClick={() => {
                setSelectedPlan(null);
                setAmount('');
              }}
            />
            <div className={styles.depositForm}>
            <h3 className={styles.formTitle}>
              <DollarSign size={24} />
              <span>Deposit Amount</span>
            </h3>
            <p className={styles.formSubtitle}>
              Enter amount between {selectedPlan.minDeposit ? formatUSDC(selectedPlan.minDeposit) : '0'} and {!selectedPlan.maxDeposit || selectedPlan.maxDeposit === 0n ? 'unlimited' : formatUSDC(selectedPlan.maxDeposit)} USDC
            </p>

            <div className={styles.inputWrapper}>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={styles.input}
                min={selectedPlan.minDeposit ? formatUSDC(selectedPlan.minDeposit) : '0'}
                max={selectedPlan.maxDeposit && selectedPlan.maxDeposit !== 0n ? formatUSDC(selectedPlan.maxDeposit) : undefined}
              />
              <span className={styles.inputSuffix}>USDC</span>
            </div>

            {/* Interest Calculation */}
            {amount && Number(amount) > 0 && (
              <div className={styles.estimate}>
                <h4 className={styles.estimateTitle}>Expected Returns</h4>
                <div className={styles.estimateContent}>
                  <div className={styles.estimateRow}>
                    <span>Principal</span>
                    <strong>{amount} USDC</strong>
                  </div>
                  <div className={styles.estimateRow}>
                    <span>Interest</span>
                    <strong className={styles.success}>
                      +{calculateInterest(amount, selectedPlan.aprBps, selectedPlan.tenorSeconds)} USDC
                    </strong>
                  </div>
                  <div className={`${styles.estimateRow} ${styles.total}`}>
                    <span>Total at Maturity</span>
                    <strong>
                      {(Number(amount) + Number(calculateInterest(amount, selectedPlan.aprBps, selectedPlan.tenorSeconds))).toFixed(2)} USDC
                    </strong>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.formActions}>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedPlan(null);
                  setAmount('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedPlan(null);
                  setAmount('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeposit}
                loading={depositLoading}
                disabled={!amount || Number(amount) <= 0}
                icon={<CheckCircle2 size={18} />}
              >
                Confirm Deposit
              </Button>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
