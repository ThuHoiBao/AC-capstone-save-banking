import { formatUnits, parseUnits } from 'ethers';
import { USDC_DECIMALS } from './constants';

/**
 * Format USDC amount from wei to human-readable format
 */
export const formatUSDC = (amount: bigint | string): string => {
  const value = typeof amount === 'string' ? BigInt(amount) : amount;
  return parseFloat(formatUnits(value, USDC_DECIMALS)).toFixed(2);
};

/**
 * Parse USDC amount from human-readable to wei
 */
export const parseUSDC = (amount: string): bigint => {
  return parseUnits(amount, USDC_DECIMALS);
};

/**
 * Format APR from basis points to percentage
 */
export const formatAPR = (aprBps: number | bigint): string => {
  const bps = typeof aprBps === 'bigint' ? Number(aprBps) : aprBps;
  return (bps / 100).toFixed(2) + '%';
};

/**
 * Format penalty from basis points to percentage
 */
export const formatPenalty = (penaltyBps: number | bigint): string => {
  const bps = typeof penaltyBps === 'bigint' ? Number(penaltyBps) : penaltyBps;
  return (bps / 100).toFixed(2) + '%';
};

/**
 * Format wallet address (0x1234...5678)
 */
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Format timestamp to date string
 */
export const formatDate = (timestamp: number | bigint): string => {
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format timestamp to date and time string
 */
export const formatDateTime = (timestamp: number | bigint): string => {
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Calculate days remaining until maturity
 */
export const getDaysRemaining = (maturityTimestamp: number | bigint): number => {
  const maturity = typeof maturityTimestamp === 'bigint' ? Number(maturityTimestamp) : maturityTimestamp;
  const now = Math.floor(Date.now() / 1000);
  const remaining = maturity - now;
  return Math.max(0, Math.ceil(remaining / 86400));
};

/**
 * Check if deposit is matured
 */
export const isMatured = (maturityTimestamp: number | bigint): boolean => {
  const maturity = typeof maturityTimestamp === 'bigint' ? Number(maturityTimestamp) : maturityTimestamp;
  const now = Math.floor(Date.now() / 1000);
  return now >= maturity;
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number | string): string => {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  return value.toLocaleString('en-US');
};
