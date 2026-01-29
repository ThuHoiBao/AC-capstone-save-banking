import { useState, useCallback } from 'react';
import { Contract } from 'ethers';
import { useContracts } from '../context/ContractContext';
import { useWallet } from '../context/WalletContext';
import { DataAggregator } from '../services/dataAggregator';
import type { Deposit } from '../types';
import { parseUSDC } from '../utils/formatters';

export const useDeposit = () => {
  const { savingLogicContract, depositCertificateContract, usdcContract, provider } = useContracts();
  const { address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const openDeposit = useCallback(async (
    planId: number,
    amount: string
  ): Promise<bigint | null> => {
    if (!savingLogicContract || !depositCertificateContract || !usdcContract || !provider || !address) {
      setError('Wallet not connected');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const amountWei = parseUSDC(amount);

      console.log('📝 [openDeposit] Starting deposit...');
      console.log('  - planId:', planId);
      console.log('  - amount:', amount, 'USDC');
      console.log('  - amountWei:', amountWei.toString());
      console.log('  - user:', address);

      // Validate plan first
      const plan = await savingLogicContract.plans(planId);
      console.log('📋 [openDeposit] Plan data:', {
        planId: plan.planId.toString(),
        isActive: plan.isActive,
        minDeposit: plan.minDeposit.toString(),
        maxDeposit: plan.maxDeposit.toString()
      });

      if (!plan.isActive) {
        throw new Error('Plan is not active');
      }

      if (plan.minDeposit > 0n && amountWei < plan.minDeposit) {
        throw new Error(`Amount below minimum: ${plan.minDeposit.toString()}`);
      }

      if (plan.maxDeposit > 0n && amountWei > plan.maxDeposit) {
        throw new Error(`Amount above maximum: ${plan.maxDeposit.toString()}`);
      }

      // Step 1: Approve USDC
      console.log('✅ [openDeposit] Approving USDC...');
      const usdcWithSigner = usdcContract.connect(signer) as Contract;
      const approveTx = await usdcWithSigner.approve(
        savingLogicContract.target,
        amountWei
      );
      await approveTx.wait();
      console.log('✅ [openDeposit] USDC approved:', approveTx.hash);

      // Step 2: Open deposit (contract only accepts planId and amount)
      console.log('✅ [openDeposit] Opening deposit...');
      const savingLogicWithSigner = savingLogicContract.connect(signer) as Contract;
      const depositTx = await savingLogicWithSigner.openDeposit(planId, amountWei);
      setTxHash(depositTx.hash);
      
      const receipt = await depositTx.wait();
      console.log('✅ [openDeposit] Deposit opened:', depositTx.hash);

      // Parse DepositOpened event to get depositId
      let depositId: bigint | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = savingLogicWithSigner.interface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });
          if (parsed && parsed.name === 'DepositOpened') {
            depositId = parsed.args.depositId;
            break;
          }
        } catch {
          continue;
        }
      }

      // Verify NFT minted
      if (depositId) {
        console.log('✅ [openDeposit] New depositId:', depositId.toString());
        const owner = await depositCertificateContract.ownerOf(depositId);
        console.log('✅ [openDeposit] NFT minted for deposit:', depositId.toString(), 'owner:', owner);
      } else {
        console.warn('⚠️ [openDeposit] No depositId found in transaction receipt');
      }

      return depositId;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to open deposit';
      setError(errorMsg);
      console.error('❌ [openDeposit] Error:', err);
      console.error('❌ [openDeposit] Error details:', {
        message: err.message,
        code: err.code,
        reason: err.reason,
        data: err.data
      });
      alert(`Error: ${errorMsg}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [savingLogicContract, depositCertificateContract, usdcContract, provider, address]);

  const fetchUserDeposits = useCallback(async (): Promise<Deposit[]> => {
    console.log('🔍 [useDeposit] fetchUserDeposits called');
    console.log('  - savingLogicContract:', savingLogicContract ? '✅' : '❌ NULL');
    console.log('  - depositCertificateContract:', depositCertificateContract ? '✅' : '❌ NULL');
    console.log('  - address:', address || '❌ NULL');
    
    if (!savingLogicContract || !depositCertificateContract || !address) {
      console.log('❌ [useDeposit] Cannot fetch user deposits: missing contract or address');
      return [];
    }

    console.log(`🔍 [useDeposit] Fetching deposits for user: ${address}`);
    
    try {
      // Use event-based query (more reliable than NFT scanning)
      const deposits = await DataAggregator.getUserDepositsByEvents(
        savingLogicContract,
        depositCertificateContract, 
        address
      );
      console.log(`✅ [useDeposit] Found ${deposits.length} deposits for user`);
      return deposits;
    } catch (err: any) {
      console.error('❌ [useDeposit] Error fetching deposits:', err);
      return [];
    }
  }, [savingLogicContract, depositCertificateContract, address]);

  // Fetch ALL deposits (for admin)
  const fetchAllDeposits = useCallback(async (): Promise<Deposit[]> => {
    if (!depositCertificateContract) return [];

    try {
      const deposits: Deposit[] = [];
      
      // Get total supply from contract
      const totalSupply = await depositCertificateContract.totalSupply();
      const count = Number(totalSupply);
      
      console.log(`📊 [useDeposit] Total NFTs minted: ${totalSupply}, fetching ${count} deposits...`);

      // Fetch existing deposits in parallel
      const promises = Array.from({ length: count }, async (_, i) => {
        const depositId = BigInt(i + 1);
        try {
          return await DataAggregator.getFullDeposit(depositCertificateContract, depositId);
        } catch {
          return null;
        }
      });

      const results = await Promise.all(promises);

      for (const deposit of results) {
        if (deposit) {
          deposits.push(deposit);
        }
      }

      console.log(`✅ [useDeposit] Fetched ${deposits.length} total deposits`);
      return deposits;
    } catch (err: any) {
      console.error('Error fetching all deposits:', err);
      return [];
    }
  }, [depositCertificateContract]);

  const withdrawAtMaturity = useCallback(async (
    depositId: number
  ): Promise<boolean> => {
    if (!savingLogicContract || !provider) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const savingLogicWithSigner = savingLogicContract.connect(signer) as Contract;
      
      const tx = await savingLogicWithSigner.withdrawAtMaturity(depositId);
      setTxHash(tx.hash);
      
      await tx.wait();
      console.log('Withdrawn at maturity:', tx.hash);

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw');
      console.error('Error withdrawing:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [savingLogicContract, provider]);

  const earlyWithdraw = useCallback(async (
    depositId: number
  ): Promise<boolean> => {
    if (!savingLogicContract || !provider) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const savingLogicWithSigner = savingLogicContract.connect(signer) as Contract;
      
      const tx = await savingLogicWithSigner.earlyWithdraw(depositId);
      setTxHash(tx.hash);
      
      await tx.wait();
      console.log('Early withdraw:', tx.hash);

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to early withdraw');
      console.error('Error early withdrawing:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [savingLogicContract, provider]);

  const renewDeposit = useCallback(async (
    depositId: number,
    newPlanId: number
  ): Promise<boolean> => {
    if (!savingLogicContract || !provider) {
      setError('Wallet not connected');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const signer = await provider.getSigner();
      const savingLogicWithSigner = savingLogicContract.connect(signer) as Contract;
      
      const tx = await savingLogicWithSigner.renewDeposit(depositId, newPlanId);
      setTxHash(tx.hash);
      
      await tx.wait();
      console.log('Deposit renewed:', tx.hash);

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to renew deposit');
      console.error('Error renewing deposit:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [savingLogicContract, provider]);

  return {
    openDeposit,
    fetchUserDeposits,
    fetchAllDeposits,
    withdrawAtMaturity,
    earlyWithdraw,
    renewDeposit,
    loading,
    error,
    txHash,
  };
};
