# Hybrid Metadata Strategy - On-chain + Off-chain

## 📑 Mục lục (Table of Contents)

1. [Giới thiệu Hybrid Metadata](#1-giới-thiệu-hybrid-metadata)
2. [On-chain vs Off-chain Analysis](#2-on-chain-vs-off-chain-analysis)
3. [Data Separation Strategy](#3-data-separation-strategy)
4. [Architecture Design](#4-architecture-design)
5. [Implementation Guide](#5-implementation-guide)
6. [SOLID Compliance](#6-solid-compliance)
7. [Security & Trust Model](#7-security--trust-model)
8. [Real-world Examples](#8-real-world-examples)

---

## 1. Giới thiệu Hybrid Metadata

### 1.1 Vấn đề với Full On-chain Metadata

**Scenario:**
```
Plan ID: 1
- Name: "90-Day Fixed Term"
- Tenor: 90 days
- APR: 500 bps (5.00%)
- Penalty: 200 bps (2.00%)
- Min deposit: $100
- Max deposit: $10,000
- Description: "Gói tiết kiệm 90 ngày với lãi suất cạnh tranh..."
```

**Nếu lưu FULL ON-CHAIN:**
```solidity
struct Plan {
    string name;              // ~50 bytes → 10,000 gas
    uint256 tenorSeconds;     // 32 bytes → 6,400 gas
    uint16 aprBps;            // 2 bytes → 400 gas
    uint16 penaltyBps;        // 2 bytes → 400 gas
    uint256 minDeposit;       // 32 bytes → 6,400 gas
    uint256 maxDeposit;       // 32 bytes → 6,400 gas
    string description;       // ~200 bytes → 40,000 gas
}

// Total storage: ~70,000 gas per plan
// 3 plans = 210,000 gas (~$10 at 50 gwei)
```

**Vấn đề khi UPDATE:**
```solidity
// Admin muốn giảm penalty từ 2% → 1.5%
function updatePlanPenalty(uint256 planId, uint16 newPenalty) external onlyOwner {
    plans[planId].penaltyBps = newPenalty;
    // Gas cost: ~5,000 gas (~$0.25)
}

// Admin muốn update description (marketing copy)
function updatePlanDescription(uint256 planId, string calldata newDesc) external onlyOwner {
    plans[planId].description = newDesc;
    // Gas cost: ~40,000 gas (~$2.00) 😱
}

// ❌ EXPENSIVE: Mỗi lần marketing muốn sửa text → $2
// ❌ INFLEXIBLE: Không thể thêm fields mới (images, videos, etc.)
// ❌ LOCKED: Description on-chain → không thể localization (EN/VI/CN)
```

### 1.2 Giải pháp: Hybrid Metadata

**Concept:**
```
┌────────────────────────────────────────────────────────────────┐
│                    HYBRID METADATA STRATEGY                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ON-CHAIN (Blockchain)                                         │
│  ├─ Critical data (affects money/logic)                        │
│  ├─ Immutable data (ownership, timestamps)                     │
│  ├─ Verification data (signatures, proofs)                     │
│  └─ Security-critical parameters                               │
│       ↓                                                         │
│    【 Small storage 】【 Expensive 】【 Immutable 】            │
│                                                                │
│  OFF-CHAIN (IPFS / Server / CDN)                               │
│  ├─ Display data (names, descriptions)                         │
│  ├─ Marketing content (images, videos)                         │
│  ├─ Localization (multiple languages)                          │
│  └─ Rich metadata (traits, attributes)                         │
│       ↓                                                         │
│    【 Large storage 】【 Cheap 】【 Updatable 】                │
│                                                                │
│  LINK: tokenURI points to off-chain JSON                       │
│        Smart contract → API endpoint → JSON → IPFS             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ **Gas savings:** ~90% reduction in storage costs
- ✅ **Flexibility:** Update marketing content without gas
- ✅ **Rich content:** Images, videos, animations
- ✅ **Localization:** Multi-language support
- ✅ **Scalability:** Add new fields without contract upgrade

---

## 2. On-chain vs Off-chain Analysis

### 2.1 Decision Matrix

```
┌──────────────────────────────────────────────────────────────────┐
│         DATA STORAGE DECISION MATRIX                             │
├──────────────────────────────────────────────────────────────────┤
│  Question                           │ On-chain │ Off-chain │     │
├─────────────────────────────────────┼──────────┼───────────┤─────┤
│  Does it affect money/tokens?       │    ✅    │     ❌    │     │
│  Does logic depend on it?           │    ✅    │     ❌    │     │
│  Must be immutable forever?         │    ✅    │     ❌    │     │
│  Needs cryptographic verification?  │    ✅    │     ❌    │     │
│  Changes frequently?                │    ❌    │     ✅    │     │
│  Large data size (>1KB)?            │    ❌    │     ✅    │     │
│  Marketing/display content?         │    ❌    │     ✅    │     │
│  Needs localization?                │    ❌    │     ✅    │     │
│  Contains media (images/video)?     │    ❌    │     ✅    │     │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Term Deposit Data Classification

**ON-CHAIN (Critical Financial Data):**
```solidity
struct DepositCore {
    uint256 depositId;           // ✅ Unique identifier
    uint256 planId;              // ✅ Links to plan rules
    address owner;               // ✅ NFT ownership
    uint256 principal;           // ✅ Amount deposited (affects money)
    uint256 startAt;             // ✅ Start timestamp (affects interest calc)
    uint256 maturityAt;          // ✅ Maturity timestamp (affects withdrawal)
    uint16 aprBps;               // ✅ Locked APR (affects interest calc)
    DepositStatus status;        // ✅ State machine (affects logic)
}

// Why on-chain?
// - Smart contract logic depends on these values
// - Affects interest calculation (money at stake)
// - Must be tamper-proof (immutable once set)
// - Needs to be trustless (no off-chain dependency)

// Gas cost: ~200 bytes = ~40,000 gas per deposit
```

**OFF-CHAIN (Display & Marketing):**
```json
{
  "name": "Term Deposit Certificate #42",
  "description": "Chứng chỉ tiết kiệm kỳ hạn với lãi suất cạnh tranh...",
  "image": "https://api.yourdapp.com/nft/42/image.svg",
  "animation_url": "https://api.yourdapp.com/nft/42/animation.mp4",
  "external_url": "https://yourdapp.com/deposit/42",
  
  "attributes": [
    {
      "trait_type": "Plan Name",
      "value": "90-Day High Yield"
    },
    {
      "trait_type": "Risk Level",
      "value": "Low Risk"
    },
    {
      "trait_type": "Category",
      "value": "Fixed Income"
    }
  ],
  
  "plan_details": {
    "name": "90-Day Fixed Term",
    "description_vi": "Gói tiết kiệm 90 ngày với lãi suất cạnh tranh...",
    "description_en": "90-day term deposit with competitive interest rate...",
    "description_cn": "90天定期存款，利率优惠...",
    "marketing_tagline": "Earn 5% APR with guaranteed returns",
    "features": [
      "Flexible renewal options",
      "Early withdrawal available",
      "Automated interest payout"
    ],
    "penalty_info": {
      "rate_bps": 200,
      "description": "2% penalty for early withdrawal"
    }
  },
  
  "ui_config": {
    "primary_color": "#667eea",
    "secondary_color": "#764ba2",
    "badge_style": "gradient",
    "icon": "https://cdn.yourdapp.com/icons/plan-1.png"
  }
}

// Why off-chain?
// - Pure display data (doesn't affect logic)
// - Changes frequently (marketing updates)
// - Large size (descriptions, images)
// - Needs localization (multi-language)
// - No gas cost to update
```

**HYBRID (Plan Configuration):**
```solidity
// On-chain: Rules that affect money
struct PlanCore {
    uint256 planId;
    uint256 tenorSeconds;      // ✅ Affects maturity calculation
    uint16 aprBps;             // ✅ Affects interest calculation
    uint16 penaltyBps;         // ✅ Affects penalty calculation
    uint256 minDeposit;        // ✅ Validation rule
    uint256 maxDeposit;        // ✅ Validation rule
    bool isActive;             // ✅ Enable/disable deposits
}

// Off-chain: Display & marketing
{
  "plan_id": 1,
  "name": "90-Day High Yield",
  "description": "Perfect for short-term savings...",
  "icon": "https://...",
  "category": "Fixed Income",
  "risk_level": "Low",
  "features": [...],
  "localization": {
    "vi": {...},
    "en": {...},
    "cn": {...}
  }
}

// Best of both worlds:
// - Critical rules on-chain (trustless)
// - Marketing content off-chain (flexible)
```

### 2.3 Gas Cost Comparison

```
┌──────────────────────────────────────────────────────────────────┐
│              GAS COST ANALYSIS (Per Deposit)                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  APPROACH 1: Full On-chain                                       │
│  ├─ Storage: 500 bytes                                           │
│  ├─ Gas: ~100,000 gas                                            │
│  ├─ Cost: ~$5 (at 50 gwei, $2000 ETH)                           │
│  └─ Update description: ~40,000 gas = $2 😱                      │
│                                                                  │
│  APPROACH 2: Hybrid (Recommended)                                │
│  ├─ Storage: 200 bytes (on-chain)                                │
│  ├─ Gas: ~40,000 gas                                             │
│  ├─ Cost: ~$2 (at 50 gwei, $2000 ETH)                           │
│  └─ Update description: FREE (off-chain API) ✅                  │
│                                                                  │
│  APPROACH 3: Full Off-chain (Not Recommended)                    │
│  ├─ Storage: 0 bytes (on-chain)                                  │
│  ├─ Gas: ~5,000 gas                                              │
│  ├─ Cost: ~$0.25 (at 50 gwei, $2000 ETH)                        │
│  └─ RISK: Server down = NFT broken ❌                            │
│                                                                  │
│  WINNER: Hybrid (60% gas savings + flexibility) 🏆               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Separation Strategy

### 3.1 Smart Contract (On-chain Layer)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DepositCertificate - Hybrid Metadata NFT
/// @notice Stores critical data on-chain, points to rich metadata off-chain
contract DepositCertificate is ERC721, Ownable {
    
    // ============== ON-CHAIN STORAGE ==============
    
    /// @notice Core deposit data (immutable, affects money)
    struct DepositCore {
        uint256 depositId;
        uint256 planId;
        uint256 principal;        // Amount in USDC (6 decimals)
        uint256 startAt;          // Unix timestamp
        uint256 maturityAt;       // Unix timestamp
        uint16 aprBps;            // Locked APR in basis points
        DepositStatus status;     // Active, Withdrawn, Renewed
    }
    
    /// @notice Plan rules (affects calculations)
    struct PlanCore {
        uint256 tenorSeconds;
        uint16 aprBps;
        uint16 penaltyBps;
        uint256 minDeposit;
        uint256 maxDeposit;
        bool isActive;
    }
    
    mapping(uint256 => DepositCore) public deposits;
    mapping(uint256 => PlanCore) public plans;
    
    // ============== OFF-CHAIN LINK ==============
    
    /// @notice Base URI for metadata API
    /// @dev Points to your backend server or IPFS gateway
    string private _baseMetadataURI;
    
    /// @notice Optional: Metadata version for cache invalidation
    uint256 public metadataVersion;
    
    constructor() ERC721("Term Deposit Certificate", "TDC") {
        // Option 1: Centralized API (flexible, fast)
        _baseMetadataURI = "https://api.yourdapp.com/metadata/";
        
        // Option 2: IPFS (decentralized, slower)
        // _baseMetadataURI = "ipfs://QmYourBaseHash/";
        
        // Option 3: Arweave (permanent, one-time cost)
        // _baseMetadataURI = "https://arweave.net/your-tx-id/";
    }
    
    /// @notice Returns metadata URI (ERC721 standard)
    /// @dev Concatenates baseURI + tokenId + version
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        require(_exists(tokenId), "Token does not exist");
        
        // Format: https://api.yourdapp.com/metadata/42?v=1
        return string(
            abi.encodePacked(
                _baseMetadataURI,
                tokenId.toString(),
                "?v=",
                metadataVersion.toString()
            )
        );
    }
    
    /// @notice Update base metadata URI (admin only)
    /// @dev Use this to switch from centralized to IPFS, or update domain
    function setBaseMetadataURI(string calldata newURI) 
        external 
        onlyOwner 
    {
        _baseMetadataURI = newURI;
        emit MetadataURIUpdated(newURI);
    }
    
    /// @notice Increment metadata version to force refresh
    /// @dev Call this after updating off-chain metadata
    function incrementMetadataVersion() external onlyOwner {
        metadataVersion++;
        emit MetadataVersionUpdated(metadataVersion);
    }
    
    /// @notice Get all on-chain data for a deposit
    /// @dev Frontends call this to combine with off-chain metadata
    function getDepositCore(uint256 depositId) 
        external 
        view 
        returns (DepositCore memory) 
    {
        return deposits[depositId];
    }
    
    /// @notice Get plan rules
    function getPlanCore(uint256 planId) 
        external 
        view 
        returns (PlanCore memory) 
    {
        return plans[planId];
    }
    
    // Events
    event MetadataURIUpdated(string newURI);
    event MetadataVersionUpdated(uint256 newVersion);
}
```

### 3.2 Metadata API (Off-chain Layer)

```typescript
// backend/src/api/metadata.ts

import express from 'express';
import { ethers } from 'ethers';

const router = express.Router();

// ============== METADATA STORAGE ==============

// Option 1: Database (PostgreSQL, MongoDB)
interface PlanMetadata {
  plan_id: number;
  name: string;
  description: string;
  description_vi: string;
  description_en: string;
  icon_url: string;
  category: string;
  risk_level: string;
  features: string[];
  marketing_tagline: string;
}

// Option 2: JSON files
const planMetadata: Record<number, PlanMetadata> = {
  1: {
    plan_id: 1,
    name: "30-Day Flexible",
    description: "Short-term savings with maximum flexibility",
    description_vi: "Tiết kiệm ngắn hạn linh hoạt",
    description_en: "Short-term flexible savings",
    icon_url: "https://cdn.yourdapp.com/icons/plan-1.png",
    category: "Short-term Fixed Income",
    risk_level: "Very Low",
    features: [
      "Withdraw anytime with minimal penalty",
      "Great for emergency funds",
      "Quick access to your money"
    ],
    marketing_tagline: "Save smart, stay flexible"
  },
  2: {
    plan_id: 2,
    name: "90-Day High Yield",
    description: "Balanced term with competitive rates",
    description_vi: "Kỳ hạn cân bằng với lãi suất cạnh tranh",
    description_en: "Balanced term with competitive rates",
    icon_url: "https://cdn.yourdapp.com/icons/plan-2.png",
    category: "Medium-term Fixed Income",
    risk_level: "Low",
    features: [
      "5% APR guaranteed",
      "Automatic renewal available",
      "Compound interest option"
    ],
    marketing_tagline: "Maximize your returns"
  },
  3: {
    plan_id: 3,
    name: "180-Day Premium",
    description: "Long-term commitment, premium returns",
    description_vi: "Cam kết dài hạn, lợi nhuận cao",
    description_en: "Long-term commitment, premium returns",
    icon_url: "https://cdn.yourdapp.com/icons/plan-3.png",
    category: "Long-term Fixed Income",
    risk_level: "Very Low",
    features: [
      "6% APR - highest rate",
      "VIP customer support",
      "Priority renewal"
    ],
    marketing_tagline: "Premium rates for patient savers"
  }
};

// ============== METADATA ENDPOINT ==============

/**
 * GET /metadata/:tokenId
 * 
 * Returns ERC721-compliant JSON metadata
 * Combines on-chain data + off-chain rich content
 */
router.get('/metadata/:tokenId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const version = parseInt(req.query.v as string) || 0;
    
    // 1. Fetch on-chain data
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS!,
      ['function getDepositCore(uint256) view returns (tuple)'],
      provider
    );
    
    const depositCore = await contract.getDepositCore(tokenId);
    
    // 2. Get plan metadata from off-chain storage
    const planMeta = planMetadata[depositCore.planId];
    
    // 3. Generate SVG (on-demand)
    const svg = generateSVG(depositCore, planMeta);
    const svgBase64 = Buffer.from(svg).toString('base64');
    
    // 4. Combine into ERC721 metadata
    const metadata = {
      name: `Term Deposit Certificate #${tokenId}`,
      description: planMeta.description,
      image: `data:image/svg+xml;base64,${svgBase64}`,
      external_url: `https://yourdapp.com/deposit/${tokenId}`,
      
      // Rich attributes (off-chain flexibility)
      attributes: [
        {
          trait_type: "Principal",
          value: `$${formatUSDC(depositCore.principal)}`,
          display_type: "string"
        },
        {
          trait_type: "APR",
          value: `${(depositCore.aprBps / 100).toFixed(2)}%`,
          display_type: "string"
        },
        {
          trait_type: "Plan",
          value: planMeta.name
        },
        {
          trait_type: "Category",
          value: planMeta.category
        },
        {
          trait_type: "Risk Level",
          value: planMeta.risk_level
        },
        {
          trait_type: "Status",
          value: getStatusText(depositCore.status)
        },
        {
          trait_type: "Maturity Date",
          value: depositCore.maturityAt,
          display_type: "date"
        }
      ],
      
      // Extra metadata (not in ERC721 standard)
      plan_details: planMeta,
      
      // Version for cache busting
      metadata_version: version
    };
    
    // 5. Cache headers (OpenSea respects this)
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // 1 hour cache
      'ETag': `"${tokenId}-v${version}"`
    });
    
    res.json(metadata);
    
  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

// ============== ADMIN ENDPOINTS ==============

/**
 * PUT /admin/plan/:planId/metadata
 * 
 * Update plan marketing content (NO GAS COST!)
 */
router.put('/admin/plan/:planId/metadata', authenticateAdmin, async (req, res) => {
  const planId = parseInt(req.params.planId);
  const updates = req.body;
  
  // Update in database/cache
  planMetadata[planId] = {
    ...planMetadata[planId],
    ...updates
  };
  
  // Optionally: Increment contract's metadataVersion
  // This forces OpenSea and wallets to refresh
  
  res.json({ success: true, message: 'Metadata updated (no gas cost)' });
});

/**
 * POST /admin/refresh-metadata
 * 
 * Trigger metadata refresh on OpenSea
 */
router.post('/admin/refresh-metadata', authenticateAdmin, async (req, res) => {
  const { tokenId } = req.body;
  
  // Call OpenSea API to refresh
  const response = await fetch(
    `https://api.opensea.io/api/v1/asset/${process.env.CONTRACT_ADDRESS}/${tokenId}/?force_update=true`,
    {
      headers: {
        'X-API-KEY': process.env.OPENSEA_API_KEY!
      }
    }
  );
  
  res.json({ success: true, opensea_response: await response.json() });
});

// Helper functions
function formatUSDC(amount: bigint): string {
  return (Number(amount) / 1e6).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getStatusText(status: number): string {
  const statuses = ['Active', 'Withdrawn', 'Renewed', 'Matured'];
  return statuses[status] || 'Unknown';
}

function generateSVG(deposit: any, plan: PlanMetadata): string {
  // Generate beautiful SVG passbook
  // Can be much more complex since it's off-chain!
  return `
    <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
      <!-- Complex SVG with gradients, animations, etc. -->
      <!-- No gas cost to make this elaborate! -->
    </svg>
  `;
}

export default router;
```

### 3.3 Frontend Integration

```typescript
// frontend/src/hooks/useDepositMetadata.ts

interface DepositMetadata {
  // On-chain (source of truth)
  onchain: {
    depositId: number;
    planId: number;
    principal: bigint;
    startAt: number;
    maturityAt: number;
    aprBps: number;
    status: number;
  };
  
  // Off-chain (rich content)
  offchain: {
    name: string;
    description: string;
    image: string;
    attributes: any[];
    plan_details: any;
  };
}

export function useDepositMetadata(tokenId: number) {
  const [metadata, setMetadata] = useState<DepositMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchMetadata() {
      // 1. Fetch on-chain data (source of truth)
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );
      
      const onchain = await contract.getDepositCore(tokenId);
      
      // 2. Fetch off-chain metadata (rich content)
      const tokenURI = await contract.tokenURI(tokenId);
      // tokenURI = "https://api.yourdapp.com/metadata/42?v=1"
      
      const response = await fetch(tokenURI);
      const offchain = await response.json();
      
      // 3. Combine both
      setMetadata({ onchain, offchain });
      setLoading(false);
    }
    
    fetchMetadata();
  }, [tokenId]);
  
  return { metadata, loading };
}

// Usage in component
function DepositCard({ tokenId }: { tokenId: number }) {
  const { metadata, loading } = useDepositMetadata(tokenId);
  
  if (loading) return <Spinner />;
  
  return (
    <div className="deposit-card">
      <img src={metadata.offchain.image} alt={metadata.offchain.name} />
      <h2>{metadata.offchain.name}</h2>
      
      {/* On-chain data (trustless) */}
      <div className="onchain-data">
        <p>Principal: ${formatUSDC(metadata.onchain.principal)}</p>
        <p>APR: {metadata.onchain.aprBps / 100}%</p>
        <p>Status: {getStatus(metadata.onchain.status)}</p>
      </div>
      
      {/* Off-chain data (rich content) */}
      <div className="offchain-data">
        <p>{metadata.offchain.description}</p>
        <ul>
          {metadata.offchain.plan_details.features.map(f => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

---

## 4. Architecture Design

### 4.1 System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│               HYBRID METADATA ARCHITECTURE                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    BLOCKCHAIN LAYER                      │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  DepositCertificate.sol                            │  │   │
│  │  │  ├─ DepositCore (minimal on-chain)                │  │   │
│  │  │  ├─ PlanCore (rules only)                         │  │   │
│  │  │  └─ tokenURI() → API endpoint                     │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         ↕                                        │
│                   [RPC Calls]                                    │
│                         ↕                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   BACKEND API LAYER                      │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Metadata API (Express.js)                         │  │   │
│  │  │  ├─ GET /metadata/:tokenId                         │  │   │
│  │  │  ├─ Fetch on-chain data                            │  │   │
│  │  │  ├─ Fetch off-chain metadata                       │  │   │
│  │  │  ├─ Generate SVG on-demand                         │  │   │
│  │  │  └─ Return ERC721 JSON                             │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Admin API                                         │  │   │
│  │  │  ├─ PUT /admin/plan/:id/metadata                   │  │   │
│  │  │  ├─ POST /admin/refresh-opensea                    │  │   │
│  │  │  └─ POST /admin/upload-images                      │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         ↕                                        │
│                   [HTTP/REST]                                    │
│                         ↕                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  STORAGE LAYER                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │  Database   │  │    IPFS     │  │     CDN     │      │   │
│  │  │  (MongoDB)  │  │  (Pinata)   │  │ (Cloudflare)│      │   │
│  │  │             │  │             │  │             │      │   │
│  │  │  Plan meta  │  │  SVG images │  │  Static     │      │   │
│  │  │  User data  │  │  JSON files │  │  assets     │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         ↕                                        │
│                    [GraphQL/REST]                                │
│                         ↕                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   FRONTEND LAYER                         │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  React App                                         │  │   │
│  │  │  ├─ useDepositMetadata() hook                      │  │   │
│  │  │  ├─ Fetch on-chain (trustless)                     │  │   │
│  │  │  ├─ Fetch off-chain (rich UX)                      │  │   │
│  │  │  └─ Display combined data                          │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   EXTERNAL SERVICES                      │   │
│  │  ├─ OpenSea (fetch metadata via tokenURI)                │   │
│  │  ├─ MetaMask (display NFT image)                         │   │
│  │  └─ Trust Wallet (show attributes)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow Diagram

```
USER OPENS DEPOSIT
═══════════════════════════════════════════════════════════════

1. User calls openDeposit()
   ↓
2. SavingLogic validates & transfers USDC
   ↓
3. SavingLogic calls DepositCertificate.mint()
   ↓
4. DepositCertificate stores DepositCore (on-chain)
   {
     depositId: 42,
     planId: 2,
     principal: 1000_000000,
     startAt: 1706544000,
     maturityAt: 1714320000,
     aprBps: 500,
     status: Active
   }
   ↓
5. NFT minted to user's wallet
   ↓
6. User views NFT in MetaMask
   ↓
7. MetaMask calls tokenURI(42)
   ↓
8. Contract returns: "https://api.yourdapp.com/metadata/42?v=1"
   ↓
9. MetaMask fetches metadata from API
   ↓
10. API endpoint:
    - Calls contract.getDepositCore(42) → on-chain data
    - Queries database for plan metadata → off-chain data
    - Generates SVG with combined data
    - Returns ERC721 JSON
   ↓
11. MetaMask displays:
    - Beautiful SVG passbook
    - Name: "Term Deposit Certificate #42"
    - Description: "90-Day High Yield plan..."
    - Attributes: Principal, APR, Status, etc.

ADMIN UPDATES PLAN MARKETING
═══════════════════════════════════════════════════════════════

1. Admin calls PUT /admin/plan/2/metadata
   {
     "description": "NEW: Now with auto-renewal bonus!",
     "marketing_tagline": "Earn 5.5% with renewal"
   }
   ↓
2. API updates database (NO blockchain transaction)
   ↓
3. API calls contract.incrementMetadataVersion()
   Gas cost: ~5,000 gas (ONE TIME for all NFTs)
   ↓
4. New tokenURI: "https://api.yourdapp.com/metadata/42?v=2"
   ↓
5. Next time wallet fetches metadata → new description shows
   ↓
6. Optional: Call OpenSea refresh API
   ↓
7. All NFTs of plan 2 show updated marketing content
   (Without any gas cost per NFT!)
```

---

## 5. Implementation Guide

### 5.1 Phase 1: Smart Contract Updates

```solidity
// contracts/DepositCertificate.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title DepositCertificate - Hybrid Metadata NFT
/// @notice Minimal on-chain storage, points to rich off-chain metadata
/// @custom:security-contact security@yourdapp.com
contract DepositCertificate is ERC721, Ownable {
    using Strings for uint256;
    
    // ============== TYPES ==============
    
    enum DepositStatus {
        Active,
        Withdrawn,
        Renewed,
        Matured
    }
    
    /// @notice Core deposit data (stored on-chain)
    /// @dev Only critical financial data, ~160 bytes per deposit
    struct DepositCore {
        uint256 depositId;      // 32 bytes
        uint256 planId;         // 32 bytes
        uint256 principal;      // 32 bytes (USDC amount, 6 decimals)
        uint256 startAt;        // 32 bytes (unix timestamp)
        uint256 maturityAt;     // 32 bytes (unix timestamp)
        uint16 aprBps;          // 2 bytes (basis points, 500 = 5%)
        DepositStatus status;   // 1 byte (enum)
    }
    
    // ============== STATE ==============
    
    /// @notice Deposit data storage
    mapping(uint256 => DepositCore) public deposits;
    
    /// @notice Base URI for metadata API
    /// @dev Can be centralized API, IPFS, or Arweave
    string private _baseMetadataURI;
    
    /// @notice Metadata version for cache busting
    /// @dev Increment this when off-chain metadata updates
    uint256 public metadataVersion;
    
    /// @notice Reference to SavingLogic contract
    address public savingLogic;
    
    // ============== EVENTS ==============
    
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 planId,
        uint256 principal
    );
    
    event StatusUpdated(
        uint256 indexed tokenId,
        DepositStatus oldStatus,
        DepositStatus newStatus
    );
    
    event BaseURIUpdated(string oldURI, string newURI);
    event MetadataVersionIncremented(uint256 newVersion);
    
    // ============== MODIFIERS ==============
    
    modifier onlySavingLogic() {
        require(msg.sender == savingLogic, "Only SavingLogic");
        _;
    }
    
    // ============== CONSTRUCTOR ==============
    
    constructor(address initialOwner, string memory baseURI) 
        ERC721("Term Deposit Certificate", "TDC")
        Ownable(initialOwner)
    {
        _baseMetadataURI = baseURI;
        metadataVersion = 1;
    }
    
    // ============== MINTING ==============
    
    /// @notice Mint new deposit certificate
    /// @dev Called by SavingLogic when user opens deposit
    function mint(
        address to,
        uint256 tokenId,
        uint256 planId,
        uint256 principal,
        uint256 startAt,
        uint256 maturityAt,
        uint16 aprBps
    ) external onlySavingLogic {
        require(to != address(0), "Invalid recipient");
        require(principal > 0, "Invalid principal");
        
        _safeMint(to, tokenId);
        
        deposits[tokenId] = DepositCore({
            depositId: tokenId,
            planId: planId,
            principal: principal,
            startAt: startAt,
            maturityAt: maturityAt,
            aprBps: aprBps,
            status: DepositStatus.Active
        });
        
        emit CertificateMinted(tokenId, to, planId, principal);
    }
    
    // ============== STATUS UPDATES ==============
    
    /// @notice Update deposit status
    /// @dev Called by SavingLogic when withdrawal/renewal happens
    function updateStatus(uint256 tokenId, DepositStatus newStatus) 
        external 
        onlySavingLogic 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        DepositStatus oldStatus = deposits[tokenId].status;
        deposits[tokenId].status = newStatus;
        
        emit StatusUpdated(tokenId, oldStatus, newStatus);
    }
    
    // ============== METADATA (ERC721) ==============
    
    /// @notice Returns metadata URI for token
    /// @dev Combines baseURI + tokenId + version
    /// @return URI pointing to off-chain metadata API
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        // Format: https://api.yourdapp.com/metadata/42?v=1
        return string(
            abi.encodePacked(
                _baseMetadataURI,
                tokenId.toString(),
                "?v=",
                metadataVersion.toString()
            )
        );
    }
    
    /// @notice Get core deposit data
    /// @dev Used by frontend and API to fetch on-chain data
    function getDepositCore(uint256 tokenId) 
        external 
        view 
        returns (DepositCore memory) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return deposits[tokenId];
    }
    
    // ============== ADMIN FUNCTIONS ==============
    
    /// @notice Update base metadata URI
    /// @dev Use this to migrate from centralized to IPFS
    function setBaseMetadataURI(string calldata newURI) 
        external 
        onlyOwner 
    {
        string memory oldURI = _baseMetadataURI;
        _baseMetadataURI = newURI;
        
        emit BaseURIUpdated(oldURI, newURI);
    }
    
    /// @notice Increment metadata version
    /// @dev Call this after updating off-chain metadata
    /// @dev Forces wallets to refresh (cache busting)
    function incrementMetadataVersion() external onlyOwner {
        metadataVersion++;
        emit MetadataVersionIncremented(metadataVersion);
    }
    
    /// @notice Set SavingLogic address
    function setSavingLogic(address _savingLogic) external onlyOwner {
        require(_savingLogic != address(0), "Invalid address");
        savingLogic = _savingLogic;
    }
}
```

### 5.2 Phase 2: Backend API Setup

```typescript
// backend/src/server.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// ============== BLOCKCHAIN CONNECTION ==============

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const contractAddress = process.env.DEPOSIT_CERTIFICATE_ADDRESS!;

const contractABI = [
  'function getDepositCore(uint256) view returns (tuple(uint256 depositId, uint256 planId, uint256 principal, uint256 startAt, uint256 maturityAt, uint16 aprBps, uint8 status))',
  'function metadataVersion() view returns (uint256)'
];

const contract = new ethers.Contract(contractAddress, contractABI, provider);

// ============== METADATA STORAGE ==============

interface PlanMetadata {
  plan_id: number;
  name: string;
  name_vi: string;
  name_en: string;
  description: string;
  description_vi: string;
  description_en: string;
  icon_url: string;
  banner_url: string;
  category: string;
  risk_level: string;
  features: string[];
  marketing_tagline: string;
  marketing_tagline_vi: string;
  updated_at: string;
}

// In production: use PostgreSQL or MongoDB
const planMetadata: Record<number, PlanMetadata> = {
  1: {
    plan_id: 1,
    name: "30-Day Flexible",
    name_vi: "Linh hoạt 30 ngày",
    name_en: "30-Day Flexible",
    description: "Short-term savings with maximum flexibility for emergency funds",
    description_vi: "Tiết kiệm ngắn hạn với tính linh hoạt tối đa cho quỹ khẩn cấp",
    description_en: "Short-term savings with maximum flexibility for emergency funds",
    icon_url: "https://cdn.yourdapp.com/icons/plan-1.svg",
    banner_url: "https://cdn.yourdapp.com/banners/plan-1.jpg",
    category: "Short-term Fixed Income",
    risk_level: "Very Low",
    features: [
      "Withdraw anytime with minimal penalty",
      "Great for emergency funds",
      "Quick access to your money",
      "Automatic notifications"
    ],
    marketing_tagline: "Save smart, stay flexible",
    marketing_tagline_vi: "Tiết kiệm thông minh, linh hoạt tối đa",
    updated_at: new Date().toISOString()
  },
  2: {
    plan_id: 2,
    name: "90-Day High Yield",
    name_vi: "Lãi suất cao 90 ngày",
    name_en: "90-Day High Yield",
    description: "Balanced term with competitive 5% APR - our most popular plan",
    description_vi: "Kỳ hạn cân bằng với lãi suất 5% cạnh tranh - gói phổ biến nhất",
    description_en: "Balanced term with competitive 5% APR - our most popular plan",
    icon_url: "https://cdn.yourdapp.com/icons/plan-2.svg",
    banner_url: "https://cdn.yourdapp.com/banners/plan-2.jpg",
    category: "Medium-term Fixed Income",
    risk_level: "Low",
    features: [
      "5% APR guaranteed",
      "Automatic renewal available",
      "Compound interest option",
      "VIP customer support"
    ],
    marketing_tagline: "Maximize your returns",
    marketing_tagline_vi: "Tối đa hóa lợi nhuận của bạn",
    updated_at: new Date().toISOString()
  },
  3: {
    plan_id: 3,
    name: "180-Day Premium",
    name_vi: "Premium 180 ngày",
    name_en: "180-Day Premium",
    description: "Long-term commitment with premium 6% APR - highest returns guaranteed",
    description_vi: "Cam kết dài hạn với lãi suất 6% cao cấp - lợi nhuận cao nhất được đảm bảo",
    description_en: "Long-term commitment with premium 6% APR - highest returns guaranteed",
    icon_url: "https://cdn.yourdapp.com/icons/plan-3.svg",
    banner_url: "https://cdn.yourdapp.com/banners/plan-3.jpg",
    category: "Long-term Fixed Income",
    risk_level: "Very Low",
    features: [
      "6% APR - highest rate",
      "VIP customer support",
      "Priority renewal",
      "Exclusive financial insights",
      "Premium badge on NFT"
    ],
    marketing_tagline: "Premium rates for patient savers",
    marketing_tagline_vi: "Lãi suất cao cấp cho người tiết kiệm kiên nhẫn",
    updated_at: new Date().toISOString()
  }
};

// ============== METADATA ENDPOINT ==============

app.get('/metadata/:tokenId', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const lang = (req.query.lang as string) || 'en';
    
    // 1. Fetch on-chain data
    const depositCore = await contract.getDepositCore(tokenId);
    
    // 2. Get plan metadata
    const planMeta = planMetadata[Number(depositCore.planId)];
    if (!planMeta) {
      return res.status(404).json({ error: 'Plan metadata not found' });
    }
    
    // 3. Generate SVG
    const svg = generateSVG(depositCore, planMeta, lang);
    const svgBase64 = Buffer.from(svg).toString('base64');
    
    // 4. Format metadata
    const description = lang === 'vi' ? planMeta.description_vi : planMeta.description_en;
    const planName = lang === 'vi' ? planMeta.name_vi : planMeta.name_en;
    
    const metadata = {
      name: `Term Deposit Certificate #${tokenId}`,
      description: description,
      image: `data:image/svg+xml;base64,${svgBase64}`,
      external_url: `https://yourdapp.com/deposit/${tokenId}`,
      
      attributes: [
        {
          trait_type: "Principal",
          value: `$${formatUSDC(depositCore.principal)}`,
          display_type: "string"
        },
        {
          trait_type: "APR",
          value: `${(Number(depositCore.aprBps) / 100).toFixed(2)}%`,
          display_type: "string"
        },
        {
          trait_type: "Plan",
          value: planName
        },
        {
          trait_type: "Category",
          value: planMeta.category
        },
        {
          trait_type: "Risk Level",
          value: planMeta.risk_level
        },
        {
          trait_type: "Status",
          value: getStatusText(Number(depositCore.status))
        },
        {
          trait_type: "Start Date",
          value: Number(depositCore.startAt),
          display_type: "date"
        },
        {
          trait_type: "Maturity Date",
          value: Number(depositCore.maturityAt),
          display_type: "date"
        }
      ],
      
      // Extended metadata (not ERC721 standard)
      plan_details: planMeta,
      
      // Blockchain verification
      contract_address: contractAddress,
      token_standard: "ERC721",
      blockchain: "Ethereum",
      network: process.env.NETWORK || "sepolia"
    };
    
    // 5. Cache headers
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'ETag': `"${tokenId}-v${await contract.metadataVersion()}"`
    });
    
    res.json(metadata);
    
  } catch (error: any) {
    console.error('Metadata error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch metadata',
      message: error.message 
    });
  }
});

