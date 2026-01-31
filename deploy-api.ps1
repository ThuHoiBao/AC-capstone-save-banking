# Deploy Metadata API to Vercel
# Run this script: .\deploy-api.ps1

Write-Host "🚀 Deploying Metadata API to Vercel..." -ForegroundColor Cyan

# Step 1: Navigate to API directory
Set-Location -Path "D:\internBlockchain\AC-capstone-save-banking\metadata-api"

# Step 2: Check Vercel CLI
Write-Host "`n📦 Checking Vercel CLI..." -ForegroundColor Yellow
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Step 3: Login to Vercel (if not already logged in)
Write-Host "`n🔐 Vercel login check..." -ForegroundColor Yellow
vercel whoami

# Step 4: Deploy to production
Write-Host "`n🚀 Deploying API to production..." -ForegroundColor Green
vercel --prod

Write-Host "`n✅ API deployment complete!" -ForegroundColor Green
Write-Host "📝 Copy the production URL" -ForegroundColor Cyan
Write-Host "⚠️  Remember to update CORS in server.js with frontend URL" -ForegroundColor Yellow
