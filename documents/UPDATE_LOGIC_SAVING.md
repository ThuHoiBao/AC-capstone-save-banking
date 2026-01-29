# Kế hoạch Tái Cấu Trúc Smart Contract - Architecture Refactoring Plan

## 📋 Tóm tắt điều hành (Executive Summary)

### 🎯 Mục tiêu chính
Tái cấu trúc kiến trúc smart contract hiện tại để tách biệt logic ERC721 NFT ra khỏi business logic trong SavingCore.sol, nhằm:
1. **Bảo vệ tài sản người dùng**: NFT certificates an toàn tuyệt đối ngay cả khi business logic có lỗi
2. **Nâng cao khả năng nâng cấp**: Có thể thay thế contract logic mà không ảnh hưởng NFT
3. **Tuân thủ SOLID principles**: Mỗi contract có một trách nhiệm duy nhất
4. **Tăng tính bảo trì**: Code rõ ràng, dễ test, dễ mở rộng

### ⚠️ Vấn đề hiện tại (Current Problems)

**Kiến trúc Monolithic - Điểm Yếu Chết Người:**

```
┌─────────────────────────────────────────┐
│     SavingCore.sol (365 dòng)           │
│  ❌ VÀO NHAU KHÔNG TÁCH ĐƯỢC             │
├─────────────────────────────────────────┤
│  1. ERC721 (NFT Certificate Logic)      │  ← Nếu business logic lỗi
│  2. Plan Management (Quản lý gói)       │  ← Toàn bộ NFT có thể bị
│  3. Deposit Logic (Gửi tiền)            │  ← lock hoặc mất dữ liệu!
│  4. Withdrawal Logic (Rút tiền)         │  ← Không upgrade được!
│  5. Renewal Logic (Gia hạn)             │  ← Vi phạm SOLID!
│  6. Interest Calculations (Tính lãi)    │
└─────────────────────────────────────────┘
```

**Rủi ro cụ thể:**
- 🔴 **Single Point of Failure**: Bug trong withdrawal logic → tất cả NFT bị lock
- 🔴 **Không thể upgrade**: Muốn sửa bug phải deploy lại toàn bộ → users mất NFT
- 🔴 **Vi phạm Single Responsibility**: 1 contract làm 6 việc khác nhau
- 🔴 **Tight Coupling**: NFT ownership gắn chặt với business logic
- 🔴 **Khó test**: Phải test toàn bộ cùng lúc, không tách biệt được

### ✅ Giải pháp đề xuất (Proposed Solution)

**Kiến trúc 3 Contract Tách Biệt:**

```
┌──────────────────────────────────────────────────────────────┐
│              KIẾN TRÚC MỚI - 3 CONTRACT RIÊNG BIỆT            │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│  DepositCertificate.sol │  ✅ ERC721 NFT (BẤT BIẾN - IMMUTABLE)
│  (150 dòng)             │     → Chỉ mint/burn NFT
│                         │     → Metadata đẹp (SVG passbook)
│  - mint()               │     → An toàn tuyệt đối
│  - burn()               │     → Không bao giờ phải deploy lại
│  - tokenURI()           │
│  - metadata storage     │
└────────┬────────────────┘
         │ owns NFT
         │
         ↓
┌─────────────────────────┐     ┌─────────────────────────┐
│   SavingLogic.sol       │────→│   VaultManager.sol      │
│   (200 dòng)            │calls│   (Giữ nguyên)          │
│                         │     │                         │
│  ✅ BUSINESS LOGIC      │     │  ✅ LIQUIDITY POOL      │
│  (CÓ THỂ NÂNG CẤP)      │     │  (GIỮ NGUYÊN)           │
│                         │     │                         │
│  - openDeposit()        │     │  - fundVault()          │
│  - withdraw()           │     │  - payoutInterest()     │
│  - renewDeposit()       │     │  - distributePenalty()  │
│  - createPlan()         │     │  - pause/unpause        │
│  - queries NFT owner    │     └─────────────────────────┘
└─────────────────────────┘
```

**Lợi ích ngay lập tức:**
- ✅ **NFT an toàn**: Logic lỗi không ảnh hưởng NFT
- ✅ **Upgrade dễ dàng**: Chỉ thay SavingLogic, NFT vẫn hoạt động
- ✅ **Tuân thủ SOLID**: Mỗi contract 1 trách nhiệm
- ✅ **Dễ test**: Test từng contract độc lập
- ✅ **Gas tối ưu**: Tách nhỏ giảm gas usage operations