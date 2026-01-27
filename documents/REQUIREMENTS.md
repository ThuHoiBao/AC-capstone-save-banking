# Yêu cầu sản phẩm - Traditional Bank Saving (Term Deposit)

## 1. Functional Requirements (Yêu cầu chức năng)

### 1.1 Actors
- **Depositor (user):** Gửi tiền, tất toán (rút), gia hạn.
- **Bank Admin:** Cấu hình sản phẩm tiết kiệm, nạp "liquidity vault" để trả lãi, pause, set feeReceiver.

### 1.2 Token
- Dùng 1 **ERC20 stablecoin mock** (USDC-like, **6 decimals**) hoặc ERC20 18 decimals.

### 1.3 Tính năng bắt buộc

#### A. Tạo gói tiết kiệm (Saving Plan)
```solidity
struct Plan {
  uint256 planId;                      // ID gói (auto-increment)
  uint32 tenorDays;                    // Kỳ hạn (ngày): 7, 30, 90, 180, 365, ...
  uint16 aprBps;                       // Lãi suất năm (basis points); 800 = 8.00%
  uint256 minDeposit;                  // Min gửi (wei); 0 = không giới hạn
  uint256 maxDeposit;                  // Max gửi (wei); 0 = không giới hạn
  uint16 earlyWithdrawPenaltyBps;      // Phạt rút trước hạn (bps); 500 = 5.00%
  bool enabled;                        // Gói có kích hoạt hay không
  uint256 createdAt;                   // Timestamp tạo gói
}
```

#### B. Mở sổ tiết kiệm (Open Deposit Certificate)
```solidity
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

- User chọn plan + amount. Contract giữ token (principal).
- Mint NFT cho user (ERC721) với depositId duy nhất.

#### C. Tất toán đúng hạn (Withdraw at Maturity)

**Công thức lãi suất (Simple Interest):**
$$\text{interest} = \frac{\text{principal} \times \text{aprBpsAtOpen} \times \text{tenorSeconds}}{365 \times 24 \times 3600 \times 10,000}$$

**Tham số:**
- `principal` = số tiền gốc gửi (wei)
- `aprBpsAtOpen` = lãi suất năm snapshot lúc mở sổ (basis points)
  - Ví dụ: 800 bps = 8.00% / năm; 250 bps = 2.50% / năm
- `tenorSeconds` = kỳ hạn (giây) = tenorDays × 24 × 3600
  - Ví dụ: 90 ngày = 90 × 86,400 = 7,776,000 giây
- Chia cho 10,000 vì aprBps là basis points (1 bps = 0.01%)
- Chia cho (365 × 24 × 3600) = 31,536,000 để quy đổi từ năm → giây

**Ví dụ cụ thể:**
```
Plan: tenorDays=90, aprBps=250 (2.5% APR)
User Alice gửi: principal=1,000 USDC = 1,000 × 10^6 wei (6 decimals)
startAt=t0, maturityAt=t0+90 days

Tính lãi:
tenorSeconds = 90 × 86,400 = 7,776,000 giây

interest = (1,000 × 10^6 × 250 × 7,776,000) / (31,536,000 × 10,000)
         = (1,000 × 10^6 × 250 × 7,776,000) / 315,360,000,000
         ≈ 6,164,383 wei
         ≈ 6.164383 USDC

Rút tại maturity:
Alice nhận = principal + interest = 1,000 + 6.164383 = 1,006.164383 USDC
```

- **Lãi rút từ liquidity vault** (admin đã nạp token vào vault để trả lãi).

#### D. Rút trước hạn (Early Withdraw)

**Công thức Penalty:**
$$\text{penalty} = \frac{\text{principal} \times \text{penaltyBpsAtOpen}}{10,000}$$

**Tham số:**
- `principal` = số tiền gốc
- `penaltyBpsAtOpen` = snapshot penalty (basis points)
  - Ví dụ: 500 bps = 5.00%; 1000 bps = 10.00%

**Ví dụ cụ thể:**
```
Deposit của Alice: principal=1,000 USDC, penaltyBpsAtOpen=500 (5%)
Alice rút trước hạn (sau 30 ngày, trước hạn 90 ngày):

penalty = (1,000 × 10^6 × 500) / 10,000
        = 50 × 10^6 wei
        = 50 USDC

