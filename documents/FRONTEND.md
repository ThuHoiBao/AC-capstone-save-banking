# 🎨 FRONTEND DEVELOPMENT PLAN - Term Deposit DApp

## 📋 Tổng Quan Dự Án

**Mục tiêu**: Xây dựng giao diện web hiện đại, đẹp mắt cho hệ thống tiết kiệm kỳ hạn (Term Deposit Banking) với 2 vai trò: **Admin** và **User**.

**Tech Stack**:
- ⚛️ **React 18+** (TypeScript)
- 🎨 **SCSS Modules** (Component-scoped styling)
- 🔗 **ethers.js v6** (Blockchain interaction)
- 🎭 **Framer Motion** (Animations)
- 📱 **React Router v6** (Routing)
- 🎯 **Zustand** (State management)
- 🎨 **Ant Design / Material-UI** (UI Components)
- 📊 **Recharts / Chart.js** (Data visualization)
- 🌈 **React Icons** (Icon library)

---

## 📁 Cấu Trúc Thư Mục

```
term-deposit-dapp/
├── public/
│   ├── favicon.ico
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   └── index.html
│
├── src/
│   ├── assets/
│   │   ├── images/
│   │   │   ├── logo.svg
│   │   │   ├── hero-bg.png
│   │   │   ├── pattern-bg.svg
│   │   │   └── icons/
│   │   │       ├── wallet.svg
│   │   │       ├── deposit.svg
│   │   │       └── withdraw.svg
│   │   └── fonts/
│   │       └── inter/
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header/
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Header.module.scss
│   │   │   ├── Footer/
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Footer.module.scss
│   │   │   ├── Sidebar/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Sidebar.module.scss
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   └── Button.module.scss
│   │   │   ├── Card/
│   │   │   │   ├── Card.tsx
│   │   │   │   └── Card.module.scss
│   │   │   ├── Modal/
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── Modal.module.scss
│   │   │   ├── Loading/
│   │   │   │   ├── Loading.tsx
│   │   │   │   └── Loading.module.scss
│   │   │   └── Notification/
│   │   │       ├── Notification.tsx
│   │   │       └── Notification.module.scss
│   │   │
│   │   ├── layout/
│   │   │   ├── AppLayout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   └── AppLayout.module.scss
│   │   │   ├── AdminLayout/
│   │   │   │   ├── AdminLayout.tsx
│   │   │   │   └── AdminLayout.module.scss
│   │   │   └── UserLayout/
│   │   │       ├── UserLayout.tsx
│   │   │       └── UserLayout.module.scss
│   │   │
│   │   ├── wallet/
│   │   │   ├── ConnectWallet/
│   │   │   │   ├── ConnectWallet.tsx
│   │   │   │   └── ConnectWallet.module.scss
│   │   │   ├── WalletInfo/
│   │   │   │   ├── WalletInfo.tsx
│   │   │   │   └── WalletInfo.module.scss
│   │   │   └── NetworkSwitch/
│   │   │       ├── NetworkSwitch.tsx
│   │   │       └── NetworkSwitch.module.scss
│   │   │
│   │   ├── user/
│   │   │   ├── Dashboard/
│   │   │   │   ├── UserDashboard.tsx
│   │   │   │   └── UserDashboard.module.scss
│   │   │   ├── PlanList/
│   │   │   │   ├── PlanList.tsx
│   │   │   │   ├── PlanCard.tsx
│   │   │   │   └── PlanList.module.scss
│   │   │   ├── DepositForm/
│   │   │   │   ├── DepositForm.tsx
│   │   │   │   └── DepositForm.module.scss
│   │   │   ├── MyDeposits/
│   │   │   │   ├── MyDeposits.tsx
│   │   │   │   ├── DepositCard.tsx
│   │   │   │   └── MyDeposits.module.scss
│   │   │   ├── WithdrawModal/
│   │   │   │   ├── WithdrawModal.tsx
│   │   │   │   └── WithdrawModal.module.scss
│   │   │   ├── PortfolioSummary/
│   │   │   │   ├── PortfolioSummary.tsx
│   │   │   │   └── PortfolioSummary.module.scss
│   │   │   └── InterestCalculator/
│   │   │       ├── InterestCalculator.tsx
│   │   │       └── InterestCalculator.module.scss
│   │   │
│   │   ├── admin/
│   │   │   ├── Dashboard/
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   └── AdminDashboard.module.scss
│   │   │   ├── PlanManagement/
│   │   │   │   ├── PlanManagement.tsx
│   │   │   │   ├── CreatePlanModal.tsx
│   │   │   │   ├── EditPlanModal.tsx
│   │   │   │   └── PlanManagement.module.scss
│   │   │   ├── VaultManagement/
│   │   │   │   ├── VaultManagement.tsx
│   │   │   │   └── VaultManagement.module.scss
│   │   │   ├── DepositManagement/
│   │   │   │   ├── DepositManagement.tsx
│   │   │   │   ├── DepositTable.tsx
│   │   │   │   └── DepositManagement.module.scss
│   │   │   ├── Statistics/
│   │   │   │   ├── Statistics.tsx
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   ├── UtilizationChart.tsx
│   │   │   │   └── Statistics.module.scss
│   │   │   └── Settings/
│   │   │       ├── Settings.tsx
│   │   │       └── Settings.module.scss
│   │   │
│   │   └── charts/
│   │       ├── LineChart/
│   │       │   ├── LineChart.tsx
│   │       │   └── LineChart.module.scss
│   │       ├── BarChart/
│   │       │   ├── BarChart.tsx
│   │       │   └── BarChart.module.scss
│   │       └── PieChart/
│   │           ├── PieChart.tsx
│   │           └── PieChart.module.scss
│   │
│   ├── context/
│   │   ├── WalletContext.tsx
│   │   ├── ContractContext.tsx
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── hooks/
│   │   ├── useWallet.ts
│   │   ├── useContract.ts
│   │   ├── useDeposit.ts
│   │   ├── usePlan.ts
│   │   ├── useBalance.ts
│   │   ├── useTransaction.ts
│   │   └── useNotification.ts
│   │
│   ├── services/
│   │   ├── contractService.ts
│   │   ├── walletService.ts
│   │   ├── apiService.ts
│   │   └── storageService.ts
│   │
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── calculator.ts
│   │
│   ├── dto/
│   │   ├── Plan.dto.ts
│   │   ├── Deposit.dto.ts
│   │   ├── User.dto.ts
│   │   └── Transaction.dto.ts
│   │
│   ├── data/
│   │   ├── abi/
│   │   │   ├── MockUSDC.json
│   │   │   ├── SavingCore.json
│   │   │   └── VaultManager.json
│   │   └── contracts.ts
│   │
│   ├── styles/
│   │   ├── variables.scss
│   │   ├── mixins.scss
│   │   ├── global.scss
│   │   └── animations.scss
│   │
│   ├── pages/
│   │   ├── Home/
│   │   │   ├── Home.tsx
│   │   │   └── Home.module.scss
│   │   ├── UserDashboard/
│   │   │   ├── UserDashboard.tsx
│   │   │   └── UserDashboard.module.scss
│   │   ├── AdminDashboard/
│   │   │   ├── AdminDashboard.tsx
│   │   │   └── AdminDashboard.module.scss
│   │   ├── Plans/
│   │   │   ├── Plans.tsx
│   │   │   └── Plans.module.scss
│   │   ├── MyDeposits/
│   │   │   ├── MyDeposits.tsx
│   │   │   └── MyDeposits.module.scss
│   │   └── NotFound/
│   │       ├── NotFound.tsx
│   │       └── NotFound.module.scss
│   │
│   ├── routes/
│   │   ├── index.tsx
│   │   ├── PrivateRoute.tsx
│   │   └── AdminRoute.tsx
│   │
│   ├── store/
│   │   ├── index.ts
│   │   ├── walletStore.ts
│   │   ├── contractStore.ts
│   │   └── uiStore.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── contract.types.ts
│   │   ├── wallet.types.ts
│   │   └── global.d.ts
│   │
│   ├── App.tsx
│   ├── App.test.tsx
│   ├── App.css
│   ├── index.tsx
│   ├── index.css
│   ├── logo.svg
│   └── setupTests.ts
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── craco.config.js (for SCSS support)
└── README.md
```

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "ethers": "^6.9.0",
    "zustand": "^4.4.7",
    "framer-motion": "^10.16.16",
    "antd": "^5.12.5",
    "recharts": "^2.10.3",
    "react-icons": "^4.12.0",
    "axios": "^1.6.2",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "typescript": "^5.3.3",
    "sass": "^1.69.5",
    "@craco/craco": "^7.1.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  }
}
```

---

## 🚀 Implementation Timeline

### Week 1: Setup & Core Components
- ✅ Create React app with TypeScript
- ✅ Setup SCSS modules
- ✅ Create folder structure
- ✅ Implement common components (Header, Footer, Card, Button)
- ✅ Setup routing

### Week 2: Blockchain Integration
- ✅ Connect MetaMask wallet
- ✅ Load contract ABIs
- ✅ Create contract service
- ✅ Implement custom hooks
- ✅ Test transactions

### Week 3: User Features
- ✅ User dashboard
- ✅ Plan list & selection
- ✅ Deposit form
- ✅ My deposits page
- ✅ Withdraw functionality

### Week 4: Admin Features
- ✅ Admin dashboard
- ✅ Plan management (CRUD)
- ✅ Vault management
- ✅ Statistics & charts
- ✅ Settings page

### Week 5: Polish & Deploy
- ✅ Animations & transitions
- ✅ Responsive design
- ✅ Error handling
- ✅ Loading states
- ✅ Testing
- ✅ Deploy to Vercel/Netlify

---

## 🎯 Key Features

### User Features
1. ✅ **Connect Wallet** - MetaMask integration
2. ✅ **View Plans** - All available saving plans with APR
3. ✅ **Open Deposit** - Select plan and deposit USDC
4. ✅ **My Portfolio** - View all active deposits
5. ✅ **Calculate Returns** - Interest calculator
6. ✅ **Withdraw** - At maturity or early withdrawal
7. ✅ **Transaction History** - All past transactions
8. ✅ **Notifications** - Real-time updates

### Admin Features
1. ✅ **Dashboard Overview** - Key metrics and stats
2. ✅ **Create Plans** - Add new saving plans
3. ✅ **Edit Plans** - Update APR, limits, etc.
4. ✅ **Vault Management** - Fund vault, withdraw fees
5. ✅ **User Management** - View all users and deposits
6. ✅ **Analytics** - Revenue, utilization charts
7. ✅ **Settings** - Grace period, fee receiver

---

## 🎨 Sample Screens

### 1. Homepage
- Hero section with CTA
- Feature highlights
- How it works section
- Statistics (TVL, users, APR)

### 2. User Dashboard
```
┌─────────────────────────────────────────────────┐
│  👤 Welcome, 0x7F22...82Bc                      │
├─────────────────────────────────────────────────┤
│  💰 Balance: 5,000 USDC                         │
│  📊 Total Invested: 10,000 USDC                 │
│  💵 Expected Returns: 1,200 USDC                │
├─────────────────────────────────────────────────┤
│  Active Deposits (3)                            │
│  ┌───────────┬──────────┬──────────┬─────────┐ │
│  │ Plan      │ Amount   │ APR      │ Maturity│ │
│  ├───────────┼──────────┼──────────┼─────────┤ │
│  │ 365 days  │ 5000     │ 12%      │ 30 days │ │
│  │ 180 days  │ 3000     │ 8%       │ 60 days │ │
│  │ 90 days   │ 2000     │ 5%       │ 15 days │ │
│  └───────────┴──────────┴──────────┴─────────┘ │
└─────────────────────────────────────────────────┘
```

### 3. Admin Dashboard
```
┌─────────────────────────────────────────────────┐
│  📊 Admin Dashboard                             │
├─────────────────────────────────────────────────┤
│  ┌───────────┬───────────┬───────────┬────────┐│
│  │    TVL    │  Users    │  Deposits │  APY   ││
│  │ 1,000,000 │    245    │    1,234  │  10%   ││
│  └───────────┴───────────┴───────────┴────────┘│
├─────────────────────────────────────────────────┤
│  📈 Revenue Chart (Last 30 days)                │
│     [Line Chart]                                │
├─────────────────────────────────────────────────┤
│  📋 Active Plans (9)                            │
│  [Plan Management Table]                        │
└─────────────────────────────────────────────────┘
```

---

## 🔐 Security Considerations

1. **Wallet Connection**
   - Verify network (Sepolia testnet)
   - Check user permissions
   - Handle disconnections

2. **Transaction Safety**
   - Display transaction details before signing
   - Confirm gas fees
   - Show estimated outcomes

3. **Input Validation**
   - Min/max deposit limits
   - Balance checks
   - Plan availability

4. **Error Handling**
   - User-friendly error messages
   - Retry mechanisms
   - Fallback UI states

---

## 📱 Responsive Design

### Mobile (< 768px)
- Hamburger menu
- Stacked cards
- Touch-friendly buttons
- Simplified charts

### Tablet (768px - 1024px)
- 2-column layout
- Sidebar collapse
- Optimized spacing

### Desktop (> 1024px)
- 3-column layout
- Full sidebar
- Rich animations
- Multiple charts

---

## 🌐 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
vercel --prod
```

