/**
 * Metadata API Client
 * Fetches off-chain data from metadata API server
 */

const API_BASE_URL = import.meta.env.VITE_METADATA_API_URL || 'http://localhost:3002';

export interface PlanMetadata {
  id: number;
  name: string;
  description: string;
  features: string[];
  riskLevel: string;
  recommended: string[];
  image: string; // Image path instead of emoji
  color: string;
  enabled: boolean; // Plan status
}

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

export class MetadataAPI {
  private static cache = new Map<string, any>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get plan metadata from API
   */
  static async getPlanMetadata(planId: number): Promise<PlanMetadata> {
    const cacheKey = `plan-${planId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/api/plans/${planId}`, 3);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch plan ${planId} metadata`);
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.warn(`Failed to fetch plan ${planId} metadata:`, error);
      return this.getDefaultPlanMetadata(planId);
    }
  }

  /**
   * Get deposit metadata from API
   */
  static async getDepositMetadata(depositId: number): Promise<DepositMetadata> {
    const cacheKey = `deposit-${depositId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`${API_BASE_URL}/metadata/${depositId}`, 3);
      
      if (!response.ok) {
        return this.getDefaultDepositMetadata(depositId);
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.warn(`Failed to fetch deposit ${depositId} metadata:`, error);
      return this.getDefaultDepositMetadata(depositId);
    }
  }

  /**
   * Default plan metadata when API fails
   */
  static getDefaultPlanMetadata(planId: number): PlanMetadata {
    const planNames: Record<number, string> = {
      1: 'Flexible Savings',
      2: 'Fixed 3 Months',
      3: 'Premium 6 Months',
    };

    const planIcons: Record<number, string> = {
      1: '💰',
      2: '📈',
      3: '💎',
    };

    const planColors: Record<number, string> = {
      1: '#10B981',
      2: '#3B82F6',
      3: '#8B5CF6',
    };

    return {
      id: planId,
      name: planNames[planId] || `Plan ${planId}`,
      description: `Savings plan ${planId} with competitive returns`,
      features: ['Competitive APY', 'Flexible terms', 'Secure deposits'],
      riskLevel: 'Low',
      recommended: ['Savers', 'Long-term investors'],
      image: planIcons[planId] || '/images/plans/default.jpg',
      color: planColors[planId] || '#3B82F6',
      enabled: true,
    };
  }

  /**
   * Default deposit metadata when API fails
   */
  static getDefaultDepositMetadata(depositId: number): DepositMetadata {
    return {
      name: `Term Deposit Certificate #${depositId}`,
      description: 'Certificate of ownership for a term deposit in the decentralized savings protocol',
      image: `${API_BASE_URL}/images/default-certificate.png`,
      external_url: `${window.location.origin}/deposits/${depositId}`,
      attributes: [
        {
          trait_type: 'Status',
          value: 'Active',
        },
        {
          trait_type: 'Type',
          value: 'Savings Certificate',
        },
        {
          trait_type: 'Certificate ID',
          value: depositId,
        },
      ],
    };
  }

  /**
   * Health check for API
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch with retry logic
   */
  private static async fetchWithRetry(
    url: string,
    retries: number,
    delay: number = 1000
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(5000),
        });
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries reached');
  }

  /**
   * Cache helpers
   */
  private static getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const { data, timestamp } = cached;
    const isExpired = Date.now() - timestamp > this.CACHE_DURATION;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return data;
  }

  private static setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
