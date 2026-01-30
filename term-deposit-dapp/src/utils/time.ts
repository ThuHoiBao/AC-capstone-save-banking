/**
 * Time & Duration Utilities
 * Format and calculate time-related values for deposits and plans
 */

/**
 * Format duration in seconds to human-readable string
 * @param seconds Duration in seconds
 * @returns Formatted string like "7 days", "2h 30m", "45m 20s"
 */
export function formatDuration(seconds: number): string {
  if (seconds === 0) return "0 seconds";
  
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  // Always show days if > 0
  if (days > 0) {
    parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    // For full days, also show hours if present
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
  } else {
    // Less than 1 day - show hours, minutes, seconds as needed
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
    if (secs > 0 || parts.length === 0) {
      // Always show seconds if it's the only value, or if < 1 minute
      parts.push(`${secs}s`);
    }
  }

  return parts.join(' ');
}

/**
 * Format duration with detailed breakdown
 * @param seconds Duration in seconds
 * @returns Formatted string like "7 days (604800 seconds)"
 */
export function formatDurationDetailed(seconds: number): string {
  const humanReadable = formatDuration(seconds);
  return `${humanReadable} (${seconds.toLocaleString()}s)`;
}

/**
 * Calculate time remaining until a future timestamp
 * @param futureTimestamp Unix timestamp in seconds
 * @returns Duration in seconds, or 0 if past
 */
export function getTimeRemaining(futureTimestamp: number): number {
  const now = Math.floor(Date.now() / 1000);
  const remaining = futureTimestamp - now;
  return Math.max(0, remaining);
}

/**
 * Calculate time elapsed since a past timestamp
 * @param pastTimestamp Unix timestamp in seconds
 * @returns Duration in seconds
 */
export function getTimeElapsed(pastTimestamp: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, now - pastTimestamp);
}

/**
 * Check if a timestamp is in the past
 * @param timestamp Unix timestamp in seconds
 * @returns true if timestamp is in the past
 */
export function isPast(timestamp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return timestamp < now;
}

/**
 * Format timestamp to readable date string
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format timestamp to readable date and time string
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date and time string
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get deposit state based on current time and maturity
 * @param startAt Start timestamp in seconds
 * @param maturityAt Maturity timestamp in seconds
 * @param status Deposit status (0=Active, 1=Withdrawn, etc.)
 * @param gracePeriodSeconds Grace period duration in seconds (default: 3 days)
 * @returns Deposit state information
 */
export interface DepositState {
  type: 'before_maturity' | 'at_maturity' | 'after_grace' | 'closed';
  timeToMaturity?: number;
  timeAfterMaturity?: number;
  graceTimeLeft?: number;
  statusName?: string;
}

export function getDepositState(
  _startAt: number,  // Prefixed with _ to indicate intentionally unused
  maturityAt: number,
  status: number,
  gracePeriodSeconds: number = 3 * 24 * 60 * 60 // 3 days default
): DepositState {
  const now = Math.floor(Date.now() / 1000);
  const statusNames = ['Active', 'Withdrawn', 'ManualRenewed', 'AutoRenewed'];

  // Not active - deposit is closed
  if (status !== 0) {
    return {
      type: 'closed',
      statusName: statusNames[status] || 'Unknown'
    };
  }

  // Before maturity
  if (now < maturityAt) {
    return {
      type: 'before_maturity',
      timeToMaturity: maturityAt - now
    };
  }

  // After grace period - must auto renew
  const graceEndTime = maturityAt + gracePeriodSeconds;
  if (now >= graceEndTime) {
    return {
      type: 'after_grace',
      timeAfterMaturity: now - maturityAt
    };
  }

  // At maturity - in grace period
  return {
    type: 'at_maturity',
    timeAfterMaturity: now - maturityAt,
    graceTimeLeft: graceEndTime - now
  };
}

/**
 * Get time progress percentage
 * @param startAt Start timestamp
 * @param maturityAt End timestamp
 * @returns Progress percentage (0-100)
 */
export function getTimeProgress(startAt: number, maturityAt: number): number {
  const now = Math.floor(Date.now() / 1000);
  const total = maturityAt - startAt;
  const elapsed = now - startAt;
  
  if (elapsed <= 0) return 0;
  if (elapsed >= total) return 100;
  
  return Math.round((elapsed / total) * 100);
}