// Helper functions
function formatUSDC(amount: bigint): string {
  return (Number(amount) / 1e6).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getStatusText(status: number): string {
  const statuses = ['Active', 'Withdrawn', 'Renewed', 'Matured'];
  return statuses[status] || 'Unknown';
}

function generateSVG(deposit: any, plan: PlanMetadata, lang: string): string {
  const principal = formatUSDC(deposit.principal);
  const apr = (Number(deposit.aprBps) / 100).toFixed(2);
  const status = getStatusText(Number(deposit.status));
  const planName = lang === 'vi' ? plan.name_vi : plan.name_en;
  
  // Generate beautiful SVG (can be very complex since off-chain!)
  return `<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="400" height="600" fill="url(#bg)" rx="20"/>
    <text x="200" y="50" font-family="Arial" font-size="20" font-weight="bold" fill="white" text-anchor="middle">
      ${lang === 'vi' ? 'SỔ TIẾT KIỆM' : 'TERM DEPOSIT'}
    </text>
    <text x="200" y="80" font-family="Arial" font-size="14" fill="rgba(255,255,255,0.8)" text-anchor="middle">
      Certificate #${deposit.depositId.toString()}
    </text>
    <rect x="30" y="110" width="340" height="420" fill="white" opacity="0.95" rx="15"/>
    <text x="200" y="180" font-family="Arial" font-size="36" font-weight="bold" fill="#667eea" text-anchor="middle">
      $${principal}
    </text>
    <text x="200" y="240" font-family="Arial" font-size="28" font-weight="bold" fill="#764ba2" text-anchor="middle">
      ${apr}% APR
    </text>
    <text x="200" y="300" font-family="Arial" font-size="16" fill="#666" text-anchor="middle">
      ${planName}
    </text>
    <text x="200" y="350" font-family="Arial" font-size="14" fill="#10b981" text-anchor="middle">
      ${status}
    </text>
  </svg>`;
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Metadata API running on port ${PORT}`);
  console.log(`📝 Endpoint: http://localhost:${PORT}/metadata/:tokenId`);
});

