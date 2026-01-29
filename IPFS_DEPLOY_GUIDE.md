# 🚀 Deploy NFT Metadata lên IPFS - Hướng dẫn nhanh

## ✅ Đã hoàn thành

- [x] Generate 100 metadata files với embedded base64 SVG
- [x] Files saved trong folder: `ipfs-metadata/`
- [x] Mỗi file ~2.3KB (nhẹ, tối ưu)

## 📋 Bước tiếp theo (5 phút)

### Bước 1: Lấy Pinata API Keys (FREE)

1. Truy cập: https://pinata.cloud
2. Click **"Start Building"** → Sign up (free account)
3. Vào **API Keys** → Click **"New Key"**
4. Permissions: Chọn **"PinFileToIPFS"**
5. Key Name: `term-deposit-nft`
6. Click **"Create Key"**
7. **Copy** API Key và Secret Key (chỉ hiện 1 lần!)

### Bước 2: Set Environment Variables

**PowerShell:**
```powershell
$env:PINATA_API_KEY="your_api_key_here"
$env:PINATA_SECRET_KEY="your_secret_key_here"
```

**Hoặc tạo file .env:**
```
PINATA_API_KEY=your_api_key_here
PINATA_SECRET_KEY=your_secret_key_here
```

### Bước 3: Upload lên IPFS

```powershell
cd D:\internBlockchain\AC-capstone-save-banking
npx hardhat run scripts/upload-to-pinata.ts --network sepolia
```

**Kết quả sẽ ra:**
```
✅ Upload successful!
📦 IPFS CID: QmXxxxxxxxxxxxxx
🔗 IPFS URL: ipfs://QmXxx.../
```

### Bước 4: Update Contract baseURI

Script sẽ tự động cho bạn command, chạy luôn:

```powershell
$env:NEW_BASE_URI="ipfs://YOUR_CID_HERE/"
npx hardhat run scripts/update-base-uri.ts --network sepolia
```

### Bước 5: Verify

Sau 2-5 phút:
- Vào Etherscan NFT page: https://sepolia.etherscan.io/nft/0xd50edbc6973d891B95Eb2087a1a13b620440B3e3/2
- Click "..." → **"Refresh metadata"**
- Ảnh certificate gradient xanh-tím sẽ hiển thị! 🎉

## 🎯 Ưu điểm IPFS

✅ **Permanent storage** - Không lo mất dữ liệu
✅ **Decentralized** - Không phụ thuộc server của bạn
✅ **Free** - Pinata free tier: 1GB (đủ cho hàng ngàn NFTs)
✅ **Fast** - CDN global, load nhanh
✅ **Standard** - OpenSea, Etherscan đều support IPFS

## 🔍 Test trước khi update contract

Sau khi upload, test URL này trong browser:
```
https://gateway.pinata.cloud/ipfs/YOUR_CID/1
```

Phải thấy JSON metadata với image base64 SVG!

## ⚡ Quick Start (Copy-paste)

```powershell
# 1. Set API keys (replace with yours)
$env:PINATA_API_KEY="paste_your_key"
$env:PINATA_SECRET_KEY="paste_your_secret"

# 2. Upload
npx hardhat run scripts/upload-to-pinata.ts --network sepolia

# 3. Update contract (replace CID from step 2)
$env:NEW_BASE_URI="ipfs://YOUR_CID/"
npx hardhat run scripts/update-base-uri.ts --network sepolia
```

## 📸 Xem ảnh NFT

**Trước khi update contract:**
- Etherscan: Placeholder image

**Sau khi update:**
- Etherscan: Certificate gradient xanh-tím đẹp! ✨
- OpenSea: Tự động sync sau vài giờ
- Your dApp: Hiển thị luôn (đã làm rồi)

## 💡 Tips

- **CID** = Content Identifier = Hash của folder metadata
- **Gateway URL** = HTTP link để xem IPFS content
- **ipfs://** = Standard NFT metadata URI
- Mỗi NFT có URL riêng: `ipfs://CID/1`, `ipfs://CID/2`, etc.

Hãy làm ngay! 🚀
