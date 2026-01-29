# KIẾN TRÚC VÀ LUỒNG HOẠT ĐỘNG - TERM DEPOSIT DAPP

## 📋 MỤC LỤC
1. [Tổng Quan Hệ Thống](#tổng-quan)
2. [Kiến Trúc Smart Contracts](#smart-contracts)
3. [Kiến Trúc Frontend](#frontend)
4. [Luồng Hoạt Động](#luồng-hoạt-động)
5. [Phân Quyền Admin/User](#phân-quyền)
6. [Tương Tác Contract](#tương-tác-contract)

---

## 🏗️ TỔNG QUAN HỆ THỐNG

### Mục đích
DApp cho phép người dùng gửi tiết kiệm USDC với lãi suất cố định (APR), giống như ngân hàng nhưng on-chain.

### Thành phần chính
```
┌─────────────────────────────────────────────────┐
│           FRONTEND (React + Vite)               │
│  - User Interface                               │
│  - Admin Dashboard                              │
│  - MetaMask Integration                         │
└────────────────┬────────────────────────────────┘
                 │ ethers.js
┌────────────────▼────────────────────────────────┐
│        SMART CONTRACTS (Sepolia)                │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ SavingCore   │──│ VaultManager │            │
│  └──────────────┘  └──────────────┘            │
│  ┌──────────────┐                               │
│  │ MockUSDC     │                               │
│  └──────────────┘                               │
└─────────────────────────────────────────────────┘
```

---

## 🔐 SMART CONTRACTS

### 1. **SavingCore** (`0x3F5812305278F6e953F4700860480518598Ef015`)
**Vai trò**: Quản lý toàn bộ logic gửi tiết kiệm

**Chức năng chính**:
- `createPlan()`: Admin tạo plan mới (tenor, APR, min/max, penalty)
- `updatePlan()`: Admin chỉnh sửa plan
- `openDeposit()`: User mở deposit mới
- `withdrawAtMaturity()`: User rút khi đáo hạn
- `earlyWithdraw()`: User rút sớm (bị phạt)
- `renewDeposit()`: User gia hạn deposit

**State quan trọng**:
```solidity
struct Plan {
    uint256 tenorDays;      // Kỳ hạn (7, 30, 90, 180, 365 ngày)
    uint256 aprBps;         // Lãi suất (basis points: 500 = 5%)
    uint256 minDeposit;     // Số tiền gửi tối thiểu
    uint256 maxDeposit;     // Số tiền gửi tối đa
    uint256 earlyWithdrawPenaltyBps; // Phí rút sớm
    bool enabled;           // Plan có hoạt động không
}

struct Deposit {
    uint256 depositId;
    uint256 planId;
    address user;
    uint256 principal;      // Số tiền gốc
    uint256 startAt;
    uint256 maturityAt;     // Thời điểm đáo hạn
    uint256 aprBpsAtOpen;   // APR lúc mở (không đổi)
    DepositStatus status;   // Active/Withdrawn/Renewed
}
```

### 2. **VaultManager** (`0x1C7AB67D9A63bFE60D41B1d0d22B66cE02c4f2F8`)
**Vai trò**: Quản lý vốn, đảm bảo có đủ USDC để trả lãi

**Chức năng**:
- `depositToVault()`: Nhận USDC từ user
- `withdrawFromVault()`: Trả USDC cho user
- `reserveCapital()`: Dự trữ vốn khi mở deposit
- `releaseCapital()`: Giải phóng vốn khi withdraw

### 3. **MockUSDC** (`0x52775277C9a0eD612e663c4d6Eb60b13Ac13898a`)
**Vai trò**: Token ERC20 giả lập USDC trên testnet

---

## 💻 FRONTEND - KIẾN TRÚC

### Cấu trúc thư mục
```
src/
├── components/
│   ├── common/          # Button, Card, Header, Footer
│   ├── user/            # PlanList, MyDeposits
│   └── wallet/          # ConnectWallet, WalletInfo
├── context/
│   ├── WalletContext    # Quản lý kết nối MetaMask
│   └── ContractContext  # Tạo instance contracts
├── hooks/
│   ├── usePlans         # Fetch plans từ blockchain
│   ├── useDeposit       # Deposit operations
│   ├── useBalance       # Lấy số dư USDC
│   └── useAdmin         # Admin operations
├── pages/
│   ├── Home             # Landing page
│   ├── Plans            # Danh sách plans
│   ├── MyDeposits       # Deposits của user
│   ├── Calculator       # Tính lãi
│   └── Admin            # Admin dashboard (chỉ admin)
└── utils/
    ├── constants        # ADMIN_ADDRESS, contract addresses
    ├── formatters       # Format số, ngày tháng
    └── calculator       # Tính toán lãi suất
```

### Context Pattern

#### **WalletContext** - Quản lý ví MetaMask
```typescript
{
  address: string | null,        // Địa chỉ ví đang connect
  chainId: number | null,        // Chain ID (11155111 = Sepolia)
  balance: string,               // Số dư ETH
  isConnected: boolean,
  provider: BrowserProvider,     // ethers.js provider
  connectWallet: () => Promise<void>,
  disconnectWallet: () => void
}
```

#### **ContractContext** - Quản lý contract instances
```typescript
{
  savingCoreContract: Contract,  // Read-only instance
  vaultManagerContract: Contract,
  usdcContract: Contract,
  provider: BrowserProvider
}
```

---

## 🔄 LUỒNG HOẠT ĐỘNG

### 1. **User Mở Deposit Mới**

```
[User Browser]
    │
    ├─► Click "Deposit" button on Plan card
    │
    ├─► PlanList.tsx: setShowModal(true)
    │
    ├─► User nhập số tiền (amount)
    │
    ├─► Click "Confirm Deposit"
    │
    └─► useDeposit.openDeposit(planId, amount)
            │
            ├─► 1. Approve USDC cho SavingCore
            │       const usdcWithSigner = usdcContract.connect(signer)
            │       await usdcWithSigner.approve(SAVING_CORE_ADDRESS, amountWei)
            │
            ├─► 2. Gọi SavingCore.openDeposit()
            │       const coreWithSigner = savingCoreContract.connect(signer)
            │       await coreWithSigner.openDeposit(planId, amountWei)
            │
            └─► 3. Wait for transaction confirmation
                    await tx.wait()
                    
[Smart Contract - SavingCore]
    │
    ├─► Validate plan enabled
    ├─► Check min/max deposit
    ├─► Transfer USDC từ user → VaultManager
    ├─► Reserve capital trong VaultManager
    ├─► Tạo Deposit struct, lưu vào storage
    └─► Emit DepositOpened event
```

### 2. **User Rút Tiền Khi Đáo Hạn**

```
[User Browser]
    │
    └─► MyDeposits.tsx: Click "Withdraw" button
            │
            └─► useDeposit.withdrawAtMaturity(depositId)
                    │
                    ├─► Get signer từ provider
                    ├─► savingCoreContract.connect(signer)
                    └─► await contract.withdrawAtMaturity(depositId)

[Smart Contract]
    │
    ├─► Check deposit status = Active
    ├─► Check maturity time passed
    ├─► Calculate interest = principal * APR * tenor / 365
    ├─► Calculate total = principal + interest
    ├─► Release capital trong VaultManager
    ├─► Transfer total từ VaultManager → user
    ├─► Update deposit status = Withdrawn
    └─► Emit DepositWithdrawn event
```

### 3. **Admin Tạo Plan Mới**

```
[Admin Browser]
    │
    └─► Admin.tsx: Fill form (tenor, APR, min, max, penalty)
            │
            ├─► Click "Create Plan"
            │
            └─► useAdmin.createPlan(...)
                    │
                    ├─► Check provider available
                    ├─► Get signer
                    ├─► savingCoreContract.connect(signer)
                    └─► await contract.createPlan(...)

[Smart Contract - Only Owner]
    │
    ├─► Check msg.sender = owner (modifier onlyOwner)
    ├─► Validate parameters
    ├─► Create new Plan struct
    ├─► Push to plans array
    ├─► planId++ 
    └─► Emit PlanCreated event
```

---

## 🔐 PHÂN QUYỀN ADMIN/USER

### Địa chỉ Admin
```typescript
// constants.ts
export const ADMIN_ADDRESS = '0x0e9b9a5886c0b6fe23bea10b1e9d00e5333e0a18'.toLowerCase();
```

### Logic Check Admin

#### **Header.tsx** - Hiển thị link Admin
```typescript
const { address } = useWallet();
const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS;

{isAdmin && (
  <Link to="/admin" className={styles.adminLink}>
    🛠️ Admin
  </Link>
)}
```

#### **Admin.tsx** - Page bảo vệ
```typescript
const { address } = useWallet();
const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS;

if (!isAdmin) {
  return (
    <div>
      🚫 Access Denied
      <p>You must be an admin to access this page.</p>
    </div>
  );
}
```

### Phân biệt User vs Admin

| Chức năng | User | Admin |
|-----------|------|-------|
| Xem Plans | ✅ | ✅ |
| Mở Deposit | ✅ | ✅ |
| Rút tiền | ✅ | ✅ |
| Calculator | ✅ | ✅ |
| **Tạo Plan** | ❌ | ✅ |
| **Chỉnh sửa Plan** | ❌ | ✅ |
| **Disable Plan** | ❌ | ✅ |
| **Xem Vault Stats** | ❌ | ✅ |
| **Emergency Pause** | ❌ | ✅ |

---

## 🔌 TƯƠNG TÁC VỚI CONTRACT

### Cách hoạt động

#### 1. **Read-only (Không cần gas)**
```typescript
// Lấy thông tin plan
const plan = await savingCoreContract.getPlan(planId);
// → Không cần signer, chỉ đọc data
```

#### 2. **Write (Cần signer + gas)**
```typescript
// Mở deposit
const signer = await provider.getSigner();
const contractWithSigner = savingCoreContract.connect(signer);
const tx = await contractWithSigner.openDeposit(planId, amount);
await tx.wait(); // Đợi confirm
// → Cần signer để ký transaction, tốn gas
```

### Flow chi tiết

```
┌─────────────────────────────────────────────────┐
│  Frontend Component (PlanList.tsx)              │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  Custom Hook (useDeposit.ts)                    │
│  - Tập hợp logic business                       │
│  - Handle errors                                │
│  - Loading states                               │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  Context (ContractContext)                      │
│  - Provide contract instances                   │
│  - Share across app                             │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  ethers.js                                      │
│  - Encode function call                         │
│  - Send transaction                             │
│  - Parse events                                 │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  MetaMask                                       │
│  - Sign transaction                             │
│  - Send to RPC                                  │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  Sepolia Blockchain                             │
│  - Execute smart contract                       │
│  - Update state                                 │
│  - Emit events                                  │
└─────────────────────────────────────────────────┘
```

---

## 🐛 DEBUG ADMIN ISSUE

### Vấn đề: Đăng nhập admin nhưng không thấy link Admin

#### Nguyên nhân có thể:
1. ❌ Địa chỉ trong MetaMask không match với `ADMIN_ADDRESS`
2. ❌ Case sensitive (uppercase vs lowercase)
3. ❌ Address chưa được toLowerCase()
4. ❌ React component chưa re-render

#### Cách fix:
```typescript
// 1. Log ra console để check
console.log('Current address:', address);
console.log('Admin address:', ADMIN_ADDRESS);
console.log('Is admin?', address?.toLowerCase() === ADMIN_ADDRESS);

// 2. Thêm useEffect để debug
useEffect(() => {
  console.log('Address changed:', address);
  console.log('Is admin:', address?.toLowerCase() === ADMIN_ADDRESS);
}, [address]);
```

---

## ✅ ĐÁNH GIÁ LOGIC

### Điểm mạnh
1. ✅ Phân quyền rõ ràng (Admin/User)
2. ✅ Sử dụng Context API hợp lý
3. ✅ Custom hooks tách biệt logic
4. ✅ Read-only contracts cho performance
5. ✅ Approve USDC trước khi deposit

### Điểm cần cải thiện
1. ⚠️ Admin address hard-coded (nên lấy từ contract)
2. ⚠️ Chưa có loading skeleton
3. ⚠️ Chưa cache plans (re-fetch mỗi lần)
4. ⚠️ Error messages chưa user-friendly
5. ⚠️ Chưa có transaction history

### Gợi ý cải thiện

#### 1. Lấy Owner từ Contract
```typescript
// Thay vì hard-code
const owner = await savingCoreContract.owner();
const isAdmin = address?.toLowerCase() === owner.toLowerCase();
```

#### 2. Cache Plans với React Query
```typescript
const { data: plans } = useQuery('plans', fetchPlans);
```

#### 3. Toast notifications thay vì alert()
```typescript
import { toast } from 'react-hot-toast';
toast.success('Deposit created!');
```

---

## 📝 KẾT LUẬN

### Luồng chính
1. User connect wallet → WalletContext lưu address
2. ContractContext tạo contract instances
3. Component gọi custom hook (usePlans, useDeposit, useAdmin)
4. Hook gọi contract methods với signer
5. MetaMask confirm → Transaction → Blockchain

### Admin vs User
- **Frontend check**: `address === ADMIN_ADDRESS` để hiện/ẩn UI
- **Contract check**: `onlyOwner` modifier để chặn unauthorized calls

### Tương tác Contract
- **Read**: Dùng contract instance trực tiếp (không gas)
- **Write**: `.connect(signer)` → ký transaction → đợi confirmation

Logic tổng thể **HỢP LÝ**, chỉ cần fix debug để đảm bảo admin address check đúng!
