// Constants for the application
export const CHAIN_ID = 11155111; // Sepolia
export const USDC_DECIMALS = 6;
export const BASIS_POINTS = 10000;
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_YEAR = 31536000;

// Contract addresses on Sepolia (NEW ARCHITECTURE)
export const SAVING_CORE_ADDRESS = '0x81B8b301ff4193e0DFD8b6044552B621830B6a44'; // SavingLogic
export const VAULT_MANAGER_ADDRESS = '0xA9E8f70EDE7932d3Caa7FE66BA2dc5840b6aA315';
export const USDC_ADDRESS = '0xd69e72f35E8C4226Ff05D13644C7f345AaBCC941'; // MockUSDC

// Admin address (will be fetched from contract owner())

// Deposit Status
export const DepositStatus = {
  Active: 0,
  Withdrawn: 1,
  AutoRenewed: 2,
  ManualRenewed: 3,
} as const;

export type DepositStatusType = typeof DepositStatus[keyof typeof DepositStatus];

export const DEPOSIT_STATUS_LABELS = {
  [DepositStatus.Active]: 'Active',
  [DepositStatus.Withdrawn]: 'Withdrawn',
  [DepositStatus.AutoRenewed]: 'Auto Renewed',
  [DepositStatus.ManualRenewed]: 'Manual Renewed',
};

// Grace period (3 days)
export const GRACE_PERIOD = 3 * SECONDS_PER_DAY;

// Default plans (for reference)
export const DEFAULT_PLANS = [
  { name: '7-Day Flex', tenorDays: 7, aprBps: 250 },
  { name: '30-Day Basic', tenorDays: 30, aprBps: 400 },
  { name: '90-Day Standard', tenorDays: 90, aprBps: 600 },
  { name: '180-Day Premium', tenorDays: 180, aprBps: 800 },
  { name: '365-Day Elite', tenorDays: 365, aprBps: 1000 },
];
