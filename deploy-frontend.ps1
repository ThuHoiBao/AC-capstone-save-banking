# Deploy Frontend to Vercel
# Run this script: .\deploy-frontend.ps1

Write-Host "🚀 Deploying Frontend to Vercel..." -ForegroundColor Cyan

# Step 1: Navigate to frontend directory
Set-Location -Path "D:\internBlockchain\AC-capstone-save-banking\term-deposit-dapp"

# Step 2: Install Vercel CLI if not installed
Write-Host "`n📦 Checking Vercel CLI..." -ForegroundColor Yellow
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Step 3: Login to Vercel
Write-Host "`n🔐 Please login to Vercel..." -ForegroundColor Yellow
vercel login

# Step 4: Deploy to production
Write-Host "`n🚀 Deploying to production..." -ForegroundColor Green
vercel --prod

Write-Host "`n✅ Frontend deployment complete!" -ForegroundColor Green
Write-Host "📝 Copy the production URL and save it for API deployment" -ForegroundColor Cyan
