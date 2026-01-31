# Admin Dashboard Testing Guide

## ✅ Đã hoàn thành

### 1. Fix fetchAllDeposits() Hook

**Vấn đề**: DepositCertificate contract không có `totalSupply()` function (không kế thừa từ ERC721Enumerable để tiết kiệm gas).

**Giải pháp**: Updated `useDeposit.ts` để:
- Scan từ depositId 1 đến 1000
- Sử dụng `exists(depositId)` để kiểm tra deposit có tồn tại không
- Fetch deposits theo batch (50 deposits/lần) để tránh RPC limits
- Stop scanning khi gặp batch rỗng

**Code đã fix**:
```typescript
// Before (broken):
const totalSupply = await depositCertificateContract.totalSupply(); // ❌ Function không tồn tại

// After (working):
const MAX_DEPOSIT_ID = 1000;
for (let i = 1; i <= MAX_DEPOSIT_ID; i++) {
  const exists = await depositCertificateContract.exists(i); // ✅ Sử dụng exists()
  if (!exists) continue;
  // Fetch deposit data...
}
```

### 2. Verified On-Chain Data

Chạy test script `test-admin-dashboard.ts` để verify data trên Sepolia:

```bash
npx hardhat run scripts/test-admin-dashboard.ts --network sepolia
```

**Kết quả**:
- ✅ **Total Users**: 2 users
- ✅ **Total Value Locked**: 39,000 USDC
- ✅ **Total Deposits**: 6 deposits
- ✅ **Active Deposits**: 0 (tất cả đã mature)
- ✅ **Total Plans**: 9 plans
- ✅ **Active Plans**: 8 plans
- ✅ **VaultManager Balance**: 49,999.999193 USDC
- ✅ **DepositVault Balance**: 11,000 USDC

**User List**:
1. **0x6b603229f119FE0a3F21487A2b0dBFd3c0Ea138A**:
   - 3 deposits (IDs: 1, 2, 4)
   - Total: 21,000 USDC
   
2. **0xF7227428Ef0e2F73560Ce6Da5EaFcff0bbBE109f**:
   - 3 deposits (IDs: 3, 5, 6)
   - Total: 27,000 USDC

**Recent Deposits**:
1. Deposit #6: 7,000 USDC (Plan #1)
2. Deposit #5: 10,000 USDC (Plan #9)
3. Deposit #4: 10,000 USDC (Plan #8)
4. Deposit #3: 10,000 USDC (Plan #1)
5. Deposit #2: 1,000 USDC (Plan #2)

---

## 🧪 Testing Steps

### Step 1: Verify Backend (On-Chain Data)

Chạy test script để verify data trên blockchain:

```bash
cd D:\internBlockchain\AC-capstone-save-banking
npx hardhat run scripts/test-admin-dashboard.ts --network sepolia
```

**Expected Output**:
- Total Users: 2
- Total Deposits: 6
- Total Value Locked: 39,000 USDC
- Plans: 8 active, 9 total

### Step 2: Start Frontend Dev Server

```bash
cd D:\internBlockchain\AC-capstone-save-banking\term-deposit-dapp
npm run dev
```

Server sẽ chạy ở: http://localhost:5173 (hoặc 5174 nếu port bận)

### Step 3: Test Admin Dashboard

#### 3.1. Connect Wallet
1. Mở browser: http://localhost:5174/admin
2. Connect MetaMask với account admin: `0x6b603229f119FE0a3F21487A2b0dBFd3c0Ea138A`
3. Đảm bảo đang ở Sepolia network

#### 3.2. Test Overview Tab

**Expected Stats**:
- **Total Users**: 2
- **Total Value Locked**: 39,000 USDC
- **Total Deposits**: 6
- **Active Deposits**: 0
- **Active Plans**: 8
- **Total Plans**: 9

**Actions**:
- [ ] Verify all stats display correctly
- [ ] Check loading states
- [ ] Verify numbers match on-chain data

#### 3.3. Test User List Tab

**Expected Users**:
1. **0x6b60...38A**: 3 deposits, 21,000 USDC
2. **0xF722...09f**: 3 deposits, 27,000 USDC

**Actions**:
- [ ] Verify 2 users displayed
- [ ] Check deposit counts correct
- [ ] Check total amounts correct
- [ ] Test sorting (by deposits, by amount)

#### 3.4. Test Plans Section