export default app;
```

### 5.3 Phase 3: Deployment Scripts

```typescript
// deploy/03-deploy-hybrid-metadata.ts

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployHybridMetadata: DeployFunction = async (
  hre: HardhatRuntimeEnvironment
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("\n🚀 Deploying Hybrid Metadata System...\n");

  // 1. Deploy DepositCertificate with API endpoint
  const metadataAPI = process.env.METADATA_API_URL || "https://api.yourdapp.com/metadata/";
  
  const depositCertificate = await deploy("DepositCertificate", {
    from: deployer,
    args: [
      deployer,        // initial owner
      metadataAPI      // base URI
    ],
    log: true,
    waitConfirmations: 1
  });

  console.log(`✅ DepositCertificate deployed at: ${depositCertificate.address}`);
  console.log(`📝 Metadata API: ${metadataAPI}`);

  // 2. Verify contract
  if (hre.network.name !== "hardhat" && process.env.ETHERSCAN_API_KEY) {
    console.log("\n🔍 Verifying contract...");
    await hre.run("verify:verify", {
      address: depositCertificate.address,
      constructorArguments: [deployer, metadataAPI]
    });
  }

  // 3. Setup metadata API environment variables
  console.log("\n📋 Required Environment Variables for API:");
  console.log(`DEPOSIT_CERTIFICATE_ADDRESS=${depositCertificate.address}`);
  console.log(`RPC_URL=${process.env.RPC_URL}`);
  console.log(`NETWORK=${hre.network.name}`);
  
  return true;
};

