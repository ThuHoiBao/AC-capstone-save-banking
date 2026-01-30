/**
 * NFT Gallery Component
 * Displays user's NFT certificates in a beautiful gallery view
 */

import React, { useEffect, useState } from 'react';
import { useWallet } from '../../../context/WalletContext';
import { useNFT } from '../../../hooks/useNFT';
import { useDeposit } from '../../../hooks/useDeposit';
import { DataAggregator } from '../../../services/dataAggregator';
import { getDepositState } from '../../../utils/time';
import type { Certificate, Deposit } from '../../../types';
import { Award, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../common/Button/Button';
import styles from './NFTGallery.module.scss';

export const NFTGallery: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { getUserCertificates } = useNFT();
  const { fetchUserDeposits } = useDeposit();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  // Note: deposits Map is managed in child components, not needed here
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      loadCertificates();
    }
  }, [isConnected, address]);

  const loadCertificates = async () => {
    if (!address) return;
    
    setLoading(true);
    
    // Load certificates and deposits in parallel
    const [certs, userDeposits] = await Promise.all([
      getUserCertificates(address),
      fetchUserDeposits()
    ]);
    
    console.log('🎨 Loaded certificates:', certs);
    console.log('💰 Loaded deposits:', userDeposits);
    
    // Create deposit map by tokenId
    const depositMap = new Map<string, Deposit>();
    userDeposits.forEach(deposit => {
      depositMap.set(deposit.depositId.toString(), deposit);
    });
    // Note: depositMap used locally here, not stored in state
    
    // Generate base64 encoded SVG for each certificate
    const certsWithImages = certs.map(cert => {
      const deposit = depositMap.get(cert.tokenId.toString());
      const gracePeriod = 259200; // 3 days
      const state = deposit ? getDepositState(
        Number(deposit.core.startAt),
        Number(deposit.core.maturityAt),
        Number(deposit.core.status),
        gracePeriod
      ) : null;
      
      const statusText = state?.statusName || DataAggregator.getStatusLabel(deposit?.core.status ?? 0);
      
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
  <defs>
    <linearGradient id="grad${cert.tokenId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0ea5e9;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="500" fill="url(#grad${cert.tokenId})"/>
  <rect x="20" y="20" width="360" height="460" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
  <circle cx="200" cy="120" r="40" fill="white" opacity="0.2"/>
  <path d="M200 95 L210 115 L232 118 L216 134 L220 156 L200 145 L180 156 L184 134 L168 118 L190 115 Z" fill="white"/>
  <text x="200" y="200" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">CERTIFICATE</text>
  <text x="200" y="235" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" opacity="0.9">of Ownership</text>
  <text x="200" y="290" font-family="Arial, sans-serif" font-size="14" fill="white" text-anchor="middle" opacity="0.8">Certificate ID</text>
  <text x="200" y="320" font-family="monospace" font-size="24" font-weight="bold" fill="white" text-anchor="middle">#${cert.tokenId}</text>
  <text x="200" y="380" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle" opacity="0.7">Term Deposit NFT</text>
  <text x="200" y="400" font-family="Arial, sans-serif" font-size="10" fill="white" text-anchor="middle" opacity="0.6">Secured on Ethereum Blockchain</text>
  <rect x="20" y="440" width="360" height="1" fill="white" opacity="0.3"/>
  <text x="200" y="465" font-family="Arial, sans-serif" font-size="10" fill="white" text-anchor="middle" opacity="0.5">ERC-721 Standard</text>
</svg>`;
      
      const base64Svg = `data:image/svg+xml;base64,${btoa(svg)}`;
      
      console.log(`📄 Certificate #${cert.tokenId}:`, {
        hasMetadata: !!cert.metadata,
        hasImage: !!cert.metadata?.image,
        status: statusText,
        generatedImage: base64Svg.substring(0, 50) + '...'
      });
      
      return {
        ...cert,
        metadata: {
          name: `Term Deposit Certificate #${cert.tokenId}`,
          description: 'Certificate of ownership for a term deposit in the decentralized savings protocol',
          image: base64Svg,
          external_url: getEtherscanUrl(cert.tokenId),
          attributes: [
            { trait_type: 'Certificate ID', value: cert.tokenId.toString() },
            { trait_type: 'Status', value: statusText },
            { trait_type: 'Type', value: 'Savings Certificate' }
          ]
        }
      };
    });
    
    console.log('✅ Certificates with images:', certsWithImages);
    setCertificates(certsWithImages);
    setLoading(false);
  };

  const getOpenSeaUrl = (tokenId: bigint): string => {
    const DEPOSIT_CERTIFICATE_ADDRESS = import.meta.env.VITE_DEPOSIT_CERTIFICATE_ADDRESS;
    return `https://testnets.opensea.io/assets/sepolia/${DEPOSIT_CERTIFICATE_ADDRESS}/${tokenId}`;
  };

  const getEtherscanUrl = (tokenId: bigint): string => {
    const DEPOSIT_CERTIFICATE_ADDRESS = import.meta.env.VITE_DEPOSIT_CERTIFICATE_ADDRESS;
    return `https://sepolia.etherscan.io/nft/${DEPOSIT_CERTIFICATE_ADDRESS}/${tokenId}`;
  };

  if (!isConnected) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <Award size={40} />
            NFT Gallery
          </h1>
          <p className={styles.subtitle}>View your deposit certificates</p>
        </div>
        <div className={styles.notConnected}>
          <Award size={64} />
          <h2>Connect Your Wallet</h2>
          <p>Please connect your wallet to view your NFT certificates</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <Award size={40} />
            NFT Gallery
          </h1>
          <p className={styles.subtitle}>View your deposit certificates</p>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading your certificates...</p>
        </div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <Award size={40} />
            NFT Gallery
          </h1>
          <p className={styles.subtitle}>View your deposit certificates</p>
        </div>
        <div className={styles.empty}>
          <Award size={64} />
          <h2>No Certificates Yet</h2>
          <p>Make a deposit to receive your first NFT certificate!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <Award size={40} />
            NFT Gallery
          </h1>
          <p className={styles.subtitle}>
            You own {certificates.length} certificate{certificates.length !== 1 ? 's' : ''}. Each NFT represents ownership of a term deposit.
          </p>
          <div style={{
            background: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginTop: '12px',
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.85)',
            textAlign: 'center'
          }}>
            💡 <strong>NFT = Proof of Ownership</strong> | Click "View on Etherscan" to see your NFT details on the blockchain
          </div>
        </div>
      </div>

      <div className={styles.gallery}>
        {certificates.map((cert, index) => (
          <div
            key={cert.tokenId.toString()}
            className={styles.certCard}
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => setSelectedCert(cert)}
          >
            <div className={styles.certImage}>
              {cert.metadata?.image ? (
                <img src={cert.metadata.image} alt={cert.metadata.name} />
              ) : (
                <div className={styles.placeholderImage}>
                  <div className={styles.nftIcon}>
                    <Award size={64} color="#0ea5e9" />
                  </div>
                  <div className={styles.nftTitle}>
                    <h3>Term Deposit Certificate</h3>
                    <p>#{cert.tokenId.toString()}</p>
                  </div>
                </div>
              )}
              <div className={styles.tokenIdBadge}>
                <Award size={14} />
                #{cert.tokenId.toString()}
              </div>
            </div>

            <div className={styles.certContent}>
              <h3 className={styles.certTitle}>
                {cert.metadata?.name || `Certificate #${cert.tokenId.toString()}`}
              </h3>
              <p className={styles.certDescription}>
                {cert.metadata?.description || 'Deposit Certificate NFT'}
              </p>

              {cert.metadata?.attributes && (
                <div className={styles.attributes}>
                  {cert.metadata.attributes.slice(0, 3).map((attr, idx) => (
                    <div key={idx} className={styles.attribute}>
                      <span className={styles.attrLabel}>{attr.trait_type}</span>
                      <span className={styles.attrValue}>{attr.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.certActions}>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ExternalLink size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(getEtherscanUrl(cert.tokenId), '_blank');
                  }}
                >
                  View on Etherscan
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for selected certificate */}
      {selectedCert && (
        <>
          <div 
            className={styles.modalBackdrop}
            onClick={() => setSelectedCert(null)}
          />
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>
                <Award size={28} />
                {selectedCert.metadata?.name || `Certificate #${selectedCert.tokenId.toString()}`}
              </h2>
              <button 
                className={styles.closeButton}
                onClick={() => setSelectedCert(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.modalImage}>
                {selectedCert.metadata?.image ? (
                  <img src={selectedCert.metadata.image} alt={selectedCert.metadata.name} />
                ) : (
                  <div className={styles.placeholderImageLarge}>
                    <ImageIcon size={96} />
                    <span>Certificate #{selectedCert.tokenId.toString()}</span>
                  </div>
                )}
              </div>

              <div className={styles.modalDetails}>
                <div className={styles.modalSection}>
                  <h3>Details</h3>
                  <div className={styles.detailsList}>
                    <div className={styles.detailRow}>
                      <span>Token ID</span>
                      <strong>#{selectedCert.tokenId.toString()}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Owner</span>
                      <strong className={styles.address}>
                        {selectedCert.owner.slice(0, 6)}...{selectedCert.owner.slice(-4)}
                      </strong>
                    </div>
                  </div>
                </div>

                {selectedCert.metadata?.attributes && selectedCert.metadata.attributes.length > 0 && (
                  <div className={styles.modalSection}>
                    <h3>Attributes</h3>
                    <div className={styles.attributesGrid}>
                      {selectedCert.metadata.attributes.map((attr, idx) => (
                        <div key={idx} className={styles.modalAttribute}>
                          <span className={styles.modalAttrLabel}>{attr.trait_type}</span>
                          <span className={styles.modalAttrValue}>{attr.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.modalSection}>
                  <h3>Description</h3>
                  <p className={styles.description}>
                    {selectedCert.metadata?.description || 'This NFT represents ownership of a term deposit in the savings protocol.'}
                  </p>
                </div>

                <div className={styles.modalActions}>
                  <Button
                    variant="primary"
                    icon={<ExternalLink size={18} />}
                    onClick={() => window.open(getOpenSeaUrl(selectedCert.tokenId), '_blank')}
                  >
                    View on OpenSea
                  </Button>
                  <Button
                    variant="outline"
                    icon={<ExternalLink size={18} />}
                    onClick={() => window.open(getEtherscanUrl(selectedCert.tokenId), '_blank')}
                  >
                    View on Etherscan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
