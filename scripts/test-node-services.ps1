# Quick test for just the Node.js services that keep failing
Write-Host "🔧 Testing Node.js Services Docker Builds" -ForegroundColor Cyan

# Test business service
Write-Host "`n🏢 Testing business-service..." -ForegroundColor Yellow
docker build -f services/business-service/Dockerfile -t test-business-service .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ business-service build successful" -ForegroundColor Green
} else {
    Write-Host "❌ business-service build failed" -ForegroundColor Red
    exit 1
}

# Test notification service
Write-Host "`n📧 Testing notification-service..." -ForegroundColor Yellow
docker build -f services/notification-service/Dockerfile -t test-notification-service .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ notification-service build successful" -ForegroundColor Green
    Write-Host "`n🎉 Both Node.js services build successfully! Safe to push." -ForegroundColor Green
} else {
    Write-Host "❌ notification-service build failed" -ForegroundColor Red
    exit 1
}
