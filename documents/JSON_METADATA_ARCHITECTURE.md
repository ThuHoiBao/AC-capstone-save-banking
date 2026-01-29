# 🎯 JSON-BASED METADATA ARCHITECTURE (No Database)

> **Kiến trúc siêu đơn giản: On-chain critical data + Static JSON files cho metadata**
>
> ✅ Không cần database (PostgreSQL, MySQL...)  
> ✅ Chỉ cần sửa JSON file khi muốn đổi ảnh/tên/mô tả  
> ✅ Deploy lên GitHub Pages/Vercel miễn phí  
> ✅ Dễ maintain, dễ backup, dễ version control

---

## 📐 ARCHITECTURE OVERVIEW

```
┌──────────────────────────────────────────────────────────────────┐
│                    HYBRID ARCHITECTURE                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ON-CHAIN (Blockchain - Immutable Critical Data)                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ DepositCertificate.sol (ERC721)                            │  │
│  │ - depositId, planId, principal                             │  │
│  │ - startAt, maturityAt, aprBps, penaltyBps                  │  │
│  │ - tokenURI() → "https://api.yourdapp.com/metadata/1"      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              ↓                                    │
│  OFF-CHAIN (Static JSON Files - Easy to Update)                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ metadata-api/                                              │  │
│  │ ├─ public/                                                 │  │
│  │ │  ├─ plans/                                               │  │
│  │ │  │  ├─ plan-1.json  ← Edit này để đổi tên/ảnh          │  │
│  │ │  │  ├─ plan-2.json                                      │  │
│  │ │  │  └─ plan-3.json                                      │  │
│  │ │  └─ images/                                             │  │
│  │ │     ├─ plan-1-icon.png                                  │  │
│  │ │     └─ certificate-template.png                         │  │
│  │ └─ server.js  ← Simple Express server                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              ↓                                    │
│  FRONTEND (React + TypeScript)                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Fetch on-chain: certificate.getDepositCore(tokenId)    │  │
│  │ 2. Fetch off-chain: GET /metadata/{tokenId}               │  │
│  │ 3. Merge data và hiển thị UI                              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📂 FILE STRUCTURE

```
AC-capstone-save-banking/
├─ contracts/
│  ├─ DepositCertificate.sol       ← ERC721 với tokenURI()
│  ├─ SavingLogic.sol               ← Business logic
│  └─ VaultManager.sol              ← Keep existing
│
├─ metadata-api/                    ← NEW! Simple backend
│  ├─ public/
│  │  ├─ plans/
│  │  │  ├─ plan-1.json             ← 90-Day Plan metadata
│  │  │  ├─ plan-2.json             ← 180-Day Plan metadata
│  │  │  └─ plan-3.json             ← 365-Day Plan metadata
│  │  │
│  │  ├─ images/
│  │  │  ├─ plan-1-icon.png         ← 256x256 icon
│  │  │  ├─ plan-2-icon.png
│  │  │  ├─ plan-3-icon.png
│  │  │  └─ certificate-bg.png      ← NFT background
│  │  │
│  │  └─ locales/                   ← Multi-language (optional)
│  │     ├─ en.json
│  │     └─ vi.json
│  │
│  ├─ server.js                     ← Express server (50 dòng)
│  ├─ package.json
│  └─ .env
│
└─ term-deposit-dapp/               ← Frontend
   ├─ src/
   │  ├─ hooks/
   │  │  ├─ useDeposit.ts           ← Fetch hybrid data
   │  │  └─ usePlan.ts
   │  ├─ components/
   │  │  └─ PlanCard.tsx            ← Display plan với off-chain metadata
   │  └─ pages/
   │     └─ Deposit.tsx
   └─ ...
