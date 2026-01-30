import React, { useEffect, useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { useAdmin } from '../../hooks/useAdmin';
import { usePlans } from '../../hooks/usePlans';
import { DataAggregator } from '../../services/dataAggregator';
import { formatUSDC } from '../../utils/formatters';
import { formatDuration } from '../../utils/time';
import type { Plan } from '../../types';
import { Button } from '../../components/common/Button/Button';
import styles from './Admin.module.scss';

export const Admin: React.FC = () => {
  const { address, isAdmin } = useWallet();
  const { createPlan, updatePlan, togglePlan, getVaultStats, loading, error, txHash } = useAdmin();
  const { plans, fetchPlans } = usePlans();
  const [vaultStats, setVaultStats] = useState<any>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    tenorDays: '30',
    aprBps: '500',
    minDeposit: '0',
    maxDeposit: '0',
    penaltyBps: '500',
  });

  useEffect(() => {
    fetchPlans();
    loadVaultStats();
  }, []);

  const loadVaultStats = async () => {
    const stats = await getVaultStats();
    setVaultStats(stats);
  };

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h2>🚫 Access Denied</h2>
          <p>You must be an admin to access this page.</p>
          <p className={styles.adminHint}>Your address: {address}</p>
        </div>
      </div>
    );
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createPlan(
      Number(formData.tenorDays),
      Number(formData.aprBps),
      formData.minDeposit,
      formData.maxDeposit,
      Number(formData.penaltyBps)
    );

    if (success) {
      setShowCreateForm(false);
      setFormData({
        tenorDays: '30',
        aprBps: '500',
        minDeposit: '0',
        maxDeposit: '0',
        penaltyBps: '500',
      });
      fetchPlans();
      alert('Plan created successfully!');
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const success = await updatePlan(
      Number(editingPlan.planId),
      Number(formData.aprBps),
      formData.minDeposit,
      formData.maxDeposit,
      Number(formData.penaltyBps),
      editingPlan.enabled ?? true
    );

    if (success) {
      setEditingPlan(null);
      fetchPlans();
      alert('Plan updated successfully!');
    }
  };

  const handleTogglePlan = async (planId: bigint, currentStatus?: boolean) => {
    const success = await togglePlan(Number(planId), !(currentStatus ?? true));
    if (success) {
      fetchPlans();
      alert(`Plan ${!(currentStatus ?? true) ? 'enabled' : 'disabled'} successfully!`);
    }
  };

  const startEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      tenorDays: DataAggregator.tenorSecondsToDays(Number(plan.tenorSeconds)).toString(),
      aprBps: Number(plan.aprBps).toString(),
      minDeposit: formatUSDC(plan.minDeposit),
      maxDeposit: formatUSDC(plan.maxDeposit),
      penaltyBps: Number(plan.earlyWithdrawPenaltyBps).toString(),
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🛠️ Admin Dashboard</h1>
        <p className={styles.subtitle}>Manage saving plans and monitor vault</p>
      </div>

      {/* Vault Statistics */}
      {vaultStats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>Total Deposits</div>
              <div className={styles.statValue}>{formatUSDC(BigInt(vaultStats.totalDeposits))} USDC</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>Available Capital</div>
              <div className={styles.statValue}>{formatUSDC(BigInt(vaultStats.availableCapital))} USDC</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🔒</div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>Committed Capital</div>
              <div className={styles.statValue}>{formatUSDC(BigInt(vaultStats.committedCapital))} USDC</div>
            </div>
          </div>
        </div>
      )}

      {/* Create Plan Button */}
      <div className={styles.actions}>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? '❌ Cancel' : '➕ Create New Plan'}
        </Button>
      </div>

      {/* Create Plan Form */}
      {showCreateForm && (
        <div className={styles.formCard}>
          <h3>Create New Plan</h3>
          <form onSubmit={handleCreatePlan} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label>Tenor (Days)</label>
                <input
                  type="number"
                  value={formData.tenorDays}
                  onChange={(e) => setFormData({ ...formData, tenorDays: e.target.value })}
                  required
                  min="1"
                />
              </div>
              <div className={styles.field}>
                <label>APR (Basis Points)</label>
                <input
                  type="number"
                  value={formData.aprBps}
                  onChange={(e) => setFormData({ ...formData, aprBps: e.target.value })}
                  required
                  min="0"
                />
                <small>{(Number(formData.aprBps) / 100).toFixed(2)}%</small>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label>Min Deposit (USDC)</label>
                <input
                  type="number"
                  value={formData.minDeposit}
                  onChange={(e) => setFormData({ ...formData, minDeposit: e.target.value })}
                  step="0.01"
                  min="0"
                />
              </div>
              <div className={styles.field}>
                <label>Max Deposit (USDC)</label>
                <input
                  type="number"
                  value={formData.maxDeposit}
                  onChange={(e) => setFormData({ ...formData, maxDeposit: e.target.value })}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Early Penalty (Basis Points)</label>
              <input
                type="number"
                value={formData.penaltyBps}
                onChange={(e) => setFormData({ ...formData, penaltyBps: e.target.value })}
                required
                min="0"
                max="10000"
              />
              <small>{(Number(formData.penaltyBps) / 100).toFixed(2)}%</small>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {txHash && <div className={styles.success}>TX: {txHash.slice(0, 10)}...</div>}

            <Button type="submit" loading={loading} fullWidth>
              Create Plan
            </Button>
          </form>
        </div>
      )}

      {/* Edit Plan Form */}
      {editingPlan && (
        <div className={styles.formCard}>
          <h3>Edit Plan #{editingPlan.planId.toString()}</h3>
          <form onSubmit={handleUpdatePlan} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label>Tenor (Days) - Read Only</label>
                <input type="text" value={formData.tenorDays} disabled />
              </div>
              <div className={styles.field}>
                <label>APR (Basis Points)</label>
                <input
                  type="number"
                  value={formData.aprBps}
                  onChange={(e) => setFormData({ ...formData, aprBps: e.target.value })}
                  required
                  min="0"
                />
                <small>{(Number(formData.aprBps) / 100).toFixed(2)}%</small>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.field}>
                <label>Min Deposit (USDC)</label>
                <input
                  type="number"
                  value={formData.minDeposit}
                  onChange={(e) => setFormData({ ...formData, minDeposit: e.target.value })}
                  step="0.01"
                  min="0"
                />
              </div>
              <div className={styles.field}>
                <label>Max Deposit (USDC)</label>
                <input
                  type="number"
                  value={formData.maxDeposit}
                  onChange={(e) => setFormData({ ...formData, maxDeposit: e.target.value })}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Early Penalty (Basis Points)</label>
              <input
                type="number"
                value={formData.penaltyBps}
                onChange={(e) => setFormData({ ...formData, penaltyBps: e.target.value })}
                required
                min="0"
                max="10000"
              />
              <small>{(Number(formData.penaltyBps) / 100).toFixed(2)}%</small>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formActions}>
              <Button variant="outline" onClick={() => setEditingPlan(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Update Plan
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Plans List */}
      <div className={styles.plansSection}>
        <h2>All Saving Plans</h2>
        <div className={styles.plansList}>
          {plans.map((plan) => (
            <div key={plan.planId.toString()} className={`${styles.planCard} ${!(plan.enabled ?? true) ? styles.disabled : ''}`}>
              <div className={styles.planHeader}>
                <h3>{formatDuration(Number(plan.tenorSeconds))}</h3>
                <span className={styles.planStatus}>
                  {(plan.enabled ?? true) ? '✅ Active' : '❌ Disabled'}
                </span>
              </div>
              <div className={styles.planBody}>
                <div className={styles.planInfo}>
                  <span>APR:</span>
                  <strong>{(Number(plan.aprBps) / 100).toFixed(2)}%</strong>
                </div>
                <div className={styles.planInfo}>
                  <span>Min:</span>
                  <strong>{plan.minDeposit > 0 ? `${formatUSDC(plan.minDeposit)} USDC` : 'No limit'}</strong>
                </div>
                <div className={styles.planInfo}>
                  <span>Max:</span>
                  <strong>{plan.maxDeposit > 0 ? `${formatUSDC(plan.maxDeposit)} USDC` : 'No limit'}</strong>
                </div>
                <div className={styles.planInfo}>
                  <span>Penalty:</span>
                  <strong>{(Number(plan.earlyWithdrawPenaltyBps) / 100).toFixed(2)}%</strong>
                </div>
              </div>
              <div className={styles.planActions}>
                <Button variant="outline" size="sm" onClick={() => startEdit(plan)}>
                  ✏️ Edit
                </Button>
                <Button
                  variant={(plan.enabled ?? true) ? 'danger' : 'primary'}
                  size="sm"
                  onClick={() => handleTogglePlan(plan.planId, plan.enabled)}
                  loading={loading}
                >
                  {(plan.enabled ?? true) ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