export default deployHybridMetadata;
deployHybridMetadata.tags = ["HybridMetadata"];
```

---

## 6. SOLID Compliance

### 6.1 Single Responsibility Principle (SRP)

```solidity
// ✅ GOOD: Each component has ONE responsibility

// Contract: DepositCertificate
// Responsibility: NFT ownership and minimal on-chain data
contract DepositCertificate is ERC721 {
    mapping(uint256 => DepositCore) public deposits;
    // ONLY handles NFT + core data
}

// Backend: Metadata API
// Responsibility: Generate rich metadata from on-chain + off-chain
class MetadataService {
    async generateMetadata(tokenId) {
        // ONLY handles metadata generation
    }
}

// Database: Plan Metadata Storage
// Responsibility: Store and retrieve marketing content
class PlanMetadataRepository {
    async updatePlanMeta(planId, updates) {
        // ONLY handles database operations
    }
}
```

### 6.2 Open/Closed Principle (OCP)

```typescript
// ✅ GOOD: Open for extension, closed for modification

// Can add new metadata sources without changing contract
interface IMetadataProvider {
    fetchOnchainData(tokenId: number): Promise<DepositCore>;
    fetchOffchainData(planId: number): Promise<PlanMetadata>;
    generateSVG(deposit: DepositCore, plan: PlanMetadata): string;
}

