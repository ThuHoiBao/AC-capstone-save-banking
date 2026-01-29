import React from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  Lock, 
  Wallet, 
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { Button } from '../../components/common/Button/Button';
import styles from './Home.module.scss';

export const Home: React.FC = () => {
  const { isConnected, connectWallet } = useWallet();

  const features = [
    {
      icon: <Shield size={32} />,
      title: 'Secure & Audited',
      description: 'Smart contracts audited and battle-tested on Sepolia testnet',
    },
    {
      icon: <TrendingUp size={32} />,
      title: 'High Yields',
      description: 'Earn competitive APR rates from 2.5% to 10% annually',
    },
    {
      icon: <Zap size={32} />,
      title: 'Instant Deposits',
      description: 'Start earning interest immediately after deposit confirmation',
    },
    {
      icon: <Lock size={32} />,
      title: 'Flexible Terms',
      description: 'Choose from 7 to 365 day terms that fit your goals',
    },
  ];

  const stats = [
    { label: 'Total Value Locked', value: '$1.2M+', icon: <Wallet /> },
    { label: 'Active Deposits', value: '250+', icon: <TrendingUp /> },
    { label: 'Average APR', value: '6.5%', icon: <Sparkles /> },
    { label: 'Users', value: '150+', icon: <CheckCircle2 /> },
  ];

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <Sparkles size={16} />
            <span>Powered by Ethereum</span>
          </div>

          <h1 className={styles.title}>
            The Future of
            <span className={styles.gradient}> DeFi Banking</span>
          </h1>

          <p className={styles.subtitle}>
            Earn competitive interest on your crypto with flexible term deposits.
            Secure, transparent, and powered by smart contracts on Sepolia testnet.
          </p>

          <div className={styles.actions}>
            {isConnected ? (
              <>
                <Link to="/plans">
                  <Button size="xl" icon={<TrendingUp size={20} />}>
                    Browse Plans
                  </Button>
                </Link>
                <Link to="/calculator">
                  <Button size="xl" variant="outline" icon={<ArrowRight size={20} />} iconPosition="right">
                    Calculate Returns
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button size="xl" onClick={connectWallet} icon={<Wallet size={20} />}>
                  Connect Wallet
                </Button>
                <Link to="/calculator">
                  <Button size="xl" variant="outline" icon={<ArrowRight size={20} />} iconPosition="right">
                    View Calculator
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Stats */}
          <div className={styles.stats}>
            {stats.map((stat, index) => (
              <div key={index} className={styles.stat}>
                <div className={styles.statIcon}>{stat.icon}</div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{stat.value}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative Elements */}
        <div className={styles.heroDecor}>
          <div className={styles.circle}></div>
          <div className={styles.circle}></div>
          <div className={styles.circle}></div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Why Choose Us</h2>
          <p className={styles.sectionSubtitle}>
            Built on blockchain technology for maximum security and transparency
          </p>
        </div>

        <div className={styles.featureGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howItWorks}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionSubtitle}>
            Start earning in three simple steps
          </p>
        </div>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>Connect Wallet</h3>
            <p className={styles.stepDescription}>
              Connect your MetaMask wallet to get started
            </p>
          </div>

          <div className={styles.stepArrow}>
            <ArrowRight size={32} />
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>Choose a Plan</h3>
            <p className={styles.stepDescription}>
              Select from flexible term deposits with competitive APRs
            </p>
          </div>

          <div className={styles.stepArrow}>
            <ArrowRight size={32} />
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>Earn Interest</h3>
            <p className={styles.stepDescription}>
              Start earning immediately with transparent smart contracts
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to Start Earning?</h2>
          <p className={styles.ctaDescription}>
            Join hundreds of users already earning competitive interest on their crypto
          </p>
          {!isConnected ? (
            <Button size="xl" onClick={connectWallet} icon={<Wallet size={20} />}>
              Connect Wallet Now
            </Button>
          ) : (
            <Link to="/plans">
              <Button size="xl" icon={<TrendingUp size={20} />}>
                Browse All Plans
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};
