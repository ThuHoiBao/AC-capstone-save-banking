# Plan & Day-1 Setup

## Mục tiêu tuần (Mon-Fri)
**Ưu tiên:** Logic + Test + Script Deploy hoàn chỉnh trước, Frontend là bước cuối cùng.
- Xây dựng smart contract tiết kiệm (plan, deposit NFT, vault, renew/withdraw) → fully tested.
- Chuẩn bị mock stablecoin 6 decimals + vault funding flow.
- Viết toàn bộ unit tests, edge cases, scripts thành công trên localhost/testnet.
- Frontend (React) giao diện lấy dữ từ contract đã test xong.

## Lịch làm việc chi tiết
- **Thứ 2 :** 
  - ✅ Chuẩn hoá yêu cầu, setup project, mock token.
  - ✅ DONEThiết kế data struct: Plan (tenorDays, aprBps, minDeposit, maxDeposit, earlyWithdrawPenaltyBps, enabled), Deposit (owner, planId, principal, startAt, maturityAt, status, aprBpsAtOpen, penaltyBpsAtOpen).
  - ✅ Tạo thư mục chuẩn: `contracts/interfaces`, `contracts/libs`, `contracts/types`, `contracts/tokens`.
  - ✅ Viết `Types.sol` (structs + enum), `InterestMath.sol` (simple interest), `ISavingCore.sol`, `IVaultManager.sol` (hàm + events).
  - ✅ Chạy `npx hardhat compile` và `npx hardhat test` xác nhận cấu trúc OK.
  - ✅ Ghi chú: chưa implement logic SavingCore/VaultManager, sẽ làm ngày 4.
  
- **Thứ 3:** 
  - Implement `SavingCore` core logic: `createPlan()`, `updatePlan()`, `openDeposit()` (ERC20 transfer, snapshot APR/penalty, mint ERC721).
  - Scaffold `VaultManager`: `fundVault()`, `setFeeReceiver()`, `pause/unpause`; restrict interest/penalty payouts to calls from `SavingCore`.
  - Wire SavingCore ↔ VaultManager + add configurable `gracePeriod`.
  - Unit tests: `testCreatePlan`, `testOpenDeposit`, constraints (enabled/min/max), event checks.

- **Thứ 4:**
  - Implement withdrawals: `withdrawAtMaturity()` (principal + interest by snapshot APR), `earlyWithdraw()` (principal - penalty, send fee via VaultManager).
  - Implement renewals: `renewDeposit()` (manual) and `autoRenewDeposit()` (auto after 3-day grace, keep original APR).
  - Integrate payouts via `VaultManager`: `payoutInterest()`, `distributePenalty()`.
  - Unit tests: withdraw, early, renew, auto-renew, vault ops, pause.
- **Thứ 5:**
  - Edge-case coverage: no funds in vault, exceed max, zero amount, time/grace windows, APR change.
  - Deploy script `deploy.ts`: deploy `MockUSDC`, `VaultManager`, `SavingCore`, seed plans, fund vault.
  - Bắt đầu setup frontend (React + Vite), prepare ABI, provider, basic pages.
  - Chạy end-to-end trên localhost: mở sổ → rút → auto/manual renew; optional testnet if `.env` sẵn sàng.
  - Coverage >90% cho tính năng chính.
- **Thứ 6:**
  - Hoàn thiện frontend: form deposit, list deposits (NFT), withdraw/renew, vault balance.
  - Kết nối web3 (ethers), trạng thái giao dịch, thông báo.
  - Integration test UI ↔ contracts; buffer sửa lỗi; security review (access control, reentrancy, math).
  - Chuẩn bị demo: faucet/testnet, walkthrough flow.

## Day-1 Setup (Hardhat)
1) Cài Node >=18 & Yarn. Kiểm tra: `node -v`, `yarn -v`.
2) Cài deps: `yarn install` (chạy trong root repo).
3) Tạo `.env` với RPC + private key (tuỳ testnet):
```
SEPOLIA_RPC_URL=https://...
TESTNET_PRIVATE_KEY=0x...
REPORT_GAS=0
ETHERSCAN_API=your-key
```
4) Chạy sanity build + test:
```
yarn compile hoặc npx hardhat compile
yarn test    hoặc npx hardhat test
```
- Kỳ vọng: compile dùng solc 0.8.28; test mock token pass 2/2.


