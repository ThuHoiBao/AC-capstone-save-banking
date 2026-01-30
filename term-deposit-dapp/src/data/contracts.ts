// Contract addresses on Sepolia testnet - v2.0 Architecture (Dec 2024)
// ⭐ NEW: Added DepositVault for fund custody (separation of concerns)
import MockUSDCJson from './abi/MockUSDC.json';
import DepositCertificateJson from './abi/DepositCertificate.json';
import DepositVaultAbi from './abi/DepositVault.json';
import SavingLogicJson from './abi/SavingLogic.json';
import VaultManagerJson from './abi/VaultManager.json';

export const CONTRACTS = {
  MockUSDC: {
    address: '0x73a9bEc9B836007904A19C30B2FD9B2f7A6720BA',
    abi: MockUSDCJson.abi,
  },
  DepositCertificate: {
    address: '0x2A4A34e3C69D862e1dAA94C64C5747f022160AB4',
    abi: DepositCertificateJson.abi,
  },
  // ⭐ NEW in v2.0: DepositVault holds all user funds
  // CRITICAL: User must approve DepositVault, NOT SavingLogic!
  DepositVault: {
    address: '0x077a4941565e0194a00Cd8DABE1acA09111F7B06',
    abi: DepositVaultAbi,  // Direct ABI array, no .abi property
  },
  SavingLogic: {
    address: '0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb',
    abi: SavingLogicJson.abi,
  },
  VaultManager: {
    address: '0xFf586ADCE68Ed8f0FcfbFA268Ba81E438900e136',
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
