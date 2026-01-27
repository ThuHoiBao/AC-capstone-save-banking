# 🚀 Deployment Guide - SavingsPool Contract

Hướng dẫn triển khai contract SavingsPool trên Sepolia Testnet.

## 📋 Prerequisites

Đảm bảo đã cài đặt tất cả dependencies:
```bash
yarn install
```

Kiểm tra `.env` file có các biến cần thiết:
```env
TESTNET_PRIVATE_KEY=0x...  # Private key với ETH trên Sepolia
SEPOLIA_RPC_URL=https://...  # RPC URL
ETHERSCAN_API=...  # (Optional) Etherscan API key để verify
```

## 🔧 Step 1: Compile Contracts

```bash
yarn compile
```

✅ Tất cả contract sẽ được biên dịch vào `artifacts/` và `typechain/`

## 🌐 Step 2: Deploy to Sepolia

### Deploy SavingsPool + MockUSDC
```bash
npx hardhat run deploy/deploy.ts --network sepolia
```

**Output**:
```
========================================
Network: sepolia
Deployer: 0x...
========================================

📦 Deploying MockUSDC...
✅ MockUSDC deployed to: 0x...

📦 Deploying SavingsPool...
✅ SavingsPool deployed to: 0x...

📝 Deployment info saved to: data/deployments-sepolia.json
```

**File được tạo**: `data/deployments-sepolia.json`
```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "deployer": "0x...",
  "timestamp": "2024-01-25T...",
  "contracts": {
    "MockUSDC": {
      "address": "0x...",
      "tokenDecimals": 6
    },
    "SavingsPool": {
      "address": "0x...",
      "mockUSDC": "0x...",
      "feeReceiver": "0x..."
    }
  }
}
```

## 🧪 Step 3: Test Deployed Contracts

### Verify Contracts on Sepolia
```bash
npx hardhat run scripts/test.ts --network sepolia
```

**Các kiểm tra**:
- ✅ MockUSDC: name, symbol, decimals, totalSupply
- ✅ SavingsPool: token, owner, feeReceiver, vaultBalance
- ✅ Create Plan: tạo gói tiết kiệm test (90 days, 5% APR)
- ✅ Fund Vault: nạp tiền test vào vault
- ✅ Generate test report

**Output**: 
```
========================================
✅ Testing Deployed Contracts
========================================

✅ Contract Instances Created
✅ Name: Mock USDC
✅ Decimals: 6
✅ Token: 0x...
✅ Vault Balance: 100 USDC

✅ All Tests Completed!
📝 Test report saved to: data/test-report-sepolia.json
```

## 📊 Step 4: View ABI & Data

### Contract ABIs (tự động tạo)
```
data/abi/
├── MockUSDC.json
├── SavingsPool.json
└── ...
```

Sử dụng ABI để tương tác với contract qua web3.js, ethers.js, hoặc các công cụ khác.

### Deployment Data
```bash
# Xem deployment info
cat data/deployments-sepolia.json

# Xem test report
cat data/test-report-sepolia.json
```

## 🔗 Interact with Contract

### Qua Hardhat Console
```bash
npx hardhat console --network sepolia
```

```javascript
// Load contracts
const MockUSDC = await ethers.getContractAt("MockUSDC", "0x...");
const SavingsPool = await ethers.getContractAt("SavingsPool", "0x...");

// Get info
await MockUSDC.balanceOf("0x...");
await SavingsPool.getPlan(1);

// Mint token
await MockUSDC.mintSelf(ethers.parseUnits("1000", 6));

// Create plan
await SavingsPool.createPlan(
  90,                          // 90 days
  500,                         // 5% APR
  ethers.parseUnits("100", 6), // min 100 USDC
  ethers.parseUnits("10000", 6), // max 10,000 USDC
  200                          // 2% early withdraw penalty
);
```

### Qua Etherscan (Read/Write)
1. Truy cập: https://sepolia.etherscan.io/address/0x...
2. Chuyển sang tab "Read Contract" hoặc "Write Contract"
3. Connect MetaMask wallet
4. Gọi hàm directly

## 📝 Contract Functions

### Admin Functions (Owner Only)
```solidity
// Tạo gói tiết kiệm mới
createPlan(tenorDays, aprBps, minDeposit, maxDeposit, earlyWithdrawPenaltyBps) → uint256 planId

// Cập nhật gói
updatePlan(planId, aprBps, enabled)

// Nạp tiền vào vault
fundVault(amount)

// Rút tiền từ vault
withdrawVault(amount)

// Đặt địa chỉ nhận phí
setFeeReceiver(address)

// Tạm dừng/mở hệ thống
pause()
unpause()
```

### User Functions
```solidity
// Mở sổ tiết kiệm
openDeposit(planId, amount) → uint256 depositId

// Rút tiền đúng hạn
withdrawAtMaturity(depositId)

// Rút tiền sớm (chịu phạt)
earlyWithdraw(depositId)

// Gia hạn sổ tiết kiệm
renew(oldDepositId, newPlanId, includeInterest) → uint256 newDepositId
```

### View Functions
```solidity
getPlan(planId) → SavingPlan
getDeposit(depositId) → Deposit
getUserDeposits(address) → uint256[]
getUserDepositCount(address) → uint256
calculateInterest(depositId) → uint256
isMatured(depositId) → bool
```

## ⚠️ Important Notes

1. **Private Key**: KHÔNG commit `.env` file vào git
2. **Test Network**: Luôn test trên Sepolia trước khi mainnet
3. **Gas**: Xem gas usage: `REPORT_GAS=true yarn test`
4. **Verify**: Verify contract trên Etherscan (manual hoặc script)

## 🔍 Verify on Etherscan

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

Ví dụ SavingsPool:
```bash
npx hardhat verify --network sepolia 0x... 0x<USDC_ADDRESS> 6 0x<FEE_RECEIVER>
```

## 📞 Troubleshooting

### "Insufficient balance"
- Cần ETH trên Sepolia testnet
- Lấy từ: https://sepoliafaucet.com

### "Contract at address does not have bytecode"
- Contract chưa deploy hoặc đã có vấn đề
- Kiểm tra deployment tx: https://sepolia.etherscan.io

### "Private key format invalid"
- Đảm bảo key bắt đầu với `0x` và có độ dài 66 ký tự
- Không bao gồm dấu ngoặc kép trong `.env`

---

**Created**: 2024-01-25  
**Network**: Sepolia (Chain ID: 11155111)