**Expected**:
- 9 total plans (3 test plans + 6 production plans)
- 8 active, 1 inactive (Plan #6)
- Disabled plan should show grayed out

**Actions**:
- [ ] Verify all 9 plans displayed
- [ ] Check Plan #6 shows as disabled
- [ ] Test Edit button (opens modal)
- [ ] Test Enable/Disable toggle

#### 3.5. Test Settings Tab

**Expected Vault Info**:
- **Total Balance**: 49,999.999193 USDC
- **Fee Receiver**: 0x6b603229f119FE0a3F21487A2b0dBFd3c0Ea138A
- **SavingLogic**: 0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb
- **Status**: Active (not paused)

**Expected Contract Addresses**:
- MockUSDC: 0x73a9bEc9B836007904A19C30B2FD9B2f7A6720BA
- DepositCertificate: 0x2A4A34e3C69D862e1dAA94C64C5747f022160AB4
- DepositVault: 0x077a4941565e0194a00Cd8DABE1acA09111F7B06
- VaultManager: 0xFf586ADCE68Ed8f0FcfbFA268Ba81E438900e136
- SavingLogic: 0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb

**Actions**:
- [ ] Verify vault balance displays
- [ ] Check all contract addresses correct
- [ ] Test Pause/Unpause button
- [ ] Test Set Fee Receiver button

#### 3.6. Test Recent Deposits Section

**Expected**:
- Last 5 deposits displayed
- Newest first (Deposit #6, #5, #4, #3, #2)

**Actions**:
- [ ] Verify deposits in reverse order
- [ ] Check amounts correct
- [ ] Check plan IDs correct
- [ ] Test "View All" link

---

## 🐛 Debug Tools

### Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Look for logs from `useDeposit.ts`:
   ```
   📊 [useDeposit] Scanning deposits from 1 to 1000...
   ✅ [useDeposit] Fetched 6 total deposits
   ```

### Check Network Tab

1. Open DevTools → Network tab
2. Filter by "XHR" or "Fetch"
3. Look for RPC calls to Sepolia
4. Check for errors or failed requests

### Manual Contract Query

Open browser console và run:

```javascript
// Check if depositCertificate exists
const { depositCertificateContract } = window.__contracts__;

// Check exists function
const exists1 = await depositCertificateContract.exists(1);
console.log("Deposit #1 exists:", exists1);

// Get deposit data
const deposit1 = await depositCertificateContract.getDepositCore(1);
console.log("Deposit #1:", deposit1);
```

---

## 📊 Test Scripts

### 1. Full Admin Dashboard Test
```bash
npx hardhat run scripts/test-admin-dashboard.ts --network sepolia
```
Comprehensive test showing all stats, deposits, users, plans.

### 2. Quick Deposit Test
```bash
npx hardhat run scripts/quick-test-deposits.ts --network sepolia
```
Quick verification that deposits exist and `exists()` function works.

### 3. View Plans
```bash
npx hardhat run scripts/view-plans.ts --network sepolia
```
List all saving plans with details.

---

## ✅ Success Criteria

Admin Dashboard hoạt động hoàn hảo khi:

1. **Overview Tab**:
   - ✅ All stats load và match on-chain data
   - ✅ No zeros displayed (except Active Deposits = 0 là đúng)
   - ✅ Numbers format correctly (commas, 2 decimals cho USDC)

2. **User List Tab**:
   - ✅ Shows 2 users
   - ✅ Deposit counts correct
   - ✅ Total amounts correct
   - ✅ Sorting works

3. **Plans Section**:
   - ✅ 9 plans displayed
   - ✅ Plan #6 shows as disabled
   - ✅ Edit/Enable/Disable work

4. **Settings Tab**:
   - ✅ Vault info displays correctly
   - ✅ All contract addresses visible
   - ✅ Admin functions work

5. **Console**:
   - ✅ No errors
   - ✅ Fetch logs show "Fetched 6 total deposits"

---

## 🔧 Troubleshooting

### Issue: Stats still show 0

**Cause**: Frontend not fetching data properly

**Solution**:
1. Check browser console for errors
2. Verify wallet connected to Sepolia
3. Check RPC endpoint in `.env`:
   ```
   VITE_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_KEY
   ```
4. Clear browser cache and reload

### Issue: "Function not found" error

**Cause**: TypeChain types outdated

**Solution**:
```bash
# Regenerate types
cd D:\internBlockchain\AC-capstone-save-banking
npx hardhat typechain

# Rebuild frontend
cd term-deposit-dapp
npm run build
```

### Issue: Deposits not loading

**Cause**: RPC rate limiting

**Solution**:
- Reduce `MAX_DEPOSIT_ID` in useDeposit.ts
- Increase `BATCH_SIZE` delay
- Use faster RPC endpoint

---

## 📝 Notes

- Tất cả 6 deposits đã mature (status = 0) vì test plans có tenor rất ngắn (30 seconds, 90 seconds, 180 seconds)
- Production plans (Plans #4-#9) có tenor dài hơn (7-365 days)
- VaultManager balance (50k USDC) > DepositVault balance (11k USDC) vì funds đã được withdraw
- Frontend đã được fix để approve DepositVault (v2.0 architecture)