## DSM Template
- **Hôm qua:** ...
- **Hôm nay:** ...
- **Vướng mắc / Issue:** ...
- **Kế hoạch ngày sau:** ...

## Chỉ số thành công (Definition of Done)
- ✅ Thứ 3 EOD: SavingCore contract v1 + plan/deposit tests pass.
- ✅ Thứ 4 EOD: withdraw/renew/vault logic + all tests pass.
- ✅ Thứ 5 EOD: deploy.ts script chạy trên localhost + testnet, >90% coverage.
- ✅ Thứ 6 EOD: Frontend giao diện hoàn chỉnh + integration test, demo sẵn sàng.

## Tài nguyên và tools
- **Contract:** Hardhat + Solidity 0.8.28 + OpenZeppelin (ERC721, ERC20, Ownable, Pausable).
- **Test:** Hardhat test runner + chai assertions.
- **Frontend:** React + ethers.js/web3.js + TypeScript.
- **Deploy:** Hardhat deploy plugin (hardhat-deploy).
- **Network:** localhost (hardhat node) + sepolia testnet.


## Backlog gần hạn
- Chuẩn hoá interface: plan struct, deposit NFT metadata, penalty/interest formula.
- Thiết kế Vault (fund/withdraw, feeReceiver, pause).
- Viết test coverage cho plan/deposit/withdraw/renew.
- Chuẩn bị flow frontend + contract ABI.

## Clarify Requirements (bổ sung chi tiết)
- Plan: tenorDays, aprBps, minDeposit, maxDeposit, earlyWithdrawPenaltyBps, enabled.
- Deposit (NFT id) lưu snapshot để chống thay đổi lãi suất về sau: owner, planId, principal, startAt, maturityAt, status, aprBpsAtOpen, penaltyBpsAtOpen.
- Đúng hạn: trả principal + simple interest với aprBpsAtOpen; lãi rút từ VaultManager.
- Trước hạn: phạt `principal * penaltyBpsAtOpen / 10000`, user nhận `principal - penalty` (interest = 0).
- Gia hạn & auto-renew:
  - Có gracePeriod (mặc định 3 ngày) sau maturity; nếu user không rút/gia hạn, contract auto-renew cùng tenor cũ, APR cố định theo aprBpsAtOpen (không bị giảm nếu admin đã chỉnh plan xuống 2%).
  - Manual renew: user có thể chọn plan khác; snapshot APR theo plan mới tại thời điểm renew.
  - Auto-renew gộp lãi vào gốc.
- Kiến trúc tách: SavingCore (logic, NFT, state) và VaultManager (quản trị quỹ, feeReceiver, pause); SavingCore gọi VaultManager để chi trả lãi/phạt.
- Admin: fundVault/withdrawVault, setFeeReceiver, pause/unpause (ở VaultManager); updatePlan (ở SavingCore) không ảnh hưởng các deposit đã snapshot APR.
- Events: PlanCreated, PlanUpdated, DepositOpened, Withdrawn, Renewed.

---

## Data Structs (Chi tiết)

### SavingCore

```solidity
struct Plan {
  uint256 planId;                      // ID gói tiết kiệm (auto-increment)
  uint32 tenorDays;                    // Kỳ hạn (ngày): 7, 30, 90, 180, 365, ...
  uint16 aprBps;                       // Lãi suất năm (basis points): 800 = 8%
  uint256 minDeposit;                  // Min gửi (wei); 0 = không giới hạn
  uint256 maxDeposit;                  // Max gửi (wei); 0 = không giới hạn
  uint16 earlyWithdrawPenaltyBps;      // Phạt rút trước hạn (bps): 500 = 5%
  bool enabled;                        // Gói có kích hoạt hay không
  uint256 createdAt;                   // Timestamp tạo gói
}

struct Deposit {
  uint256 depositId;                   // NFT ID (auto-increment)
  address owner;                       // Chủ sở hữu sổ
  uint256 planId;                      // Reference đến Plan
  uint256 principal;                   // Số tiền gốc (wei)
  uint256 startAt;                     // Timestamp mở sổ
  uint256 maturityAt;                  // Timestamp đến hạn (startAt + tenorSeconds)
  uint8 status;                        // 0=Active, 1=Withdrawn, 2=AutoRenewed, 3=ManualRenewed
  uint16 aprBpsAtOpen;                 // Snapshot APR lúc mở (từ Plan.aprBps)
  uint16 penaltyBpsAtOpen;             // Snapshot penalty lúc mở (từ Plan.earlyWithdrawPenaltyBps)
}
```

