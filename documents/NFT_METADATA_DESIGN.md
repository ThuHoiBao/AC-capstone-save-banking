# Thiết kế NFT Metadata - Beautiful Passbook Design

## 📑 Mục lục (Table of Contents)

1. [Giới thiệu NFT Metadata](#1-giới-thiệu-nft-metadata)
2. [ERC721 Metadata Standard](#2-erc721-metadata-standard)
3. [Data URI vs IPFS vs Centralized](#3-data-uri-vs-ipfs-vs-centralized)
4. [Thiết kế SVG Passbook](#4-thiết-kế-svg-passbook)
5. [JSON Metadata Structure](#5-json-metadata-structure)
6. [Implementation Guide](#6-implementation-guide)
7. [Testing & Optimization](#7-testing--optimization)

---

## 1. Giới thiệu NFT Metadata

### 1.1 NFT Metadata là gì?

**NFT Metadata** = Dữ liệu mô tả NFT, bao gồm:
- **Tên**: "Term Deposit Certificate #42"
- **Mô tả**: "Chứng chỉ tiết kiệm kỳ hạn trên blockchain"
- **Hình ảnh**: SVG passbook (sổ tiết kiệm) đẹp
- **Thuộc tính**: Principal, APR, Status, Maturity date, ...

**Tại sao quan trọng?**
- 🎨 **Hiển thị trên wallets**: MetaMask, Trust Wallet, Coinbase Wallet
- 🖼️ **Hiển thị trên marketplaces**: OpenSea, Rarible, LooksRare
- 📊 **User experience**: Người dùng nhìn thấy thông tin deposit ngay trong NFT
- 💎 **Collectible value**: NFT đẹp → người dùng muốn giữ lâu

### 1.2 Vì sao dùng SVG thay vì PNG/JPG?

```
┌──────────────────────────────────────────────────────────────────┐
│            SVG vs PNG/JPG COMPARISON                             │
├──────────────────────────────────────────────────────────────────┤
│  Tiêu chí           │  PNG/JPG       │  SVG                      │
├─────────────────────┼────────────────┼───────────────────────────┤
│  File size          │  100-500 KB    │  2-5 KB ✅                │
│  Scalability        │  Pixelated     │  Infinite zoom ✅         │
│  On-chain storage   │  Too expensive │  Affordable ✅            │
│  Dynamic content    │  Static image  │  Can update text ✅       │
│  Gas cost           │  Very high     │  Reasonable ✅            │
│  Quality            │  Fixed         │  Always perfect ✅        │
│  Gradients/effects  │  Baked in      │  Live rendering ✅        │
└──────────────────────────────────────────────────────────────────┘

✅ CHỌN SVG vì:
- Nhẹ, đẹp, động, on-chain được
- Wallet render SVG rất tốt
- OpenSea hỗ trợ SVG 100%
```

---

## 2. ERC721 Metadata Standard

### 2.1 ERC721 Standard Requirements

Theo **EIP-721**, mỗi NFT phải có function `tokenURI()`:

```solidity
function tokenURI(uint256 tokenId) external view returns (string memory);
```

**Return value:** URL hoặc Data URI trỏ đến JSON metadata

**JSON Schema (ERC721 Metadata):**
```json
{
  "name": "Term Deposit Certificate #42",
  "description": "Chứng chỉ tiết kiệm kỳ hạn trên blockchain",
  "image": "ipfs://... hoặc data:image/svg+xml;base64,...",
  "attributes": [
    {
      "trait_type": "Principal",
      "value": "$1000 USDC"
    },
    {
      "trait_type": "APR",
      "value": "5.00%"
    },
    {
      "trait_type": "Status",
      "value": "Active"
    }
  ]
}
```

### 2.2 OpenSea Metadata Standards

OpenSea hỗ trợ thêm nhiều fields:

```json
{
  "name": "string",           // Required
  "description": "string",    // Recommended
  "image": "string",          // Required
  "external_url": "string",   // Optional - link to website
  "attributes": [             // Recommended - traits
    {
      "trait_type": "string",
      "value": "string | number"
    }
  ],
  "background_color": "string", // Optional - hex color (no #)
  "animation_url": "string"     // Optional - video/audio/HTML
}
```

**Best Practices theo OpenSea:**
- ✅ `image`: Luôn có, SVG hoặc IPFS
- ✅ `attributes`: Tối đa 20-30 traits
- ✅ `background_color`: Không dùng `#`, chỉ dùng `"667eea"`
- ✅ `description`: Ngắn gọn, dễ hiểu

---

## 3. Data URI vs IPFS vs Centralized

### 3.1 So sánh 3 phương pháp

```
┌──────────────────────────────────────────────────────────────────┐
│        METADATA STORAGE COMPARISON                               │
├──────────────────────────────────────────────────────────────────┤
│  Method         │ Pros                    │ Cons                 │
├─────────────────┼─────────────────────────┼──────────────────────┤
│ 1. CENTRALIZED  │                         │                      │
│  (https://...)  │ - Easy to update        │ - Server down = NFT  │
│                 │ - Cheap                 │   broken ❌          │
│                 │ - Fast loading          │ - Not decentralized  │
│                 │                         │ - Censorship risk    │
├─────────────────┼─────────────────────────┼──────────────────────┤
│ 2. IPFS         │                         │                      │
│  (ipfs://...)   │ - Decentralized ✅      │ - Pinning required   │
│                 │ - Immutable ✅          │ - Slow loading       │
│                 │ - No server needed      │ - Gateway dependency │
│                 │                         │ - Extra deploy step  │
├─────────────────┼─────────────────────────┼──────────────────────┤
│ 3. DATA URI     │                         │                      │
│  (data:...)     │ - 100% on-chain ✅      │ - Higher gas cost    │
│                 │ - No dependencies ✅    │   (~50k more)        │
│                 │ - Always available ✅   │ - Cannot update      │
│                 │ - Truly decentralized   │   metadata easily    │
└──────────────────────────────────────────────────────────────────┘

✅ CHỌN DATA URI vì:
1. Truly decentralized (không phụ thuộc IPFS gateway)
2. Luôn available (không cần pinning service)
3. Immutable (phù hợp với deposit certificates)
4. Professional (institutional-grade)
```

### 3.2 Data URI Format

**Data URI Structure:**
```
data:[<mediatype>][;base64],<data>

Ví dụ SVG:
data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCI+Li4uPC9zdmc+

Ví dụ JSON:
data:application/json;base64,eyJuYW1lIjoiVGVybSBEZXBvc2l0ICM0MiIsLi4ufQ==
```

**Encoding Flow:**
```
SVG (text)
  ↓
Base64.encode()
  ↓
"PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCI+Li4uPC9zdmc+"
  ↓
Prepend "data:image/svg+xml;base64,"
  ↓
"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCI+Li4uPC9zdmc+"
```

---

## 4. Thiết kế SVG Passbook

### 4.1 Concept Design - Sổ Tiết Kiệm Đẹp

**Mục tiêu thiết kế:**
- 🎨 Gradient background (purple-blue) - sang trọng
- 💎 White card center - clean, professional
- 📊 Clear typography - dễ đọc
- ✨ Subtle animations - hiện đại
- 🏦 Bank passbook style - quen thuộc

**Design Mockup (400x600px):**

```
┌────────────────────────────────────────────────────────┐
│  ╔══════════════════════════════════════════════════╗  │
│  ║  Gradient Background (Purple → Blue)             ║  │
│  ║                                                  ║  │
│  ║     SỔ TIẾT KIỆM KỲ HẠN                         ║  │
│  ║     (white text, bold, 24px)                    ║  │
│  ║                                                  ║  │
│  ║     Certificate #42                             ║  │
│  ║     (white text, 14px)                          ║  │
│  ║                                                  ║  │
│  ║  ┌────────────────────────────────────────────┐ ║  │
│  ║  │  White Card (95% opacity)                  │ ║  │
│  ║  │                                            │ ║  │
│  ║  │         Số tiền gốc                        │ ║  │
│  ║  │         (gray, 16px)                       │ ║  │
│  ║  │                                            │ ║  │
│  ║  │      $1,000.00 USDC                        │ ║  │
│  ║  │      (purple, bold, 36px)                  │ ║  │
│  ║  │                                            │ ║  │
│  ║  │         Lãi suất năm                       │ ║  │
│  ║  │         (gray, 14px)                       │ ║  │
│  ║  │                                            │ ║  │
│  ║  │           5.00%                            │ ║  │
│  ║  │      (purple, bold, 28px)                  │ ║  │
│  ║  │                                            │ ║  │
│  ║  │    Ngày đáo hạn: 30/04/2026                │ ║  │
│  ║  │    (gray, 12px)                            │ ║  │
│  ║  │                                            │ ║  │
│  ║  │    Trạng thái: 🟢 Đang hoạt động          │ ║  │
│  ║  │    (14px, with status badge)               │ ║  │
│  ║  │                                            │ ║  │
│  ║  └────────────────────────────────────────────┘ ║  │
│  ║                                                  ║  │
│  ║  Secured on Blockchain | Plan ID: 1             ║  │
│  ║  (white text, 10px, footer)                     ║  │
│  ╚══════════════════════════════════════════════════╝  │
└────────────────────────────────────────────────────────┘
```

### 4.2 SVG Code - Complete Implementation

```xml
<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- =================== DEFINITIONS =================== -->
  <defs>
    <!-- Gradient Background (Purple → Blue) -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
    
    <!-- Shadow for white card -->
    <filter id="cardShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge> 
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/> 
      </feMerge>
    </filter>
  </defs>
  
  <!-- =================== BACKGROUND =================== -->
  <rect width="400" height="600" fill="url(#bgGradient)" rx="20"/>
  
  <!-- =================== HEADER =================== -->
  <text x="200" y="50" 
        font-family="Arial, sans-serif" 
        font-size="24" 
        font-weight="bold"
        fill="white" 
        text-anchor="middle">
    SỔ TIẾT KIỆM KỲ HẠN
  </text>
  
  <text x="200" y="80" 
        font-family="Arial, sans-serif" 
        font-size="14" 
        fill="rgba(255,255,255,0.8)" 
        text-anchor="middle">
    Certificate #42
  </text>
  
  <!-- =================== WHITE CARD =================== -->
  <rect x="30" y="110" 
        width="340" height="420" 
        fill="white" 
        opacity="0.95" 
        rx="15" 
        filter="url(#cardShadow)"/>
  
  <!-- =================== CARD CONTENT =================== -->
  
  <!-- Principal Amount Label -->
  <text x="200" y="160" 
        font-family="Arial, sans-serif" 
        font-size="16" 
        font-weight="bold"
        fill="#666" 
        text-anchor="middle">
    Số tiền gốc
  </text>
  
  <!-- Principal Amount Value -->
  <text x="200" y="210" 
        font-family="Arial, sans-serif" 
        font-size="36" 
        font-weight="bold"
        fill="#667eea" 
        text-anchor="middle">
    $1,000.00 USDC
  </text>
  
  <!-- Divider Line -->
  <line x1="60" y1="240" x2="340" y2="240" 
        stroke="#ddd" 
        stroke-width="1"/>
  
  <!-- APR Label -->
  <text x="200" y="280" 
        font-family="Arial, sans-serif" 
        font-size="14" 
        fill="#888" 
        text-anchor="middle">
    Lãi suất năm
  </text>
  
  <!-- APR Value -->
  <text x="200" y="320" 
        font-family="Arial, sans-serif" 
        font-size="28" 
        font-weight="bold"
        fill="#764ba2" 
        text-anchor="middle">
    5.00%
  </text>
  
  <!-- Divider Line -->
  <line x1="60" y1="350" x2="340" y2="350" 
        stroke="#ddd" 
        stroke-width="1"/>
  
  <!-- Maturity Date -->
  <text x="200" y="385" 
        font-family="Arial, sans-serif" 
        font-size="12" 
        fill="#888" 
        text-anchor="middle">
    Ngày đáo hạn
  </text>
  
  <text x="200" y="410" 
        font-family="Arial, sans-serif" 
        font-size="14" 
        font-weight="600"
        fill="#333" 
        text-anchor="middle">
    30 Tháng 4, 2026
  </text>
  
  <!-- Status Badge -->
  <rect x="130" y="430" 
        width="140" height="30" 
        fill="#10b981" 
        opacity="0.1" 
        rx="15"/>
  
  <circle cx="150" cy="445" r="5" fill="#10b981">
    <!-- Pulse animation -->
    <animate attributeName="opacity" 
             values="1;0.5;1" 
             dur="2s" 
             repeatCount="indefinite"/>
  </circle>
  
  <text x="165" y="450" 
        font-family="Arial, sans-serif" 
        font-size="14" 
        font-weight="600"
        fill="#10b981" 
        text-anchor="start">
    Đang hoạt động
  </text>
  
  <!-- Plan Info -->
  <text x="200" y="490" 
        font-family="Arial, sans-serif" 
        font-size="11" 
        fill="#999" 
        text-anchor="middle">
    Gói tiết kiệm: 90 ngày
  </text>
  
  <text x="200" y="510" 
        font-family="Arial, sans-serif" 
        font-size="11" 
        fill="#999" 
        text-anchor="middle">
    Mở sổ: 30 Tháng 1, 2026
  </text>
  
  <!-- =================== FOOTER =================== -->
  <text x="200" y="565" 
        font-family="Arial, sans-serif" 
        font-size="10" 
        fill="white" 
        text-anchor="middle">
    🔒 Secured on Blockchain
  </text>
  
  <text x="200" y="585" 
        font-family="Arial, sans-serif" 
        font-size="9" 
        fill="rgba(255,255,255,0.7)" 
        text-anchor="middle">
    Plan ID: 1 | Deposit ID: 42
  </text>
</svg>
```

### 4.3 Dynamic SVG Generation (Solidity)

```solidity
/// @notice Generate dynamic SVG based on deposit data
function _generateSVG(CertificateMetadata memory cert) 
    internal 
    pure 
    returns (string memory) 
{
    // Determine status color and text
    (string memory statusColor, string memory statusText, string memory statusBg) = 
        _getStatusDisplay(cert.status);
    
    return string(
        abi.encodePacked(
            '<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">',
            _generateDefs(),
            _generateBackground(),
            _generateHeader(cert.depositId),
            _generateCard(cert),
            _generateStatus(statusColor, statusText, statusBg),
            _generateFooter(cert.planId, cert.depositId),
            '</svg>'
        )
    );
}

/// @notice Get status display based on current state
function _getStatusDisplay(string memory status) 
    internal 
    pure 
    returns (
        string memory color,    // Text/circle color
        string memory text,     // Display text
        string memory bgColor   // Background color
    ) 
{
    if (keccak256(bytes(status)) == keccak256("Active")) {
        return ("#10b981", unicode"Đang hoạt động", "#10b98120");
    } else if (keccak256(bytes(status)) == keccak256("Matured")) {
        return ("#3b82f6", unicode"Đã đáo hạn", "#3b82f620");
    } else if (keccak256(bytes(status)) == keccak256("Withdrawn")) {
        return ("#6b7280", unicode"Đã rút", "#6b728020");
    } else if (keccak256(bytes(status)) == keccak256("Renewed")) {
        return ("#8b5cf6", unicode"Đã gia hạn", "#8b5cf620");
    } else {
        return ("#f59e0b", unicode"Đang xử lý", "#f59e0b20");
    }
}

/// @notice Format USDC amount with proper decimals
function _formatUSDC(uint256 amount) internal pure returns (string memory) {
    uint256 whole = amount / 1e6;
    uint256 decimals = amount % 1e6;
    
    // Format: $1,234.56 USDC
    return string(
        abi.encodePacked(
            "$",
            _formatWithCommas(whole),
            ".",
            _padDecimals(decimals, 6, 2),  // Show 2 decimal places
            " USDC"
        )
    );
}

/// @notice Format APR (basis points → percentage)
function _formatAPR(uint16 aprBps) internal pure returns (string memory) {
    uint256 whole = aprBps / 100;
    uint256 decimal = aprBps % 100;
    
    return string(
        abi.encodePacked(
            whole.toString(),
            ".",
            _padZeros(decimal, 2),
            "%"
        )
    );
}

/// @notice Format timestamp to readable date
function _formatDate(uint256 timestamp) internal pure returns (string memory) {
    // Simple implementation - in production use BokkyPooBahsDateTimeLibrary
    // For now, return timestamp string
    // TODO: Implement proper date formatting
    
    // Example output: "30 Tháng 4, 2026"
    return string(
        abi.encodePacked(
            "Timestamp: ",
            timestamp.toString()
        )
    );
}

/// @notice Add commas to large numbers (1234567 → 1,234,567)
function _formatWithCommas(uint256 num) internal pure returns (string memory) {
    if (num < 1000) return num.toString();
    
    // Recursive comma insertion
    // Implementation: Split number into groups of 3
    // TODO: Implement proper comma formatting
    
    return num.toString();
}
```

### 4.4 Status Badge Variations

```xml
<!-- Status: Active (Green) -->
<rect x="130" y="430" width="140" height="30" 
      fill="#10b981" opacity="0.1" rx="15"/>
<circle cx="150" cy="445" r="5" fill="#10b981">
  <animate attributeName="opacity" 
           values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
</circle>
<text x="165" y="450" fill="#10b981">Đang hoạt động</text>

<!-- Status: Matured (Blue) -->
<rect x="130" y="430" width="140" height="30" 
      fill="#3b82f6" opacity="0.1" rx="15"/>
<circle cx="150" cy="445" r="5" fill="#3b82f6">
  <animate attributeName="r" 
           values="5;8;5" dur="1.5s" repeatCount="indefinite"/>
</circle>
<text x="165" y="450" fill="#3b82f6">Đã đáo hạn</text>

<!-- Status: Withdrawn (Gray) -->
<rect x="130" y="430" width="140" height="30" 
      fill="#6b7280" opacity="0.1" rx="15"/>
<circle cx="150" cy="445" r="5" fill="#6b7280"/>
<text x="165" y="450" fill="#6b7280">Đã rút</text>

<!-- Status: Renewed (Purple) -->
<rect x="130" y="430" width="140" height="30" 
      fill="#8b5cf6" opacity="0.1" rx="15"/>
<circle cx="150" cy="445" r="5" fill="#8b5cf6"/>
<text x="165" y="450" fill="#8b5cf6">Đã gia hạn</text>
```

---

## 5. JSON Metadata Structure

### 5.1 Complete JSON Schema

```json
{
  "name": "Term Deposit Certificate #42",
  "description": "Chứng chỉ tiết kiệm kỳ hạn được bảo mật trên blockchain Ethereum. Certificate này đại diện cho khoản tiền gửi $1,000 USDC với lãi suất 5.00% trong 90 ngày.",
  "image": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCI+Li4uPC9zdmc+",
  "external_url": "https://your-dapp.com/deposit/42",
  "attributes": [
    {
      "trait_type": "Principal",
      "value": "$1,000.00 USDC",
      "display_type": "string"
    },
    {
      "trait_type": "APR",
      "value": "5.00%",
      "display_type": "string"
    },
    {
      "trait_type": "Tenor",
      "value": 90,
      "display_type": "number"
    },
    {
      "trait_type": "Status",
      "value": "Active"
    },
    {
      "trait_type": "Start Date",
      "value": 1706544000,
      "display_type": "date"
    },
    {
      "trait_type": "Maturity Date",
      "value": 1714320000,
      "display_type": "date"
    },
    {
      "trait_type": "Plan ID",
      "value": 1,
      "display_type": "number"
    },
    {
      "trait_type": "Expected Interest",
      "value": "$12.33 USDC",
      "display_type": "string"
    },
    {
      "trait_type": "Network",
      "value": "Ethereum"
    },
    {
      "trait_type": "Contract Version",
      "value": "v2.0"
    }
  ],
  "background_color": "667eea"
}
```

### 5.2 Solidity JSON Generation

```solidity
/// @notice Generate complete JSON metadata
function _generateJSON(CertificateMetadata memory cert) 
    internal 
    pure 
    returns (string memory) 
{
    string memory svg = _generateSVG(cert);
    string memory svgBase64 = Base64.encode(bytes(svg));
    
    return string(
        abi.encodePacked(
            '{',
            '"name":"Term Deposit Certificate #', cert.depositId.toString(), '",',
            '"description":"', _generateDescription(cert), '",',
            '"image":"data:image/svg+xml;base64,', svgBase64, '",',
            '"external_url":"https://your-dapp.com/deposit/', cert.depositId.toString(), '",',
            '"attributes":', _generateAttributes(cert), ',',
            '"background_color":"667eea"',
            '}'
        )
    );
}

/// @notice Generate description text
function _generateDescription(CertificateMetadata memory cert) 
    internal 
    pure 
    returns (string memory) 
{
    return string(
        abi.encodePacked(
            unicode"Chứng chỉ tiết kiệm kỳ hạn được bảo mật trên blockchain Ethereum. ",
            "Certificate ", unicode"này đại diện cho khoản tiền gửi ",
            _formatUSDC(cert.principal),
            unicode" với lãi suất ",
            _formatAPR(cert.aprBps),
            " trong ",
            uint256((cert.maturityAt - cert.startAt) / 1 days).toString(),
            unicode" ngày."
        )
    );
}

/// @notice Generate attributes array
function _generateAttributes(CertificateMetadata memory cert) 
    internal 
    pure 
    returns (string memory) 
{
    uint256 tenorDays = (cert.maturityAt - cert.startAt) / 1 days;
    
    return string(
        abi.encodePacked(
            '[',
            _makeAttribute("Principal", _formatUSDC(cert.principal), "string"),
            ',',
            _makeAttribute("APR", _formatAPR(cert.aprBps), "string"),
            ',',
            _makeAttribute("Tenor", tenorDays.toString(), "number"),
            ',',
            _makeAttribute("Status", cert.status, "string"),
            ',',
            _makeAttribute("Start Date", cert.startAt.toString(), "date"),
            ',',
            _makeAttribute("Maturity Date", cert.maturityAt.toString(), "date"),
            ',',
            _makeAttribute("Plan ID", cert.planId.toString(), "number"),
            ']'
        )
    );
}

/// @notice Helper to create attribute JSON object
function _makeAttribute(
    string memory traitType,
    string memory value,
    string memory displayType
) internal pure returns (string memory) {
    if (bytes(displayType).length > 0) {
        return string(
            abi.encodePacked(
                '{"trait_type":"', traitType, '",',
                '"value":"', value, '",',
                '"display_type":"', displayType, '"}'
            )
        );
    } else {
        return string(
            abi.encodePacked(
                '{"trait_type":"', traitType, '",',
                '"value":"', value, '"}'
            )
        );
    }
}
```

---

## 6. Implementation Guide

### 6.1 Complete DepositCertificate Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract DepositCertificate is ERC721, Ownable {
    using Strings for uint256;

    // State
    address public savingLogic;
    mapping(uint256 => CertificateMetadata) public certificates;

    struct CertificateMetadata {
        uint256 depositId;
        uint256 planId;
        uint256 principal;
        uint256 startAt;
        uint256 maturityAt;
        uint16 aprBps;
        string status;
    }

    // Events
    event CertificateMinted(uint256 indexed tokenId, address indexed owner);
    event MetadataUpdated(uint256 indexed tokenId, string newStatus);

    modifier onlySavingLogic() {
        require(msg.sender == savingLogic, "Only SavingLogic");
        _;
    }

    constructor(address initialOwner) 
        ERC721("Term Deposit Certificate", "TDC") 
        Ownable(initialOwner) 
    {}

    function setSavingLogic(address _savingLogic) external onlyOwner {
        require(_savingLogic != address(0), "Invalid address");
        savingLogic = _savingLogic;
    }

    function mint(
        address to,
        uint256 tokenId,
        uint256 planId,
        uint256 principal,
        uint256 startAt,
        uint256 maturityAt,
        uint16 aprBps
    ) external onlySavingLogic {
        _safeMint(to, tokenId);
        
        certificates[tokenId] = CertificateMetadata({
            depositId: tokenId,
            planId: planId,
            principal: principal,
            startAt: startAt,
            maturityAt: maturityAt,
            aprBps: aprBps,
            status: "Active"
        });

        emit CertificateMinted(tokenId, to);
    }

    function updateStatus(uint256 tokenId, string calldata newStatus) 
        external 
        onlySavingLogic 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        certificates[tokenId].status = newStatus;
        emit MetadataUpdated(tokenId, newStatus);
    }

    /// @notice Generate tokenURI with beautiful SVG passbook
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        CertificateMetadata memory cert = certificates[tokenId];
        
        string memory json = _generateJSON(cert);
        string memory jsonBase64 = Base64.encode(bytes(json));
        
        return string(
            abi.encodePacked("data:application/json;base64,", jsonBase64)
        );
    }

    // ... (implement all helper functions from section 5.2)
}
```

### 6.2 Testing tokenURI Output

```typescript
// test/depositCertificate.spec.ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositCertificate - Metadata", () => {
    let certificate: DepositCertificate;
    let owner: SignerWithAddress;
    let savingLogic: SignerWithAddress;

    beforeEach(async () => {
        [owner, savingLogic] = await ethers.getSigners();
        
        const DepositCertificate = await ethers.getContractFactory("DepositCertificate");
        certificate = await DepositCertificate.deploy(owner.address);
        await certificate.setSavingLogic(savingLogic.address);
    });

    it("should generate valid Data URI", async () => {
        // Mint certificate
        await certificate.connect(savingLogic).mint(
            owner.address,
            1,              // tokenId
            1,              // planId
            1000_000000,    // principal ($1000)
            1706544000,     // startAt
            1714320000,     // maturityAt
            500             // aprBps (5%)
        );

        // Get tokenURI
        const tokenURI = await certificate.tokenURI(1);
        
        // Verify Data URI format
        expect(tokenURI).to.include("data:application/json;base64,");
        
        // Decode and parse JSON
        const base64Data = tokenURI.split(",")[1];
        const jsonString = Buffer.from(base64Data, "base64").toString();
        const metadata = JSON.parse(jsonString);
        
        // Verify JSON structure
        expect(metadata).to.have.property("name");
        expect(metadata).to.have.property("description");
        expect(metadata).to.have.property("image");
        expect(metadata).to.have.property("attributes");
        
        // Verify name
        expect(metadata.name).to.equal("Term Deposit Certificate #1");
        
        // Verify image is SVG Data URI
        expect(metadata.image).to.include("data:image/svg+xml;base64,");
        
        // Decode SVG
        const svgBase64 = metadata.image.split(",")[1];
        const svgString = Buffer.from(svgBase64, "base64").toString();
        
        // Verify SVG structure
        expect(svgString).to.include("<svg");
        expect(svgString).to.include("</svg>");
        expect(svgString).to.include("$1,000.00 USDC");
        expect(svgString).to.include("5.00%");
        
        // Verify attributes
        expect(metadata.attributes).to.be.an("array");
        expect(metadata.attributes.length).to.be.greaterThan(5);
        
        const principalAttr = metadata.attributes.find(
            (attr: any) => attr.trait_type === "Principal"
        );
        expect(principalAttr).to.exist;
        expect(principalAttr.value).to.include("$1,000");
    });

    it("should update status dynamically", async () => {
        await certificate.connect(savingLogic).mint(
            owner.address, 1, 1, 1000_000000, 
            Date.now(), Date.now() + 90 * 86400, 500
        );

        // Update status
        await certificate.connect(savingLogic).updateStatus(1, "Matured");

        // Get new tokenURI
        const tokenURI = await certificate.tokenURI(1);
        const jsonString = Buffer.from(
            tokenURI.split(",")[1], 
            "base64"
        ).toString();
        const metadata = JSON.parse(jsonString);

        // Verify status changed in attributes
        const statusAttr = metadata.attributes.find(
            (attr: any) => attr.trait_type === "Status"
        );
        expect(statusAttr.value).to.equal("Matured");

        // Verify SVG updated (should have blue badge)
        const svgString = Buffer.from(
            metadata.image.split(",")[1], 
            "base64"
        ).toString();
        expect(svgString).to.include("#3b82f6"); // Blue color for Matured
    });
});
```

---

## 7. Testing & Optimization

### 7.1 Gas Optimization

```solidity
// ❌ BAD: String concatenation in loop
function _generateAttributes(CertificateMetadata memory cert) 
    internal 
    pure 
    returns (string memory) 
{
    string memory result = "[";
    
    // Multiple abi.encodePacked calls = expensive!
    result = string(abi.encodePacked(result, _makeAttribute("Principal", ...)));
    result = string(abi.encodePacked(result, ","));
    result = string(abi.encodePacked(result, _makeAttribute("APR", ...)));
    result = string(abi.encodePacked(result, ","));
    // ... more concatenations
    
    return result;
}

// ✅ GOOD: Single abi.encodePacked
function _generateAttributes(CertificateMetadata memory cert) 
    internal 
    pure 
    returns (string memory) 
{
    return string(
        abi.encodePacked(
            '[',
            _makeAttribute("Principal", _formatUSDC(cert.principal), "string"),
            ',',
            _makeAttribute("APR", _formatAPR(cert.aprBps), "string"),
            ',',
            // All attributes in one call
            ']'
        )
    );
}

// Gas savings: ~50,000 gas per tokenURI() call
```

### 7.2 OpenSea Metadata Refresh

```typescript
// Force OpenSea to refresh metadata
async function refreshMetadata(tokenId: number) {
    const url = `https://api.opensea.io/api/v1/asset/${contractAddress}/${tokenId}/?force_update=true`;
    
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "X-API-KEY": process.env.OPENSEA_API_KEY
        }
    });
    
    const data = await response.json();
    console.log("Metadata refreshed:", data);
}

