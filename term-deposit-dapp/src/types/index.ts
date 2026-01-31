import { BrowserProvider, Contract } from 'ethers';

// Wallet types
export interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

// ============ NEW ARCHITECTURE TYPES ============

// Deposit Status Enum
export const DepositStatus = {
  Active: 0,
  MaturedWithdrawn: 1,
  EarlyWithdrawn: 2,
  Renewed: 3,
} as const;

export type DepositStatus = typeof DepositStatus[keyof typeof DepositStatus];

// Plan Core Data (On-chain from SavingLogic)
export interface PlanCore {
  planId: bigint;
  tenorSeconds: bigint;
  aprBps: bigint;
  minDeposit: bigint;
  maxDeposit: bigint;
  earlyWithdrawPenaltyBps: bigint;
  isActive: boolean;  // ⭐ On-chain active status
}

// Plan Metadata (Off-chain from API)
export interface PlanMetadata {
  id: number;
  name: string;
  description: string;
  features: string[];
  riskLevel: string;
  recommended: string[];
  image: string; // Changed from icon to image path
  color: string;
  enabled: boolean; // Added for admin enable/disable functionality
}

// Combined Plan (On-chain + Off-chain)
export interface Plan extends PlanCore {
  metadata?: PlanMetadata;
  // Computed properties for backward compatibility
  tenorDays?: number;
  enabled?: boolean;
  penaltyBps?: number;
}

// Deposit Core Data (On-chain from DepositCertificate)
export interface DepositCore {
  depositId: bigint;
  planId: bigint;
  principal: bigint;        // Changed from 'amount' to match contract
  startAt: bigint;          // Changed from 'startTime' to match contract
  maturityAt: bigint;       // Changed from 'maturityTime' to match contract
  aprBpsAtOpen: bigint;
  penaltyBpsAtOpen: bigint;
  status: number;
}

// Deposit Metadata (Off-chain from API)
export interface DepositMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

// Combined Deposit (On-chain + Off-chain)
export interface Deposit {
  depositId: bigint;
  owner: string;
  core: DepositCore;
  metadata?: DepositMetadata;
  nftTokenId: bigint;
}

// NFT Certificate
export interface Certificate {
  tokenId: bigint;
  owner: string;
  tokenURI: string;
  metadata: DepositMetadata;
}

// ============ LEGACY TYPES (for backward compat during migration) ============

// Old Plan type (deprecated)
export interface PlanLegacy {
  planId: bigint;
  tenorDays: number;
  aprBps: number;
  minDeposit: bigint;
  maxDeposit: bigint;
  earlyWithdrawPenaltyBps: number;
  penaltyBps: number;
  enabled: boolean;
  createdAt: bigint;
}

// Old Deposit type (deprecated)
export interface DepositLegacy {
  depositId: bigint;
  owner: string;
  user: string;
  planId: bigint;
  principal: bigint;
  startAt: bigint;
  maturityAt: bigint;
  status: number;
  aprBpsAtOpen: number;
  penaltyBpsAtOpen: number;
}

// Transaction status
export interface TransactionState {
  hash: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
}

// Ethereum window type
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

// ============ NEW CONTEXT TYPES ============

export interface ContractContextType {
  provider: BrowserProvider | null;
  depositCertificateContract: Contract | null;
  depositVaultContract: Contract | null;  // ⭐ NEW in v2.0
  savingLogicContract: Contract | null;
  vaultManagerContract: Contract | null;
  usdcContract: Contract | null;
}