// Implementations
class DatabaseMetadataProvider implements IMetadataProvider {
    // Fetch from PostgreSQL
}

class IPFSMetadataProvider implements IMetadataProvider {
    // Fetch from IPFS
}

class ArweaveMetadataProvider implements IMetadataProvider {
    // Fetch from Arweave
}

// Easy to switch providers
const provider = new DatabaseMetadataProvider(); // or IPFS or Arweave
const metadata = await provider.fetchOffchainData(planId);
```

### 6.3 Liskov Substitution Principle (LSP)

```typescript
// ✅ GOOD: All metadata providers are interchangeable

function renderNFT(tokenId: number, provider: IMetadataProvider) {
    const onchain = await provider.fetchOnchainData(tokenId);
    const offchain = await provider.fetchOffchainData(onchain.planId);
    return provider.generateSVG(onchain, offchain);
}

// Can substitute any provider
renderNFT(42, new DatabaseMetadataProvider());
renderNFT(42, new IPFSMetadataProvider());
renderNFT(42, new ArweaveMetadataProvider());
// All work the same way!
```

### 6.4 Interface Segregation Principle (ISP)

```typescript
// ✅ GOOD: Small, focused interfaces

interface IOnchainDataProvider {
    fetchDepositCore(tokenId: number): Promise<DepositCore>;
}

