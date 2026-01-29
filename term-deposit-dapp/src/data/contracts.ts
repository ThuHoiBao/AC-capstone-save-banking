// Contract addresses on Sepolia testnet - NEW ARCHITECTURE
import MockUSDCJson from './abi/MockUSDC.json';
import DepositCertificateJson from './abi/DepositCertificate.json';
import SavingLogicJson from './abi/SavingLogic.json';
import VaultManagerJson from './abi/VaultManager.json';

export const CONTRACTS = {
  MockUSDC: {
    address: '0xd69e72f35E8C4226Ff05D13644C7f345AaBCC941',
    abi: MockUSDCJson.abi,
  },
  DepositCertificate: {
    address: '0xd50edbc6973d891B95Eb2087a1a13b620440B3e3',
    abi: DepositCertificateJson.abi,
  },
  SavingLogic: {
    address: '0x81B8b301ff4193e0DFD8b6044552B621830B6a44',
    abi: SavingLogicJson.abi,
  },
  VaultManager: {
    address: '0xA9E8f70EDE7932d3Caa7FE66BA2dc5840b6aA315',
    abi: VaultManagerJson.abi,
  },
};

export const SUPPORTED_CHAINS = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://sepolia.etherscan.io',
  },
};
