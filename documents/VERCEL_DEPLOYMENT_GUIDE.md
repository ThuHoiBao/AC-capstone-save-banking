# 🚀 HƯỚNG DẪN DEPLOY HỆ THỐNG LÊN VERCEL

**Project:** Term Deposit DApp  
**Version:** 2.0  
**Date:** January 31, 2026

---

## 📋 MỤC LỤC

1. [Tổng Quan](#tổng-quan)
2. [Chuẩn Bị](#chuẩn-bị)
3. [Deploy Frontend (React DApp)](#deploy-frontend-react-dapp)
4. [Deploy Metadata API](#deploy-metadata-api)
5. [Cấu Hình Environment Variables](#cấu-hình-environment-variables)
6. [Kiểm Tra Deployment](#kiểm-tra-deployment)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 TỔNG QUAN

Hệ thống Term Deposit DApp gồm **2 ứng dụng** cần deploy lên Vercel:

```
1. Frontend (React DApp)
   - Thư mục: term-deposit-dapp/
   - Framework: Vite + React
   - Port: 5173 (local)
   - URL: https://your-dapp.vercel.app

2. Metadata API (Express Server)
   - Thư mục: metadata-api/
   - Framework: Express.js
   - Port: 3002 (local)
   - URL: https://your-api.vercel.app
```

---

## 🛠️ CHUẨN BỊ

### 1. Tài Khoản Vercel

1. Truy cập [vercel.com](https://vercel.com)
2. Đăng ký/Đăng nhập bằng GitHub
3. Kết nối GitHub repository của bạn

### 2. Cài Đặt Vercel CLI (Tùy chọn)

```bash
npm install -g vercel
```

### 3. Kiểm Tra Cấu Trúc Project

```
AC-capstone-save-banking/
├── term-deposit-dapp/          # Frontend React
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env                    # Environment variables
│
├── metadata-api/               # Metadata API
│   ├── server.js
│   ├── package.json
│   ├── vercel.json            # ✅ Đã có
│   └── public/
│       ├── plans/             # Plan metadata JSON
│       └── images/            # Plan images
│
└── contracts/                  # Smart contracts (không deploy)
```

---

## 🎨 DEPLOY FRONTEND (REACT DAPP)

### Bước 1: Chuẩn Bị Environment Variables

Tạo file `.env.production` trong `term-deposit-dapp/`:

```bash
# term-deposit-dapp/.env.production

# Network Configuration
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Contract Addresses (Sepolia)
VITE_MOCK_USDC_ADDRESS=0x73a9bEc9B836007904A19C30B2FD9B2f7A6720BA
VITE_DEPOSIT_CERTIFICATE_ADDRESS=0x2A4A34e3C69D862e1dAA94C64C5747f022160AB4
VITE_DEPOSIT_VAULT_ADDRESS=0x077a4941565e0194a00Cd8DABE1acA09111F7B06
VITE_VAULT_MANAGER_ADDRESS=0xFf586ADCE68Ed8f0FcfbFA268Ba81E438900e136
VITE_SAVING_LOGIC_ADDRESS=0xddEDe5D9F4005C1e5f84Cda022DB7e558177FEAb

# Metadata API URL (sẽ cập nhật sau khi deploy API)
VITE_METADATA_API_URL=https://your-metadata-api.vercel.app
```

### Bước 2: Deploy qua Vercel Dashboard

#### Option A: Deploy qua GitHub (Khuyến nghị)

1. **Push code lên GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project vào Vercel**
   - Truy cập [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Chọn repository `AC-capstone-save-banking`
   - Click "Import"

3. **Cấu hình Project**
   ```
   Project Name: term-deposit-dapp
   Framework Preset: Vite
   Root Directory: term-deposit-dapp
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Thêm Environment Variables**
   - Click "Environment Variables"
   - Thêm tất cả biến từ `.env.production`
   - Click "Add" cho mỗi biến

5. **Deploy**
   - Click "Deploy"
   - Đợi 2-3 phút
   - ✅ Frontend deployed!

#### Option B: Deploy qua Vercel CLI

```bash
# Di chuyển vào thư mục frontend
cd term-deposit-dapp

# Login Vercel
vercel login

# Deploy (lần đầu)
vercel

# Trả lời các câu hỏi:
# ? Set up and deploy "~/term-deposit-dapp"? [Y/n] y
# ? Which scope? Your Account
# ? Link to existing project? [y/N] n
# ? What's your project's name? term-deposit-dapp
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] n

# Deploy production
vercel --prod
```

### Bước 3: Lấy URL Frontend

Sau khi deploy thành công:
```
✅ Production: https://term-deposit-dapp.vercel.app
```

Lưu URL này để cấu hình CORS cho Metadata API!

---

## 🔧 DEPLOY METADATA API

### Bước 1: Kiểm Tra File `vercel.json`

File `metadata-api/vercel.json` đã có sẵn:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

### Bước 2: Cập Nhật CORS trong `server.js`

Mở `metadata-api/server.js` và cập nhật CORS:

```javascript
// metadata-api/server.js
const cors = require('cors');

// Cập nhật CORS origin
app.use(cors({
  origin: [
    'http://localhost:5173',                           // Local development
    'https://term-deposit-dapp.vercel.app',           // Production frontend
    'https://your-custom-domain.com'                   // Custom domain (nếu có)
  ],
  credentials: true
}));
```

### Bước 3: Deploy Metadata API

#### Option A: Deploy qua Vercel Dashboard

1. **Import Project**
   - Truy cập [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Chọn repository `AC-capstone-save-banking`
   - Click "Import"

2. **Cấu hình Project**
   ```
   Project Name: term-deposit-metadata-api
   Framework Preset: Other
   Root Directory: metadata-api
   Build Command: (leave empty)
   Output Directory: (leave empty)
   Install Command: npm install
   ```

3. **Environment Variables** (nếu cần)
   ```
   PORT=3002
   NODE_ENV=production
   ```

4. **Deploy**
   - Click "Deploy"
   - Đợi 2-3 phút
   - ✅ API deployed!

#### Option B: Deploy qua Vercel CLI

```bash
# Di chuyển vào thư mục metadata-api
cd metadata-api

# Deploy
vercel

# Trả lời các câu hỏi:
# ? Set up and deploy "~/metadata-api"? [Y/n] y
# ? Which scope? Your Account
# ? Link to existing project? [y/N] n
# ? What's your project's name? term-deposit-metadata-api
# ? In which directory is your code located? ./

# Deploy production
vercel --prod
```

### Bước 4: Lấy URL Metadata API

Sau khi deploy thành công:
```
✅ Production: https://term-deposit-metadata-api.vercel.app
```

---

## ⚙️ CẤU HÌNH ENVIRONMENT VARIABLES

### 1. Cập Nhật Frontend Environment Variables

Quay lại Vercel Dashboard của **Frontend**:

1. Vào Settings → Environment Variables
2. Cập nhật `VITE_METADATA_API_URL`:
   ```
   VITE_METADATA_API_URL=https://term-deposit-metadata-api.vercel.app
   ```
3. Click "Save"
4. Redeploy frontend:
   - Vào Deployments tab
   - Click "..." → "Redeploy"

### 2. Cập Nhật Contract BaseURI

Cập nhật NFT metadata baseURI trong smart contract:

```bash
# Trong thư mục root project
cd D:\internBlockchain\AC-capstone-save-banking

# Chỉnh sửa scripts/update-base-uri.ts
# Thay YOUR_VERCEL_URL bằng URL thực tế
const NEW_BASE_URI = "https://term-deposit-metadata-api.vercel.app/api/metadata/";

# Chạy script
npx hardhat run scripts/update-base-uri.ts --network sepolia
```

---

## ✅ KIỂM TRA DEPLOYMENT

### 1. Kiểm Tra Frontend

Truy cập: `https://term-deposit-dapp.vercel.app`

**Checklist:**
- [ ] Trang web load thành công
- [ ] Kết nối MetaMask hoạt động
- [ ] Hiển thị danh sách plans
- [ ] Hiển thị contract addresses đúng
- [ ] Có thể xem My Deposits
- [ ] NFT Gallery hiển thị certificates

### 2. Kiểm Tra Metadata API

**Test Plan Endpoints:**
```bash
# Get all plans
curl https://term-deposit-metadata-api.vercel.app/api/plans

# Get single plan
curl https://term-deposit-metadata-api.vercel.app/api/plans/1
```

**Test NFT Metadata:**
```bash
# Get NFT metadata (thay 8 bằng depositId thực tế)
curl https://term-deposit-metadata-api.vercel.app/api/metadata/8
```

**Expected Response:**
```json
{
  "name": "Term Deposit Certificate #8",
  "description": "Certificate of ownership...",
  "image": "data:image/svg+xml;base64,...",
  "attributes": [...]
}
```

### 3. Kiểm Tra NFT trên Etherscan

1. Truy cập Etherscan Sepolia
2. Tìm NFT certificate: `https://sepolia.etherscan.io/nft/0x2A4A34e3C69D862e1dAA94C64C5747f022160AB4/8`
3. Kiểm tra:
   - [ ] Metadata hiển thị đúng
   - [ ] SVG certificate hiển thị đẹp
   - [ ] Attributes đầy đủ

---

## 🔍 TROUBLESHOOTING

### Lỗi 1: Frontend không kết nối được MetaMask

**Nguyên nhân:** Network configuration sai

**Giải pháp:**
```bash
# Kiểm tra .env.production
VITE_CHAIN_ID=11155111  # Phải là Sepolia
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

### Lỗi 2: API trả về CORS error

**Nguyên nhân:** CORS chưa cấu hình đúng

**Giải pháp:**
```javascript
// metadata-api/server.js
app.use(cors({
  origin: 'https://term-deposit-dapp.vercel.app',  // Frontend URL
  credentials: true
}));
```

Sau đó redeploy API.

### Lỗi 3: NFT metadata không hiển thị trên Etherscan

**Nguyên nhân:** Contract baseURI chưa update

**Giải pháp:**
```bash
# Update baseURI
npx hardhat run scripts/update-base-uri.ts --network sepolia

# Verify
npx hardhat run scripts/verify-metadata.ts --network sepolia
```

### Lỗi 4: Build failed - Module not found

**Nguyên nhân:** Dependencies chưa đầy đủ

**Giải pháp:**
```bash
# Frontend
cd term-deposit-dapp
npm install
npm run build  # Test local build

# API
cd metadata-api
npm install
```

### Lỗi 5: Environment variables không load

**Nguyên nhân:** Vercel chưa sync environment variables

**Giải pháp:**
1. Vào Vercel Dashboard
2. Settings → Environment Variables
3. Kiểm tra tất cả biến đã được thêm
4. Redeploy project

---

## 🎯 CUSTOM DOMAIN (TÙY CHỌN)

### 1. Thêm Custom Domain cho Frontend

1. Vào Vercel Dashboard → term-deposit-dapp
2. Settings → Domains
3. Thêm domain: `dapp.yourdomain.com`
4. Cấu hình DNS:
   ```
   Type: CNAME
   Name: dapp
   Value: cname.vercel-dns.com
   ```

### 2. Thêm Custom Domain cho API

1. Vào Vercel Dashboard → term-deposit-metadata-api
2. Settings → Domains
3. Thêm domain: `api.yourdomain.com`
4. Cấu hình DNS tương tự

### 3. Cập Nhật Environment Variables

Sau khi có custom domain, cập nhật:

```bash
# Frontend .env
VITE_METADATA_API_URL=https://api.yourdomain.com

# API CORS
origin: 'https://dapp.yourdomain.com'
```

---

## 📊 MONITORING & ANALYTICS

### Vercel Analytics

1. Vào project → Analytics tab
2. Enable Web Analytics
3. Xem metrics:
   - Page views
   - Unique visitors
   - Performance scores
   - Error rates

### Vercel Logs

Xem logs real-time:
```bash
# Frontend logs
vercel logs term-deposit-dapp

# API logs
vercel logs term-deposit-metadata-api
```

---

## 🔄 CI/CD - AUTO DEPLOYMENT

Vercel tự động deploy khi push code lên GitHub:

```bash
# Workflow
1. Push code lên GitHub
   git add .
   git commit -m "Update feature"
   git push origin main

2. Vercel tự động detect changes
   - Build project
   - Run tests (nếu có)
   - Deploy to production

3. Nhận notification
   - Email
   - Slack (nếu setup)
   - GitHub commit status
```

**Branch Deployment:**
- `main` branch → Production
- `develop` branch → Preview
- Feature branches → Preview URLs

---

## 📝 CHECKLIST HOÀN CHỈNH

### Pre-Deployment
- [ ] Code đã test kỹ trên local
- [ ] Environment variables đã chuẩn bị
- [ ] Smart contracts đã deploy lên Sepolia
- [ ] Git repository đã push lên GitHub

### Frontend Deployment
- [ ] Deploy frontend lên Vercel
- [ ] Cấu hình environment variables
- [ ] Test kết nối MetaMask
- [ ] Test tất cả features

### API Deployment
- [ ] Deploy metadata API lên Vercel
- [ ] Cấu hình CORS
- [ ] Test plan endpoints
- [ ] Test NFT metadata endpoints

### Post-Deployment
- [ ] Update contract baseURI
- [ ] Verify NFT metadata trên Etherscan
- [ ] Test end-to-end user flows
- [ ] Setup monitoring & alerts

---

## 🎉 KẾT LUẬN

Sau khi hoàn thành các bước trên, bạn sẽ có:

✅ **Frontend DApp** deployed tại: `https://term-deposit-dapp.vercel.app`  
✅ **Metadata API** deployed tại: `https://term-deposit-metadata-api.vercel.app`  
✅ **NFT Certificates** hiển thị đẹp trên Etherscan  
✅ **Auto-deployment** khi push code lên GitHub

**URLs Quan Trọng:**
- Frontend: https://term-deposit-dapp.vercel.app
- API: https://term-deposit-metadata-api.vercel.app
- Etherscan: https://sepolia.etherscan.io

**Support:**
- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support

---

**Document Version:** 1.0  
**Last Updated:** January 31, 2026  
**Author:** Tran Anh Thu
