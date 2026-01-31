/**
 * Data Aggregator
 * Combines on-chain and off-chain data for plans and deposits
 */

import { Contract } from 'ethers';
import { MetadataAPI } from './metadataApi';
import type { Plan, PlanCore, Deposit, DepositCore, Certificate } from '../types';

export class DataAggregator {
  /**
   * Get full plan data (on-chain + off-chain)
   */
  static async getFullPlan(
    savingLogicContract: Contract,
    planId: number
  ): Promise<Plan | null> {
    try {
      console.log(`🔍 [DataAggregator] Fetching plan ${planId} from blockchain...`);
      
      // Fetch on-chain data
      const planCore: PlanCore = await savingLogicContract.getPlan(planId);
      
      console.log(`✅ [DataAggregator] Plan ${planId} blockchain data:`, {
        planId: planCore.planId.toString(),
        tenorSeconds: planCore.tenorSeconds.toString(),
        aprBps: planCore.aprBps.toString(),
        minDeposit: planCore.minDeposit.toString(),
        maxDeposit: planCore.maxDeposit.toString(),
      });

      // Check if plan exists (planId should not be 0)
      if (!planCore || planCore.planId === 0n) {
        console.warn(`⚠️  [DataAggregator] Plan ${planId} not found on blockchain`);
        return null;
      }

      // Fetch off-chain metadata
      console.log(`📥 [DataAggregator] Fetching metadata for plan ${planId}...`);
      let metadata;
      try {
        metadata = await MetadataAPI.getPlanMetadata(planId);
        console.log(`✅ [DataAggregator] Plan ${planId} metadata:`, metadata);
      } catch (error) {
        console.warn(`⚠️  [DataAggregator] Using default metadata for plan ${planId}:`, error);
        metadata = MetadataAPI.getDefaultPlanMetadata(planId);
      }

      // Merge on-chain and off-chain data
      const fullPlan: Plan = {
        planId: planCore.planId,
        tenorSeconds: planCore.tenorSeconds,
        aprBps: planCore.aprBps,
        minDeposit: planCore.minDeposit,
        maxDeposit: planCore.maxDeposit,
        earlyWithdrawPenaltyBps: planCore.earlyWithdrawPenaltyBps,
        isActive: planCore.isActive,  // ⭐ On-chain active status
        metadata: metadata,
      };

      console.log(`✅ [DataAggregator] Full plan ${planId}:`, {
        planId: fullPlan.planId.toString(),
        hasMetadata: !!fullPlan.metadata,
        metadataName: fullPlan.metadata?.name,
      });

      return fullPlan;
    } catch (error) {
      console.error(`❌ [DataAggregator] Error fetching plan ${planId}:`, error);
      return null;
    }
  }

  /**
   * Get plan count from blockchain
   * Query plans sequentially until we find one that doesn't exist
   */
  static async getPlanCount(savingLogicContract: Contract): Promise<number> {
    try {
      let count = 0;
      const MAX_PLANS = 100; // Safety limit
      
      for (let i = 1; i <= MAX_PLANS; i++) {
        try {
          const plan = await savingLogicContract.plans(i);
          
          // Check if plan exists (planId will be 0 if not exists)
          if (plan && plan.planId !== 0n) {
            count = i;
          } else {
            // Found non-existent plan, stop searching
            break;
          }
        } catch {
          // Error reading plan, assume we've reached the end
          break;
        }
      }
      
      console.log(`📊 [DataAggregator] Found ${count} plans on blockchain`);
      return count;
    } catch (error) {
      console.error('❌ [DataAggregator] Error getting plan count:', error);
      return 0;
    }
  }

