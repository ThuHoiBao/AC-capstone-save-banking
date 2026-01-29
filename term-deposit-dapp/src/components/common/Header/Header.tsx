import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, Menu, X, Home, TrendingUp, PiggyBank, Calculator, Shield, Award } from 'lucide-react';
import { ConnectWallet } from '../../wallet/ConnectWallet/ConnectWallet';
import { WalletInfo } from '../../wallet/WalletInfo/WalletInfo';
import { useWallet } from '../../../context/WalletContext';
import styles from './Header.module.scss';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isConnected, isAdmin } = useWallet();
  const location = useLocation();

  const isActivePath = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/plans', label: 'Plans', icon: TrendingUp },
    { path: '/my-deposits', label: 'My Deposits', icon: PiggyBank },
    { path: '/nft-gallery', label: 'NFT Gallery', icon: Award },
    { path: '/calculator', label: 'Calculator', icon: Calculator },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', label: 'Admin', icon: Shield });
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <Wallet size={28} />
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoName}>Term Deposit</span>
            <span className={styles.logoTag}>DeFi Banking</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        {isConnected && (
          <nav className={styles.nav}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.navLink} ${isActivePath(item.path) ? styles.active : ''}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Wallet Actions */}
        <div className={styles.actions}>
          {isConnected ? <WalletInfo /> : <ConnectWallet />}
          
          {/* Mobile Menu Toggle */}
          <button
            className={styles.menuToggle}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isConnected && (
          <div className={`${styles.mobileNav} ${isMenuOpen ? styles.open : ''}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.mobileNavLink} ${isActivePath(item.path) ? styles.active : ''}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