### Environment Variables
```
REACT_APP_NETWORK=sepolia
REACT_APP_MOCK_USDC=0x5277e9cCe876f5b6DDC5e8CaFb2e30809e1AB6b7
REACT_APP_SAVING_CORE=0x3F5812305278F6e953F4700860480518598Ef015
REACT_APP_VAULT_MANAGER=0x1C7A336B754f97a83E3eb72244967F3c896E1cb8
REACT_APP_ETHERSCAN=https://sepolia.etherscan.io
```

---

## ✅ Testing Checklist

- [ ] Wallet connection/disconnection
- [ ] Network switching
- [ ] View all plans
- [ ] Open deposit
- [ ] Approve USDC
- [ ] View my deposits
- [ ] Withdraw at maturity
- [ ] Early withdrawal
- [ ] Admin: Create plan
- [ ] Admin: Edit plan
- [ ] Admin: View statistics
- [ ] Responsive on mobile
- [ ] Dark mode toggle
- [ ] Error handling

---

## 📚 Resources

- [React Documentation](https://react.dev)
- [ethers.js Documentation](https://docs.ethers.org/v6/)
- [SCSS Documentation](https://sass-lang.com)
- [Framer Motion](https://www.framer.com/motion/)
- [Ant Design](https://ant.design)

---

## 🎉 Next Steps

1. Run `npx create-react-app term-deposit-dapp --template typescript`
2. Install dependencies from package.json
3. Copy contract ABIs from `deployments/sepolia/`
4. Start building components!

**Let's build the most beautiful Term Deposit DApp! 🚀**