Alice nhận = principal - penalty = 1,000 - 50 = 950 USDC
Fee receiver nhận = 50 USDC
Interest = 0 (không trả lãi khi rút trước hạn)
```

- **Penalty chảy vào feeReceiver** (do admin set, mặc định có thể là vault hoặc treasury).
- **Interest = 0** khi rút trước hạn (không có lãi).

#### E. Gia hạn (Renew / Roll-over)

**Manual Renew (user chủ động):**
- Khi đến hạn (now >= maturityAt), user gọi `renewDeposit(depositId, newPlanId)`.
- Tính interest từ old deposit theo aprBpsAtOpen.
- **newPrincipal = principal + interest** (gộp lãi vào gốc).
- Snapshot APR theo newPlan.
- Mở deposit mới với newPrincipal, newMaturityAt = now + newTenor.
- Status cũ → ManualRenewed.

**Ví dụ Manual Renew:**
```
Old deposit (Alice):
  principal = 1,000 USDC
  interest ≈ 6.16 USDC (tính từ 90 ngày, 2.5%)
  status = Active

Alice gọi renewDeposit(101, 2) → chọn gói 2 (180 ngày, 2.5% APR)

New deposit:
  newDepositId = 102
  newPrincipal = 1,000 + 6.16 = 1,006.16 USDC
  newTenor = 180 ngày
  newMaturityAt = now + 180 days
  newAprBpsAtOpen = 250 (snapshot từ plan 2)
  status = Active

Old deposit:
  status → ManualRenewed
```

**Auto Renew (tự động sau grace period):**
- Nếu user **không rút/renew trong vòng grace period (3 ngày)** sau maturityAt.
- Tự động gia hạn **cùng tenor cũ**, **APR khóa theo lúc mở đầu tiên**.
  - NewAprBpsAtOpen = aprBpsAtOpen (không thay đổi dù admin đã update plan xuống lãi).
- newPrincipal = principal + interest.
- Status → AutoRenewed.
- Bảo vệ user: không bị giảm lãi suất ban đầu.

**Ví dụ Auto Renew:**
```
Old deposit (Alice): depositId=101, aprBpsAtOpen=250 (2.5%)
Maturity = t0 + 90 days

Scenario:
- Admin update Plan 1 từ 2.5% → 2.0% (giảm lãi)
- Alice không rút/renew trong 3 ngày grace period
- Bot gọi autoRenewDeposit(101)

Auto-renew result:
  newDepositId = 102
  newPrincipal = 1,000 + 6.16 = 1,006.16 USDC
  newTenor = 90 ngày (cùng cái cũ)
  newMaturityAt = t0 + 90 + 90 = t0 + 180 days
  newAprBpsAtOpen = 250 (khóa theo lúc mở đầu, không bị hạ xuống 200)
  status = AutoRenewed

