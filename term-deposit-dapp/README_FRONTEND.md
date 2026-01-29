# Term Deposit DApp - Frontend

Frontend React application cho hệ thống tiết kiệm kỳ hạn (Term Deposit Banking) on-chain.

## 🎯 Chức năng đã hoàn thiện

### User Features ✅
- ✅ Connect/Disconnect MetaMask Wallet
- ✅ View Balance USDC
- ✅ View danh sách Saving Plans
- ✅ Open Deposit với calculator preview 
- ✅ View My Deposits
- ✅ Withdraw at Maturity
- ✅ Early Withdraw (with penalty)
- ✅ Renew Deposit
- ✅ Interest Calculator

### UI/UX ✅
- ✅ Responsive design
- ✅ Modern styling with SCSS modules
- ✅ Loading states & error handling
- ✅ Transaction feedback
- ✅ Real-time data from blockchain

## 🛠️ Tech Stack

- **React 19** với TypeScript
- **Vite** - build tool
- **ethers.js v6** - blockchain interaction
- **React Router v6** - routing
- **SCSS Modules** - styling
- **Context API** - state management

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🌐 Network Configuration

App được cấu hình cho **Sepolia Testnet**:
- Chain ID: 11155111
- Contracts deployed:
  - MockUSDC: `0x5277e9cCe876f5b6DDC5e8CaFb2e30809e1AB6b7`
  - SavingCore: `0x3F5812305278F6e953F4700860480518598Ef015`
  - VaultManager: `0x1C7A336B754f97a83E3eb72244967F3c896E1cb8`

## 📁 Cấu trúc Project

```
src/
├── components/
│   ├── common/          # Header, Button, Card...
│   ├── wallet/          # ConnectWallet, WalletInfo
│   └── user/            # PlanList, MyDeposits
├── context/
│   ├── WalletContext.tsx
│   └── ContractContext.tsx
├── hooks/
│   ├── usePlans.ts
│   ├── useDeposit.ts
│   └── useBalance.ts
├── pages/
│   ├── Home/
│   ├── Plans/
│   ├── MyDeposits/
│   └── Calculator/
├── utils/
│   ├── constants.ts
│   ├── formatters.ts
│   └── calculator.ts
├── data/
│   ├── abi/             # Contract ABIs
│   └── contracts.ts     # Contract addresses
└── styles/
    ├── variables.scss   # Design tokens
    └── global.scss      # Global styles
```

## 🚀 Usage

### 1. Connect Wallet
- Click "Connect Wallet" button
- Approve MetaMask connection
- Ensure you're on Sepolia network

### 2. View & Choose Plan
- Navigate to "Plans" page
- View available saving plans with APR
- Check tenor, min/max deposit, and penalty rates

### 3. Open Deposit
- Click "Deposit" on chosen plan
- Enter amount (USDC)
- Preview expected maturity amount
- Approve USDC spending
- Confirm transaction

### 4. Manage Deposits
- Navigate to "My Deposits"
- View all active deposits
- Withdraw at maturity (principal + interest)
- Early withdraw (principal - penalty)
- Renew deposit to extend

### 5. Calculate Interest
- Use Calculator page
- Input amount, tenor, APR
- Preview interest & maturity amount

## 🎨 Design System

### Colors
- **Primary**: Indigo (#6366F1)
- **Secondary**: Green (#10B981) 
- **Accent**: Amber (#F59E0B)
- **Danger**: Red (#EF4444)

### Typography
- Font: Inter
- Sizes: 12px - 36px
- Weights: 400 - 700

## 📝 TODO (Optional Enhancements)

- [ ] Admin Dashboard (plan management, vault ops)
- [ ] Auto-renew functionality UI
- [ ] Transaction history
- [ ] Dark mode toggle
- [ ] Multi-language support
- [ ] Charts & analytics
- [ ] NFT certificate viewer
- [ ] Mobile app (React Native)

## 🔗 Links

- [Smart Contracts Repo](../AC-capstone-save-banking/)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [MetaMask](https://metamask.io/)

## 📄 License

MIT
