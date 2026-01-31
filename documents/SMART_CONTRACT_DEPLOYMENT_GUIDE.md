# 📘 HƯỚNG DẪN DEPLOY SMART CONTRACTS VÀ SCRIPTS

**Project:** Term Deposit DApp - Smart Contract Deployment  
**Version:** 2.0  
**Date:** January 31, 2026  
**Network:** Ethereum Sepolia Testnet

---

## 📋 MỤC LỤC

1. [Tổng Quan](#tổng-quan)
2. [Giải Thích Deployment Scripts](#giải-thích-deployment-scripts)
3. [Hướng Dẫn Deploy Contracts](#hướng-dẫn-deploy-contracts)
4. [Hướng Dẫn Scripts](#hướng-dẫn-scripts)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 TỔNG QUAN

### Cấu Trúc Deployment

```
AC-capstone-save-banking/
├── deploy/
│   ├── deploy-v2-sepolia.ts      # Deploy tất cả contracts lần đầu
│   └── complete-setup.ts          # Kết nối contracts đã deploy
│
└── scripts/
    ├── 1-admin-create-plans.ts    # Tạo savings plans
    ├── 2-user-open-deposit.ts     # Test mở deposit
    ├── 3-user-withdraw.ts         # Test withdraw
    ├── update-base-uri.ts         # Update NFT metadata URI
    ├── verify-metadata.ts         # Verify NFT metadata
    └── verify-all-contracts.ts    # Verify contracts trên Etherscan
```

### Workflow Deployment

```
1. Deploy Contracts (deploy-v2-sepolia.ts)
   ↓
2. Verify Contracts (verify-all-contracts.ts)
   ↓
3. Create Plans (1-admin-create-plans.ts)
   ↓
4. Update NFT URI (update-base-uri.ts)
   ↓
5. Test System (2-user-open-deposit.ts, 3-user-withdraw.ts)
```

---

## 📜 GIẢI THÍCH DEPLOYMENT SCRIPTS

### 1. `deploy-v2-sepolia.ts` - Deploy Toàn Bộ Hệ Thống

**Mục đích:** Deploy tất cả smart contracts lên Sepolia testnet lần đầu tiên.

#### Chi Tiết Từng Bước:

```typescript
// ========== BƯỚC 1: Deploy MockUSDC ==========
const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
const mockUSDC = await MockUSDCFactory.deploy(deployer.address);
```

**Giải thích:**
- Deploy token USDC giả để test trên Sepolia
- `deployer.address` = owner của contract
- Có 6 decimals như USDC thật
- Initial supply: 1,000,000 USDC

---

```typescript
// ========== BƯỚC 2: Deploy DepositCertificate (NFT) ==========
const depositCertificate = await DepositCertificateFactory.deploy(
    deployer.address,
    "https://metadata.example.com/deposit/" // Placeholder
);
```

**Giải thích:**
- Deploy ERC-721 NFT contract cho deposit certificates
- `deployer.address` = owner
- `baseURI` = placeholder, sẽ update sau khi deploy metadata API
- Mỗi deposit sẽ được mint 1 NFT certificate

---

```typescript
// ========== BƯỚC 3: Deploy DepositVault ==========
const depositVault = await DepositVaultFactory.deploy(
    usdcAddress,
    deployer.address
);
```

**Giải thích:**
- **QUAN TRỌNG:** Contract này giữ TẤT CẢ tiền của users
- Tách biệt hoàn toàn với business logic
- Chỉ SavingLogic được phép rút tiền ra
- Security: Funds isolation

---

```typescript
// ========== BƯỚC 4: Deploy VaultManager ==========
const vaultManager = await VaultManagerFactory.deploy(
    usdcAddress,
    deployer.address, // feeReceiver (nhận penalty)
    deployer.address  // owner
);
```

**Giải thích:**
- Quản lý interest pool (tiền lãi)
- `feeReceiver` = địa chỉ nhận penalty khi early withdraw
- Admin fund USDC vào đây để trả lãi
- Có thể pause trong trường hợp khẩn cấp

---

```typescript
// ========== BƯỚC 5: Deploy SavingLogic ==========
const savingLogic = await SavingLogicFactory.deploy(
    usdcAddress,
    certificateAddress,
    vaultAddress,
    vaultManagerAddress,
    deployer.address
);
```

**Giải thích:**
- **Core business logic** của hệ thống
- **KHÔNG giữ tiền** - chỉ điều phối
- Dependency injection: nhận tất cả addresses
- Xử lý: create plan, open deposit, withdraw, renew

---

```typescript
// ========== BƯỚC 6: Kết Nối Contracts ==========
await depositVault.setSavingLogic(logicAddress);
await depositCertificate.setSavingLogic(logicAddress);
await vaultManager.setSavingLogic(logicAddress);
```

**Giải thích:**
- **Cực kỳ quan trọng!** Authorize SavingLogic
- DepositVault: Cho phép SavingLogic rút tiền
- DepositCertificate: Cho phép SavingLogic mint NFT
- VaultManager: Cho phép SavingLogic request interest

**⚠️ Nếu bỏ qua bước này:** Hệ thống sẽ KHÔNG hoạt động!

---

```typescript
// ========== BƯỚC 7: Fund VaultManager ==========
const interestFund = ethers.parseUnits("50000", 6); // 50,000 USDC
await mockUSDC.approve(vaultManagerAddress, interestFund);
await vaultManager.fundVault(interestFund);
```

**Giải thích:**
- Admin nạp 50,000 USDC vào interest pool
- Tiền này dùng để trả lãi cho users
- Cần approve trước khi transfer
- Có thể fund thêm sau bằng `fundVault()`

---

#### Output Của Script:

```
✅ MockUSDC deployed: 0x73a9...20BA
✅ DepositCertificate deployed: 0x2A4A...0AB4
✅ DepositVault deployed: 0x077a...7B06  ← USER FUNDS HERE
✅ VaultManager deployed: 0xFf58...e136
✅ SavingLogic deployed: 0xddED...FEAb

🔗 Connections:
✅ DepositVault ↔ SavingLogic
✅ DepositCertificate ↔ SavingLogic
✅ VaultManager ↔ SavingLogic
```

---

### 2. `complete-setup.ts` - Kết Nối Contracts Đã Deploy

**Mục đích:** Dùng khi deployment bị gián đoạn ở bước kết nối, hoặc cần re-connect contracts.

#### Khi Nào Dùng Script Này?

1. **Deployment bị fail** ở bước 6 (connections)
2. **Cần update** SavingLogic address
3. **Re-fund** VaultManager
4. **Verify connections** sau khi deploy

#### Chi Tiết:

```typescript
// Hardcoded addresses của contracts đã deploy
const USDC_ADDRESS = "0x73a9bEc9B836007904A19C30B2FD9B2f7A6720BA";
const CERTIFICATE_ADDRESS = "0x2A4A34e3C69D862e1dAA94C64C5747f022160AB4";
const DEPOSIT_VAULT_ADDRESS = "0x077a4941565e0194a00Cd8DABE1acA09111F7B06";
const VAULT_MANAGER_ADDRESS = "0xFf586ADCE68Ed8f0FcfbFA268Ba81E438900e136";
const SAVING_LOGIC_ADDRESS = "0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb";
```

**Giải thích:**
- Sử dụng addresses đã deploy trước đó
- Không deploy lại contracts
- Chỉ setup connections

---

```typescript
// Kiểm tra trước khi set
const currentLogic = await depositVault.savingLogic();
if (currentLogic === SAVING_LOGIC_ADDRESS) {
    console.log("Already set correctly");
} else {
    await depositVault.setSavingLogic(SAVING_LOGIC_ADDRESS);
}
```

**Giải thích:**
- **Idempotent**: Kiểm tra trước khi thực hiện
- Tránh waste gas nếu đã set rồi
- Safe để chạy nhiều lần

---

```typescript
// Auto mint USDC nếu thiếu
if (deployerBalance < fundAmount) {
    await usdc.mint(deployer.address, fundAmount);
}
```

**Giải thích:**
- Tự động mint USDC nếu deployer không đủ
- Chỉ hoạt động với MockUSDC (testnet)
- Production sẽ cần mua USDC thật

---

#### Khi Nào Dùng?

| Tình Huống | Dùng Script |
|------------|-------------|
| Deploy lần đầu | `deploy-v2-sepolia.ts` |
| Deployment bị fail ở bước 6-7 | `complete-setup.ts` |
| Cần re-connect contracts | `complete-setup.ts` |
| Update SavingLogic address | `complete-setup.ts` |
| Re-fund VaultManager | `complete-setup.ts` |

---

## 🚀 HƯỚNG DẪN DEPLOY CONTRACTS

### Bước 1: Chuẩn Bị

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env
cp .env.example .env

# 3. Cấu hình .env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
TESTNET_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

**Lấy Sepolia RPC URL:**
- Truy cập [alchemy.com](https://www.alchemy.com/)
- Tạo app mới → Chọn Sepolia
- Copy API URL

**Lấy Private Key:**
```bash
# MetaMask: Settings → Security & Privacy → Show Private Key
# ⚠️ KHÔNG share private key với ai!
```

**Lấy Etherscan API Key:**
- Truy cập [etherscan.io/myapikey](https://etherscan.io/myapikey)
- Tạo API key mới

---

### Bước 2: Deploy Contracts

```bash
# Deploy tất cả contracts
npx hardhat run deploy/deploy-v2-sepolia.ts --network sepolia
```

**Output mong đợi:**
```
🚀 Deploying v2.0 Architecture to Sepolia...

1️⃣ Deploying MockUSDC...
   ✅ MockUSDC deployed: 0x73a9...

2️⃣ Deploying DepositCertificate...
   ✅ DepositCertificate deployed: 0x2A4A...

3️⃣ Deploying DepositVault...
   ✅ DepositVault deployed: 0x077a...

4️⃣ Deploying VaultManager...
   ✅ VaultManager deployed: 0xFf58...

5️⃣ Deploying SavingLogic...
   ✅ SavingLogic deployed: 0xddED...

6️⃣ Connecting contracts...
   ✅ All connections complete

7️⃣ Funding VaultManager...
   ✅ VaultManager funded with 50,000 USDC

🎉 DEPLOYMENT COMPLETE
```

**Thời gian:** ~5-10 phút

---

### Bước 3: Lưu Addresses

Copy addresses vào file `.env` của frontend:

```bash
# term-deposit-dapp/.env
VITE_MOCK_USDC_ADDRESS=0x73a9bEc9B836007904A19C30B2FD9B2f7A6720BA
VITE_DEPOSIT_CERTIFICATE_ADDRESS=0x2A4A34e3C69D862e1dAA94C64C5747f022160AB4
VITE_DEPOSIT_VAULT_ADDRESS=0x077a4941565e0194a00Cd8DABE1acA09111F7B06
VITE_VAULT_MANAGER_ADDRESS=0xFf586ADCE68Ed8f0FcfbFA268Ba81E438900e136
VITE_SAVING_LOGIC_ADDRESS=0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb
```

---

### Bước 4: Verify Contracts trên Etherscan

```bash
npx hardhat run scripts/verify-all-contracts.ts --network sepolia
```

**Tại sao cần verify?**
- ✅ Users có thể đọc source code
- ✅ Tăng trust và transparency
- ✅ Etherscan hiển thị functions
- ✅ Có thể interact trực tiếp trên Etherscan

---

## 📝 HƯỚNG DẪN SCRIPTS

### 1. `1-admin-create-plans.ts` - Tạo Savings Plans

**Mục đích:** Tạo các gói tiết kiệm với APR, tenor, limits khác nhau.

```bash
npx hardhat run scripts/1-admin-create-plans.ts --network sepolia
```

**Chức năng:**
- Tạo 5 plans: 7 days, 30 days, 90 days, 180 days, 365 days
- APR từ 3% đến 12%
- Min/Max deposit limits
- Penalty 20% cho early withdrawal

**Output:**
```
✅ Plan 0 created: 7 days, 3% APR
✅ Plan 1 created: 30 days, 5% APR
✅ Plan 2 created: 90 days, 8% APR
✅ Plan 3 created: 180 days, 10% APR
✅ Plan 4 created: 365 days, 12% APR
```

**Khi nào chạy:**
- Sau khi deploy contracts
- Khi cần thêm plans mới
- Khi update APR rates

---

### 2. `2-user-open-deposit.ts` - Test Mở Deposit

**Mục đích:** Test flow mở deposit như một user.

```bash
npx hardhat run scripts/2-user-open-deposit.ts --network sepolia
```

**Chức năng:**
1. Mint USDC cho user
2. Approve SavingLogic
3. Open deposit với plan ID
4. Verify NFT certificate được mint

**Output:**
```
💰 User balance: 1000 USDC
✅ Approved SavingLogic
🎫 Opening deposit: 100 USDC, Plan 1 (30 days)
✅ Deposit opened! ID: 1
🎨 NFT Certificate minted to user
```

**Khi nào chạy:**
- Test sau khi deploy
- Verify deposit flow hoạt động
- Debug issues

---

### 3. `3-user-withdraw.ts` - Test Withdraw

**Mục đích:** Test flow withdraw at maturity.

```bash
npx hardhat run scripts/3-user-withdraw.ts --network sepolia
```

**Chức năng:**
1. Kiểm tra deposit đã matured
2. Calculate interest
3. Withdraw principal + interest
4. Verify balance updated

**Output:**
```
📊 Deposit Info:
   Principal: 100 USDC
   Maturity: 2026-02-30
   Status: Active

💰 Calculated Interest: 0.41 USDC
✅ Withdrawn: 100.41 USDC
```

**⚠️ Lưu ý:**
- Chỉ withdraw được khi đã matured
- Nếu chưa matured, dùng `earlyWithdraw()` (có penalty)

---

### 4. `update-base-uri.ts` - Update NFT Metadata URI

**Mục đích:** Update baseURI của NFT certificates để point đến metadata API.

```bash
npx hardhat run scripts/update-base-uri.ts --network sepolia
```

**Chức năng:**
1. Connect to DepositCertificate contract
2. Update baseURI to Vercel API URL
3. Verify update successful

**Cấu hình:**
```typescript
// Sửa URL này thành Vercel API của bạn
const NEW_BASE_URI = "https://your-metadata-api.vercel.app/api/metadata/";
```

**Output:**
```
📝 Current baseURI: https://metadata.example.com/deposit/
🔄 Updating to: https://your-api.vercel.app/api/metadata/
✅ BaseURI updated!
```

**Khi nào chạy:**
- Sau khi deploy metadata API lên Vercel
- Khi thay đổi API URL

---

### 5. `verify-metadata.ts` - Verify NFT Metadata

**Mục đích:** Test NFT metadata endpoints hoạt động đúng.

```bash
npx hardhat run scripts/verify-metadata.ts --network sepolia
```

**Chức năng:**
1. Get baseURI from contract
2. Fetch metadata từ API
3. Verify JSON format đúng ERC-721 standard
4. Check SVG image có render được

**Output:**
```
🔍 Testing NFT Metadata...

📝 BaseURI: https://your-api.vercel.app/api/metadata/
🎫 Testing Token ID: 1

✅ Metadata fetched successfully
✅ JSON format valid
✅ Image field present
✅ Attributes present

Sample metadata:
{
  "name": "Term Deposit Certificate #1",
  "description": "Certificate of ownership...",
  "image": "data:image/svg+xml;base64,...",
  "attributes": [...]
}
```

**Khi nào chạy:**
- Sau khi update baseURI
- Verify metadata API hoạt động
- Debug NFT display issues

---

### 6. `verify-all-contracts.ts` - Verify Contracts

**Mục đích:** Verify source code của tất cả contracts trên Etherscan.

```bash
npx hardhat run scripts/verify-all-contracts.ts --network sepolia
```

**Chức năng:**
- Verify MockUSDC
- Verify DepositCertificate
- Verify DepositVault
- Verify VaultManager
- Verify SavingLogic

**Output:**
```
✅ MockUSDC verified
✅ DepositCertificate verified
✅ DepositVault verified
✅ VaultManager verified
✅ SavingLogic verified

🔗 View on Etherscan:
https://sepolia.etherscan.io/address/0x73a9...
```

**Khi nào chạy:**
- Ngay sau khi deploy contracts
- Nếu verify fail lần đầu, chạy lại

---

## 🔧 TROUBLESHOOTING

### Lỗi 1: "Insufficient funds for gas"

**Nguyên nhân:** Không đủ Sepolia ETH

**Giải pháp:**
```bash
# Lấy Sepolia ETH từ faucet
https://sepoliafaucet.com/
https://www.alchemy.com/faucets/ethereum-sepolia
```

---

### Lỗi 2: "Nonce too high"

**Nguyên nhân:** Hardhat cache bị lỗi

**Giải pháp:**
```bash
npx hardhat clean
rm -rf cache
rm -rf artifacts
```

---

### Lỗi 3: "Contract already verified"

**Nguyên nhân:** Contract đã được verify rồi

**Giải pháp:**
- Bỏ qua, không cần verify lại
- Hoặc xóa dòng verify contract đó trong script

---

### Lỗi 4: "Transaction underpriced"

**Nguyên nhân:** Gas price quá thấp

**Giải pháp:**
```typescript
// Thêm gasPrice cao hơn
const tx = await contract.function({
  gasPrice: ethers.parseUnits("50", "gwei")
});
```

---

### Lỗi 5: "Execution reverted: OnlySavingLogic"

**Nguyên nhân:** Chưa chạy `complete-setup.ts`

**Giải pháp:**
```bash
npx hardhat run deploy/complete-setup.ts --network sepolia
```

---

## 📊 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] `.env` file configured
- [ ] Có Sepolia ETH trong wallet
- [ ] Có Etherscan API key
- [ ] Code đã test trên local

### Deployment
- [ ] Run `deploy-v2-sepolia.ts`
- [ ] Lưu contract addresses
- [ ] Run `verify-all-contracts.ts`
- [ ] Verify trên Etherscan thành công

### Post-Deployment
- [ ] Run `1-admin-create-plans.ts`
- [ ] Update frontend `.env` với addresses
- [ ] Deploy metadata API lên Vercel
- [ ] Run `update-base-uri.ts`
- [ ] Run `verify-metadata.ts`

### Testing
- [ ] Run `2-user-open-deposit.ts`
- [ ] Run `3-user-withdraw.ts`
- [ ] Test trên frontend
- [ ] Verify NFT trên Etherscan

---

## 🎯 WORKFLOW HOÀN CHỈNH

```bash
# 1. Deploy contracts
npx hardhat run deploy/deploy-v2-sepolia.ts --network sepolia

# 2. Verify contracts
npx hardhat run scripts/verify-all-contracts.ts --network sepolia

# 3. Create plans
npx hardhat run scripts/1-admin-create-plans.ts --network sepolia

# 4. Update frontend .env với contract addresses

# 5. Deploy metadata API lên Vercel

# 6. Update NFT baseURI
npx hardhat run scripts/update-base-uri.ts --network sepolia

# 7. Verify metadata
npx hardhat run scripts/verify-metadata.ts --network sepolia

# 8. Test deposit flow
npx hardhat run scripts/2-user-open-deposit.ts --network sepolia

# 9. Test withdraw flow (sau khi matured)
npx hardhat run scripts/3-user-withdraw.ts --network sepolia
```

---

## 📚 TÀI LIỆU THAM KHẢO

- [Hardhat Documentation](https://hardhat.org/docs)
- [Etherscan Verify](https://docs.etherscan.io/tutorials/verifying-contracts-programmatically)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Dashboard](https://dashboard.alchemy.com/)

---

**Document Version:** 1.0  
**Last Updated:** January 31, 2026  
**Author:** Tran Anh Thu
