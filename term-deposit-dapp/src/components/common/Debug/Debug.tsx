import React from 'react';
import { useWallet } from '../../../context/WalletContext';
import styles from './Debug.module.scss';

export const Debug: React.FC = () => {
  const { address, isConnected, isAdmin } = useWallet();

  if (!isConnected) return null;

  return (
    <div className={styles.debug}>
      <div className={styles.debugTitle}>🐛 Debug Info</div>
      <div className={styles.debugContent}>
        <div className={styles.debugRow}>
          <span>Connected:</span>
          <strong>{isConnected ? '✅ Yes' : '❌ No'}</strong>
        </div>
        <div className={styles.debugRow}>
          <span>Your Address:</span>
          <code>{address?.toLowerCase()}</code>
        </div>
        <div className={styles.debugRow}>
          <span>Is Admin:</span>
          <strong className={isAdmin ? styles.yes : styles.no}>
            {isAdmin ? '✅ YES - Admin' : '❌ NO - User'}
          </strong>
        </div>
      </div>
    </div>
  );
};