### VaultManager

```solidity
struct VaultState {
  uint256 totalBalance;                // Tổng số token trong vault (để trả lãi)
  address feeReceiver;                 // Địa chỉ nhận phí penalty
  bool paused;                         // Vault tạm dừng hay không (khi admin pause)
}
```

---

## Hàm & Flow (Usecase)

### SavingCore Contract

#### 1. **createPlan() → planId**
**Flow:**
- Admin gọi `createPlan(tenorDays, aprBps, minDeposit, maxDeposit, earlyWithdrawPenaltyBps)`.
- Contract lưu vào `plans[planId]` với enabled=true, createdAt=now.
- Emit `PlanCreated(planId, tenorDays, aprBps)`.

**Constraint:**
- Chỉ admin mới gọi được (role-based).
- tenorDays > 0, aprBps < 10000 (max 99.99%).

**Usecase:**
```
Admin muốn tạo gói 3 tháng (90 ngày), 2.5% APR/năm, min 100 USDC, max 10,000 USDC, penalty 5%.
→ createPlan(90, 250, 100e6, 10000e6, 500)
→ PlanId = 1
```

---

#### 2. **openDeposit(planId, amount) → depositId**
**Flow:**
- User gọi approve(savingCoreAddr, amount) trước để cho contract transfer token.
- User gọi `openDeposit(planId, amount)`.
- Contract kiểm tra: plan enabled, minDeposit ≤ amount ≤ maxDeposit.
- Contract transferFrom(user, this, amount) lấy token.
- Lưu deposit struct: depositId (NFT), owner, planId, principal, startAt, maturityAt, status=Active, aprBpsAtOpen, penaltyBpsAtOpen.
- Mint NFT cho user (ERC721): token ID = depositId.
- Emit `DepositOpened(depositId, user, planId, amount, maturityAt, aprBpsAtOpen)`.

**Constraint:**
- Plan phải enabled.
- amount >= minDeposit, amount <= maxDeposit.
- User phải có balance ≥ amount.

**Usecase:**
```
User Alice muốn gửi 1000 USDC vào gói 3 tháng (planId=1).
→ Alice.approve(savingCore, 1000e6)
→ Alice.openDeposit(1, 1000e6)
→ DepositId = 101 (NFT minted to Alice)
→ Deposit locked, maturityAt = now + 90 days
→ aprBpsAtOpen snapshot = 250 (2.5%)
```

---

#### 3. **withdrawAtMaturity(depositId) → (principal, interest)**
**Flow:**
- User (NFT holder) gọi hàm.
- Contract kiểm tra: now >= maturityAt, status == Active.
- Tính interest: `interest = principal * aprBpsAtOpen * tenorSeconds / (365 * 24 * 3600 * 10000)`.
- Gọi VaultManager để rút interest từ vault.
- Transfer (principal + interest) cho user.
- Cập nhật status = Withdrawn.
- Emit `Withdrawn(depositId, user, principal, interest, false)` (false = not early).

**Constraint:**
- now >= maturityAt.
- status == Active.
- Vault có đủ interest.

**Usecase:**
```
Sau 90 ngày, Alice rút tiền:
→ Alice.withdrawAtMaturity(101)
→ Principal = 1000 USDC
→ Interest = 1000 * 250 * (90*86400) / (365*86400*10000) ≈ 6.16 USDC
→ Alice nhận 1006.16 USDC
→ Status → Withdrawn
```

---

#### 4. **earlyWithdraw(depositId) → (principal - penalty)**
**Flow:**
- User gọi trước maturity.
- Contract kiểm tra: status == Active.
- Tính penalty: `penalty = principal * penaltyBpsAtOpen / 10000`.
- Transfer (principal - penalty) cho user.
- Transfer penalty → feeReceiver (qua VaultManager).
- Cập nhật status = Withdrawn.
- Emit `Withdrawn(depositId, user, principal, 0, true)` (true = early, interest=0).

