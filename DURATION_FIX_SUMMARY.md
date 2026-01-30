# 🔍 DIAGNOSIS & SOLUTION SUMMARY

## 📋 Vấn đề phát hiện

### 1. **Duration hiển thị "0 days"** ❌
**Root Cause**: Plans được tạo với giá trị tenor SAI
- Plan #1: `30` seconds → nên là `604800` (7 days)
- Plan #2: `90` seconds → nên là `2592000` (30 days)  
- Plan #3: `180` seconds → nên là `7776000` (90 days)
- Plan #4: `2592000` seconds → nên là `15552000` (180 days)

**Lỗi gốc**: Admin đã pass **days** vào parameter `tenorSeconds` thay vì **seconds**

### 2. **Không thể update tenor của plans** ❌
**Vấn đề**: Function `updatePlan()` không có parameter `tenorSeconds`:
```solidity
function updatePlan(
    uint256 planId,
    uint16 aprBps,              // ✅ Có thể update
    uint256 minDeposit,         // ✅ Có thể update
    uint256 maxDeposit,         // ✅ Có thể update  
    uint16 earlyWithdrawPenaltyBps, // ✅ Có thể update
    bool isActive               // ✅ Có thể update
)
// ❌ KHÔNG có `tenorSeconds` parameter
```

**Tenor là immutable**: Sau khi plan được tạo, `tenorSeconds` không thể thay đổi.

---

## ✅ GIẢI PHÁP ĐÃ THỰC HIỆN

### Step 1: Tạo Scripts Debug
Đã tạo 4 scripts TypeScript để kiểm tra:

1. **`debug-plan-details.ts`** ✅
   - Kiểm tra chi tiết từng plan
   - So sánh tenor thực tế vs expected
   - Hiển thị breakdown (days/hours/minutes/seconds)

2. **`debug-deposit-states.ts`** ✅
   - Kiểm tra trạng thái của từng deposit
   - Tính toán actions available (Early Withdraw / Withdraw / Renew / Auto Renew)
   - Hiển thị potential returns và penalties

3. **`fix-plans-tenor.ts`** ❌ (Failed)
   - Cố gắng update plans hiện tại
   - **Thất bại**: `updatePlan()` không support update tenor

4. **`recreate-plans.ts`** ✅ **SUCCESS!**
   - Disable 4 plans cũ
   - Tạo 4 plans mới với tenor đúng
   - Kết quả:
     * Plan #5: 7 days (604800s) ✅
     * Plan #6: 30 days (2592000s) ✅
     * Plan #7: 90 days (7776000s) ✅
     * Plan #8: 180 days (15552000s) ✅

### Step 2: Tạo Plans Mới ✅

**Transactions:**
```
Plan #5 (7d):   0xabcc0ecd89b3dd6a69c1b9c4c017f2f99cf60e73f2daf6c898464691905cf0f8
Plan #6 (30d):  0xcba3308044a0541378cb209d31e97a2f7173b896a35768bcc608ed82229c072e
Plan #7 (90d):  0xcdfd3b9a8d51b677b2d07419f5ae1fcb106a498c1da96de84b31866bcb2817ac
Plan #8 (180d): 0x29eb976eb2f184fbc3d5f18ad305d05f8b964d58a9c51be308572d33c0932f16
```

**Verification:**
```
Plan #5: 604800 seconds = 7 days    APR: 5%   ✅
Plan #6: 2592000 seconds = 30 days  APR: 8%   ✅
Plan #7: 7776000 seconds = 90 days  APR: 12%  ✅
Plan #8: 15552000 seconds = 180 days APR: 15% ✅
```

---

## 🔄 CÁC BƯỚC TIẾP THEO

### 1. Update Frontend để dùng Plans mới

**File cần update**: 
- `term-deposit-dapp/src/components/Admin/AdminPlansView/AdminPlansView.tsx`
- `term-deposit-dapp/src/components/Plans/PlansList.tsx`
- `term-deposit-dapp/src/hooks/usePlans.ts`

