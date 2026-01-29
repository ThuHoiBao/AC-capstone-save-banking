import React from 'react';
import { Button } from '../../../components/common/Button/Button';
import { DataAggregator } from '../../../services/dataAggregator';
import { formatUSDC } from '../../../utils/formatters';
import type { Plan } from '../../../types';
import { Clock, Plus, Edit2, Lock, Unlock, CheckCircle } from 'lucide-react';
import styles from './PlansSection.module.css';

interface PlansSectionProps {
  plans: Plan[];
  loading: boolean;
  onCreateClick: () => void;
  onEditClick: (plan: Plan) => void;
  onToggleClick: (plan: Plan) => void;
}

const METADATA_API_URL = import.meta.env.VITE_METADATA_API_URL || 'http://localhost:3002';

export const PlansSection: React.FC<PlansSectionProps> = ({
  plans,
  loading,
  onCreateClick,
  onEditClick,
  onToggleClick
}) => {
  return (
    <div className={styles.plansTab}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <Clock size={24} />
          <h2>Savings Plans</h2>
        </div>
        <Button onClick={onCreateClick} disabled={loading}>
          <Plus size={18} />
          Create New Plan
        </Button>
      </div>

      <div className={styles.plansGrid}>
        {plans.map(plan => {
          const days = DataAggregator.tenorSecondsToDays(Number(plan.tenorSeconds));
          const isEnabled = plan.metadata?.enabled ?? true;
          
          return (
            <div key={plan.planId.toString()} className={`${styles.planCard} ${!isEnabled ? styles.disabled : ''}`}>
              {/* Plan Image */}
              {plan.metadata?.image && (
                <div className={styles.planImage}>
                  <img 
                    src={`${METADATA_API_URL}${plan.metadata.image}`} 
                    alt={plan.metadata.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-plan.png';
                    }}
                  />
                </div>
              )}

              {/* Plan Header */}
              <div className={styles.planHeader}>
                <div className={styles.planTitle}>
                  <span className={styles.planId}>Plan #{plan.planId.toString()}</span>
                  {plan.metadata && (
                    <h3>{plan.metadata.name}</h3>
                  )}
                </div>
                <span className={`${styles.badge} ${isEnabled ? styles.active : styles.inactive}`}>
                  {isEnabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              {/* APR Display */}
              <div className={styles.planApr}>
                <span className={styles.aprValue}>{(Number(plan.aprBps) / 100).toFixed(2)}%</span>
                <span className={styles.aprLabel}>APR</span>
              </div>

              {/* Plan Details */}
              <div className={styles.planDetails}>
                <div className={styles.detailRow}>
                  <span>Duration:</span>
                  <span>{days} days</span>
                </div>
                <div className={styles.detailRow}>
                  <span>Min Deposit:</span>
                  <span>{formatUSDC(plan.minDeposit)} USDC</span>
                </div>
                <div className={styles.detailRow}>
                  <span>Max Deposit:</span>
                  <span>
                    {plan.maxDeposit === 0n ? 'Unlimited' : `${formatUSDC(plan.maxDeposit)} USDC`}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span>Early Penalty:</span>
                  <span>{(Number(plan.earlyWithdrawPenaltyBps) / 100).toFixed(2)}%</span>
                </div>
              </div>

              {/* Features */}
              {plan.metadata?.features && plan.metadata.features.length > 0 && (
                <div className={styles.planFeatures}>
                  {plan.metadata.features.slice(0, 3).map((feature, idx) => (
                    <div key={idx} className={styles.feature}>
                      <CheckCircle size={14} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className={styles.planActions}>
                <button
                  className={styles.editButton}
                  onClick={() => onEditClick(plan)}
                  disabled={loading}
                  title="Edit plan metadata"
                >
                  <Edit2 size={16} />
                  <span>Edit</span>
                </button>
                
                <button
                  className={`${styles.toggleButton} ${isEnabled ? styles.disableBtn : styles.enableBtn}`}
                  onClick={() => onToggleClick(plan)}
                  disabled={loading}
                  title={isEnabled ? 'Disable plan' : 'Enable plan'}
                >
                  {isEnabled ? <Lock size={16} /> : <Unlock size={16} />}
                  <span>{isEnabled ? 'Disable' : 'Enable'}</span>
                </button>
              </div>
            </div>
          );
        })}

        {plans.length === 0 && (
          <div className={styles.emptyState}>
            <Clock size={64} />
            <h3>No Plans Yet</h3>
            <p>Create your first savings plan to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};
