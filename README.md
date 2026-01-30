# 🏦 Term Deposit DApp - Decentralized Savings Protocol

[![Built with Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-f7e018?style=for-the-badge&logo=ethereum)](https://hardhat.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?style=for-the-badge&logo=solidity&logoColor=white)](https://docs.soliditylang.org)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-Contracts-4b7bec?style=for-the-badge)](https://docs.openzeppelin.com/contracts)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

**Author:** Tran Anh Thu  
**Project Type:** Production-Ready DeFi Savings Platform  
**Network:** Ethereum Sepolia Testnet  
**Status:** ✅ Fully Deployed & Operational

---

## 🌟 Overview

A fully decentralized term deposit savings protocol that brings traditional banking features to the blockchain. Users can lock stablecoins (USDC) into fixed-term savings plans, receive ERC-721 NFT certificates as proof of ownership, and earn competitive interest rates - all secured by smart contracts.

### Key Highlights

- 🎫 **NFT-Based Deposits** - Each deposit is an ERC-721 certificate with embedded metadata
- 💰 **Multiple Savings Plans** - 5 pre-configured plans from flexible to long-term
- 📊 **Transparent APR** - Simple interest with snapshot protection
- 🔒 **Vault Separation** - Secure fund management with emergency pause
- 🌐 **Full Stack** - Smart contracts + React frontend + IPFS metadata
- ✅ **Battle-Tested** - 75/75 tests passing with >90% coverage

---

## 📑 Table of Contents

- [Live Deployment](#-live-deployment)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#️-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Smart Contracts](#-smart-contracts)
- [Frontend Application](#-frontend-application)
- [NFT Metadata & IPFS](#-nft-metadata--ipfs)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Scripts & Tools](#-scripts--tools)
- [Configuration](#-configuration)
- [Security](#-security)
- [Documentation](#-documentation)
- [Contact](#-contact)

---

## 🌐 Live Deployment

### Sepolia Testnet Contracts

| Contract | Address | Verified |
|----------|---------|----------|
| **MockUSDC** | [`0xd69e72f35E8C4226Ff05D13644C7f345AaBCC941`](https://sepolia.etherscan.io/address/0xd69e72f35E8C4226Ff05D13644C7f345AaBCC941) | ✅ |
| **VaultManager** | [`0xA9E8f70EDE7932d3Caa7FE66BA2dc5840b6aA315`](https://sepolia.etherscan.io/address/0xA9E8f70EDE7932d3Caa7FE66BA2dc5840b6aA315) | ✅ |
| **SavingLogic** | [`0x81B8b301ff4193e0DFD8b6044552B621830B6a44`](https://sepolia.etherscan.io/address/0x81B8b301ff4193e0DFD8b6044552B621830B6a44) | ✅ |
| **DepositCertificate** | [`0xd50edbc6973d891B95Eb2087a1a13b620440B3e3`](https://sepolia.etherscan.io/address/0xd50edbc6973d891B95Eb2087a1a13b620440B3e3) | ✅ |

### Frontend

- **DApp**: [term-deposit-dapp.vercel.app](https://term-deposit-dapp.vercel.app) (React + Vite)
- **Metadata API**: [term-deposit-api.vercel.app](https://term-deposit-api.vercel.app) (Express)

---

## ✨ Features

### For Users

- ✅ **Multiple Savings Plans** - Choose from 5 plans with varying terms and APRs
- ✅ **Open Deposits** - Lock USDC and receive NFT certificate instantly
- ✅ **Track Deposits** - View all your active deposits with real-time interest calculation
- ✅ **Withdraw at Maturity** - Get principal + interest when term ends
- ✅ **Early Withdrawal** - Access funds early with transparent penalty (20%)
- ✅ **NFT Gallery** - Beautiful certificate images stored on IPFS
- ✅ **Admin Dashboard** - Manage plans, vault, and system parameters (owner only)

### For Developers

- ✅ **Modular Architecture** - Clean separation of concerns
- ✅ **Type-Safe** - Full TypeScript support with Typechain
- ✅ **Event-Based Queries** - Efficient deposit retrieval using blockchain events
- ✅ **Comprehensive Testing** - 75 tests with edge case coverage
- ✅ **IPFS Integration** - Decentralized metadata storage
- ✅ **Script Automation** - Deploy, verify, test, and manage via scripts

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Wallet                          │
│                    (MetaMask/WalletConnect)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴──────────────┐
        │                              │
┌───────▼────────┐            ┌────────▼─────────┐
│  React Frontend │            │   Smart Contracts │
│  (Vite + TS)    │            │   (Sepolia)       │
│                 │            │                   │
│  - Plans Page   │            │  SavingLogic     │
│  - My Deposits  │◄───────────┤  VaultManager    │
│  - NFT Gallery  │            │  DepositCert     │
│  - Admin Panel  │            │  MockUSDC        │
└────────┬────────┘            └──────────────────┘
         │                              
         │        
         │        
┌────────▼─────────────┐
│   Metadata API/IPFS   │
│  (NFT Certificate     │
│   Images & Data)      │
└───────────────────────┘
```

### Contract Interaction Flow

```
User approves USDC → User calls openDeposit()
                     ↓
              SavingLogic validates
                     ↓
              Mints NFT Certificate
                     ↓
              Transfers USDC to VaultManager
                     ↓
              Stores deposit data + APR snapshot
                     ↓
              Returns depositId & tokenId
```

---

## 🛠️ Tech Stack

### Smart Contracts
- **Solidity** 0.8.28
- **Hardhat** - Development environment
- **OpenZeppelin** - ERC20, ERC721, Ownable, Pausable
- **Typechain** - TypeScript bindings
- **Chai/Mocha** - Testing framework

### Frontend
- **React** 18.3.1
- **TypeScript** 5.6.2
- **Vite** - Build tool
- **ethers.js** 6.16.0 - Ethereum interaction
- **Wagmi** - React hooks for Ethereum
- **Sass** - Styling

### Infrastructure
- **IPFS/Pinata** - NFT metadata storage
- **Vercel** - Frontend & API hosting
- **Sepolia** - Ethereum testnet

---

## ⚡ Quick Start

### Prerequisites

```bash
Node.js >= 18
npm or yarn
MetaMask wallet
Sepolia testnet ETH (from faucet)
```

### Installation

```bash
# Clone repository
git clone <repository-url>
cd AC-capstone-save-banking

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your keys
```

### Compile Contracts

```bash
npm run compile
# or
npx hardhat compile
```

### Run Tests

```bash
npm test
# With gas report
REPORT_GAS=true npm test
```

### Start Frontend

```bash
cd term-deposit-dapp
npm install
npm run dev
# Opens http://localhost:5173
```

---

## 📁 Project Structure

```
AC-capstone-save-banking/
├── contracts/
│   ├── SavingCore.sol              # Main deposit logic
│   ├── VaultManager.sol            # Fund management
│   ├── interfaces/
│   │   ├── ISavingCore.sol
│   │   └── IVaultManager.sol
│   ├── libs/
│   │   └── InterestMath.sol        # Interest calculations
│   ├── tokens/
│   │   └── MockUSDC.sol            # Test stablecoin
│   └── types/
│       └── Types.sol               # Shared structs
│
├── scripts/
│   ├── generate-ipfs-metadata.ts   # Generate NFT metadata
│   ├── upload-to-pinata.ts         # Upload to IPFS
│   ├── update-base-uri.ts          # Update contract URI
│   ├── prepare-ipfs-deploy.ts      # All-in-one IPFS prep
│   ├── verify-contracts.ts         # Contract verification
│   ├── create-plans-sepolia.ts     # Create savings plans
│   └── user-journey-test.ts        # E2E testing
│
├── test/
│   ├── mockUSDC.spec.ts            # USDC tests (2)
│   ├── savingCore.spec.ts          # Core logic (46)
│   └── vaultManager.spec.ts        # Vault tests (27)
│
├── term-deposit-dapp/              # Frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── user/               # User-facing UI
│   │   │   │   ├── Plans/
│   │   │   │   ├── MyDeposits/
│   │   │   │   └── NFTGallery/
│   │   │   ├── admin/              # Admin dashboard
│   │   │   └── common/             # Shared components
│   │   ├── contracts/              # Contract ABIs
│   │   ├── context/                # React context
│   │   ├── hooks/                  # Custom hooks
│   │   ├── services/               # API services
│   │   └── types/                  # TypeScript types
│   └── public/
│
├── metadata-api/                   # Metadata server
│   ├── server.js
│   └── public/images/
│
├── deployments/sepolia/            # Deployment artifacts
├── data/abi/                       # Extracted ABIs
├── documents/                      # Documentation
└── ipfs-metadata/                  # Generated NFT metadata

75 tests passing ✅
```

---

## 📜 Smart Contracts

### SavingCore (Main Logic)

**Key Functions:**
- `createPlan()` - Admin creates savings plan
- `openDeposit(planId, amount)` - User opens deposit, receives NFT
- `withdrawAtMaturity(depositId)` - Withdraw principal + interest
- `earlyWithdraw(depositId)` - Withdraw with penalty
- `getUserDepositIds(user)` - Get user's deposit IDs

**Features:**
- ✅ APR & penalty snapshot per deposit
- ✅ ERC-721 NFT minting
- ✅ Event-based deposit tracking
- ✅ Plan management (CRUD)
### VaultManager (Fund Management)

**Key Functions:**
- `fundVault(amount)` - Admin deposits USDC liquidity
- `withdrawFromVault(amount)` - Admin withdraws excess
- `setFeeReceiver(address)` - Set penalty recipient
- `pause()` / `unpause()` - Emergency controls

**Features:**
- ✅ Separate liquidity pool
- ✅ Penalty collection & routing
- ✅ Emergency pause mechanism
- ✅ Transparent balance tracking

### DepositCertificate (NFT)

**Key Functions:**
- `tokenURI(tokenId)` - Get NFT metadata URL
- `setBaseURI(newURI)` - Update metadata endpoint
- `ownerOf(tokenId)` - Check NFT ownership

**Features:**
- ✅ ERC-721 compliant
- ✅ IPFS metadata support
- ✅ Beautiful SVG certificates
- ✅ On-chain ownership proof

### MockUSDC (Test Token)

**For testing only** - Standard ERC-20 with 6 decimals, 1M initial supply

---

## 🎨 Frontend Application

### Pages

**1. Plans** (`/plans`)
- Browse 5 savings plans
- Compare APRs, terms, penalties
- Open new deposits
- Real-time validation

**2. My Deposits** (`/my-deposits`)
- View all active deposits
- Real-time interest calculation
- Withdraw at maturity
- Early withdrawal with penalty preview
- Deposit details modal

**3. NFT Gallery** (`/nft-gallery`)
- Visual certificate gallery
- NFT metadata display
- Etherscan links
- IPFS-hosted images

**4. Admin Dashboard** (`/admin`)
- Create/update plans
- Fund/withdraw vault
- Set system parameters
- View vault balance
- Emergency pause controls

### Tech Features

- ✅ **Wagmi + RainbowKit** - Wallet connection
- ✅ **Event-based queries** - Efficient blockchain data fetching
- ✅ **Type-safe contracts** - Typechain integration
- ✅ **Responsive design** - Mobile-friendly UI
- ✅ **Real-time updates** - Live balance & interest calculations
- ✅ **Error handling** - User-friendly error messages

---

## 🖼️ NFT Metadata & IPFS

### Certificate Design

Each deposit NFT has a beautiful gradient certificate:
- 🎨 Blue-to-purple gradient background
- ⭐ Award icon decoration
- 🔢 Unique certificate ID
- 🔐 "Secured on Ethereum Blockchain"
- 📜 ERC-721 compliant metadata

### IPFS Deployment

**Generate Metadata:**
```bash
npx hardhat run scripts/generate-ipfs-metadata.ts
# Creates 100 metadata files with embedded base64 SVG
```

**Upload to IPFS via Pinata:**
```bash
# Set API keys
$env:PINATA_API_KEY="your_api_key"
$env:PINATA_SECRET_KEY="your_secret_key"

# Upload
npx hardhat run scripts/upload-to-pinata.ts --network sepolia
```

**Update Contract:**
```bash
$env:NEW_BASE_URI="ipfs://YOUR_CID/"
npx hardhat run scripts/update-base-uri.ts --network sepolia
```

**All-in-One:**
```bash
npx hardhat run scripts/prepare-ipfs-deploy.ts
```

See [IPFS_DEPLOY_GUIDE.md](IPFS_DEPLOY_GUIDE.md) for detailed instructions.

---

## ✅ Testing

### Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| **MockUSDC** | 2 | ✅ |
| **SavingCore** | 46 | ✅ |
| **VaultManager** | 27 | ✅ |
| **Total** | **75** | **✅ 100%** |

**Coverage:** >90% on core business logic

### Test Categories

**Unit Tests:**
- ✅ Plan CRUD operations
- ✅ Deposit opening & validation
- ✅ Interest calculations
- ✅ Penalty calculations
- ✅ NFT minting
- ✅ Access control

**Integration Tests:**
- ✅ Withdraw at maturity flow
- ✅ Early withdrawal flow
- ✅ Vault funding & payouts
- ✅ Pause/unpause behavior
- ✅ Event emissions

**Edge Cases:**
- ✅ Insufficient vault balance
- ✅ Plan constraints (min/max amounts)
- ✅ Deposit status transitions
- ✅ Reentrancy protection
- ✅ Zero amounts & edge values

### Run Tests

```bash
# All tests
npm test

# Specific test suite
npm test -- --grep "withdrawAtMaturity"

# With gas report
REPORT_GAS=true npm test

# Watch mode
npm test -- --watch
```

### Sample Output

```
  SavingCore - Core Functionality
    ✓ Should create a plan (89ms)
    ✓ Should open deposit and mint NFT (156ms)
    ✓ Should calculate interest correctly (234ms)
    ✓ Should withdraw at maturity (187ms)
    ✓ Should apply penalty on early withdraw (198ms)
    
  75 passing (4s)
```

---

## 🚀 Deployment

### Sepolia Testnet (Live)

**Deployed:** January 2026  
**Network:** Ethereum Sepolia Testnet  
**Status:** ✅ Verified & Operational

**Deployment Info:**
- **Deployment file:** `deployments/sepolia/*.json`
- **ABIs:** `data/abi/contracts/`
- **Configuration:** See `deployment.json`

### Deploy to New Network

```bash
# 1. Set environment variables
cp .env.example .env
# Edit .env with your keys

# 2. Deploy contracts
npx hardhat run deploy/deploy.ts --network <network>

# 3. Verify on Etherscan
npx hardhat run scripts/verify-contracts.ts --network <network>

# 4. Create plans
npx hardhat run scripts/create-plans-sepolia.ts --network <network>
```

### Verification Checklist

Run comprehensive verification:
```bash
npx hardhat run scripts/verify-sepolia-deployment.ts --network sepolia
```

**Checks:**
- ✅ Contract deployments
- ✅ Contract linkages
- ✅ Owner permissions
- ✅ Initial balances
- ✅ Plan configurations
- ✅ Vault funding
- ✅ NFT metadata

---

## 🛠️ Scripts & Tools

### Core Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `generate-ipfs-metadata.ts` | Generate NFT metadata | `npx hardhat run scripts/generate-ipfs-metadata.ts` |
| `upload-to-pinata.ts` | Upload to IPFS | `npx hardhat run scripts/upload-to-pinata.ts --network sepolia` |
| `update-base-uri.ts` | Update NFT URI | `$env:NEW_BASE_URI="ipfs://..."; npx hardhat run scripts/update-base-uri.ts --network sepolia` |
| `prepare-ipfs-deploy.ts` | All-in-one IPFS setup | `npx hardhat run scripts/prepare-ipfs-deploy.ts` |
| `verify-contracts.ts` | Verify deployments | `npx hardhat run scripts/verify-contracts.ts --network sepolia` |
| `create-plans-sepolia.ts` | Create savings plans | `npx hardhat run scripts/create-plans-sepolia.ts --network sepolia` |
| `user-journey-test.ts` | E2E user flow test | `npx hardhat run scripts/user-journey-test.ts --network sepolia` |

### Utility Scripts

```bash
# Extract ABIs for frontend
npx hardhat run scripts/extract-abis.ts

# View plans
npx hardhat run scripts/view-plans.ts --network sepolia

# Admin operations
npx hardhat run scripts/admin-dashboard.ts --network sepolia
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file:

```bash
# Network RPC
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Private Keys (TESTNET ONLY!)
TESTNET_PRIVATE_KEY=0x...

# Etherscan Verification
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

# Pinata IPFS
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Gas Reporting
REPORT_GAS=false

# Contract Addresses (auto-populated after deploy)
VITE_USDC_ADDRESS=0x...
VITE_VAULT_MANAGER_ADDRESS=0x...
VITE_SAVING_LOGIC_ADDRESS=0x...
VITE_DEPOSIT_CERTIFICATE_ADDRESS=0x...
```

### Hardhat Config

Key settings in `hardhat.config.ts`:
- **Solidity:** 0.8.28
- **Optimizer:** Enabled (1000 runs)
- **Networks:** localhost, hardhat, sepolia
- **Typechain:** Full TypeScript bindings

### Frontend Config

Frontend environment (`.env` in `term-deposit-dapp/`):
```bash
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_USDC_ADDRESS=0xd69e72f35E8C4226Ff05D13644C7f345AaBCC941
VITE_VAULT_MANAGER_ADDRESS=0xA9E8f70EDE7932d3Caa7FE66BA2dc5840b6aA315
VITE_SAVING_LOGIC_ADDRESS=0x81B8b301ff4193e0DFD8b6044552B621830B6a44
VITE_DEPOSIT_CERTIFICATE_ADDRESS=0xd50edbc6973d891B95Eb2087a1a13b620440B3e3
```

---

## 🔒 Security

### Audit Status

- ✅ **Unit tested:** 75 tests passing
- ✅ **Manual review:** Architecture & access control
- ⚠️ **External audit:** Recommended before mainnet
- ✅ **OpenZeppelin libraries:** Battle-tested contracts

### Security Features

**Access Control:**
- ✅ Ownable pattern for admin functions
- ✅ Role-based permissions
- ✅ Owner-only plan management
- ✅ Owner-only vault operations

**Safety Mechanisms:**
- ✅ Pausable vault (emergency stop)
- ✅ Reentrancy protection
- ✅ SafeERC20 for token transfers
- ✅ Input validation & bounds checking

**Snapshot Protection:**
- ✅ APR locked at deposit open
- ✅ Penalty rate locked at deposit open
- ✅ Admin changes don't affect existing deposits

**Best Practices:**
- ✅ CEI pattern (Checks-Effects-Interactions)
- ✅ Fail-fast validation
- ✅ Event emissions for off-chain tracking
- ✅ Minimal external calls

### Known Limitations

- ⚠️ No upgradability pattern (by design for simplicity)
- ⚠️ Simple interest only (no compound interest)
- ⚠️ Fixed penalty rate per plan
- ⚠️ Centralized admin (consider DAO for production)

---

## 📚 Documentation

### Core Documents

- **[Plan.md](documents/Plan.md)** - Product roadmap & milestones
- **[REQUIREMENTS.md](documents/REQUIREMENTS.md)** - Functional requirements
- **[QUICKSTART.md](documents/QUICKSTART.md)** - Getting started guide
- **[Day5-Guide.md](documents/Day5-Guide.md)** - Development journal
- **[IPFS_DEPLOY_GUIDE.md](IPFS_DEPLOY_GUIDE.md)** - NFT metadata deployment
- **[NFT_METADATA_GUIDE.md](NFT_METADATA_GUIDE.md)** - Metadata architecture

### API Documentation

**Smart Contracts:**
- See Natspec comments in `contracts/interfaces/`
- TypeScript types in `typechain/`

**Frontend:**
- Hook documentation in `term-deposit-dapp/src/hooks/`
- Service layer in `term-deposit-dapp/src/services/`

---

## 📐 Math & Economics

### Interest Calculation

**Simple Interest Formula:**
```
interest = (principal × aprBps × durationSeconds) / (365 days × 10,000)
```

**Example:**
- Principal: 1,000 USDC
- APR: 500 bps (5%)
- Duration: 30 days
- Interest: 1,000 × 500 × 2,592,000 / (31,536,000 × 10,000) = 4.11 USDC

### Penalty Calculation

**Penalty Formula:**
```
penalty = (principal × penaltyBps) / 10,000
```

**Example:**
- Principal: 1,000 USDC
- Penalty: 2000 bps (20%)
- Penalty: 1,000 × 2,000 / 10,000 = 200 USDC

### APR Units

- **1 bps** = 0.01%
- **100 bps** = 1%
- **500 bps** = 5% (typical plan)
- **10,000 bps** = 100% (max)

---

## 🎯 Roadmap

### ✅ Completed

- [x] Smart contract development
- [x] Comprehensive testing suite
- [x] Sepolia deployment
- [x] React frontend
- [x] NFT certificates
- [x] IPFS metadata
- [x] Admin dashboard
- [x] Event-based queries
- [x] Documentation

### 🚧 In Progress

- [ ] External security audit
- [ ] Gas optimization review
- [ ] Enhanced UI/UX
- [ ] Mobile responsiveness improvements

### 🔮 Future Enhancements

- [ ] Compound interest option
- [ ] Flexible penalty tiers
- [ ] Governance token integration
- [ ] Multi-token support (DAI, USDT)
- [ ] Referral system
- [ ] Staking rewards
- [ ] Cross-chain deployment

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Write tests for new features
4. Ensure all tests pass: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open Pull Request

### Code Standards

- **Solidity:** Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- **TypeScript:** Use Prettier + ESLint
- **Tests:** Achieve >80% coverage for new code
- **Commits:** Use [Conventional Commits](https://www.conventionalcommits.org/)

### Testing Requirements

```bash
# Before submitting PR
npm run compile
npm test
npm run lint
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- **OpenZeppelin** - Secure smart contract libraries
- **Hardhat** - Ethereum development environment
- **React** - UI framework
- **Pinata** - IPFS pinning service
- **Ethereum Community** - Inspiration & support

---

## 📬 Contact

**Tran Anh Thu**

[![Gmail](https://img.shields.io/badge/Gmail-trananhthu270904%40gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:trananhthu270904@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-ThuHoiBao-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/ThuHoiBao)

---

<div align="center">

**Built with ❤️ for the Ethereum ecosystem**

[⬆ Back to Top](#-term-deposit-dapp---decentralized-savings-protocol)

</div>

