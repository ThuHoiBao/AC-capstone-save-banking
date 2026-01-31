import React, { useEffect, useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { useAdmin } from '../../hooks/useAdmin';
import { useAdminPlans } from '../../hooks/useAdminPlans';
import { usePlans } from '../../hooks/usePlans';
import { useDeposit } from '../../hooks/useDeposit';
import { useContracts } from '../../context/ContractContext';
import { formatUSDC } from '../../utils/formatters';
import type { Deposit, Plan } from '../../types';
import { AdminPlanForm } from '../../components/Admin/AdminPlanForm/AdminPlanForm';
import type { PlanFormData } from '../../components/Admin/AdminPlanForm/AdminPlanForm';
import { PlansSection } from './PlansSection/PlansSection';
import { 
  Shield, 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Check,
  BarChart3,
  Settings,
  Wallet,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import styles from './AdminDashboard.module.scss';

interface VaultStats {
  totalBalance: bigint;
  feeReceiver: string;
  savingLogic: string;
  isPaused: boolean;
}

export const Admin: React.FC = () => {
  const { address, isAdmin } = useWallet();
  const { getVaultStats, setFeeReceiver, loading: adminLoading, error: adminError, txHash } = useAdmin();
  const { createPlan, updatePlan, togglePlanStatus, loading } = useAdminPlans();
  const { plans, fetchPlans } = usePlans();
  const { fetchAllDeposits } = useDeposit();
  const { vaultManagerContract, savingLogicContract } = useContracts();
  
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'users' | 'settings'>('overview');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [newFeeReceiver, setNewFeeReceiver] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    }
  }, [isAdmin]);

  const loadAllData = async () => {
    await Promise.all([
      fetchPlans(),
      loadDeposits(),
      loadVaultStats()
    ]);
  };

  const loadDeposits = async () => {
    const allDeposits = await fetchAllDeposits();
    setDeposits(allDeposits);
  };

  const loadVaultStats = async () => {
    const stats = await getVaultStats();
    if (stats) {
      setVaultStats(stats);
      setNewFeeReceiver(stats.feeReceiver);
    }
  };

  const copyToClipboard = (addr: string) => {
    navigator.clipboard.writeText(addr).then(() => {
      setCopiedAddress(addr);
      setTimeout(() => setCopiedAddress(null), 2000);
    });
  };

  const handleSetFeeReceiver = async () => {
    if (!newFeeReceiver || newFeeReceiver === vaultStats?.feeReceiver) {
      alert('Please enter a valid new address');
      return;
    }

    const success = await setFeeReceiver(newFeeReceiver);
    if (success) {
      alert('Fee receiver updated successfully!');
      await loadVaultStats();
    } else {
      alert(`Failed to update fee receiver: ${adminError}`);
    }
  };

  // Plan management handlers
  const handleCreatePlanClick = () => {
    setEditingPlan(null);
    setShowPlanForm(true);
  };

  const handleEditPlanClick = (plan: Plan) => {
    setEditingPlan(plan);
    setShowPlanForm(true);
  };

  const handlePlanFormSubmit = async (planData: PlanFormData) => {
    if (editingPlan) {
      // Update existing plan (off-chain metadata only)
      const success = await updatePlan(Number(editingPlan.planId), planData);
      if (success) {
        setShowPlanForm(false);
        setEditingPlan(null);
        fetchPlans();
      }
    } else {
      // Create new plan (on-chain + off-chain)
      const success = await createPlan(planData);
      if (success) {
        setShowPlanForm(false);
        fetchPlans();
      }
    }
  };

  const handleTogglePlan = async (plan: Plan) => {
    const currentStatus = plan.metadata?.enabled ?? true;
    const action = currentStatus ? 'disable' : 'enable';
    
    if (confirm(`Are you sure you want to ${action} this plan?`)) {
      const success = await togglePlanStatus(plan);
      if (success) {
        fetchPlans();
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <Shield size={64} className={styles.deniedIcon} />
          <h2>Access Denied</h2>
          <p>You must be an administrator to access this dashboard.</p>
          <div className={styles.addressBox}>
            <span>Your Address:</span>
            <code>{address}</code>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalDeposits = deposits.length;
  const activeDeposits = deposits.filter((d: Deposit) => d.core.status === 0).length;
  const totalValueLocked = deposits.reduce((sum: bigint, d: Deposit) => sum + d.core.principal, 0n);
  const uniqueUsers = new Set(deposits.map((d: Deposit) => d.owner.toLowerCase())).size;
  const activePlans = Array.from(plans.values()).filter((p: Plan) => p.metadata?.enabled !== false).length;

  // Get user list with deposit counts
  const userStats = deposits.reduce((acc: Record<string, any>, deposit: Deposit) => {
    const userAddr = deposit.owner.toLowerCase();
    if (!acc[userAddr]) {
      acc[userAddr] = {
        address: deposit.owner,
        depositCount: 0,
        totalDeposited: 0n,
        activeDeposits: 0,
      };
    }
    acc[userAddr].depositCount++;
    acc[userAddr].totalDeposited += deposit.core.principal;
    if (deposit.core.status === 0) acc[userAddr].activeDeposits++;
    return acc;
  }, {} as Record<string, any>);

  const userList = Object.values(userStats).sort((a: any, b: any) => b.depositCount - a.depositCount);

  // Contract addresses
  const CONTRACT_ADDRESSES = {
    SavingLogic: savingLogicContract?.target || '-',
    VaultManager: vaultManagerContract?.target || '-',
    DepositVault: vaultStats?.savingLogic || '-'
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerTop}>
            <div className={styles.titleSection}>
              <Shield size={40} />
              <div>
                <h1>Admin Dashboard</h1>
                <p>Manage your savings platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Users</span>
            <span className={styles.statValue}>{uniqueUsers}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Value Locked</span>
            <span className={styles.statValue}>{formatUSDC(BigInt(totalValueLocked))}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <BarChart3 size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Deposits</span>
            <span className={styles.statValue}>{totalDeposits}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Active Deposits</span>
            <span className={styles.statValue}>{activeDeposits}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={18} />
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'plans' ? styles.active : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          <Clock size={18} />
          Plans Management
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} />
          User List
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} />
          Settings
        </button>
      </div>

      {/* Content Area */}
      <div className={styles.content}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className={styles.overviewTab}>
            <div className={styles.sectionTitle}>
              <BarChart3 size={24} />
              <h2>Platform Overview</h2>
            </div>
            
            <div className={styles.overviewGrid}>
              <div className={styles.overviewCard}>
                <h3>Active Plans</h3>
                <div className={styles.overviewValue}>{activePlans}</div>
                <p className={styles.overviewLabel}>Enabled plans</p>
              </div>

              <div className={styles.overviewCard}>
                <h3>Total Plans</h3>
                <div className={styles.overviewValue}>{Array.from(plans.values()).length}</div>
                <p className={styles.overviewLabel}>All plans created</p>
              </div>

              <div className={styles.overviewCard}>
                <h3>Avg Deposit Size</h3>
                <div className={styles.overviewValue}>
                  {totalDeposits > 0 ? formatUSDC(totalValueLocked / BigInt(totalDeposits)) : '0'}
                </div>
                <p className={styles.overviewLabel}>USDC per deposit</p>
              </div>

              <div className={styles.overviewCard}>
                <h3>Platform Status</h3>
                <div className={styles.overviewValue}>
                  {vaultStats?.isPaused ? (
                    <AlertCircle size={32} className={styles.statusIconPaused} />
                  ) : (
                    <CheckCircle size={32} className={styles.statusIcon} />
                  )}
                </div>
                <p className={styles.overviewLabel}>
                  {vaultStats?.isPaused ? 'Paused' : 'Operational'}
                </p>
              </div>
            </div>

            {/* Vault Stats */}
            <div className={styles.vaultSection}>
              <h3>Vault Information</h3>
              <div className={styles.vaultStats}>
                <div className={styles.vaultCard}>
                  <DollarSign size={20} />
                  <div>
                    <p className={styles.vaultLabel}>Vault Balance</p>
                    <p className={styles.vaultValue}>
                      {vaultStats ? formatUSDC(vaultStats.totalBalance) : '0'} USDC
                    </p>
                  </div>
                </div>
                <div className={styles.vaultCard}>
                  <Wallet size={20} />
                  <div>
                    <p className={styles.vaultLabel}>Fee Receiver</p>
                    <div className={styles.addressWithCopy}>
                      <code className={styles.vaultValue}>
                        {vaultStats?.feeReceiver ? 
                          `${vaultStats.feeReceiver.slice(0, 8)}...${vaultStats.feeReceiver.slice(-6)}` 
                          : 'Not set'}
                      </code>
                      {vaultStats?.feeReceiver && (
                        <button 
                          className={styles.copyButton}
                          onClick={() => copyToClipboard(vaultStats.feeReceiver)}
                        >
                          {copiedAddress === vaultStats.feeReceiver ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Addresses
            <div className={styles.contractsSection}>
              <h3>Contract Addresses</h3>
              <div className={styles.contractsList}>
                {Object.entries(CONTRACT_ADDRESSES).map(([name, addr]) => (
                  <div key={name} className={styles.contractItem}>
                    <span className={styles.contractName}>{name}</span>
                    <div className={styles.addressWithCopy}>
                      <code>{addr !== '-' ? `${String(addr).slice(0, 10)}...${String(addr).slice(-8)}` : '-'}</code>
                      {addr !== '-' && (
                        <>
                          <button 
                            className={styles.copyButton}
                            onClick={() => copyToClipboard(String(addr))}
                            title="Copy"
                          >
                            {copiedAddress === addr ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          <a
                            href={`https://sepolia.etherscan.io/address/${addr}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.linkButton}
                            title="View on Etherscan"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div> */}

            {/* Recent Deposits */}
            <div className={styles.recentSection}>
              <h3>Recent Deposits</h3>
              <div className={styles.depositsList}>
                {deposits.slice(0, 5).map((deposit: Deposit) => (
                  <div key={deposit.depositId.toString()} className={styles.depositItem}>
                    <div className={styles.depositInfo}>
                      <span className={styles.depositId}>NFT #{deposit.depositId.toString()}</span>
                      <div className={styles.addressWithCopy}>
                        <code className={styles.depositUser}>{deposit.owner}</code>
                        <button 
                          className={styles.copyButton}
                          onClick={() => copyToClipboard(deposit.owner)}
                          title="Copy address"
                        >
                          {copiedAddress === deposit.owner ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className={styles.depositAmount}>{formatUSDC(deposit.core.principal)} USDC</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Plans Management Tab */}
        {activeTab === 'plans' && (
          <>
            <PlansSection
              plans={plans}
              loading={loading}
              onCreateClick={handleCreatePlanClick}
              onEditClick={handleEditPlanClick}
              onToggleClick={handleTogglePlan}
            />
            
            <AdminPlanForm
              isOpen={showPlanForm}
              onClose={() => {
                setShowPlanForm(false);
                setEditingPlan(null);
              }}
              onSubmit={handlePlanFormSubmit}
              editingPlan={editingPlan}
            />
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className={styles.usersTab}>
            <div className={styles.sectionTitle}>
              <Users size={24} />
              <h2>Registered Users ({uniqueUsers})</h2>
            </div>

            <div className={styles.usersTable}>
              <div className={styles.tableHeader}>
                <div className={styles.tableCol}>User Address</div>
                <div className={styles.tableCol}>Total Deposits</div>
                <div className={styles.tableCol}>Active</div>
                <div className={styles.tableCol}>Total Amount</div>
              </div>

              {userList.map((user: any) => (
                <div key={user.address} className={styles.tableRow}>
                  <div className={styles.tableCol}>
                    <Wallet size={16} />
                    <div className={styles.addressWithCopy}>
                      <code className={styles.userAddress}>{user.address}</code>
                      <button 
                        className={styles.copyButton}
                        onClick={() => copyToClipboard(user.address)}
                        title="Copy address"
                      >
                        {copiedAddress === user.address ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className={styles.tableCol}>
                    <span className={styles.badge}>{user.depositCount}</span>
                  </div>
                  <div className={styles.tableCol}>
                    <span className={styles.badge}>{user.activeDeposits}</span>
                  </div>
                  <div className={styles.tableCol}>
                    <span className={styles.amount}>{formatUSDC(user.totalDeposited)} USDC</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className={styles.settingsTab}>
            <div className={styles.sectionTitle}>
              <Settings size={24} />
              <h2>Platform Settings</h2>
            </div>

            {/* Fee Receiver Settings */}
            <div className={styles.settingsCard}>
              <h3>
                <Wallet size={20} />
                Penalty Fee Receiver Address
              </h3>
              <p>Set the address that will receive early withdrawal penalty fees</p>
              
              <div className={styles.settingForm}>
                <div className={styles.formGroup}>
                  <label>Current Fee Receiver</label>
                  <div className={styles.addressWithCopy}>
                    <code className={styles.currentAddress}>
                      {vaultStats?.feeReceiver || 'Not set'}
                    </code>
                    {vaultStats?.feeReceiver && (
                      <button 
                        className={styles.copyButton}
                        onClick={() => copyToClipboard(vaultStats.feeReceiver)}
                      >
                        {copiedAddress === vaultStats.feeReceiver ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>New Fee Receiver Address</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="0x..."
                    value={newFeeReceiver}
                    onChange={(e) => setNewFeeReceiver(e.target.value)}
                  />
                </div>

                {adminError && (
                  <div className={styles.errorMessage}>
                    <AlertCircle size={16} />
                    {adminError}
                  </div>
                )}

                {txHash && (
                  <div className={styles.successMessage}>
                    <CheckCircle size={16} />
                    Transaction sent: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.txLink}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}

                <Button
                  onClick={handleSetFeeReceiver}
                  loading={adminLoading}
                  disabled={!newFeeReceiver || newFeeReceiver === vaultStats?.feeReceiver}
                >
                  Update Fee Receiver
                </Button>
              </div>
            </div>

            {/* Admin Info */}
            <div className={styles.settingsCard}>
              <h3>
                <Shield size={20} />
                Admin Information
              </h3>
              <div className={styles.adminInfo}>
                <div className={styles.infoRow}>
                  <span>Your Address:</span>
                  <div className={styles.addressWithCopy}>
                    <code>{address}</code>
                    <button 
                      className={styles.copyButton}
                      onClick={() => copyToClipboard(address || '')}
                    >
                      {copiedAddress === address ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div className={styles.infoRow}>
                  <span>Role:</span>
                  <span className={styles.roleAdmin}>ADMINISTRATOR</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