**Thay đổi**:
```typescript
// OLD: Load plans 1-4
const planIds = [1, 2, 3, 4];

// NEW: Load plans 5-8
const planIds = [5, 6, 7, 8];
```

### 2. Implement Deposit State Logic

Deposit có 4 states dựa vào time:

```typescript
enum DepositState {
  // 1. Before Maturity (now < maturityAt)
  BEFORE_MATURITY: {
    button: "Early Withdraw",
    action: earlyWithdraw(depositId),
    penalty: `${penaltyBps / 100}%`,
    color: "red"
  },
  
  // 2. At Maturity (maturityAt <= now < maturityAt + gracePeriod)
  AT_MATURITY: {
    buttons: ["Withdraw", "Renew"],
    actions: [
      withdrawAtMaturity(depositId),
      renewDeposit(depositId, newPlanId)
    ],
    color: "green"
  },
  
  // 3. After Grace Period (now >= maturityAt + gracePeriod)
  AFTER_GRACE: {
    button: "Auto Renew",
    action: autoRenewDeposit(depositId),
    color: "yellow"
  },
  
  // 4. Closed (status != Active)
  CLOSED: {
    display: statusName, // "Withdrawn", "ManualRenewed", "AutoRenewed"
    noActions: true,
    color: "gray"
  }
}
```

### 3. Update `useUserDeposits.ts` Hook

```typescript
export function useUserDeposits() {
  const getDepositState = (deposit: Deposit): DepositState => {
    const now = Math.floor(Date.now() / 1000);
    const gracePeriod = 3 * 24 * 60 * 60; // 3 days
    
    // Not active
    if (deposit.status !== 0) {
      return {
        type: 'CLOSED',
        statusName: ['Active', 'Withdrawn', 'ManualRenewed', 'AutoRenewed'][deposit.status]
      };
    }
    
    // Before maturity
    if (now < deposit.maturityAt) {
      const penalty = (deposit.principal * deposit.penaltyBpsAtOpen) / 10000;
      return {
        type: 'BEFORE_MATURITY',
        timeToMaturity: deposit.maturityAt - now,
        penalty: penalty,
        penaltyPercent: deposit.penaltyBpsAtOpen / 100
      };
    }
    
    // After grace period
    if (now >= deposit.maturityAt + gracePeriod) {
      return {
        type: 'AFTER_GRACE',
        overdueBy: now - (deposit.maturityAt + gracePeriod)
      };
    }
    
    // At maturity (in grace period)
    const interest = calculateInterest(deposit);
    return {
      type: 'AT_MATURITY',
      graceTimeLeft: (deposit.maturityAt + gracePeriod) - now,
      interest: interest,
      totalReturn: deposit.principal + interest
    };
  };
  
  return { deposits, getDepositState };
}
```

### 4. Update DepositCard Component

```tsx
function DepositCard({ deposit }: { deposit: Deposit }) {
  const state = useDepositState(deposit);
  
  return (
    <div className="deposit-card">
      <h3>Deposit #{deposit.id}</h3>
      <p>Principal: {formatUSDC(deposit.principal)}</p>
      <p>Status: {state.statusName}</p>
      
      {state.type === 'BEFORE_MATURITY' && (
        <>
          <p>Time to Maturity: {formatDuration(state.timeToMaturity)}</p>
          <button onClick={() => earlyWithdraw(deposit.id)} className="btn-red">
            Early Withdraw (Penalty: {state.penaltyPercent}%)
          </button>
          <p className="warning">
            You'll receive: {formatUSDC(deposit.principal - state.penalty)}
          </p>
        </>
      )}
      
      {state.type === 'AT_MATURITY' && (
        <>
          <p>✅ Matured! Grace period: {formatDuration(state.graceTimeLeft)}</p>
          <button onClick={() => withdrawAtMaturity(deposit.id)} className="btn-green">
            Withdraw ({formatUSDC(state.totalReturn)})
          </button>
          <button onClick={() => showRenewModal(deposit.id)} className="btn-blue">
            Renew to New Plan
          </button>
        </>
      )}
      
      {state.type === 'AFTER_GRACE' && (
        <>
          <p>⚠️ Grace period expired ({formatDuration(state.overdueBy)} ago)</p>
          <button onClick={() => autoRenew(deposit.id)} className="btn-yellow">
            Auto Renew (Required)
          </button>
        </>
      )}
      
      {state.type === 'CLOSED' && (
        <p className="text-gray">Status: {state.statusName} - No actions available</p>
      )}
    </div>
  );
}
```