interface IOffchainDataProvider {
    fetchPlanMetadata(planId: number): Promise<PlanMetadata>;
    updatePlanMetadata(planId: number, updates: Partial<PlanMetadata>): Promise<void>;
}

interface ISVGGenerator {
    generateSVG(deposit: DepositCore, plan: PlanMetadata): string;
}

// Clients only depend on what they need
class MetadataAPI implements IOnchainDataProvider, IOffchainDataProvider {
    // Implements both
}

class SVGService implements ISVGGenerator {
    // Only implements SVG generation
}
```

### 6.5 Dependency Inversion Principle (DIP)

```typescript
// ✅ GOOD: Depend on abstractions, not concretions

// High-level module
class MetadataController {
    constructor(
        private onchainProvider: IOnchainDataProvider,
        private offchainProvider: IOffchainDataProvider,
        private svgGenerator: ISVGGenerator
    ) {}
    
    async getMetadata(tokenId: number) {
        const onchain = await this.onchainProvider.fetchDepositCore(tokenId);
        const offchain = await this.offchainProvider.fetchPlanMetadata(onchain.planId);
        const svg = this.svgGenerator.generateSVG(onchain, offchain);
        return { ...metadata, image: svg };
    }
}

// Easy to test (inject mocks)
// Easy to swap implementations (IPFS → Database → Arweave)
```

---

## 7. Security & Trust Model

### 7.1 Trust Assumptions

```
┌──────────────────────────────────────────────────────────────────┐
│                    TRUST MODEL ANALYSIS                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ON-CHAIN DATA (Trustless)                                       │
│  ├─ depositId, planId, principal, dates, APR                     │
│  ├─ Guaranteed by blockchain consensus                           │
│  ├─ Immutable once written                                       │
│  └─ ✅ NO TRUST REQUIRED                                         │
│                                                                  │
│  OFF-CHAIN METADATA (Trust Required)                             │
│  ├─ Plan names, descriptions, images                             │
│  ├─ Depends on API uptime                                        │
│  ├─ Can be censored or modified                                  │
│  └─ ⚠️ REQUIRES TRUST IN API OPERATOR                            │
│                                                                  │
│  MITIGATION STRATEGIES:                                          │
│  1. Critical data on-chain (money-related)                       │
│  2. Display data off-chain (low risk)                            │
│  3. Fallback to IPFS if API down                                 │
│  4. User can verify on-chain data independently                  │
│  5. Open-source frontend (users can self-host)                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Attack Vectors & Mitigations

