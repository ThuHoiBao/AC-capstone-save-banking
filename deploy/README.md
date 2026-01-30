# Deployment Guide - v2.0 Architecture

## 📋 Prerequisites

1. **Sepolia ETH**: Get from [Sepolia Faucet](https://sepoliafaucet.com/)
2. **Private Key**: Set in `.env` file
3. **Etherscan API Key**: For contract verification

## 🚀 Deployment Steps

### Step 1: Deploy Contracts

```bash
npx hardhat run deploy/deploy-v2-sepolia.ts --network sepolia
```

**This will deploy:**
- ✅ MockUSDC (test token)
- ✅ DepositCertificate (NFT for deposits)
- ✅ DepositVault (custody contract - holds user funds)
- ✅ VaultManager (interest pool)
- ✅ SavingLogic (business logic)

**Output:**
```
📋 Contract Addresses:
   MockUSDC:            0x...
   DepositCertificate:  0x...
   DepositVault:        0x... ← USER FUNDS HERE
   VaultManager:        0x...
   SavingLogic:         0x...
```

### Step 2: Save Addresses to .env

Copy output and create/update `.env`:

```env
# Network
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_key

# Contract Addresses (update after deployment)
USDC_ADDRESS=0x...
CERTIFICATE_ADDRESS=0x...
DEPOSIT_VAULT_ADDRESS=0x...
VAULT_MANAGER_ADDRESS=0x...
SAVING_LOGIC_ADDRESS=0x...
```

### Step 3: Verify Contracts

**Option A: Manual verification (one by one)**

```bash
npx hardhat verify --network sepolia <USDC_ADDRESS> <DEPLOYER_ADDRESS>

npx hardhat verify --network sepolia <CERTIFICATE_ADDRESS> <DEPLOYER_ADDRESS> "https://metadata.example.com/deposit/"

npx hardhat verify --network sepolia <DEPOSIT_VAULT_ADDRESS> <USDC_ADDRESS> <DEPLOYER_ADDRESS>

npx hardhat verify --network sepolia <VAULT_MANAGER_ADDRESS> <USDC_ADDRESS> <DEPLOYER_ADDRESS> <DEPLOYER_ADDRESS>

npx hardhat verify --network sepolia <SAVING_LOGIC_ADDRESS> <USDC_ADDRESS> <CERTIFICATE_ADDRESS> <DEPOSIT_VAULT_ADDRESS> <VAULT_MANAGER_ADDRESS> <DEPLOYER_ADDRESS>
```

**Option B: Automated verification (all at once)**

1. Update addresses in `scripts/verify-all-contracts.ts`
2. Run:
```bash
npx hardhat run scripts/verify-all-contracts.ts --network sepolia
```

### Step 4: Test Deployment

```bash
# 1. Admin creates plans
npx hardhat run scripts/1-admin-create-plans.ts --network sepolia

# 2. User opens deposit
npx hardhat run scripts/2-user-open-deposit.ts --network sepolia

# 3. User withdraws at maturity
npx hardhat run scripts/3-user-withdraw-maturity.ts --network sepolia

# OR: User withdraws early (with penalty)
npx hardhat run scripts/4-user-withdraw-early.ts --network sepolia
```

## 📊 Architecture Overview

```
User Funds Flow (v2.0):
  User → approve(DepositVault) ← CRITICAL CHANGE
       → SavingLogic.openDeposit()
            → DepositVault.deposit() ← Funds stored here
            → DepositCertificate.mint() ← NFT to user

Withdrawal Flow:
  User → SavingLogic.withdrawAtMaturity()
       → DepositVault.withdraw() ← Funds released
       → VaultManager.payoutInterest()
       → User receives principal + interest
```

## ⚠️ Critical Security Notes

### For Users:
- ✅ **APPROVE DepositVault**, NOT SavingLogic
- ✅ User funds are isolated in DepositVault
- ✅ SavingLogic NEVER holds user funds

### For Developers:
- ✅ DepositVault is custody only (minimal attack surface)
- ✅ Admin can upgrade SavingLogic without moving funds
- ✅ Each contract follows Single Responsibility Principle

## 🔧 Troubleshooting

**Error: "Insufficient funds"**
- Get more Sepolia ETH from faucet

**Error: "Already Verified"**
- Contract already verified on Etherscan ✅

**Error: "USDC_ADDRESS not set"**
- Update contract addresses in scripts after deployment

**Error: "NotYetMatured"**
- Wait until maturity date or use early withdrawal

**Error: "DepositNotFound"**
- Run script 2 first to create a deposit

## 📝 Next Steps

After deployment:
1. ✅ Update frontend `.env` with new addresses
2. ✅ Update frontend to approve DepositVault (not SavingLogic)
3. ✅ Test full user flow on Sepolia
4. ✅ Deploy to mainnet (with real USDC address)

## 🔗 Resources

- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Architecture Docs](../documents/ARCHITECTURE.md)
- [Test Coverage](../test/)