### 5. Tạo Helper Functions

```typescript
// helpers/time.ts
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function calculateInterest(deposit: Deposit): bigint {
  const tenorSeconds = deposit.maturityAt - deposit.startAt;
  return (deposit.principal * deposit.aprBpsAtOpen * BigInt(tenorSeconds)) 
         / (BigInt(365 * 24 * 60 * 60) * 10000n);
}
```

---

## 📝 SCRIPTS CHẠY ĐỂ VERIFY

```bash
# 1. Verify plans mới
npx hardhat run scripts/debug-plan-details.ts --network sepolia

# 2. Check deposit states
npx hardhat run scripts/debug-deposit-states.ts --network sepolia

# 3. Test deposit với plans mới
npx hardhat run scripts/test-deposit-flow.ts --network sepolia
```

---

## 🎯 EXPECTED RESULTS SAU KHI FIX

### Frontend - Plans Page
```
✅ Flexible Saver (7d)       | 5% APR  | Duration: 7 days
✅ Growth Builder (30d)      | 8% APR  | Duration: 30 days
✅ Wealth Maximizer (90d)    | 12% APR | Duration: 90 days
✅ Premium Plus (180d)       | 15% APR | Duration: 180 days
```

### Frontend - My Deposits
```
Deposit #3 - ACTIVE
- Principal: 10,000 USDC
- APR: 5%
- Tenor: 7 days
- Start: Jan 31, 2026
- Maturity: Feb 7, 2026
- Time left: 6 days 23 hours
- Status: Before Maturity
[Early Withdraw] Button (Penalty: 3%)
```

### Frontend - NFT Gallery
```
Certificate #1 - Withdrawn ⚫
Certificate #2 - Active ✅
Certificate #3 - Active ✅
Certificate #4 - ManualRenewed 🔄
```

---

## ⚠️ IMPORTANT NOTES

1. **Old plans (1-4) đã bị disable** - Không thể tạo deposits mới
2. **Old deposits vẫn valid** - Deposits từ plans cũ vẫn active và có thể withdraw/renew
3. **Frontend cần update** - Phải dùng planIds 5-8 thay vì 1-4
4. **Tenor is immutable** - Không thể update tenor của plans đã tạo
5. **Admin phải cẩn thận** - Khi tạo plans mới, phải pass **seconds** chứ không phải days

---

## 📚 CONTRACT ADDRESSES (Sepolia)

```
SavingLogic:        0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb
DepositVault:       0x0C8cFf298Da75dE2f88a00D970DD0cF23FF1cE45
DepositCertificate: 0xe6c9dc8ac77e8c2cafa3029c85ea980b72ad5d21
VaultManager:       0x19b40d0C869a45b3Ad238FB5FB41bD92f6Dc4989
MockUSDC:           0x73a9bEc9B836007904A19C30B2FD9B2f7A6720BA
```

**Active Plans**: #5, #6, #7, #8  
**Disabled Plans**: #1, #2, #3, #4

---

✅ **SUMMARY**: Đã fix root cause của duration issue và tạo plans mới đúng. Frontend cần update để sử dụng plans mới và implement deposit state logic.