**Attack 1: API Server Down**
```
Problem: Metadata API offline → NFTs show broken images

Mitigation:
1. Multi-region deployment (AWS + Cloudflare)
2. Fallback to IPFS if API fails
3. On-chain SVG as last resort (basic version)
4. Service-level agreement (99.9% uptime)

Code:
function tokenURI(uint256 tokenId) public view returns (string memory) {
    // Primary: API
    string memory apiURI = string(abi.encodePacked(_baseURI, tokenId.toString()));
    
    // Fallback: IPFS (pre-generated)
    // string memory ipfsURI = string(abi.encodePacked("ipfs://Qm...", tokenId.toString()));
    
    // Fallback: On-chain SVG (basic version)
    // string memory onchainSVG = _generateBasicSVG(tokenId);
    
    return apiURI;
}
```

**Attack 2: Malicious Metadata**
```
Problem: Compromised API serves malicious content (phishing links, scam descriptions)

Mitigation:
1. Admin authentication (JWT + 2FA)
2. Content validation (sanitize inputs)
3. Rate limiting (prevent spam)
4. Audit logs (track all changes)
5. Rollback capability (version history)
6. Community reporting (flag inappropriate content)

Code:
function updatePlanMetadata(planId, updates) {
    // 1. Authenticate admin
    if (!isAdmin(req.user)) throw new Error("Unauthorized");
    
    // 2. Validate content
    if (containsScamKeywords(updates.description)) {
        throw new Error("Suspicious content detected");
    }
    
    // 3. Sanitize HTML
    updates.description = sanitizeHTML(updates.description);
    
    // 4. Log change
    auditLog.create({
        action: "UPDATE_PLAN_METADATA",
        planId,
        user: req.user.id,
        timestamp: Date.now(),
        changes: updates
    });
    
    // 5. Save with version
    await planMetadataRepo.update(planId, updates);
}
```

**Attack 3: Data Inconsistency**
```
Problem: On-chain APR says 5% but off-chain metadata says 6%

Mitigation:
1. API always fetches on-chain data as source of truth
2. Display both (on-chain + off-chain) with clear labels
3. Validate consistency on frontend
4. Alert if mismatch detected

Code:
async function getMetadata(tokenId) {
    const onchain = await contract.getDepositCore(tokenId);
    const offchain = await database.getPlanMetadata(onchain.planId);
    
    // Validate consistency
    if (offchain.aprBps !== onchain.aprBps) {
        console.warn(`APR mismatch for token ${tokenId}`);
        // Use on-chain value (source of truth)
        offchain.aprBps = onchain.aprBps;
    }
    
    return { onchain, offchain };
}
```

