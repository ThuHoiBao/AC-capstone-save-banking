# 🚀 MASTER PLAN - 1-WEEK SPRINT (JSON Metadata)

> **Tái cấu trúc Term Deposit DApp với JSON-based metadata (No Database)**
>
> **Ngày bắt đầu:** 29/01/2026  
> **Deadline:** 7 ngày  
> **Kiến trúc:** On-chain Critical Data + Static JSON Files  
> **Backend:** Express.js (50 dòng) + JSON files  
> **Deploy:** Vercel (free)

---

## 🎯 OVERVIEW: JSON-Based Approach

```
ON-CHAIN (Blockchain)               OFF-CHAIN (Static JSON)
────────────────────────            ──────────────────────────
DepositCertificate.sol              metadata-api/
├─ depositId, principal      ←──→   ├─ public/plans/
├─ dates, APR, penalty               │  ├─ plan-1.json  ← Edit này!
└─ tokenURI() → API                  │  ├─ plan-2.json
                                     │  └─ plan-3.json
SavingLogic.sol                      ├─ public/images/
├─ createPlan()                      │  ├─ plan-icons/
├─ openDeposit()                     │  └─ nft-bg.png
└─ withdraw()                        └─ server.js (Express)

VaultManager.sol                     Deployment: Vercel/Railway
└─ Keep as-is                        Cost: $0 (free tier)
```

**Key Benefits:**
- ✅ **No Database:** Chỉ cần JSON files
- ✅ **Easy Update:** Sửa JSON → git push → done
- ✅ **Cost $0:** Vercel free hosting
- ✅ **Version Control:** Git history cho metadata
- ✅ **Multi-language:** Add keys to JSON
- ✅ **1-Week Sprint:** Thay vì 3 tuần

---

## 📅 1-WEEK IMPLEMENTATION PLAN

**Day 1-2:** Smart Contracts + Deploy Sepolia  
**Day 3-4:** Metadata API + JSON files + Deploy Vercel  
**Day 5-7:** Frontend Integration + Testing + Launch

---

## 📅 WEEK 1: SMART CONTRACTS

### Day 1-2: Core Contracts

**✅ Tasks:**

## 📊 Progress Tracker

### ✅ WEEK 0: Analysis & Design (COMPLETED)
- [x] Phân tích SavingCore.sol hiện tại (365 dòng monolithic)
- [x] Xác định vi phạm SOLID principles
- [x] Thiết kế kiến trúc 3-layer mới
- [x] Tạo ARCHITECTURE_REDESIGN_PLAN.md (100KB comprehensive)
- [x] Plan hybrid on-chain/off-chain metadata strategy

---

### 🔵 WEEK 1: SMART CONTRACTS (IN PROGRESS)

#### Day 1-2: Core Contracts ⏳
- [ ] **DepositCertificate.sol** (NEW - ERC721 NFT Only)
  ```solidity
  // contracts/DepositCertificate.sol
  - struct DepositCore (on-chain critical data)
  - enum DepositStatus (Active/Withdrawn/Renewed)
  - function mint() → onlySavingLogic
  - function updateStatus() → onlySavingLogic
  - function getDepositCore() → view
  - function tokenURI() → points to API
  - function setSavingLogic() → admin (upgrade capability)
   📋 DAY 1-2: SMART CONTRACTS 🔨

### Tasks:
  // contracts/SavingLogic.sol
  - struct PlanCore (on-chain rules only)
  - IDepositCertificate certificate (dependency injection)
  - IVaultManager vaultManager (dependency injection)
  - function createPlan()
  - function openDeposit() → delegates mint to Certificate
  - ReentrancyGuard on all mutations
  ```
- [ ] **IDepositCertificate.sol** (NEW - Interface)
  ```solidity
  // contracts/interfaces/IDepositCertificate.sol
  interface IDepositCertificate {
      function mint(...) external;
      function updateStatus(...) external;
      function getDepositCore(...) external view returns (DepositCore);
      function ownerOf(...) external view returns (address);
  }
  ```
- [ ] **Update VaultManager.sol** (Minor changes)
  ```solidity
  // Change: savingCore → savingLogic
  address public savingLogic;  // Renamed from savingCore
  
  modifier onlySavingLogic() {  // Renamed
      require(msg.sender == savingLogic, "Only SavingLogic");
      _;
  }
  ```

### Tests:
- [ ] `test/depositCertificate.spec.ts`
  - mint() only by authorized
  - tokenURI() returns correct endpoint
  - getDepositCore() returns struct
  