**Constraint:**
- status == Active (không cần check maturity).
- Vault phải có penalty để transfer cho feeReceiver.

**Usecase:**
```
Alice rút trước hạn sau 30 ngày:
→ Alice.earlyWithdraw(101)
→ Penalty = 1000 * 500 / 10000 = 50 USDC
→ Alice nhận 950 USDC
→ Fee receiver nhận 50 USDC
→ Status → Withdrawn
```

---

#### 5. **renewDeposit(depositId, newPlanId) → newDepositId**
**Flow:**
- User (NFT holder) gọi sau maturity hoặc trong grace period.
- Contract kiểm tra: now >= maturityAt, status == Active.
- Tính interest theo old deposit (aprBpsAtOpen): `interest = principal * aprBpsAtOpen * tenorSeconds / (365 * 86400 * 10000)`.
- Gọi VaultManager để rút interest.
- newPrincipal = principal + interest (gộp lãi vào gốc).
- Kiểm tra newPlan enabled, newPrincipal trong [minDeposit, maxDeposit].
- Tạo new deposit: newDepositId, owner, newPlanId, newPrincipal, startAt=now, maturityAt=now + newTenor, status=Active, aprBpsAtOpen (từ newPlan).
- Mint NFT mới cho user.
- Cập nhật old status = ManualRenewed (nếu user call manual) hoặc AutoRenewed (nếu auto).
- Emit `Renewed(depositId, newDepositId, newPrincipal, newPlanId)`.

**Constraint:**
- now >= maturityAt.
- status == Active.
- newPlan enabled, newPrincipal trong [minDeposit, maxDeposit].

**Usecase:**
```
Sau 90 ngày, Alice muốn gia hạn sang gói 180 ngày:
→ Alice.renewDeposit(101, 2) // planId=2 là 180 ngày
→ Interest ≈ 6.16 USDC
→ NewPrincipal = 1006.16 USDC
→ NewDepositId = 102
→ NewMaturityAt = now + 180 days
→ NewAprBpsAtOpen = 250 (snapshot từ plan 2)
→ OldDeposit status → ManualRenewed
```

---

#### 6. **autoRenewDeposit(depositId)** (Internal triggered by Keeper/Bot)
**Flow:**
- Bot/Keeper gọi sau grace period (e.g., now >= maturityAt + 3 days) nếu user chưa rút/renew.
- Tương tự renewDeposit, nhưng: newPlanId = oldPlanId (cùng gói cũ), newAprBpsAtOpen = aprBpsAtOpen (khóa lãi cũ, không bị giảm).
- Status → AutoRenewed.
- Emit event auto-renew.

**Usecase:**
```
Sau 90 ngày + 3 ngày grace, Alice chưa rút:
→ Keeper.autoRenewDeposit(101)
→ Interest ≈ 6.16 USDC
→ NewPrincipal = 1006.16 USDC, NewDepositId = 102
→ NewPlanId = 1 (90 ngày, cùng cái cũ)
→ NewAprBpsAtOpen = 250 (snapshot lúc đầu, không bị giảm dù plan.aprBps = 200 bây giờ)
→ Status → AutoRenewed
```

---

#### 7. **updatePlan(planId, aprBps, ...) (Admin)**
**Flow:**
- Admin cập nhật `plans[planId]`.
- Chỉ ảnh hưởng new deposits, không ảnh hưởng deposits đã snapshot.
- Emit `PlanUpdated(planId, newAprBps)`.

**Constraint:**
- Chỉ admin.
- Không thay đổi tenorDays (để tránh confusion).

**Usecase:**
```
Admin hạ lãi plan 1 từ 2.5% → 2.0%:
→ Admin.updatePlan(1, 200) // 200 bps = 2%
→ New deposits mở sau này dùng 2%
→ Old deposits (như 101) vẫn dùng 2.5% (snapshot)
```

---

### VaultManager Contract

#### 1. **fundVault(amount)**
**Flow:**
- Admin/Authorized gọi approve(vaultManagerAddr, amount) trước.
- Gọi `fundVault(amount)`.
- Contract transferFrom(admin, this, amount) lấy token.
- Cập nhật totalBalance += amount.
- Emit `VaultFunded(amount, newBalance)`.