---

## 8. Real-world Examples

### 8.1 Uniswap V3 Position NFTs

**On-chain:**
- Token IDs
- Pool address
- Tick range (lower, upper)
- Liquidity amount

**Off-chain:**
- Position value (USD)
- Unclaimed fees
- Price charts
- Pool analytics

**Metadata API:**
```
https://api.uniswap.org/v1/positions/ethereum/1/42
```

**Learning:** Uniswap stores critical financial data on-chain, but generates rich visualizations off-chain.

### 8.2 ENS (Ethereum Name Service)

**On-chain:**
- Name ownership
- Resolver address
- Expiry date

**Off-chain:**
- Avatar images (IPFS)
- Social profiles
- Website URLs

**Metadata API:**
```
https://metadata.ens.domains/mainnet/0x123.../1
```

**Learning:** ENS uses IPFS for avatars, API for metadata, on-chain for ownership.

### 8.3 Artblocks Generative Art

**On-chain:**
- Token ID
- Project ID
- Seed/hash

**Off-chain:**
- Rendered artwork (generated on-demand)
- Artist info
- Project description

**Metadata API:**
```
https://token.artblocks.io/42000123
```

**Learning:** Artblocks generates art on-demand from on-chain seed, stores nothing off-chain except metadata.

---

## 9. Implementation Checklist

```
✅ SMART CONTRACT
────────────────────────────────────────────────────────────────
□ DepositCore struct with minimal fields
□ tokenURI() points to metadata API
□ setBaseMetadataURI() for migration
□ incrementMetadataVersion() for cache busting
□ getDepositCore() view function
□ Events for status changes
□ Access control (onlySavingLogic, onlyOwner)

✅ BACKEND API
────────────────────────────────────────────────────────────────
□ GET /metadata/:tokenId endpoint
□ Fetch on-chain data via ethers.js
□ Fetch off-chain data from database
□ Generate SVG dynamically
□ Return ERC721-compliant JSON
□ Cache headers (1 hour)
□ PUT /admin/plan/:id/metadata (admin only)
□ POST /admin/refresh-opensea
□ Error handling and logging
□ Rate limiting (100 req/min)

✅ DATABASE
────────────────────────────────────────────────────────────────
□ PlanMetadata table/collection
□ Multi-language support (vi, en, cn)
□ Version history (rollback)
□ Audit logs (who changed what)
□ Indexes (planId, updated_at)

✅ FRONTEND
────────────────────────────────────────────────────────────────
□ useDepositMetadata() hook
□ Fetch on-chain (trustless)
□ Fetch off-chain (rich UX)
□ Display combined data
□ Error handling (API down)
□ Language selector (vi/en)

✅ DEPLOYMENT
────────────────────────────────────────────────────────────────
□ Deploy contract with API URL
□ Setup metadata API server
□ Configure environment variables
□ Setup database (PostgreSQL)
□ Deploy to production (AWS/Vercel)
□ Setup CDN (Cloudflare)
□ SSL certificate
□ Monitoring (Sentry)

✅ TESTING
────────────────────────────────────────────────────────────────
□ Contract unit tests
□ API endpoint tests
□ Load testing (1000 req/s)
□ OpenSea metadata validation
□ MetaMask display test
□ Mobile wallet test
□ Multi-language test
□ Cache invalidation test

✅ DOCUMENTATION
────────────────────────────────────────────────────────────────
□ API documentation (Swagger)
□ Architecture diagram
□ Trust model explanation
□ Admin guide (update metadata)
□ User guide (view NFT)
□ Developer guide (integrate API)
```

---

## 10. Kết luận

### 10.1 Benefits Summary

```
┌──────────────────────────────────────────────────────────────────┐
│              HYBRID METADATA BENEFITS                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  💰 COST SAVINGS                                                 │
│  ├─ 60% reduction in gas costs                                   │
│  ├─ Free metadata updates (no blockchain transactions)           │
│  └─ Scalable to millions of NFTs                                 │
│                                                                  │
│  ⚡ FLEXIBILITY                                                  │
│  ├─ Update marketing content instantly                           │
│  ├─ A/B testing (different descriptions)                         │
│  ├─ Multi-language support (vi/en/cn)                            │
│  └─ Rich media (videos, animations)                              │
│                                                                  │
│  🎨 BETTER UX                                                    │
│  ├─ Beautiful, complex SVG designs                               │
│  ├─ Dynamic content (live prices, stats)                         │
│  ├─ Personalization (user preferences)                           │
│  └─ Fast loading (CDN + caching)                                 │
│                                                                  │
│  🔒 SECURITY                                                     │
│  ├─ Critical data on-chain (immutable)                           │
│  ├─ Display data off-chain (low risk)                            │
│  ├─ Can verify on-chain independently                            │
│  └─ No smart contract risk from metadata bugs                    │
│                                                                  │
│  🚀 SCALABILITY                                                  │
│  ├─ Add new features without contract upgrade                    │
│  ├─ Can migrate to IPFS later                                    │
│  ├─ Supports future standards (ERC-5192, etc.)                   │
│  └─ Modular architecture (easy to extend)                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 10.2 Best Practices

1. **On-chain:** Only store data that affects money/logic
2. **Off-chain:** Everything else (marketing, images, etc.)
3. **Fallbacks:** API → IPFS → On-chain SVG (basic)
4. **Versioning:** Increment metadataVersion when updating
5. **Caching:** Use ETags and Cache-Control headers
6. **Security:** Validate and sanitize all off-chain content
7. **Monitoring:** Track API uptime and performance
8. **Documentation:** Clear trust model explanation

### 10.3 Next Steps

```
PHASE 1 (Week 1): Smart Contract
├─ Implement DepositCertificate with hybrid metadata
├─ Deploy to testnet
└─ Test tokenURI() generation

PHASE 2 (Week 2): Backend API
├─ Build metadata API (Express.js)
├─ Setup database (PostgreSQL)
└─ Test with OpenSea

PHASE 3 (Week 3): Frontend
├─ useDepositMetadata() hook
├─ Display combined data
└─ Language selector

PHASE 4 (Week 4): Production
├─ Deploy to mainnet
├─ Setup monitoring
└─ User testing
```

---

**Phiên bản:** 1.0  
**Ngày tạo:** 29 Tháng 1, 2026  
**Tác giả:** Blockchain Architecture Team  
**Trạng thái:** ✅ Ready for Implementation  

**Chiến lược Hybrid Metadata này giúp bạn:**
- ✅ Tiết kiệm 60% gas costs
- ✅ Update metadata MIỄN PHÍ
- ✅ NFT đẹp hơn, linh hoạt hơn
- ✅ Vẫn đảm bảo security (critical data on-chain)
- ✅ Follow SOLID principles hoàn toàn

**Đây là cách các dự án lớn (Uniswap, ENS, Artblocks) làm! 🚀**
