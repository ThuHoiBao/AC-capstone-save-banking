# Duration Display Fix & Deposit State Management - Summary

## Problem Statement

The frontend was showing "0 days" for all plan durations and deposit tenors across:
- Plans page
- My Deposits page  
- Admin page
- NFT Gallery

Additionally, the deposit state management needed to be implemented with proper action buttons based on maturity time and grace period.

## Root Cause Analysis

**Plans Created with Incorrect Tenor Values:**
- Plans 1-4 were created with **days** instead of **seconds**:
  - Plan #1: 30 (should be 604800 seconds for 7 days)
  - Plan #2: 90 (should be 2592000 seconds for 30 days)
  - Plan #3: 180 (should be 7776000 seconds for 90 days)
  - Plan #4: 2592000 (should be 15552000 seconds for 180 days)

## Solution Implemented

### 1. Created New Plans with Correct Tenor Values

Created Plans 5-8 on Sepolia testnet with proper tenor in seconds:

| Plan ID | Duration | Tenor (seconds) | APR  | Transaction Hash |
|---------|----------|-----------------|------|------------------|
| #5      | 7 days   | 604,800         | 5%   | 0xabcc0ecd...    |
| #6      | 30 days  | 2,592,000       | 8%   | 0xcba33080...    |
| #7      | 90 days  | 7,776,000       | 12%  | 0xcdfd3b9a...    |
| #8      | 180 days | 15,552,000      | 15%  | 0x29eb976e...    |

**Scripts Created:**
- `scripts/debug-plan-details.ts` - Diagnostic script to verify plan tenor values
- `scripts/recreate-plans.ts` - Disable old plans and create new ones

### 2. Created Time Utility Functions

**File:** `term-deposit-dapp/src/utils/time.ts`

**Key Functions:**
```typescript
// Format duration in human-readable format
formatDuration(seconds: number): string
// Examples: "7 days", "2h 30m", "45m 20s"

// Get deposit state based on current time vs maturity
getDepositState(startAt, maturityAt, status, gracePeriod): DepositState
// Returns: before_maturity, at_maturity, after_grace, or closed

// Calculate time remaining until timestamp
getTimeRemaining(targetTimestamp: number): number

// Format date/time
formatDate(timestamp: bigint): string
formatDateTime(timestamp: bigint): string

// Get progress percentage
getTimeProgress(startAt, maturityAt): number
```

**Deposit States:**
- `before_maturity`: Active, not yet matured → Show "Early Withdraw" button
- `at_maturity`: Matured, in grace period (3 days) → Show "Withdraw" + "Renew" buttons
- `after_grace`: Grace period expired → Show "Auto Renew Required" button
- `closed`: Withdrawn or renewed → Show status only

### 3. Updated Frontend Components

#### A. DataAggregator Service
**File:** `term-deposit-dapp/src/services/dataAggregator.ts`

**Change:**
```typescript
// OLD: Load all plans (1 to MAX_PLANS)
const MAX_PLANS = await this.getPlanCount(savingLogicContract);

// NEW: Load only active plans (5-8)
const ACTIVE_PLAN_IDS = [5, 6, 7, 8];
```

#### B. PlanList Component
**File:** `term-deposit-dapp/src/components/user/PlanList/PlanList.tsx`

**Changes:**
- Added import: `import { formatDuration } from '../../../utils/time'`
- Replaced `DataAggregator.tenorSecondsToDays()` with `formatDuration()`
- Added "Duration" field to plan card display

#### C. MyDeposits Component
**File:** `term-deposit-dapp/src/components/user/MyDeposits/MyDeposits.tsx`

**Major Changes:**

1. **Import Time Utilities:**
```typescript
import { formatDuration, getDepositState } from '../../../utils/time';
```

2. **Updated getStatusCategory Function:**
```typescript
const getStatusCategory = (deposit: Deposit): string => {
  const gracePeriod = 259200; // 3 days in seconds
  const state = getDepositState(
    Number(deposit.core.startAt),
    Number(deposit.core.maturityAt),
    Number(deposit.core.status),
    gracePeriod
  );
  // Returns: active, matured, auto_renew_required, withdrawn, renewed
};
```

3. **Implemented State-Based Action Buttons:**
```typescript
{statusCategory === 'active' && (
  <Button variant="danger" onClick={() => handleEarlyWithdraw(deposit.depositId)}>
    Early Withdraw (Penalty: {Number(deposit.core.penaltyBpsAtOpen) / 100}%)
  </Button>
)}

{statusCategory === 'matured' && (
  <>
    <Button onClick={() => handleWithdraw(deposit.depositId)}>Withdraw Funds</Button>
    <Button variant="outline" onClick={() => handleRenew(deposit.depositId, deposit.core.planId)}>
      Renew Deposit
    </Button>
  </>
)}

{statusCategory === 'auto_renew_required' && (
  <Button variant="warning" onClick={() => handleRenew(deposit.depositId, deposit.core.planId)}>
    Auto Renew Required
  </Button>
)}
```

