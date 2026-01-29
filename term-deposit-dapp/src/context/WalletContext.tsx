import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import type { WalletState } from '../types';
import { formatUSDC } from '../utils/formatters';
import { CHAIN_ID, SAVING_CORE_ADDRESS } from '../utils/constants';

interface WalletContextType extends WalletState {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  provider: BrowserProvider | null;
  isAdmin: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    balance: '0',
    isConnected: false,
    isConnecting: false,
    error: null,
  });
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const isConnectingRef = useRef(false);

  const checkAdminRole = async (address: string, browserProvider: BrowserProvider) => {
    try {
      const savingCore = new Contract(
        SAVING_CORE_ADDRESS,
        ['function owner() view returns (address)'],
        browserProvider
      );
      const owner = await savingCore.owner();
      const isOwner = owner.toLowerCase() === address.toLowerCase();
      setIsAdmin(isOwner);
      console.log('👤 Connected:', address.toLowerCase());
      console.log('👑 Contract Owner:', owner.toLowerCase());
      console.log('🔐 Is Admin:', isOwner);
      return isOwner;
    } catch (error) {
      console.error('Failed to check admin role:', error);
      setIsAdmin(false);
      return false;
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setState(prev => ({ ...prev, error: 'MetaMask not installed' }));
      return;
    }

    // Prevent multiple concurrent requests
    if (isConnectingRef.current) {
      console.log('Connection already in progress...');
      return;
    }

    try {
      isConnectingRef.current = true;
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      const browserProvider = new BrowserProvider(window.ethereum);
      
      // Request accounts with timeout
      const accounts = await Promise.race([
        browserProvider.send('eth_requestAccounts', []),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 60000)
        )
      ]) as string[];
      
      const network = await browserProvider.getNetwork();
      const balance = await browserProvider.getBalance(accounts[0]);

      setProvider(browserProvider);
      setState({
        address: accounts[0],
        chainId: Number(network.chainId),
        balance: formatUSDC(balance),
        isConnected: true,
        isConnecting: false,
        error: null,
      });

      // Check if on correct network
      if (Number(network.chainId) !== CHAIN_ID) {
        setState(prev => ({ 
          ...prev, 
          error: `Please switch to Sepolia network (Chain ID: ${CHAIN_ID})` 
        }));
      }
    } catch (error: any) {
      console.error('Connect error:', error);
      let errorMessage = 'Failed to connect wallet';
      
      if (error.code === 4001) {
        errorMessage = 'Connection rejected by user';
      } else if (error.code === -32002) {
        errorMessage = 'Please check MetaMask - connection request already pending';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout - please try again';
      }
      
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
    } finally {
      isConnectingRef.current = false;
    }
  };

  const disconnectWallet = () => {
    isConnectingRef.current = false;
    setIsAdmin(false);
    setState({
      address: null,
      chainId: null,
      balance: '0',
      isConnected: false,
      isConnecting: false,
      error: null,
    });
    setProvider(null);
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to MetaMask
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${CHAIN_ID.toString(16)}`,
                chainName: 'Sepolia',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      }
    }
  };

  // Listen to account and network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== state.address) {
        connectWallet();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [state.address]);

  // Auto-connect if previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum || isConnectingRef.current) return;

      try {
        const browserProvider = new BrowserProvider(window.ethereum);
        const accounts = await browserProvider.send('eth_accounts', []);
        
        if (accounts.length > 0 && !state.isConnected) {
          // Silent connect without requesting permissions
          const network = await browserProvider.getNetwork();
          const balance = await browserProvider.getBalance(accounts[0]);
          
          
          // Check admin role
          await checkAdminRole(accounts[0], browserProvider);
          
          setProvider(browserProvider);
          setState({
            address: accounts[0],
            chainId: Number(network.chainId),
            balance: formatUSDC(balance),
            isConnected: true,
            isConnecting: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Failed to check connection:', error);
      }
    };

    // Delay auto-connect slightly to avoid conflicts
    const timer = setTimeout(checkConnection, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        isAdmin,
        ...state,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        provider,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
