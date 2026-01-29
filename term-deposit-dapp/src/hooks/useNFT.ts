/**
 * useNFT Hook
 * Manages NFT certificate operations for deposits
 */

import { useState, useCallback } from 'react';
import { useContracts } from '../context/ContractContext';
import { DataAggregator } from '../services/dataAggregator';
import type { Certificate, DepositMetadata } from '../types';

export const useNFT = () => {
  const { depositCertificateContract } = useContracts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get owner of an NFT certificate
   */
  const getOwner = useCallback(async (depositId: bigint): Promise<string | null> => {
    if (!depositCertificateContract) return null;

    try {
      const owner = await depositCertificateContract.ownerOf(depositId);
      return owner;
    } catch (err: any) {
      console.error('Error getting NFT owner:', err);
      return null;
    }
  }, [depositCertificateContract]);

  /**
   * Get token URI for metadata
   */
  const getTokenURI = useCallback(async (depositId: bigint): Promise<string | null> => {
    if (!depositCertificateContract) return null;

    try {
      const tokenURI = await depositCertificateContract.tokenURI(depositId);
      return tokenURI;
    } catch (err: any) {
      console.error('Error getting token URI:', err);
      return null;
    }
  }, [depositCertificateContract]);

  /**
   * Get full deposit data via NFT
   */
  const getDepositCore = useCallback(async (depositId: bigint) => {
    if (!depositCertificateContract) return null;

    try {
      const core = await depositCertificateContract.getDepositCore(depositId);
      return core;
    } catch (err: any) {
      console.error('Error getting deposit core:', err);
      return null;
    }
  }, [depositCertificateContract]);

  /**
   * Get full metadata for deposit NFT
   */
  const getMetadata = useCallback(async (depositId: bigint): Promise<DepositMetadata | null> => {
    if (!depositCertificateContract) return null;

    try {
      const tokenURI = await getTokenURI(depositId);
      
      if (!tokenURI) return null;

      // Fetch metadata from URI
      const response = await fetch(tokenURI);
      const metadata = await response.json();
      
      return metadata;
    } catch (err: any) {
      console.error('Error getting metadata:', err);
      return null;
    }
  }, [depositCertificateContract, getTokenURI]);

  /**
   * Get certificate data for display
   */
  const getCertificate = useCallback(async (tokenId: bigint): Promise<Certificate | null> => {
    if (!depositCertificateContract) return null;

    try {
      const certificate = await DataAggregator.getCertificate(depositCertificateContract, tokenId);
      return certificate;
    } catch (err: any) {
      console.error('Error getting certificate:', err);
      return null;
    }
  }, [depositCertificateContract]);

  /**
   * Get all certificates owned by user
   */
  const getUserCertificates = useCallback(async (userAddress: string): Promise<Certificate[]> => {
    if (!depositCertificateContract || !userAddress) return [];

    try {
      setLoading(true);
      setError(null);

      const certificates = await DataAggregator.getUserCertificates(
        depositCertificateContract,
        userAddress
      );

      return certificates;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch certificates');
      console.error('Error fetching user certificates:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [depositCertificateContract]);

  /**
   * Check if user owns a specific NFT
   */
  const isOwner = useCallback(async (
    depositId: bigint,
    userAddress: string
  ): Promise<boolean> => {
    if (!depositCertificateContract || !userAddress) return false;

    try {
      const owner = await getOwner(depositId);
      return owner?.toLowerCase() === userAddress.toLowerCase();
    } catch (err: any) {
      console.error('Error checking ownership:', err);
      return false;
    }
  }, [depositCertificateContract, getOwner]);

  return {
    getOwner,
    getTokenURI,
    getDepositCore,
    getMetadata,
    getCertificate,
    getUserCertificates,
    isOwner,
    loading,
    error,
  };
};