- [ ] `test/savingLogic.spec.ts`
  - openDeposit() mints NFT
  - withdrawAtMaturity() calculates interest
  - earlyWithdraw() applies penalty

### Deploy to Sepolia:
```bash
npx hardhat deploy --network sepolia
npx hardhat verify --network sepolia <address>
```

**🎯 Success:** Contracts deployed + verified on Etherscan

---

## 📋 DAY 3-4: METADATA API + JSON 🖥️

### 1. Setup Project Structure:
```bash
mkdir metadata-api
cd metadata-api
npm init -y
npm install express cors ethers dotenv
```

### 2. Create JSON Files:

**File:** `public/plans/plan-1.json`
```json
{
  "planId": 1,
  "metadata": {
    "names": {
      "en": "90-Day Savings Plus",
      "vi": "Gói Tiết Kiệm 90 Ngày"
    },
    "descriptions": {
      "en": "Perfect for short-term goals",
      "vi": "Hoàn hảo cho mục tiêu ngắn hạn"
    },
    "icon": "/images/plan-1-icon.png",
    "color": "#3B82F6",
    "benefits": [
      {"en": "7.2% APR", "vi": "7.2% lãi suất"},
      {"en": "Flexible withdrawal", "vi": "Rút linh hoạt"}
    ],
    "tags": ["Short-term", "Popular"]
  }
}
```

**Tương tự cho:** `plan-2.json`, `plan-3.json`

### 3. Add Images:
```
public/images/
├─ plan-1-icon.png   (256x256)
├─ plan-2-icon.png
├─ plan-3-icon.png
└─ certificate-bg.png (1000x1400)
```

### 4. Implement Server (`server.js`):
```javascript
const express = require('express');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Setup contract
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const certificate = new ethers.Contract(
  process.env.CERTIFICATE_ADDRESS,
  require('./abis/DepositCertificate.json'),
  provider
);

// 🎯 Main endpoint
app.get('/metadata/:tokenId', async (req, res) => {
  const tokenId = parseInt(req.params.tokenId);
  
  // 1. Fetch on-chain
  const depositCore = await certificate.getDepositCore(tokenId);
  
  // 2. Load plan metadata
  const plan = require(`./public/plans/plan-${depositCore.planId}.json`);
  
  // 3. Build ERC721 metadata
  const metadata = {
    name: `Deposit Certificate #${tokenId}`,
    description: `${plan.metadata.names.en} | ${ethers.formatUnits(depositCore.principal, 6)} USDC`,
    image: `/images/certificate-bg.png`,
    attributes: [
      { trait_type: "Plan", value: plan.metadata.names.en },
      { trait_type: "Principal", value: parseFloat(ethers.formatUnits(depositCore.principal, 6)) },
      { trait_type: "APR", value: depositCore.aprBps / 100 }
    ]
  };
  
  res.json(metadata);
});

app.get('/api/plans', (req, res) => {
  const plans = [
    require('./public/plans/plan-1.json'),
    require('./public/plans/plan-2.json'),
    require('./public/plans/plan-3.json')
  ];
  res.json(plans);
});

app.listen(PORT, () => console.log(`API running on :${PORT}`));
```

### 5. Test Locally:
```bash
npm start
curl http://localhost:3001/api/plans
curl http://localhost:3001/metadata/1
```

### 6. Deploy to Vercel:
```bash
vercel deploy
# URL: https://term-deposit-api.vercel.app
```

**🎯 Success:** API trả về metadata đúng format

---

## 📋 DAY 5-7: FRONTEND INTEGRATION ⚛️

### 1. Create Hooks:

**File:** `hooks/useDeposit.ts`
```typescript
import { useState, useEffect } from 'react';
import { useContractRead } from 'wagmi';

const API_URL = 'https://term-deposit-api.vercel.app';