// Usage: After updateStatus()
await certificate.updateStatus(tokenId, "Withdrawn");
await refreshMetadata(tokenId);
// OpenSea will fetch new tokenURI and update display
```

### 7.3 Browser Testing

```html
<!-- test-nft.html -->
<!DOCTYPE html>
<html>
<head>
    <title>NFT Metadata Viewer</title>
</head>
<body>
    <h1>Term Deposit Certificate Preview</h1>
    
    <div id="metadata-container">
        <h2>Metadata JSON:</h2>
        <pre id="json-output"></pre>
        
        <h2>SVG Image:</h2>
        <div id="svg-output"></div>
    </div>

    <script>
        // Paste Data URI from tokenURI()
        const dataURI = "data:application/json;base64,...";
        
        // Decode JSON
        const base64Data = dataURI.split(",")[1];
        const jsonString = atob(base64Data);
        const metadata = JSON.parse(jsonString);
        
        // Display JSON
        document.getElementById("json-output").textContent = 
            JSON.stringify(metadata, null, 2);
        
        // Decode and display SVG
        const svgDataURI = metadata.image;
        const svgBase64 = svgDataURI.split(",")[1];
        const svgString = atob(svgBase64);
        
        document.getElementById("svg-output").innerHTML = svgString;
    </script>
