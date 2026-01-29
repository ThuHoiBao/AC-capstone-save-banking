import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '../../../context/WalletContext';
import { useBalance } from '../../../hooks/useBalance';
import { formatAddress } from '../../../utils/formatters';
import styles from './WalletInfo.module.scss';

export const WalletInfo: React.FC = () => {
  const { address, disconnectWallet } = useWallet();
  const { balance } = useBalance();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDisconnect = () => {
    disconnectWallet();
    setShowMenu(false);
  };

  const handleChangeAccount = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
        setShowMenu(false);
      } catch (error) {
        console.error('Failed to change account:', error);
      }
    }
  };

  return (
    <div className={styles.container} ref={menuRef}>
      <div className={styles.info} onClick={() => setShowMenu(!showMenu)}>
        <div className={styles.balance}>
          <span className={styles.label}>USDC Balance:</span>
          <span className={styles.value}>{balance}</span>
        </div>
        <div className={styles.address}>{formatAddress(address || '')}</div>
        <span className={styles.arrow}>{showMenu ? '▲' : '▼'}</span>
      </div>
      
      {showMenu && (
        <div className={styles.menu}>
          <button className={styles.menuItem} onClick={handleChangeAccount}>
            <span className={styles.icon}>🔄</span>
            Change Account
          </button>
          <button className={styles.menuItem} onClick={handleDisconnect}>
            <span className={styles.icon}>🚪</span>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};
