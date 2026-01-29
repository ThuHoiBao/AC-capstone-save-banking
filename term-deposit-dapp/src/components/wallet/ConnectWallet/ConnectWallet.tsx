import React from 'react';
import { Button } from '../../common/Button/Button';
import { useWallet } from '../../../context/WalletContext';
import styles from './ConnectWallet.module.scss';

export const ConnectWallet: React.FC = () => {
  const { connectWallet, isConnecting, error } = useWallet();

  const handleConnect = () => {
    if (!isConnecting) {
      connectWallet();
    }
  };

  return (
    <div className={styles.container}>
      <Button
        onClick={handleConnect}
        loading={isConnecting}
        disabled={isConnecting}
        size="md"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
      {error && (
        <div className={styles.error}>
          <span>⚠️</span> {error}
        </div>
      )}
      {isConnecting && (
        <p className={styles.hint}>Please check MetaMask popup...</p>
      )}
    </div>
  );
};
