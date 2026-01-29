import React, { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Contract } from 'ethers';
import { useWallet } from './WalletContext';
import { CONTRACTS } from '../data/contracts';
import type { ContractContextType } from '../types';

const ContractContext = createContext<ContractContextType | undefined>(undefined);

export const ContractProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { provider, isConnected } = useWallet();

  const contracts = useMemo(() => {
    console.log('🔧 [ContractContext] Creating contracts...');
    console.log('  - provider:', provider ? '✅' : '❌ NULL');
    console.log('  - isConnected:', isConnected);
    
    if (!provider || !isConnected) {
      console.log('❌ [ContractContext] No provider or not connected, returning null contracts');
      return {
        provider: null,
        depositCertificateContract: null,
        savingLogicContract: null,
        vaultManagerContract: null,
        usdcContract: null,
      };
    }

    console.log('✅ [ContractContext] Initializing contracts...');
    
    // Create contract instances (read-only, will use signer for transactions)
    const depositCertificateContract = new Contract(
      CONTRACTS.DepositCertificate.address,
      CONTRACTS.DepositCertificate.abi,
      provider
    );

    const savingLogicContract = new Contract(
      CONTRACTS.SavingLogic.address,
      CONTRACTS.SavingLogic.abi,
      provider
    );

    const vaultManagerContract = new Contract(
      CONTRACTS.VaultManager.address,
      CONTRACTS.VaultManager.abi,
      provider
    );

    const usdcContract = new Contract(
      CONTRACTS.MockUSDC.address,
      CONTRACTS.MockUSDC.abi,
      provider
    );

    console.log('✅ [ContractContext] All contracts initialized');

    return {
      provider,
      depositCertificateContract,
      savingLogicContract,
      vaultManagerContract,
      usdcContract,
    };
  }, [provider, isConnected]);

  return (
    <ContractContext.Provider value={contracts}>
      {children}
    </ContractContext.Provider>
  );
};

export const useContracts = () => {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error('useContracts must be used within ContractProvider');
  }
  return context;
};
