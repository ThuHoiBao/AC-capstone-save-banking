import React from 'react';
import { Github, Twitter, Send, FileText, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.scss';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.section}>
            <div className={styles.brand}>
              <div className={styles.logo}>
                <div className={styles.logoIcon}>
                  <Send size={24} />
                </div>
                <span>Term Deposit DApp</span>
              </div>
              <p>Decentralized on-chain term deposits with guaranteed interest rates. Secure, transparent, and fully automated.</p>
            </div>
          </div>
          
          <div className={styles.section}>
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/plans">Saving Plans</Link></li>
              <li><Link to="/my-deposits">My Deposits</Link></li>
              <li><Link to="/calculator">Calculator</Link></li>
            </ul>
          </div>
          
          <div className={styles.section}>
            <h4>Network</h4>
            <div className={styles.network}>
              <p>Sepolia Testnet</p>
              <p className={styles.chainId}>Chain ID: 11155111</p>
              <a 
                href="https://sepolia.etherscan.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.externalLink}
              >
                View on Etherscan
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
          
          <div className={styles.section}>
            <h4>Resources</h4>
            <ul>
              <li>
                <a href="https://docs.openzeppelin.com" target="_blank" rel="noopener noreferrer">
                  <FileText size={16} />
                  Documentation
                </a>
              </li>
              <li>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                  <Github size={16} />
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className={styles.bottom}>
          <p>&copy; {currentYear} Term Deposit DApp. Built on Ethereum with ❤️</p>
          <div className={styles.social}>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <Twitter size={20} />
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <Github size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