export const useDeposit = (tokenId: number) => {
  const [metadata, setMetadata] = useState(null);
  
  // Fetch on-chain
  const { data: depositCore } = useContractRead({
    address: CERTIFICATE_ADDRESS,
    abi: CertificateABI,
    functionName: 'getDepositCore',
    args: [tokenId]
  });
  
  // Fetch off-chain
  useEffect(() => {
    if (!tokenId) return;
    
    fetch(`${API_URL}/metadata/${tokenId}`)
      .then(r => r.json())
      .then(setMetadata);
  }, [tokenId]);
  
  return { depositCore, metadata };
};
```

**File:** `hooks/usePlans.ts`
```typescript
export const usePlans = () => {
  const [plans, setPlans] = useState([]);
  
  useEffect(() => {
    fetch(`${API_URL}/api/plans`)
      .then(r => r.json())
      .then(setPlans);
  }, []);
  
  return { plans };
};
```

### 2. Update Components:

**File:** `components/PlanCard.tsx`
```typescript
export const PlanCard = ({ plan }: { plan: any }) => {
  return (
    <div style={{ borderColor: plan.metadata.color }}>
      <img src={plan.metadata.icon} alt={plan.metadata.names.en} />
      <h3>{plan.metadata.names.vi}</h3>  {/* Multi-language */}
      <p>{plan.metadata.descriptions.vi}</p>
      
      <div>
        {plan.metadata.benefits.map((b: any) => (
          <div key={b.vi}>✓ {b.vi}</div>
        ))}
      </div>
      
      <button>Mở sổ tiết kiệm</button>
    </div>
  );
};
```

### 3. Update Pages:

**File:** `pages/PlansPage.tsx`
```typescript
export const PlansPage = () => {
  const { plans } = usePlans();
  
  return (
    <div className="plans-grid">
      {plans.map(plan => (
        <PlanCard key={plan.planId} plan={plan} />
      ))}
    </div>
  );
};
```

### 4. Test Full Flow:
- [ ] View plans (off-chain names/icons)
- [ ] Open deposit (on-chain transaction)
- [ ] View deposit detail (hybrid data)
- [ ] Withdraw (on-chain)
- [ ] Check OpenSea (NFT metadata)

### 5. Deploy Frontend:
```bash
npm run build
vercel deploy
```

**🎯 Success:** Full flow working end-to-end

---

## 🔧 HOW TO UPDATE METADATA

### Scenario: Đổi tên plan từ "90-Day" → "90-Day Premium"

```bash
# 1. Edit JSON
vim metadata-api/public/plans/plan-1.json

# Change:
"names": {
  "en": "90-Day Premium Savings",  # ← Updated
  "vi": "Gói Tiết Kiệm Premium 90 Ngày"
}

# 2. Commit & push
git add .
git commit -m "Update plan 1 name to Premium"
git push

