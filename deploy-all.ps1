# Complete Deployment Script
# Run this to deploy both Frontend and API
# Usage: .\deploy-all.ps1

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Term Deposit DApp - Complete Vercel Deployment      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Check if Vercel CLI is installed
Write-Host "`n📦 Step 1: Checking Vercel CLI..." -ForegroundColor Yellow
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Vercel CLI globally..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed!" -ForegroundColor Green
} else {
    Write-Host "✅ Vercel CLI already installed" -ForegroundColor Green
}

# Login to Vercel
Write-Host "`n🔐 Step 2: Login to Vercel..." -ForegroundColor Yellow
Write-Host "A browser window will open for authentication" -ForegroundColor Gray
vercel login

# Deploy Frontend
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║              DEPLOYING FRONTEND                        ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

Set-Location -Path "D:\internBlockchain\AC-capstone-save-banking\term-deposit-dapp"

Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`n🔨 Building frontend..." -ForegroundColor Yellow
npm run build

Write-Host "`n🚀 Deploying frontend to Vercel..." -ForegroundColor Green
vercel --prod

Write-Host "`n✅ Frontend deployed!" -ForegroundColor Green
Write-Host "📝 IMPORTANT: Copy the production URL above!" -ForegroundColor Cyan
Read-Host "`nPress Enter after copying the frontend URL to continue"

# Deploy Metadata API
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║            DEPLOYING METADATA API                      ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Magenta

Set-Location -Path "D:\internBlockchain\AC-capstone-save-banking\metadata-api"

Write-Host "`n📦 Installing API dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`n🚀 Deploying API to Vercel..." -ForegroundColor Green
vercel --prod

Write-Host "`n✅ API deployed!" -ForegroundColor Green
Write-Host "📝 IMPORTANT: Copy the production URL above!" -ForegroundColor Cyan

# Post-deployment instructions
Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║              POST-DEPLOYMENT STEPS                     ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update CORS in metadata-api/server.js with frontend URL" -ForegroundColor White
Write-Host "2. Redeploy API: cd metadata-api && vercel --prod" -ForegroundColor White
Write-Host "3. Update VITE_METADATA_API_URL in Vercel dashboard" -ForegroundColor White
Write-Host "4. Update contract baseURI:" -ForegroundColor White
Write-Host "   npx hardhat run scripts/update-base-uri.ts --network sepolia" -ForegroundColor Gray
Write-Host "5. Test the application!" -ForegroundColor White

Write-Host "`n✅ Deployment process complete!" -ForegroundColor Green
Write-Host "📚 See documents/VERCEL_DEPLOYMENT_GUIDE.md for details" -ForegroundColor Cyan

Set-Location -Path "D:\internBlockchain\AC-capstone-save-banking"
