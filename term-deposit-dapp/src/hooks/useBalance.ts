import { useState, useCallback, useEffect } from 'react';
import { useContracts } from '../context/ContractContext';
import { useWallet } from '../context/WalletContext';
import { formatUSDC } from '../utils/formatters';

export const useBalance = () => {
  const { usdcContract } = useContracts();
  const { address } = useWallet();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!usdcContract || !address) {
      setBalance('0');
      return;
    }

    try {
      setLoading(true);
      const bal = await usdcContract.balanceOf(address);
      setBalance(formatUSDC(bal));
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalance('0');
    } finally {
      setLoading(false);
    }
  }, [usdcContract, address]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    refetch: fetchBalance,
  };
};