# 3. Vercel auto-deploy (~30 seconds)
# Done! Metadata updated
```

**No SQL, no migration, no database restart!**

---

## 📊 PROGRESS TRACKER

### ✅ COMPLETED (Old Architecture)
- [x] SavingCore.sol monolithic (365 dòng)
- [x] Basic tests
- [x] Deploy to Sepolia

### 🔵 DAY 1-2: Smart Contracts ⏳
- [ ] DepositCertificate.sol (ERC721 only)
  - [ ] getDepositCore() struct
  - [ ] tokenURI() → API endpoint
  - [ ] mint() onlySavingLogic
- [ ] SavingLogic.sol (Business logic)
  - [ ] IDepositCertificate interface
  - [ ] openDeposit() delegates mint
- [ ] Tests (>95% coverage)
- [ ] Deploy to Sepolia
- [ ] Verify on Etherscan

### 🔵 DAY 3-4: Metadata API ⏳
- [ ] Create metadata-api/ folder
- [ ] Write JSON files:
  - [ ] plan-1.json (90-Day)
  - [ ] plan-2.json (180-Day)
  - [ ] plan-3.json (365-Day)
- [ ] Add images (icons + NFT background)
- [ ] Implement server.js (Express)
- [ ] Test endpoints locally
- [ ] Deploy to Vercel

### 🔵 DAY 5-7: Frontend ⏳
- [ ] Create hooks:
  - [ ] useDeposit(tokenId)
  - [ ] usePlans()
- [ ] Update components:
  - [ ] PlanCard (show JSON metadata)
  - [ ] DepositCard (hybrid data)
- [ ] Update pages:
  - [ ] /plans
  - [ ] /deposit/:id
- [ ] Test multi-language (vi/en)
- [ ] Deploy to Vercel
- [ ] Launch! 🚀
- [ ] **Implement SavingLogic functions:**
  - [ ] `openDeposit(planId, amount)` - Delegates to certificate.mint()
  - [ ] `withdrawAtMaturity(depositId)` - Queries certificate.ownerOf()
  - [ ] `earlyWithdraw(depositId)` - Penalty calculation
  - [ ] `renewDeposit(oldId, newPlanId)` - Compound interest
  
- [ ] **Write comprehensive tests:**
  - [ ] `test/depositCertificate.spec.ts`
    - mint() only callable by authorized logic
    - updateStatus() changes deposit status
    - tokenURI() returns correct API endpoint
    - setSavingLogic() allows upgrade
  
  - [ ] `test/savingLogic.spec.ts`
    - createPlan() stores PlanCore correctly
    - openDeposit() mints NFT via Certificate
    - withdrawAtMaturity() calculates interest from snapshot
    - earlyWithdraw() applies penalty from snapshot
    - renewDeposit() compounds interest correctly
  
  - [ ] `test/integration.spec.ts`
    - Full flow: Create plan → Open deposit → Withdraw
    - Upgrade scenario: Deploy LogicV2 → setSavingLogic → Test

**🎯 Success Criteria:**
- ✅ Test coverage >95%
- ✅ All edge cases covered (maturity, penalties, upgrades)
- ✅ Gas optimization verified

#### Day 5: Deployment & Verification 🚀
- [ ] **Create deployment scripts:**
  ```javascript
  // deploy/01-deploy-certificate.ts
  - Deploy DepositCertificate
  - Set baseURI to "https://api.yourdapp.com/metadata/"
  
  // deploy/02-deploy-logic.ts
  - Deploy SavingLogic (with Certificate + Vault addresses)
  
  // deploy/03-configure.ts
  - Certificate.setSavingLogic(logicAddress)
  - VaultManager.setSavingCore(logicAddress)
  
  // deploy/04-seed-data.ts
  - Create plans (90-day, 180-day, 365-day)
  - Fund vault with 500,000 USDC
  ```

- [ ] **Deploy to networks:**
  - [ ] Localhost (hardhat node)
    ```bash
    npx hardhat node
    npx hardhat deploy --network localhost
    npx hardhat test --network localhost
    ```
  
  - [ ] Sepolia testnet
    ```bash
    npx hardhat deploy --network sepolia
    npx hardhat verify --network sepolia <address>
    ```

- [ ] **Verify contracts on Etherscan**
  - [ ] DepositCertificate verified
  - [ ] SavingLogic verified
  - [ ] VaultManager verified (updated)

**🎯 Success Criteria:**
- ✅ All contracts deployed successfully
- ✅ Configuration correct (permissions set)
- ✅ Verified on Etherscan with green checkmarks
- ✅ Test transactions work on Sepolia

---

### 🟢 WEEK 2: OFF-CHAIN INFRASTRUCTURE

#### Day 1-2: Backend API 🖥️
- [ ] **Setup Node.js + Express API**
  ```
  metadata-api/
  ├─ src/
  │  ├─ server.ts
  │  ├─ routes/
  │  │  ├─ metadata.ts
  │  │  └─ plans.ts
  │  ├─ services/
  │  │  ├─ blockchain.ts
  │  │  └─ database.ts
  │  └─ db/
  │     ├─ schema.sql
  │     └─ seed.sql
  ├─ .env
  └─ package.json
  ```

- [ ] **Implement endpoints:**
  - [ ] `GET /metadata/:tokenId?v=1`
    - Fetch on-chain: certificate.getDepositCore(tokenId)
    - Fetch off-chain: db.query('plans_metadata WHERE plan_id = ?')
    - Merge & return ERC721 metadata JSON
  
  - [ ] `GET /api/plans`
    - Fetch all plans (on-chain + off-chain)
    - Return combined data with translations
  
  - [ ] `GET /api/deposits/:tokenId`
    - Full deposit info (hybrid data)
    - Calculate expected interest
    - Time to maturity

- [ ] **Setup caching with Redis**
  - [ ] Cache metadata responses (5 min TTL)
  - [ ] Cache plans list (10 min TTL)
  - [ ] Invalidation via ?v= query param

**🎯 Success Criteria:**
- ✅ API responds < 200ms (cached)
- ✅ All endpoints return correct data
- ✅ Error handling for invalid tokenIds

#### Day 3: Database & Metadata 💾
- [ ] **Setup PostgreSQL**
  ```sql
  CREATE TABLE plans_metadata (
      id SERIAL PRIMARY KEY,
      plan_id INTEGER NOT NULL UNIQUE,
      names JSONB NOT NULL,  -- {"en": "...", "vi": "..."}
      descriptions JSONB NOT NULL,
      icon_url VARCHAR(255),
      benefits JSONB,
      ...
  );
  ```

- [ ] **Insert sample data**
  ```sql
  INSERT INTO plans_metadata (plan_id, names, descriptions) VALUES
  (1, 
   '{"en": "90-Day Savings", "vi": "Gói Tiết Kiệm 90 Ngày"}',
   '{"en": "Perfect for short-term goals", "vi": "Hoàn hảo cho mục tiêu ngắn hạn"}'
  );
  ```

- [ ] **Setup CDN for images**
  - [ ] Upload plan icons (64x64)
  - [ ] Upload NFT certificate templates (1000x1400)
  - [ ] Configure Cloudflare CDN

**🎯 Success Criteria:**
- ✅ Database schema created
- ✅ Sample data inserted
- ✅ Images accessible via CDN

#### Day 4-5: Testing & Deployment ☁️
- [ ] **Integration testing**
  - [ ] Test API with real smart contract data
  - [ ] Test all languages (vi/en/cn)
  - [ ] Test OpenSea metadata format

- [ ] **Deploy to production**
  - [ ] Deploy API to Railway/Vercel
  - [ ] Setup environment variables
  - [ ] Configure CORS for frontend
  - [ ] Test production endpoints

**🎯 Success Criteria:**
- ✅ API live at https://api.yourdapp.com
- ✅ 99.9% uptime
- ✅ SSL certificate valid

---

### 🔵 WEEK 3: FRONTEND INTEGRATION

#### Day 1-2: React Hooks 🪝
- [ ] **Create custom hooks**
  ```typescript
  // hooks/useDeposit.ts
  export const useDeposit = (tokenId: number) => {
      const [data, setData] = useState(null);
      
      useEffect(() => {
          // 1. Fetch on-chain
          const depositCore = await certificate.getDepositCore(tokenId);
          
          // 2. Fetch off-chain
          const tokenURI = await certificate.tokenURI(tokenId);
          const metadata = await fetch(tokenURI).then(r => r.json());
          
          // 3. Merge
          setData({ onchain: depositCore, offchain: metadata });
      }, [tokenId]);
      
      return data;
  };
  ```

- [ ] **Create hooks:**
  - [ ] `useDeposit(tokenId)` - Hybrid data for single deposit
  - [ ] `usePlan(planId)` - Hybrid data for plan
  - [ ] `useAllPlans()` - All plans with off-chain metadata
  - [ ] `useUserDeposits(address)` - User's NFT collection

#### Day 3-4: Components & Pages 🎨
- [ ] **Update components**
  - [ ] `PlanCard.tsx` - Show off-chain names, images, benefits
  - [ ] `DepositCard.tsx` - Display hybrid data (principal from chain, image from API)
  - [ ] `OpenDepositForm.tsx` - Select plan with rich metadata
  - [ ] `WithdrawButton.tsx` - Show expected interest from on-chain calc

- [ ] **Update pages**
  - [ ] `/plans` - Grid of plans with off-chain metadata
  - [ ] `/deposit/:id` - Detail page with hybrid data
  - [ ] `/my-deposits` - User's NFT gallery

#### Day 5: Testing & Launch 🚀
- [ ] **E2E testing**
  - [ ] Test complete flow (open → withdraw → renew)
  - [ ] Test multi-language switching
  - [ ] Test mobile responsiveness

- [ ] **Deploy frontend**
  - [ ] Build production: `npm run build`
  - [ ] Deploy to Vercel
  - [ ] Configure .env with production addresses
  - [ ] Test on Sepolia before mainnet

**🎯 Final Success Criteria:**
- ✅ All features working end-to-end
- ✅ UI shows both on-chain and off-chain data
- ✅ Multi-language support functional
- ✅ Gas costs reduced as planned
- ✅ NFTs display correctly on OpenSea

---

## 📈 Key Metrics & KPIs

```
┌────────────────────────────────────────────────────────────────┐
│                    SUCCESS METRICS                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Gas Efficiency:                                               │
│  □ Plan creation: <35,000 gas (target: 30k)                   │
│  □ Deposit: <240,000 gas (target: 235k)                       │
│  □ Withdraw: <185,000 gas (target: 180k)                      │
│                                                                │
│  Test Coverage:                                                │
│  □ Unit tests: >95%                                            │
│  □ Integration tests: >90%                                     │
│  □ Edge cases: All covered                                     │
│                                                                │
│  SOLID Compliance:                                             │
│  □ Single Responsibility: ✅ (3 contracts, 1 job each)        │
│  □ Open/Closed: ✅ (upgradeable via setSavingLogic)           │
│  □ Liskov Substitution: ✅ (interface-based)                  │
│  □ Interface Segregation: ✅ (small interfaces)               │
│  □ Dependency Inversion: ✅ (dependency injection)            │
│                                                                │
│  User Experience:                                              │
│  □ API response time: <200ms                                  │
│  □ Frontend load time: <2s                                    │
│  □ Multi-language: vi/en/cn supported                         │
│  □ OpenSea compatibility: ✅                                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

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
