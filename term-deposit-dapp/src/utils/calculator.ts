import { SECONDS_PER_YEAR, BASIS_POINTS, SECONDS_PER_DAY } from './constants';

/**
 * Calculate simple interest
 * Formula: interest = (principal × aprBps × tenorSeconds) / (31,536,000 × 10,000)
 */
export const calculateInterest = (
  principal: bigint,
  aprBps: number | bigint,
  tenorDays: number
): bigint => {
  const apr = typeof aprBps === 'bigint' ? aprBps : BigInt(aprBps);
  const tenorSeconds = BigInt(tenorDays * SECONDS_PER_DAY);
  
  const interest = (principal * apr * tenorSeconds) / 
    (BigInt(SECONDS_PER_YEAR) * BigInt(BASIS_POINTS));
  
  return interest;
};

/**
 * Calculate penalty for early withdrawal
 * Formula: penalty = (principal × penaltyBps) / 10,000
 */
export const calculatePenalty = (
  principal: bigint,
  penaltyBps: number | bigint
): bigint => {
  const penalty = typeof penaltyBps === 'bigint' ? penaltyBps : BigInt(penaltyBps);
  return (principal * penalty) / BigInt(BASIS_POINTS);
};

/**
 * Calculate total amount at maturity (principal + interest)
 */
export const calculateMaturityAmount = (
  principal: bigint,
  aprBps: number | bigint,
  tenorDays: number
): bigint => {
  const interest = calculateInterest(principal, aprBps, tenorDays);
  return principal + interest;
};

/**
 * Calculate amount after early withdrawal (principal - penalty)
 */
export const calculateEarlyWithdrawalAmount = (
  principal: bigint,
  penaltyBps: number | bigint
): bigint => {
  const penalty = calculatePenalty(principal, penaltyBps);
  return principal - penalty;
};

/**
 * Calculate APY from APR (for display purposes)
 * APY = (1 + APR/n)^n - 1, where n = compounding frequency
 * For simplicity, we use simple interest: APY ≈ APR
 */
export const calculateAPY = (aprBps: number): number => {
  return aprBps / 100; // Convert bps to percentage
};