```

---

## 📝 JSON METADATA FORMAT

### 1. Plan Metadata (Static JSON)

**File:** `metadata-api/public/plans/plan-1.json`

```json
{
  "planId": 1,
  "metadata": {
    "names": {
      "en": "90-Day Savings Plus",
      "vi": "Gói Tiết Kiệm 90 Ngày Plus",
      "zh": "90天储蓄计划"
    },
    "descriptions": {
      "en": "Perfect for short-term financial goals. Competitive APR with flexible withdrawal options.",
      "vi": "Hoàn hảo cho mục tiêu tài chính ngắn hạn. Lãi suất cạnh tranh với tùy chọn rút linh hoạt.",
      "zh": "适合短期财务目标。具有竞争力的年利率和灵活的提款选项。"
    },
    "icon": "/images/plan-1-icon.png",
    "color": "#3B82F6",
    "benefits": [
      {
        "en": "7.2% APR",
        "vi": "7.2% lãi suất/năm"
      },
      {
        "en": "Low minimum deposit (100 USDC)",
        "vi": "Gửi tối thiểu thấp (100 USDC)"
      },
      {
        "en": "Early withdrawal with 3% penalty",
        "vi": "Rút sớm với phí 3%"
      }
    ],
    "tags": ["Short-term", "Flexible", "Popular"],
    "category": "savings",
    "riskLevel": "low"
  },
  "openSeaAttributes": [
    {
      "trait_type": "Plan Type",
      "value": "Short-term Savings"
    },
    {
      "trait_type": "Tenor",
      "value": "90 Days"
    },
    {
      "display_type": "boost_percentage",
      "trait_type": "APR",
      "value": 7.2
    }
  ]
}
```

**✏️ Muốn đổi tên/ảnh?** → Chỉ cần edit file này và deploy lại!

---

### 2. Deposit/NFT Metadata (Dynamic JSON)

**Endpoint:** `GET /metadata/{tokenId}`

**Response example:** (Generated dynamically từ on-chain + static JSON)

```json
{
  "name": "Term Deposit Certificate #123",
  "description": "90-Day Savings Plus | 1000 USDC | 7.2% APR",
  "image": "https://api.yourdapp.com/images/certificate-bg.png?depositId=123",
  "external_url": "https://yourdapp.com/deposit/123",
  
  "attributes": [
    {
      "trait_type": "Plan Name",
      "value": "90-Day Savings Plus"
    },
    {
      "trait_type": "Principal",
      "display_type": "number",
      "value": 1000,
      "max_value": 100000
    },
    {
      "trait_type": "APR",
      "display_type": "boost_percentage",
      "value": 7.2
    },
    {
      "trait_type": "Status",
      "value": "Active"
    },
    {
      "trait_type": "Maturity Date",
      "display_type": "date",
      "value": 1719792000
    },
    {
      "trait_type": "Expected Interest",
      "display_type": "number",
      "value": 17.75
    }
  ],
  
  "properties": {
    "depositId": 123,
    "planId": 1,
    "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "principal": "1000000000",
    "startAt": 1711929600,
    "maturityAt": 1719792000,
    "aprBps": 720,
    "penaltyBps": 300,
    "status": "Active"
  }
}
```

---

## 🖥️ BACKEND IMPLEMENTATION (50 dòng Express)

### File: `metadata-api/server.js`

```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Setup provider + contract
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const certificateABI = require('./abis/DepositCertificate.json');
const certificate = new ethers.Contract(
  process.env.CERTIFICATE_ADDRESS,
  certificateABI,
  provider
);

// 🎯 MAIN ENDPOINT: Get deposit metadata
app.get('/metadata/:tokenId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    
    // 1. Fetch on-chain data
    const depositCore = await certificate.getDepositCore(tokenId);
    const owner = await certificate.ownerOf(tokenId);
    
    // 2. Load plan metadata từ static JSON
    const planMetadata = require(`./public/plans/plan-${depositCore.planId}.json`);
    
    // 3. Calculate expected interest
    const now = Math.floor(Date.now() / 1000);
    const duration = depositCore.maturityAt - depositCore.startAt;
    const elapsed = Math.min(now - depositCore.startAt, duration);
    const expectedInterest = (depositCore.principal * depositCore.aprBps * elapsed) 
                            / (365 * 86400 * 10000);
    
    // 4. Build ERC721 metadata
    const metadata = {
      name: `Term Deposit Certificate #${tokenId}`,
      description: `${planMetadata.metadata.names.en} | ${ethers.formatUnits(depositCore.principal, 6)} USDC | ${depositCore.aprBps / 100}% APR`,
      image: `${process.env.BASE_URL}/images/certificate-bg.png?id=${tokenId}`,
      external_url: `${process.env.FRONTEND_URL}/deposit/${tokenId}`,
      
      attributes: [
        { trait_type: "Plan Name", value: planMetadata.metadata.names.en },
        { trait_type: "Principal", display_type: "number", value: parseFloat(ethers.formatUnits(depositCore.principal, 6)) },
        { trait_type: "APR", display_type: "boost_percentage", value: depositCore.aprBps / 100 },
        { trait_type: "Status", value: ["Active", "Withdrawn", "Renewed"][depositCore.status] },
        { trait_type: "Maturity Date", display_type: "date", value: depositCore.maturityAt },
        { trait_type: "Expected Interest", display_type: "number", value: parseFloat(ethers.formatUnits(expectedInterest, 6)) }
      ],
      
      properties: {
        depositId: tokenId,
        planId: depositCore.planId,
        owner: owner,
        principal: depositCore.principal.toString(),
        startAt: depositCore.startAt,
        maturityAt: depositCore.maturityAt,
        aprBps: depositCore.aprBps,
        penaltyBps: depositCore.penaltyBps,
        status: depositCore.status
      }
    };
    
    res.json(metadata);
    
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(404).json({ error: 'Token not found' });
  }
});