Alice được bảo vệ lãi suất 2.5% cho kỳ renew này!
```

#### F. Admin Vault Management
```solidity
// VaultManager contract
fundVault(amount)           // Nạp token để trả lãi (yêu cầu approve trước)
withdrawVault(amount)       // Rút bớt vốn (có giới hạn)
setFeeReceiver(address)     // Set địa chỉ nhận phí
pause()                     // Tạm dừng vault (chặn rút tiền)
unpause()                   // Bật lại vault
```

#### G. Events bắt buộc
```solidity
event PlanCreated(uint256 indexed planId, uint32 tenorDays, uint16 aprBps);
event PlanUpdated(uint256 indexed planId, uint16 newAprBps);
event DepositOpened(
  uint256 indexed depositId, 
  address indexed owner, 
  uint256 planId, 
  uint256 principal, 
  uint256 maturityAt,
  uint16 aprBpsAtOpen
);
event Withdrawn(
  uint256 indexed depositId, 
  address indexed owner, 
  uint256 principal, 
  uint256 interest, 
  bool isEarly
);
event Renewed(
  uint256 indexed oldDepositId, 
  uint256 indexed newDepositId, 
  uint256 newPrincipal, 
  uint256 newPlanId
);
```

---

## 2. Business Rules (Quy tắc kinh doanh)

1. **NFT Certificate:**
   - Mỗi **sổ tiết kiệm** là một **NFT (ERC721)** với depositId duy nhất.
   - User là owner, có thể chuyển, burn (tuy chủ sẽ không thường xuyên chuyển).

2. **Snapshot APR/Penalty:**
   - Lãi suất và phạt được **khóa tại lúc mở sổ** (aprBpsAtOpen, penaltyBpsAtOpen).
   - Nếu admin sau này update plan (giảm lãi từ 2.5% → 2%), deposit cũ vẫn dùng 2.5%.
   - **Bảo vệ user** khỏi biến động lãi suất.

3. **Simple Interest:**
   - Lãi tính theo **simple interest** (không compound).
   - Công thức: interest = principal × aprBps × tenor / năm.

4. **Rút trước hạn không có lãi:**
   - Early withdraw: **interest = 0**, chỉ mất penalty.
   - Penalty không hoàn lại.

5. **Auto-renew bảo vệ user:**
   - Grace period (mặc định 3 ngày) sau maturity.
   - Nếu quên không rút/gia hạn, tự động gia hạn cùng tenor, APR khóa ban đầu.
   - Nếu muốn rút gốc+lãi, user có thể gọi withdrawAtMaturity() trước grace period kết thúc.

6. **Vault quản lý tập trung:**
   - Tất cả lãi trả cho user đến từ liquidity vault.
   - Admin nạp vốn định kỳ, rút bớt nếu cần.
   - Pause vault → chặn toàn bộ rút tiền (emergency).

7. **Admin không thể ảnh hưởng deposit đã mở:**
   - Update plan chỉ ảnh hưởng deposits mới.
   - Deposits cũ dùng snapshot APR/Penalty tại lúc mở.

---

## 3. Tính toán chi tiết (Cheat Sheet)

### Interest (Đúng hạn)
```
interest (wei) = (principal × aprBpsAtOpen × tenorSeconds) / (365 × 24 × 3600 × 10,000)
               = (principal × aprBpsAtOpen × (tenorDays × 86,400)) / (31,536,000 × 10,000)

Ví dụ:
principal = 1,000,000,000 (1,000 USDC, 6 decimals)
aprBpsAtOpen = 250 (2.5%)
tenorDays = 90

tenorSeconds = 90 × 86,400 = 7,776,000
interest = (1,000,000,000 × 250 × 7,776,000) / (315,360,000,000)
         ≈ 6,164,383 wei ≈ 6.16 USDC
```

### Penalty (Rút trước hạn)
```
penalty (wei) = (principal × penaltyBpsAtOpen) / 10,000

Ví dụ:
principal = 1,000,000,000 (1,000 USDC)
penaltyBpsAtOpen = 500 (5%)

penalty = (1,000,000,000 × 500) / 10,000
        = 50,000,000 wei = 50 USDC

User nhận = 1,000 - 50 = 950 USDC
```

### APR & BPS Reference
```
1 bps = 0.01% = 0.0001 (decimal)
100 bps = 1%
250 bps = 2.5%
500 bps = 5%
800 bps = 8%
10,000 bps = 100%
```

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  Form deposit, Display list, Withdraw/Renew buttons        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Smart Contract Layer                           │
│                                                             │
│  ┌──────────────────┐      ┌──────────────────────┐        │
│  │  SavingCore      │◄────►│  VaultManager        │        │
│  │  (ERC721 NFT)    │      │  (Vault + Fee Mgmt)  │        │
│  │                  │      │                      │        │
│  │ - createPlan()   │      │ - fundVault()        │        │
│  │ - openDeposit()  │      │ - withdrawVault()    │        │
│  │ - withdraw*()    │      │ - setFeeReceiver()   │        │
│  │ - renew*()       │      │ - pause/unpause()    │        │
│  │ - updatePlan()   │      │                      │        │
│  └──────────────────┘      └──────────────────────┘        │
│           │                            │                   │
│           └────────────┬───────────────┘                   │
│                        ↓                                    │
│          ┌─────────────────────────┐                       │
│          │   MockUSDC (ERC20)      │                       │
│          │   6 decimals            │                       │
│          └─────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│            Blockchain (Hardhat / Sepolia)                   │
│  State: Plans, Deposits (NFTs), Vault balance              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Test Coverage Plan

- ✅ **Thứ 3:** createPlan, openDeposit (unit tests)
- ✅ **Thứ 4:** withdrawAtMaturity, earlyWithdraw, renewDeposit (manual), autoRenew, vault operations
- ✅ **Thứ 5:** Edge cases (no funds, exceed limits, grace period, APR change), >90% coverage
- ✅ **Thứ 6:** Frontend integration + demo

