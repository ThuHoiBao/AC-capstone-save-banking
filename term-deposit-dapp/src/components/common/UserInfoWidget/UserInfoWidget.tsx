import React, { useState } from 'react';
import { useWallet } from '../../../context/WalletContext';
import { MessageCircle, X, User, Shield, Wallet, CheckCircle, XCircle } from 'lucide-react';
import styles from './UserInfoWidget.module.scss';

export const UserInfoWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { address, isConnected, isAdmin } = useWallet();

  const toggleWidget = () => setIsOpen(!isOpen);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        className={styles.floatingButton}
        onClick={toggleWidget}
        aria-label="User Info"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Info Panel */}
      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <User size={20} />
            <h3>Account Info</h3>
          </div>

          <div className={styles.content}>
            {/* Connection Status */}
            <div className={styles.infoRow}>
              <div className={styles.label}>
                <Wallet size={16} />
                <span>Connection</span>
              </div>
              <div className={`${styles.value} ${isConnected ? styles.success : styles.danger}`}>
                {isConnected ? (
                  <>
                    <CheckCircle size={16} />
                    <span>Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    <span>Disconnected</span>
                  </>
                )}
              </div>
            </div>

            {/* Wallet Address */}
            {isConnected && address && (
              <div className={styles.infoRow}>
                <div className={styles.label}>
                  <User size={16} />
                  <span>Address</span>
                </div>
                <div className={styles.value}>
                  <code className={styles.address}>{formatAddress(address)}</code>
                </div>
              </div>
            )}

            {/* Full Address */}
            {isConnected && address && (
              <div className={styles.fullAddress}>
                <span className={styles.fullAddressLabel}>Full Address:</span>
                <code className={styles.fullAddressValue}>{address}</code>
              </div>
            )}

            {/* Admin Status */}
            <div className={styles.infoRow}>
              <div className={styles.label}>
                <Shield size={16} />
                <span>Role</span>
              </div>
              <div className={`${styles.value} ${isAdmin ? styles.admin : ''}`}>
                {isAdmin ? (
                  <>
                    <Shield size={16} />
                    <span className={styles.adminBadge}>Admin</span>
                  </>
                ) : (
                  <span>User</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && <div className={styles.backdrop} onClick={toggleWidget} />}
    </>
  );
};
