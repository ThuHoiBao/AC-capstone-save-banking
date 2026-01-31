import React, { useEffect, useState } from 'react';
import { useDeposit } from '../../../hooks/useDeposit';
import { useContracts } from '../../../context/ContractContext';
import { useWallet } from '../../../context/WalletContext';
import { DataAggregator } from '../../../services/dataAggregator';
import type { Deposit } from '../../../types';
import { formatUSDC, formatDate } from '../../../utils/formatters';
import { formatDuration, getDepositState } from '../../../utils/time';
import { Button } from '../../common/Button/Button';
import { TrendingUp, Clock, CheckCircle, DollarSign, AlertCircle, RotateCcw, Award } from 'lucide-react';
import styles from './MyDeposits.module.scss';

export const MyDeposits: React.FC = () => {
  const { fetchUserDeposits, withdrawAtMaturity, earlyWithdraw, renewDeposit, loading } = useDeposit();
  const { savingLogicContract, depositCertificateContract } = useContracts();
  const { address } = useWallet();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  // Note: plans Map no longer needed - using deposit's stored APR/tenor values
  const [loadingDeposits, setLoadingDeposits] = useState(true);

  useEffect(() => {
    console.log('🎯 [MyDeposits] Component mounted, loading deposits...');
    loadDeposits();
  }, []);

  // Re-fetch when contracts or address become available
  useEffect(() => {
    console.log('🔄 [MyDeposits] Contracts or address changed, re-fetching...');
    console.log('  - savingLogicContract:', savingLogicContract ? '✅' : '❌');
    console.log('  - depositCertificateContract:', depositCertificateContract ? '✅' : '❌');
    console.log('  - address:', address || '❌');
    
    if (savingLogicContract && depositCertificateContract && address) {
      console.log('✅ [MyDeposits] All dependencies ready, loading deposits...');
      loadDeposits();
    }
  }, [savingLogicContract, depositCertificateContract, address]);

  const loadDeposits = async () => {
    console.log('🔄 [MyDeposits] Loading deposits...');
    setLoadingDeposits(true);
    const userDeposits = await fetchUserDeposits();
    console.log(`📊 [MyDeposits] Received ${userDeposits.length} deposits`);
    setDeposits(userDeposits);

    // Note: No longer need to fetch plan details - using deposit's stored APR/tenor
    setLoadingDeposits(false);
    console.log('✅ [MyDeposits] Deposits loaded');
  };

  const handleWithdraw = async (depositId: bigint) => {
    const success = await withdrawAtMaturity(Number(depositId));
    if (success) {
      alert('Withdrawn successfully!');
      loadDeposits();
    }
  };

  const handleEarlyWithdraw = async (depositId: bigint) => {
    if (!confirm('Are you sure? You will be charged a penalty fee.')) return;
    
    const success = await earlyWithdraw(Number(depositId));
    if (success) {
      alert('Early withdraw successful!');
      loadDeposits();
    }
  };

  const handleRenew = async (depositId: bigint, planId: bigint) => {
    const success = await renewDeposit(Number(depositId), Number(planId));
    if (success) {
      alert('Deposit renewed successfully!');
      loadDeposits();
    }
  };

  const getStatusLabel = (status: number): string => {
    return DataAggregator.getStatusLabel(status);
  };

  const getStatusCategory = (deposit: Deposit): string => {
    const gracePeriod = 259200; // 3 days in seconds
    const state = getDepositState(
      Number(deposit.core.startAt),
      Number(deposit.core.maturityAt),
      Number(deposit.core.status),
      gracePeriod
    );

    // Map state type to category
    if (state.type === 'closed') {
      // Check status directly: 1 = Withdrawn
      if (Number(deposit.core.status) === 1) {
        return 'withdrawn';
      }
      // Check for renewed: 2 = ManualRenewed, 3 = AutoRenewed
      if (Number(deposit.core.status) === 2 || Number(deposit.core.status) === 3) {
        return 'renewed';
      }
    }
    if (state.type === 'at_maturity') return 'matured';
    if (state.type === 'after_grace') return 'auto_renew_required';
    if (state.type === 'before_maturity') return 'active';
    
    return 'active';
  };

  if (loadingDeposits) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              <DollarSign size={40} />
              My Deposits
            </h1>
            <p className={styles.subtitle}>Track and manage all your savings deposits</p>
          </div>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading your deposits...</p>
        </div>
      </div>
    );
  }

  // Categorize deposits by status
  const groupedDeposits = {
    active: deposits.filter(d => getStatusCategory(d) === 'active'),
    matured: deposits.filter(d => getStatusCategory(d) === 'matured'),
    auto_renew_required: deposits.filter(d => getStatusCategory(d) === 'auto_renew_required'),
    withdrawn: deposits.filter(d => getStatusCategory(d) === 'withdrawn'),
    renewed: deposits.filter(d => getStatusCategory(d) === 'renewed'),
  };

  const hasAnyDeposits = deposits.length > 0;

  if (!hasAnyDeposits) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              <DollarSign size={40} />
              My Deposits
            </h1>
            <p className={styles.subtitle}>Track and manage all your savings deposits</p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <DollarSign size={64} />
          </div>
          <h2>No Deposits Yet</h2>
          <p>Start saving by choosing a plan and making your first deposit!</p>
          <Button 
            onClick={loadDeposits}
            variant="primary"
            style={{ marginTop: '20px' }}
          >
            🔄 Reload Deposits
          </Button>
        </div>
      </div>
    );
  }

  const renderDepositCard = (deposit: Deposit, statusCategory: string) => {
    // Note: plan variable not needed - using deposit's stored APR and tenor values
    const maturityTime = Number(deposit.core.maturityAt);
    const startTime = Number(deposit.core.startAt);
    const gracePeriod = 259200; // 3 days in seconds
    
    // Get deposit state
    const state = getDepositState(startTime, maturityTime, Number(deposit.core.status), gracePeriod);
    
    // Calculate interest using the deposit's stored APR and tenor (at time of opening)
    // This is more reliable than fetching from plan which might not load
    const principal = BigInt(deposit.core.principal.toString());
    const aprBps = BigInt(deposit.core.aprBpsAtOpen.toString());
    
    // Calculate tenor from deposit times
    const tenorSeconds = BigInt(Number(deposit.core.maturityAt) - Number(deposit.core.startAt));
    
    const interest = DataAggregator.calculateInterest(
      principal,
      aprBps,
      tenorSeconds
    );
    const maturityAmount = principal + interest;
    
    // Get duration text
    const durationText = formatDuration(Number(tenorSeconds));

    return (
      <div key={deposit.depositId.toString()} className={`${styles.card} ${styles[statusCategory]}`}>
        <div className={styles.cardTop}>
          <div className={styles.badgeContainer}>
            <span className={`${styles.badge} ${styles[`badge_${statusCategory}`]}`}>
              {statusCategory === 'active' && <Clock size={14} />}
              {statusCategory === 'matured' && <AlertCircle size={14} />}
              {statusCategory === 'auto_renew_required' && <AlertCircle size={14} />}
              {statusCategory === 'withdrawn' && <CheckCircle size={14} />}
              {statusCategory === 'renewed' && <RotateCcw size={14} />}
              {state.statusName || getStatusLabel(deposit.core.status)}
            </span>
            <span className={styles.depositId}>
              <Award size={14} /> NFT #{deposit.depositId.toString()}
            </span>
          </div>
          {state.timeToMaturity !== undefined && state.timeToMaturity > 0 && (
            <span className={styles.daysLeft}>
              {formatDuration(state.timeToMaturity)} left
            </span>
          )}
          {state.graceTimeLeft !== undefined && state.graceTimeLeft > 0 && (
            <span className={styles.daysLeft} style={{ color: '#ff9800' }}>
              Grace: {formatDuration(state.graceTimeLeft)}
            </span>
          )}
        </div>

        {/* NFT Metadata Display */}
        {deposit.metadata && (
          <div className={styles.nftInfo}>
            <div className={styles.nftIcon}>💎</div>
            <div>
              <div className={styles.nftName}>{deposit.metadata.name}</div>
              <div className={styles.nftDescription}>{deposit.metadata.description}</div>
            </div>
          </div>
        )}

        <div className={styles.mainAmount}>
          <span className={styles.amountLabel}>Principal</span>
          <span className={styles.amount}>{formatUSDC(deposit.core.principal)}</span>
          <span className={styles.currency}>USDC</span>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>APR</span>
            <span className={styles.detailValue}>{Number(deposit.core.aprBpsAtOpen) / 100}%</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Tenor</span>
            <span className={styles.detailValue}>{durationText}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Early Penalty</span>
            <span className={styles.detailValue} style={{ color: '#ff6b6b' }}>
              {Number(deposit.core.penaltyBpsAtOpen) / 100}%
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Start</span>
            <span className={styles.detailValue}>{formatDate(BigInt(startTime))}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Maturity</span>
            <span className={styles.detailValue}>{formatDate(BigInt(maturityTime))}</span>
          </div>
        </div>

        <div className={styles.resultBox}>
          <div className={styles.resultItem}>
            <span className={styles.resultLabel}>
              <TrendingUp size={16} />
              Interest Earned
            </span>
            <span className={styles.resultValue}>
              +{formatUSDC(interest)} USDC
            </span>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.resultItem}>
            <span className={styles.resultLabel}>Total at Maturity</span>
            <span className={styles.totalValue}>{formatUSDC(maturityAmount)} USDC</span>
          </div>
        </div>

        {(statusCategory === 'active' || statusCategory === 'matured' || statusCategory === 'auto_renew_required') && (
          <div className={styles.actions}>
            {statusCategory === 'active' && (
              <Button
                fullWidth
                variant="danger"
                onClick={() => handleEarlyWithdraw(deposit.depositId)}
                loading={loading}
              >
                Early Withdraw (Penalty: {Number(deposit.core.penaltyBpsAtOpen) / 100}%)
              </Button>
            )}
            
            {statusCategory === 'matured' && (
              <>
                <Button
                  fullWidth
                  onClick={() => handleWithdraw(deposit.depositId)}
                  loading={loading}
                >
                  Withdraw Funds
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => handleRenew(deposit.depositId, deposit.core.planId)}
                  loading={loading}
                >
                  Renew Deposit
                </Button>
              </>
            )}
            
            {statusCategory === 'auto_renew_required' && (
              <Button
                fullWidth
                variant="primary"
                onClick={() => handleRenew(deposit.depositId, deposit.core.planId)}
                loading={loading}
              >
                Auto Renew Required
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <TrendingUp size={40} />
            My Deposits
          </h1>
          <p className={styles.subtitle}>Track and manage all your savings deposits</p>
        </div>
      </div>

      {groupedDeposits.active.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Clock size={24} />
            Active Deposits ({groupedDeposits.active.length})
          </h2>
          <div className={styles.grid}>
            {groupedDeposits.active.map(deposit => renderDepositCard(deposit, 'active'))}
          </div>
        </section>
      )}

      {groupedDeposits.matured.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <AlertCircle size={24} />
            Matured - Action Required ({groupedDeposits.matured.length})
          </h2>
          <div className={styles.grid}>
            {groupedDeposits.matured.map(deposit => renderDepositCard(deposit, 'matured'))}
          </div>
        </section>
      )}

      {groupedDeposits.auto_renew_required.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <AlertCircle size={24} style={{ color: '#ff9800' }} />
            Auto Renew Required ({groupedDeposits.auto_renew_required.length})
          </h2>
          <div className={styles.grid}>
            {groupedDeposits.auto_renew_required.map(deposit => renderDepositCard(deposit, 'auto_renew_required'))}
          </div>
        </section>
      )}

      {groupedDeposits.renewed.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <RotateCcw size={24} />
            Renewed Deposits ({groupedDeposits.renewed.length})
          </h2>
          <div className={styles.grid}>
            {groupedDeposits.renewed.map(deposit => renderDepositCard(deposit, 'renewed'))}
          </div>
        </section>
      )}

      {groupedDeposits.withdrawn.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <CheckCircle size={24} />
            Withdrawn Deposits ({groupedDeposits.withdrawn.length})
          </h2>
          <div className={styles.grid}>
            {groupedDeposits.withdrawn.map(deposit => renderDepositCard(deposit, 'withdrawn'))}
          </div>
        </section>
      )}
    </div>
  );
};