// 🎯 Get all plans
app.get('/api/plans', (req, res) => {
  const plans = [
    require('./public/plans/plan-1.json'),
    require('./public/plans/plan-2.json'),
    require('./public/plans/plan-3.json')
  ];
  res.json(plans);
});

// 🎯 Get single plan
app.get('/api/plans/:planId', (req, res) => {
  try {
    const plan = require(`./public/plans/plan-${req.params.planId}.json`);
    res.json(plan);
  } catch (error) {
    res.status(404).json({ error: 'Plan not found' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Metadata API running on http://localhost:${PORT}`);
});
```

### File: `metadata-api/.env`

```bash
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
CERTIFICATE_ADDRESS=0x1234...
BASE_URL=https://api.yourdapp.com
FRONTEND_URL=https://yourdapp.com
PORT=3001
```

### File: `metadata-api/package.json`

```json
{
  "name": "term-deposit-metadata-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "ethers": "^6.9.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## ⚛️ FRONTEND IMPLEMENTATION

### Hook: `useDeposit.ts`

```typescript
import { useState, useEffect } from 'react';
import { useContractRead } from 'wagmi';
import DepositCertificateABI from '../abis/DepositCertificate.json';

const METADATA_API = 'https://api.yourdapp.com';
const CERTIFICATE_ADDRESS = '0x1234...';

export interface DepositData {
  // On-chain
  depositId: number;
  planId: number;
  principal: bigint;
  startAt: number;
  maturityAt: number;
  aprBps: number;
  penaltyBps: number;
  status: number;
  owner: string;
  
  // Off-chain (from metadata API)
  planName: string;
  planDescription: string;
  planIcon: string;
  expectedInterest: string;
  metadata: any;
}

export const useDeposit = (tokenId: number | undefined) => {
  const [data, setData] = useState<DepositData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch on-chain (wagmi hook)
  const { data: depositCore } = useContractRead({
    address: CERTIFICATE_ADDRESS,
    abi: DepositCertificateABI,
    functionName: 'getDepositCore',
    args: [tokenId],
    enabled: !!tokenId
  });

  const { data: owner } = useContractRead({
    address: CERTIFICATE_ADDRESS,
    abi: DepositCertificateABI,
    functionName: 'ownerOf',
    args: [tokenId],
    enabled: !!tokenId
  });

  // 2. Fetch off-chain metadata
  useEffect(() => {
    if (!tokenId || !depositCore || !owner) return;

    const fetchMetadata = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`${METADATA_API}/metadata/${tokenId}`);
        if (!response.ok) throw new Error('Failed to fetch metadata');
        
        const metadata = await response.json();
        
        // 3. Merge on-chain + off-chain
        setData({
          depositId: tokenId,
          planId: depositCore.planId,
          principal: depositCore.principal,
          startAt: depositCore.startAt,
          maturityAt: depositCore.maturityAt,
          aprBps: depositCore.aprBps,
          penaltyBps: depositCore.penaltyBps,
          status: depositCore.status,
          owner: owner as string,
          
          // From metadata
          planName: metadata.attributes.find((a: any) => a.trait_type === 'Plan Name')?.value || '',
          planDescription: metadata.description,
          planIcon: metadata.image,
          expectedInterest: metadata.attributes.find((a: any) => a.trait_type === 'Expected Interest')?.value || '0',
          metadata: metadata
        });
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [tokenId, depositCore, owner]);

  return { data, loading, error };
};
```

### Hook: `usePlans.ts`

```typescript
import { useState, useEffect } from 'react';
import { useContractRead } from 'wagmi';

const METADATA_API = 'https://api.yourdapp.com';

export interface PlanData {
  // On-chain
  planId: number;
  tenorSeconds: number;
  aprBps: number;
  minDeposit: bigint;
  maxDeposit: bigint;
  penaltyBps: number;
  isActive: boolean;
  
  // Off-chain (from JSON)
  name: string;
  description: string;
  icon: string;
  color: string;
  benefits: string[];
  tags: string[];
}

export const usePlans = () => {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Fetch off-chain metadata
        const response = await fetch(`${METADATA_API}/api/plans`);
        const metadata = await response.json();
        
        // TODO: Fetch on-chain data và merge
        // const planCore = await contract.getPlanCore(planId);
        
        setPlans(metadata.map((m: any) => ({
          planId: m.planId,
          name: m.metadata.names.en, // or use i18n
          description: m.metadata.descriptions.en,
          icon: m.metadata.icon,
          color: m.metadata.color,
          benefits: m.metadata.benefits.map((b: any) => b.en),
          tags: m.metadata.tags
        })));
        
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return { plans, loading };
};
```

### Component: `PlanCard.tsx`

```typescript
import React from 'react';
import { PlanData } from '../hooks/usePlans';

interface Props {
  plan: PlanData;
  onSelect: () => void;
}

export const PlanCard: React.FC<Props> = ({ plan, onSelect }) => {
  return (
    <div 
      className="plan-card"
      style={{ borderColor: plan.color }}
    >
      <img src={plan.icon} alt={plan.name} />
      <h3>{plan.name}</h3>
      <p>{plan.description}</p>
      
      <div className="benefits">
        {plan.benefits.map((benefit, i) => (
          <div key={i} className="benefit-item">✓ {benefit}</div>
        ))}
      </div>
      
      <div className="tags">
        {plan.tags.map((tag, i) => (
          <span key={i} className="tag">{tag}</span>
        ))}
      </div>
      
      <button onClick={onSelect}>Open Deposit</button>
    </div>
  );
};
```

---

## 📅 1-WEEK IMPLEMENTATION PLAN

```
┌─────────────────────────────────────────────────────────────────┐
│                     1-WEEK SPRINT                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DAY 1-2: Smart Contracts                                      │
│  ─────────────────────────────────────────────────────────────  │
│  □ Implement DepositCertificate.sol                            │
│    - tokenURI() returns API endpoint                           │
│    - getDepositCore() returns struct                           │
│  □ Implement SavingLogic.sol                                   │
│  □ Write unit tests                                            │
│  □ Deploy to Sepolia                                           │
│                                                                 │
│  DAY 3-4: Backend API + JSON                                   │
│  ─────────────────────────────────────────────────────────────  │
│  □ Setup Express server (metadata-api/)                        │
│  □ Create JSON files:                                          │
│    - public/plans/plan-1.json                                  │
│    - public/plans/plan-2.json                                  │
│    - public/plans/plan-3.json                                  │
│  □ Add images (icons + certificate background)                 │
│  □ Implement endpoints:                                        │
│    - GET /metadata/:tokenId                                    │
│    - GET /api/plans                                            │
│  □ Test locally                                                │
│  □ Deploy to Vercel/Railway                                    │
│                                                                 │
│  DAY 5-7: Frontend Integration                                 │
│  ─────────────────────────────────────────────────────────────  │
│  □ Create hooks:                                               │
│    - useDeposit(tokenId)                                       │
│    - usePlans()                                                │
│  □ Update components:                                          │
│    - PlanCard (show off-chain metadata)                        │
│    - DepositCard (show hybrid data)                            │
│  □ Update pages:                                               │
│    - /plans (list với JSON metadata)                           │
│    - /deposit/:id (detail page)                                │
│  □ Test full flow                                              │
│  □ Deploy to Vercel                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 HOW TO UPDATE METADATA (Easy!)

### Scenario 1: Đổi tên plan

```bash
# Edit file
vim metadata-api/public/plans/plan-1.json

# Change:
"names": {
  "en": "90-Day Savings Plus ⭐",  # ← Thêm emoji
  "vi": "Gói Tiết Kiệm 90 Ngày Plus ⭐"
}

# Redeploy (Vercel auto-deploy on git push)
git add .
git commit -m "Update plan name"
git push

# Done! Metadata updated in ~30 seconds
```

### Scenario 2: Đổi icon plan

```bash
# Upload new image
cp new-icon.png metadata-api/public/images/plan-1-icon.png

# Update JSON
vim metadata-api/public/plans/plan-1.json
# Change: "icon": "/images/plan-1-icon.png"  (same path)

# Deploy
git push

# OpenSea will refresh metadata automatically
```

### Scenario 3: Thêm benefit mới

```json
// Edit plan-1.json
"benefits": [
  { "en": "7.2% APR", "vi": "7.2% lãi suất/năm" },
  { "en": "Low minimum (100 USDC)", "vi": "Gửi tối thiểu 100 USDC" },
  { "en": "NEW: Get 50 USDC bonus!", "vi": "MỚI: Nhận 50 USDC thưởng!" }  // ← Add
]
```

**✅ No database migration, no SQL, just edit JSON!**

---

## 🚀 DEPLOYMENT OPTIONS

### Option 1: Vercel (Recommended - Free)

```bash
cd metadata-api
vercel deploy

# Auto SSL, CDN, Serverless
# URL: https://term-deposit-api.vercel.app
```

### Option 2: Railway

```bash
railway up

# Free $5/month credit
# URL: https://term-deposit-api.up.railway.app
```

### Option 3: GitHub Pages (Static only)

```bash
# Only serve static JSON (no dynamic metadata generation)
# Put files in docs/ folder
# Enable GitHub Pages in settings
# URL: https://yourusername.github.io/term-deposit-metadata/
```

---

## 📊 COMPARISON: Database vs JSON

| Feature | With Database (PostgreSQL) | With JSON Files |
|---------|---------------------------|-----------------|
| Setup | Complex (install, configure) | Simple (create files) |
| Cost | $5-20/month | $0 (static hosting) |
| Update | Need SQL/admin panel | Edit JSON, git push |
| Backup | Database backups | Git history |
| Version Control | Difficult | Easy (git) |
| Scale | Better for >10k plans | Perfect for <100 plans |
| Query | Complex queries possible | Simple lookup only |
| Multi-user Edit | Yes (admin panel) | No (git workflow) |

**✅ Recommendation:** Start với JSON, migrate to DB later nếu cần

---

## ✅ BENEFITS OF THIS APPROACH

```
✅ Đơn giản:
   - Không cần học SQL
   - Không cần setup database server
   - Chỉ cần biết JSON

✅ Rẻ:
   - $0 hosting (Vercel/GitHub Pages free tier)
   - No database hosting cost

✅ Dễ maintain:
   - Sửa file → git push → done
   - Có version history (git)
   - Easy rollback nếu sai

✅ An toàn:
   - Critical data vẫn on-chain
   - Off-chain chỉ là "decoration"
   - Không sợ mất data quan trọng

✅ Flexible:
   - Thêm field mới: just add to JSON
   - Multi-language: add more keys
   - A/B testing: swap JSON files
```

---

## 🎯 NEXT STEPS

1. **Review architecture** ← BẠN Ở ĐÂY
2. Create contracts (DepositCertificate + SavingLogic)
3. Setup metadata-api/ folder
4. Create JSON files (plan-1/2/3.json)
5. Implement Express server
6. Deploy API to Vercel
7. Update frontend hooks
8. Test & launch!

**Timeline: 1 tuần** (thay vì 3 tuần với database)

---

## 📚 REFERENCES

- [ERC721 Metadata Standard](https://eips.ethereum.org/EIPS/eip-721)
- [OpenSea Metadata](https://docs.opensea.io/docs/metadata-standards)
- [Vercel Deployment](https://vercel.com/docs)
- [Express.js Guide](https://expressjs.com/en/starter/installing.html)