**Usecase:**
```
Admin nạp 10,000 USDC vào vault để trả lãi:
→ Admin.approve(vaultManager, 10000e6)
→ Admin.fundVault(10000e6)
→ totalBalance = 10000e6
```

---

#### 2. **withdrawVault(amount) (Admin)**
**Flow:**
- Admin gọi `withdrawVault(amount)`.
- Kiểm tra totalBalance >= amount.
- Transfer(admin, amount).
- Cập nhật totalBalance -= amount.
- Emit `VaultWithdrawn(amount, newBalance)`.

**Constraint:**
- totalBalance >= amount.
- Chỉ admin.

**Usecase:**
```
Admin rút 2000 USDC từ vault:
→ Admin.withdrawVault(2000e6)
→ totalBalance = 8000e6
```

---

#### 3. **setFeeReceiver(address newReceiver) (Admin)**
**Flow:**
- Admin gọi `setFeeReceiver(address)`.
- Cập nhật feeReceiver.
- Emit `FeeReceiverUpdated(newReceiver)`.

**Usecase:**
```
Admin muốn chuyển fee nhận sang treasury:
→ Admin.setFeeReceiver(treasuryAddr)
→ Penalty rút trước hạn về treasury
```

---

#### 4. **pause() / unpause() (Admin)**
**Flow:**
- Admin gọi `pause()`: paused = true, VaultManager reject all withdrawals.
- SavingCore không thể gọi withdrawInterest hoặc transferPenalty.
- Admin gọi `unpause()`: paused = false.

**Usecase:**
```
Admin phát hiện issue, tạm dừng vault:
→ Admin.pause()
→ withdrawAtMaturity() fail, earlyWithdraw() fail
→ After fix: Admin.unpause()
```

---

## Interaction Diagram

```
User (Alice)
  ↓ [1] openDeposit(planId, amount)
  ↓ [approve token]
  ↓
SavingCore
  ├─ Lưu Deposit struct (NFT)
  ├─ Transfer token from user
  └─ Emit DepositOpened

---

90 ngày sau:
User (Alice)
  ↓ [2a] withdrawAtMaturity(depositId) | [2b] earlyWithdraw(depositId)
  ↓
SavingCore
  ├─ Calc interest / penalty
  ├─ Gọi VaultManager.withdrawInterest() / transferPenalty()
  └─ VaultManager.transfer() → Alice / feeReceiver
  └─ SavingCore.emit Withdrawn

---

Gia hạn (Auto or Manual):
User (Alice) or Keeper Bot
  ↓ [3] renewDeposit(depositId, newPlanId) | autoRenewDeposit(depositId)
  ↓
SavingCore
  ├─ Calc interest from old Deposit
  ├─ Gọi VaultManager.withdrawInterest()
  ├─ Tạo new Deposit (principal + interest)
  ├─ Mint new NFT
  └─ Emit Renewed

---

Admin Vault Ops:
Admin
  ├─ [a] fundVault(amount) → VaultManager
  ├─ [b] withdrawVault(amount) → VaultManager
  ├─ [c] setFeeReceiver(addr) → VaultManager
  ├─ [d] pause() / unpause() → VaultManager
  └─ [e] updatePlan(...) → SavingCore
```

---

## Test Scenarios (Usecase đầy đủ)

1. **Happy path (on-time withdrawal):**
   - Create plan → Open deposit → Wait 90 days → Withdraw at maturity → Verify (principal + interest) received.

2. **Early withdrawal scenario:**
   - Open deposit → Withdraw after 30 days (before maturity) → Verify penalty deducted, principal - penalty received.

3. **Manual renewal:**
   - Open deposit → Wait 90 days → Renew to another plan → Verify new principal = old principal + interest.

4. **Auto-renewal (grace period):**
   - Open deposit → Wait 90 days + 3 days (grace) → Call autoRenew → Verify deposit renewed with same tenor, APR snapshot preserved.

5. **APR change protection:**
   - Create plan 1 (2.5%) → Open deposit → Admin updates plan to 2% → Open another deposit → Verify old deposit still uses 2.5%, new uses 2%.

6. **Vault mechanics:**
   - Admin fund vault → Multiple users open deposits → Users withdraw → Verify vault balance sufficient, penalty sent to feeReceiver.

7. **Pause/Unpause:**
   - Pause vault → Try withdrawal (should fail) → Unpause → Retry (should succeed).