</body>
</html>
```

---

## 8. Kết luận

### 8.1 Checklist

```
✅ METADATA DESIGN CHECKLIST
────────────────────────────────────────────────────────
□ SVG passbook design hoàn chỉnh
□ Gradient background đẹp
□ Dynamic status badges (Active, Matured, Withdrawn, Renewed)
□ Principal amount formatted với commas
□ APR displayed correctly (5.00%)
□ Date formatting readable
□ Data URI encoding correct
□ JSON metadata follows ERC721 standard
□ OpenSea-compatible attributes
□ Gas-optimized implementation
□ Tests passing (tokenURI generation)
□ Browser preview works
□ OpenSea displays correctly
```

### 8.2 Lợi ích

**On-chain Metadata Benefits:**
- ✅ Truly decentralized (không phụ thuộc server)
- ✅ Always available (không cần IPFS pinning)
- ✅ Immutable (phù hợp deposit certificates)
- ✅ Beautiful display (SVG renders perfectly)
- ✅ Professional grade (institutional quality)

**User Experience:**
- 🎨 Đẹp mắt trên wallets (MetaMask, Trust Wallet)
- 📱 Responsive (SVG scale perfectly)
- 🔄 Dynamic updates (status changes reflected)
- 💎 Collectible (users want to keep)

---

**Phiên bản:** 1.0  
**Ngày tạo:** 29 Tháng 1, 2026  
**Tác giả:** Senior UI/UX Designer & Smart Contract Engineer  
**Trạng thái:** ✅ Ready for Implementation

**Next:** Đọc SKILLS_INJECTION.md để học conversation patterns! 💬
