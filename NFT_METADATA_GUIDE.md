# 🖼️ NFT Metadata - Cách hoạt động để hiển thị ảnh chứng chỉ

## 📚 Kiến trúc NFT Metadata

### 1. Luồng hoạt động (Data Flow)

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐         ┌─────────────┐
│  Etherscan  │ ──────> │   Contract   │ ──────> │  Metadata    │ ──────> │   Image     │
│   / OpenSea │  (1)    │  tokenURI()  │  (2)    │     API      │  (3)    │  (base64)   │
└─────────────┘         └──────────────┘         └──────────────┘         └─────────────┘
```

**Bước 1:** Etherscan/OpenSea gọi `contract.tokenURI(tokenId)`
- Input: Token ID (ví dụ: 1, 2, 3...)
- Output: URL metadata (ví dụ: `https://api.example.com/metadata/1`)

**Bước 2:** Platform fetch metadata từ URL
- Request: `GET https://api.example.com/metadata/1`
- Response: JSON chứa thông tin NFT

**Bước 3:** Platform hiển thị ảnh từ trường `image` trong JSON

### 2. Cấu trúc Metadata JSON (ERC-721 Standard)

```json
{
  "name": "Term Deposit Certificate #1",
  "description": "Certificate of ownership for a term deposit...",
  "image": "data:image/svg+xml;base64,PHN2Zy4uLg==",
  "external_url": "https://your-dapp.com/nft-gallery",
  "attributes": [
    { "trait_type": "Certificate ID", "value": "1" },
    { "trait_type": "Status", "value": "Active" }
  ]
}
```

**Các trường quan trọng:**
- `image`: **URL hoặc Data URI** của ảnh
  - ✅ External URL: `https://example.com/image.png`
  - ✅ **Data URI (Khuyên dùng):** `data:image/svg+xml;base64,<base64_encoded_svg>`
  - ✅ IPFS: `ipfs://QmXxx...`
  
### 3. Vấn đề với localhost và giải pháp

#### ❌ Vấn đề hiện tại

Contract trả về: `https://term-deposit-api.vercel.app/metadata/2`

Nhưng API Vercel **chưa được deploy code mới** nên vẫn trả về ảnh placeholder.

#### ✅ Giải pháp 1: Deploy API lên Vercel (Production-ready)

**Bước 1:** Commit code mới
```bash
cd metadata-api
git add .
git commit -m "feat: Add base64 SVG certificate generation"
```

**Bước 2:** Deploy lên Vercel
```bash
# Cài Vercel CLI nếu chưa có
npm i -g vercel

# Deploy
vercel

# Hoặc push lên GitHub và auto-deploy qua Vercel dashboard
```

**Bước 3:** Verify endpoint hoạt động
```bash
curl https://term-deposit-api.vercel.app/metadata/1
```

Kết quả mong đợi:
```json
{
  "name": "Term Deposit Certificate #1",
  "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cD...",
  ...
}
```

**Bước 4:** Etherscan tự động refresh sau vài giờ, hoặc force refresh:
- Vào Etherscan NFT page
- Click "..." → "Refresh metadata"

#### ✅ Giải pháp 2: Sử dụng IPFS (Permanent storage)

**Bước 1:** Upload SVG lên IPFS
```bash
# Sử dụng Pinata, NFT.Storage, hoặc web3.storage
# Ví dụ với NFT.Storage:
npx nft-storage upload ./certificate.svg
```

**Bước 2:** Update metadata API trả về IPFS URL
```javascript
const metadata = {
  name: `Term Deposit Certificate #${tokenId}`,
  image: `ipfs://QmYourCertificateHash`,
  ...
};
```

#### ✅ Giải pháp 3: Embedded base64 trong contract (Gas-efficient)

**Cách này không cần API external!**

Update contract để trả về data URI trực tiếp:

```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_exists(tokenId), "Token does not exist");
    
    // Generate base64 encoded JSON
    string memory json = Base64.encode(
        bytes(
            string(
                abi.encodePacked(
                    '{"name":"Term Deposit Certificate #',
                    tokenId.toString(),
                    '","image":"data:image/svg+xml;base64,',
                    generateCertificateSVG(tokenId),
                    '"}'
                )
            )
        )
    );
    
    return string(abi.encodePacked('data:application/json;base64,', json));
}
```

**Ưu điểm:** 
- ✅ Không phụ thuộc API external
- ✅ Permanently on-chain
- ✅ Không lo domain expire

**Nhược điểm:**
- ❌ Tốn gas khi update logic
- ❌ Hạn chế kích thước ảnh

### 4. Kiểm tra deployment hiện tại

**Contract baseURI:**
```javascript
const cert = await ethers.getContractAt('DepositCertificate', '0xd50edbc6973d891B95Eb2087a1a13b620440B3e3');
const uri = await cert.tokenURI(2);
console.log(uri);
// Output: https://term-deposit-api.vercel.app/metadata/2
```

**Test API endpoint:**
```bash
# Phải trả về JSON với image field
curl https://term-deposit-api.vercel.app/metadata/2
```

**Hiện trạng:**
- ✅ Contract đã có baseURI đúng
- ❌ API Vercel chưa có code mới với base64 SVG
- ⚠️ Cần deploy metadata-api lên Vercel

### 5. Hướng dẫn deploy nhanh

**Option A: Vercel (Khuyến nghị)**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
cd D:\internBlockchain\AC-capstone-save-banking\metadata-api
vercel --prod

# 4. Verify
curl https://term-deposit-api.vercel.app/metadata/1
```

**Option B: Railway / Render (Alternative)**

```bash
# Tương tự, follow docs của platform
# Đảm bảo PORT được set từ env variable
```

**Option C: On-chain SVG (No server needed)**

Xem script: `scripts/update-base-uri.ts`

## 🎨 Demo SVG Certificate

File tạo: `metadata-api/generate-certificate-svg.js`

**Kết quả base64:**
```
data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgNTAwIj4...
```

**Render trong browser:**
- Copy base64 string
- Paste vào address bar
- Enter → Xem ảnh certificate đẹp với gradient xanh-tím!

## 📊 Checklist hoàn thành

- [x] Tạo SVG certificate template
- [x] Function generate base64 SVG
- [x] Update metadata API endpoint
- [x] Test localhost (✅ hoạt động)
- [ ] **TODO: Deploy lên Vercel** ⚠️ QUAN TRỌNG
- [ ] Verify Etherscan hiển thị ảnh
- [ ] (Optional) Force refresh metadata trên Etherscan

## 🚀 Next Steps

1. **Deploy metadata-api lên Vercel ngay**
   ```bash
   cd metadata-api
   vercel --prod
   ```

2. **Test production endpoint**
   ```bash
   curl https://term-deposit-api.vercel.app/metadata/1
   curl https://term-deposit-api.vercel.app/metadata/2
   ```

3. **Wait hoặc force refresh Etherscan** (2-24 giờ tự động)
   - Vào: https://sepolia.etherscan.io/nft/0xd50edbc6973d891B95Eb2087a1a13b620440B3e3/2
   - Click "..." → "Refresh metadata"

4. **Xem kết quả**
   - NFT #2 sẽ hiển thị ảnh certificate gradient xanh-tím đẹp thay vì placeholder!

---

**Kết luận:** Để ảnh hiện trên Etherscan, **PHẢI deploy API lên server public**. Localhost không hoạt động vì Etherscan không thể access localhost của bạn.