#### D. Admin Page
**File:** `term-deposit-dapp/src/pages/Admin/Admin.tsx`

- Added import: `import { formatDuration } from '../../utils/time'`
- Updated plan display to use `formatDuration()`

#### E. NFT Gallery
**File:** `term-deposit-dapp/src/components/user/NFTGallery/NFTGallery.tsx`

- Fetch deposit data alongside certificates
- Calculate proper status for each NFT using `getDepositState()`
- Update NFT metadata with actual status instead of hardcoded "Active"

## Deposit State Logic

### Grace Period
- **Duration:** 3 days (259,200 seconds)
- **Purpose:** Allow users to manually withdraw or renew after maturity

### State Transitions

```
Active (before_maturity)
    ↓ (time >= maturityAt)
Matured (at_maturity) - Grace period starts
    ↓ (time < maturityAt + gracePeriod)
    ├─→ User Withdraws → MaturedWithdrawn (closed)
    └─→ User Renews → ManualRenewed (closed)
    ↓ (time >= maturityAt + gracePeriod)
Auto Renew Required (after_grace)
    └─→ User Auto Renews → AutoRenewed (closed)
```

### Action Buttons by State

| State | Buttons Available | Description |
|-------|------------------|-------------|
| before_maturity | Early Withdraw | Can withdraw with penalty |
| at_maturity | Withdraw + Renew | Manual withdrawal or renewal within grace period |
| after_grace | Auto Renew Required | Grace period expired, must auto-renew |
| closed | None | Deposit finalized (withdrawn or renewed) |

## Files Modified

1. **Scripts (Created):**
   - `scripts/debug-plan-details.ts`
   - `scripts/recreate-plans.ts`

2. **Utilities (Created):**
   - `term-deposit-dapp/src/utils/time.ts`

3. **Services (Modified):**
   - `term-deposit-dapp/src/services/dataAggregator.ts`

4. **Components (Modified):**
   - `term-deposit-dapp/src/components/user/PlanList/PlanList.tsx`
   - `term-deposit-dapp/src/components/user/MyDeposits/MyDeposits.tsx`
   - `term-deposit-dapp/src/components/user/NFTGallery/NFTGallery.tsx`

5. **Pages (Modified):**
   - `term-deposit-dapp/src/pages/Admin/Admin.tsx`

## Deployment Status

**Network:** Sepolia Testnet

**Active Plans:**
- Plan #5: ✅ Deployed & Verified (7 days, 5% APR)
- Plan #6: ✅ Deployed & Verified (30 days, 8% APR)
- Plan #7: ✅ Deployed & Verified (90 days, 12% APR)
- Plan #8: ✅ Deployed & Verified (180 days, 15% APR)

**Old Plans (Disabled):**
- Plan #1-4: ❌ Disabled (incorrect tenor values)

## Frontend Dev Server

```bash
cd term-deposit-dapp
npm run dev
```

**URL:** http://localhost:5174/

## Testing Checklist

### Plans Page
- [ ] Plans 5-8 display with correct durations ("7 days", "30 days", etc.)
- [ ] APR displays correctly
- [ ] Deposit button works

### My Deposits Page
- [ ] Active deposits show "Early Withdraw" button
- [ ] Matured deposits (in grace) show "Withdraw" + "Renew" buttons
- [ ] After-grace deposits show "Auto Renew Required" button
- [ ] Withdrawn deposits show status only (no buttons)
- [ ] Duration displays correctly
- [ ] Time remaining shows for active deposits

### Admin Page
- [ ] Plans 5-8 display with correct durations
- [ ] Create/edit plan forms work

### NFT Gallery
- [ ] NFTs display with correct status (not hardcoded "Active")
- [ ] Status updates based on deposit state

## Contract Addresses (Sepolia)

```
SavingLogic: 0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb
DepositVault: 0x5e0D1f9bd64E58C49CAfdB48dFC17d4c00A3A903
DepositCertificate: 0x23F97edE5B8C0C2C38F6B085a0f8b8398E8c088E
MockUSDC: 0x11Ed1bb21D76f36c47B8FE6e6CbB0fCE6C1C2e1E
```

## Summary

✅ **Fixed:** Duration showing "0 days" (root cause: wrong tenor values)
✅ **Implemented:** Deposit state management with grace period logic
✅ **Updated:** All frontend components to display correct durations
✅ **Added:** State-based action buttons (Early Withdraw, Withdraw, Renew, Auto Renew)
✅ **Improved:** NFT Gallery to show actual deposit status

**Result:** Users can now see correct plan durations and deposit states, with appropriate action buttons based on maturity time and grace period.
