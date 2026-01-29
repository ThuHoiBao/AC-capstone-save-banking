import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, TrendingUp, DollarSign, Clock, Percent, Info } from 'lucide-react';
import { calculateInterest, calculateMaturityAmount } from '../../utils/calculator';
import { formatUSDC } from '../../utils/formatters';
import { DataAggregator } from '../../services/dataAggregator';
import { Button } from '../../components/common/Button/Button';
import { usePlans } from '../../hooks/usePlans';
import { useWallet } from '../../context/WalletContext';
import type { Plan } from '../../types';
import styles from './Calculator.module.scss';

export const Calculator: React.FC = () => {
  const { plans, fetchPlans } = usePlans();
  const { isConnected } = useWallet();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [amount, setAmount] = useState('10000');
  const [days, setDays] = useState('90');
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  // Use selected plan's APR or default
  const apr = selectedPlan ? selectedPlan.aprBps.toString() : '600'; // 6% in bps (default)

  useEffect(() => {
    if (isConnected) {
      fetchPlans();
    }
  }, [isConnected, fetchPlans]);

  // Auto-select plan when days change
  useEffect(() => {
    if (plans.length > 0) {
      const matchingPlan = plans.find(p => 
        DataAggregator.tenorSecondsToDays(Number(p.tenorSeconds)) === Number(days)
      );
      if (matchingPlan) {
        setSelectedPlan(matchingPlan);
      }
    }
  }, [days, plans]);

  const principal = BigInt(Math.floor(parseFloat(amount || '0') * 1000000));
  const interest = calculateInterest(principal, Number(apr), Number(days));
  const total = calculateMaturityAmount(principal, Number(apr), Number(days));

  const aprPercent = (Number(apr) / 100).toFixed(2);
  const interestValue = Number(interest) / 1000000;
  const totalValue = Number(total) / 1000000;
  const monthsApprox = Number(days) / 30;

  const handleQuickSelect = (day: number) => {
    setDays(day.toString());
  };

  const presets = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
    { label: '180 Days', value: 180 },
    { label: '1 Year', value: 365 },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <CalcIcon size={40} />
            <span>Interest Calculator</span>
          </h1>
          <p className={styles.subtitle}>
            Calculate your potential returns on term deposits
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Left: Input Form */}
        <div className={styles.section}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Deposit Details</h2>
            
            {/* Amount Input */}
            <div className={styles.field}>
              <label className={styles.label}>
                <DollarSign size={18} />
                <span>Deposit Amount (USDC)</span>
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10000"
                  step="0.01"
                  min="0"
                  className={styles.input}
                />
                <span className={styles.suffix}>USDC</span>
              </div>
            </div>

            {/* Tenor Input */}
            <div className={styles.field}>
              <label className={styles.label}>
                <Clock size={18} />
                <span>Tenor Period (Days)</span>
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  placeholder="90"
                  min="1"
                  className={styles.input}
                />
                <span className={styles.suffix}>Days</span>
              </div>
            </div>

            {/* Plan Selection Dropdown */}
            {plans.length > 0 && (
              <div className={styles.field}>
                <label className={styles.label}>
                  <Percent size={18} />
                  <span>Select Plan (APR)</span>
                </label>
                <select
                  value={selectedPlan?.planId?.toString() || ''}
                  onChange={(e) => {
                    const plan = plans.find(p => p.planId.toString() === e.target.value);
                    if (plan) {
                      setSelectedPlan(plan);
                      setDays(DataAggregator.tenorSecondsToDays(Number(plan.tenorSeconds)).toString());
                    }
                  }}
                  className={styles.select}
                >
                  <option value="">Custom calculation</option>
                  {plans.map(plan => (
                    <option key={plan.planId.toString()} value={plan.planId.toString()}>
                      {DataAggregator.tenorSecondsToDays(Number(plan.tenorSeconds))} Days - {(Number(plan.aprBps) / 100).toFixed(2)}% APR
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Select Buttons */}
            <div className={styles.quickSelect}>
              <label className={styles.quickLabel}>Quick Select:</label>
              <div className={styles.buttonGroup}>
                {presets.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => handleQuickSelect(preset.value)}
                    className={`${styles.presetBtn} ${days === preset.value.toString() ? styles.active : ''}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* APR Info */}
            <div className={styles.aprInfo}>
              <div className={styles.aprBox}>
                <Percent size={20} />
                <div>
                  <span className={styles.aprLabel}>APR (Annual %)</span>
                  <span className={styles.aprValue}>{aprPercent}%</span>
                </div>
              </div>
              <div className={styles.infoNote}>
                <Info size={16} />
                <small>
                  {selectedPlan 
                    ? `Using ${DataAggregator.tenorSecondsToDays(Number(selectedPlan.tenorSeconds))} Days Plan APR` 
                    : 'Select a plan or enter custom values'}
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className={styles.section}>
          <div className={`${styles.card} ${styles.resultsCard}`}>
            <h2 className={styles.cardTitle}>Estimated Returns</h2>

            {/* Principal Display */}
            <div className={styles.resultBox}>
              <div className={styles.resultItem}>
                <div className={styles.resultLabel}>
                  <DollarSign size={20} />
                  <span>Initial Deposit</span>
                </div>
                <div className={styles.resultValue}>{formatUSDC(BigInt(Math.floor(parseFloat(amount || '0') * 1000000)))} USDC</div>
              </div>
            </div>

            {/* Interest Calculation */}
            <div className={styles.resultBox}>
              <div className={styles.resultItem}>
                <div className={styles.resultLabel}>
                  <TrendingUp size={20} />
                  <span>Interest Earned</span>
                </div>
                <div className={`${styles.resultValue} ${styles.success}`}>
                  +{interestValue.toFixed(2)} USDC
                </div>
              </div>
              <div className={styles.breakdown}>
                <span>{aprPercent}% APR × {Number(days)} days ÷ 365</span>
              </div>
            </div>

            {/* Total Amount */}
            <div className={`${styles.resultBox} ${styles.totalBox}`}>
              <div className={styles.resultItem}>
                <div className={styles.resultLabel}>
                  <span>Total at Maturity</span>
                </div>
                <div className={styles.resultValue}>{totalValue.toFixed(2)} USDC</div>
              </div>
            </div>

            {/* Monthly Breakdown */}
            <button 
              onClick={() => setShowBreakdown(!showBreakdown)}
              className={styles.expandBtn}
            >
              <span>{showBreakdown ? 'Hide' : 'Show'} Breakdown</span>
              <span className={styles.arrow}>{showBreakdown ? '▼' : '▶'}</span>
            </button>

            {showBreakdown && (
              <div className={styles.breakdownTable}>
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>Monthly Interest Rate</span>
                  <span className={styles.breakdownValue}>
                    {(Number(apr) / 12 / 100).toFixed(3)}%
                  </span>
                </div>
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>Period</span>
                  <span className={styles.breakdownValue}>
                    {monthsApprox.toFixed(1)} months
                  </span>
                </div>
                <div className={styles.breakdownRow}>
                  <span className={styles.breakdownLabel}>Interest Rate (Days)</span>
                  <span className={styles.breakdownValue}>
                    {((Number(apr) / 100) / 365).toFixed(4)}%
                  </span>
                </div>
              </div>
            )}

            {/* Summary Info */}
            <div className={styles.summaryBox}>
              <div className={styles.summaryItem}>
                <span>Return on Investment</span>
                <span className={styles.roi}>
                  {Number(amount) > 0 
                    ? ((interestValue / Number(amount)) * 100).toFixed(2)
                    : '0.00'
                  }%
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span>Daily Average</span>
                <span>
                  {(interestValue / Number(days)).toFixed(4)} USDC/day
                </span>
              </div>
            </div>

            {/* Action Button */}
            <Button 
              variant="primary" 
              fullWidth
              size="lg"
              icon={<TrendingUp size={20} />}
            >
              Start Saving
            </Button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className={styles.infoSection}>
        <div className={styles.infoCard}>
          <h3>How It Works</h3>
          <ul>
            <li>Select your deposit amount in USDC</li>
            <li>Choose a tenor period (7 days to 1 year)</li>
            <li>Interest is calculated using simple interest formula</li>
            <li>Receive principal + interest at maturity</li>
          </ul>
        </div>

        <div className={styles.infoCard}>
          <h3>Early Withdrawal</h3>
          <ul>
            <li>Early withdrawal is allowed with a penalty</li>
            <li>Penalty is deducted from your principal</li>
            <li>No interest earned if withdrawn before maturity</li>
            <li>Penalty percentage depends on plan selected</li>
          </ul>
        </div>

        <div className={styles.infoCard}>
          <h3>Auto Renewal</h3>
          <ul>
            <li>Deposits auto-renew after 3-day grace period</li>
            <li>Principal + interest becomes new deposit base</li>
            <li>Same tenor and APR from original deposit</li>
            <li>Compound your earnings automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