  /**
   * Get all plans (parallel fetching with error handling)
   * Load ALL plans dynamically from blockchain
   */
  static async getAllPlans(savingLogicContract: Contract): Promise<Plan[]> {
    const plans: Plan[] = [];
    
    // Get plan count from blockchain
    const planCount = await this.getPlanCount(savingLogicContract);
    
    if (planCount === 0) {
      console.warn('⚠️  [DataAggregator] No plans found on blockchain');
      return [];
    }

    console.log(`📋 [DataAggregator] Found ${planCount} plans on blockchain, loading all...`);

    // Fetch ALL plans from 1 to planCount in parallel
    const promises = Array.from({ length: planCount }, (_, i) => i + 1).map(async (planId) => {
      try {
        const plan = await this.getFullPlan(savingLogicContract, planId);
        return plan; // May be null if plan doesn't exist
      } catch (error) {
        console.warn(`⚠️  Failed to load plan ${planId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);

    // Filter out null results
    for (const plan of results) {
      if (plan && plan.planId !== 0n) {
        plans.push(plan);
      }
    }

    console.log(`✅ Loaded ${plans.length} plans from blockchain`);
    return plans;
  }

  /**
   * Get full deposit data (on-chain + off-chain)
   */
  static async getFullDeposit(
    depositCertificateContract: Contract,
    depositId: bigint
  ): Promise<Deposit> {
    try {
      // Fetch on-chain core data
      const core: DepositCore = await depositCertificateContract.getDepositCore(depositId);

      // Fetch NFT owner
      const owner = await depositCertificateContract.ownerOf(depositId);

      // Fetch metadata from API
      let metadata;
      try {
        metadata = await MetadataAPI.getDepositMetadata(Number(depositId));
      } catch (error) {
        console.warn(`Using default metadata for deposit ${depositId}:`, error);
        metadata = undefined; // Optional metadata
      }

      return {
        depositId,
        owner,
        core,
        metadata,
        nftTokenId: depositId,
      };
    } catch (error) {
      console.error(`Failed to fetch deposit ${depositId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's deposits (by NFT ownership)
   */
  static async getUserDeposits(
    depositCertificateContract: Contract,
    userAddress: string
  ): Promise<Deposit[]> {
    const deposits: Deposit[] = [];
    const MAX_DEPOSITS = 100; // Check up to 100 deposits

    console.log(`🔍 [DataAggregator] Fetching deposits for user: ${userAddress}`);

    // Try to fetch deposits in parallel
    const promises = Array.from({ length: MAX_DEPOSITS }, async (_, i) => {
      const depositId = BigInt(i + 1);
      try {
        const owner = await depositCertificateContract.ownerOf(depositId);
        
        console.log(`✅ [DataAggregator] Deposit ${depositId} owner: ${owner}`);
        
        // Only return if user owns this NFT
        if (owner.toLowerCase() === userAddress.toLowerCase()) {
          console.log(`✅ [DataAggregator] User owns deposit ${depositId}, fetching full data...`);
          return await this.getFullDeposit(depositCertificateContract, depositId);
        }
        return null;
      } catch (error) {
        // Silently ignore - deposit doesn't exist or reverted
        return null;
      }
    });

    const results = await Promise.all(promises);

    // Filter out null results
    for (const deposit of results) {
      if (deposit) {
        deposits.push(deposit);
      }
    }

    console.log(`✅ [DataAggregator] Found ${deposits.length} deposits for user`);
    return deposits;
  }

  /**
   * Get user's deposits using DepositOpened events (more reliable)
   * This queries blockchain events instead of scanning NFT ownership
   */
  static async getUserDepositsByEvents(
    savingLogicContract: Contract,
    depositCertificateContract: Contract,
    userAddress: string
  ): Promise<Deposit[]> {
    console.log(`🔍 [DataAggregator] Fetching deposits for user via events: ${userAddress}`);
    
    try {
      // Get current block number
      const provider = savingLogicContract.runner?.provider;
      if (!provider) {
        throw new Error('No provider available');
      }
      
      const currentBlock = await provider.getBlockNumber();
      // Query last 100,000 blocks (approximately last few days on Sepolia)
      const fromBlock = Math.max(0, currentBlock - 100000);
      const toBlock = 'latest';
      
      console.log(`📡 [DataAggregator] Querying DepositOpened events from block ${fromBlock} to ${toBlock}...`);
      
      // Query ALL DepositOpened events (no filter on indexed params to avoid RPC issues)
      const filter = savingLogicContract.filters.DepositOpened();
      const allEvents = await savingLogicContract.queryFilter(filter, fromBlock, toBlock);
      
      console.log(`📊 [DataAggregator] Found ${allEvents.length} total DepositOpened events`);
      
      // Filter events by user address in JavaScript
      const userEvents = allEvents.filter((event: any) => {
        const owner = event.args[1]; // Second arg is owner address
        return owner.toLowerCase() === userAddress.toLowerCase();
      });
      
      console.log(`📊 [DataAggregator] Found ${userEvents.length} DepositOpened events for user ${userAddress}`);

      // Extract deposit IDs from events
      const depositIds: bigint[] = userEvents.map((event: any) => {
        const depositId = event.args[0]; // First arg is depositId
        const owner = event.args[1];
        const planId = event.args[2];
        console.log(`  ✅ Event: depositId=${depositId}, owner=${owner}, planId=${planId}`);
        return BigInt(depositId.toString());
      });

      // Fetch full data for each deposit ID in parallel
      const promises = depositIds.map(async (depositId) => {
        try {
          return await this.getFullDeposit(depositCertificateContract, depositId);
        } catch (error) {
          console.error(`❌ Error fetching deposit ${depositId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);

      // Filter out null results and only include active deposits
      const deposits = results.filter((d): d is Deposit => {
        if (!d) return false;
        
        // Check if user still owns the NFT (not transferred/withdrawn)
        return d.owner.toLowerCase() === userAddress.toLowerCase();
      });

      console.log(`✅ [DataAggregator] Found ${deposits.length} active deposits for user`);
      return deposits;
    } catch (error) {
      console.error('❌ [DataAggregator] Error fetching deposits by events:', error);
      return [];
    }
  }

  /**
   * Get NFT certificate data
   */
  static async getCertificate(
    depositCertificateContract: Contract,
    tokenId: bigint
  ): Promise<Certificate> {
    try {
      const owner = await depositCertificateContract.ownerOf(tokenId);
      const tokenURI = await depositCertificateContract.tokenURI(tokenId);

      // Fetch metadata from token URI
      let metadata;
      try {
        const response = await fetch(tokenURI);
        metadata = await response.json();
      } catch {
        metadata = MetadataAPI.getDefaultDepositMetadata(Number(tokenId));
      }

      return {
        tokenId,
        owner,
        tokenURI,
        metadata,
      };
    } catch (error) {
      console.error(`Failed to fetch certificate ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Batch fetch certificates for user
   */
  static async getUserCertificates(
    depositCertificateContract: Contract,
    userAddress: string
  ): Promise<Certificate[]> {
    const certificates: Certificate[] = [];
    const MAX_TOKENS = 100;

    const promises = Array.from({ length: MAX_TOKENS }, async (_, i) => {
      const tokenId = BigInt(i + 1);
      try {
        const owner = await depositCertificateContract.ownerOf(tokenId);
        
        if (owner.toLowerCase() === userAddress.toLowerCase()) {
          return await this.getCertificate(depositCertificateContract, tokenId);
        }
        return null;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(promises);

    for (const cert of results) {
      if (cert) {
        certificates.push(cert);
      }
    }

    return certificates;
  }

  /**
   * Calculate expected interest for a deposit
   */
  static calculateInterest(
    principal: bigint,
    aprBps: bigint,
    tenorSeconds: bigint
  ): bigint {
    // Interest = (principal * aprBps * tenorSeconds) / (10000 * 365 * 24 * 3600)
    const SECONDS_PER_YEAR = BigInt(365 * 24 * 3600);
    const BPS_DIVISOR = 10000n;

    const interest = (principal * aprBps * tenorSeconds) / (BPS_DIVISOR * SECONDS_PER_YEAR);
    return interest;
  }

  /**
   * Calculate early withdrawal penalty
   */
  static calculatePenalty(
    principal: bigint,
    penaltyBps: bigint
  ): bigint {
    const BPS_DIVISOR = 10000n;
    const penalty = (principal * penaltyBps) / BPS_DIVISOR;
    return penalty;
  }

  /**
   * Convert status number to label
   */
  static getStatusLabel(status: number): string {
    const statusMap: Record<number, string> = {
      0: 'Active',
      1: 'Matured & Withdrawn',
      2: 'Early Withdrawn',
      3: 'Renewed',
    };
    return statusMap[status] || 'Unknown';
  }

  /**
   * Convert tenorSeconds to days
   */
  static tenorSecondsToDays(tenorSeconds: number | bigint): number {
    const seconds = typeof tenorSeconds === 'bigint' ? Number(tenorSeconds) : tenorSeconds;
    return Math.floor(seconds / (24 * 3600));
  }

  /**
   * Convert days to tenorSeconds
   */
  static daysToTenorSeconds(days: number): bigint {
    return BigInt(days * 24 * 3600);
  }
}
