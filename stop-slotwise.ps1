# ========================================
# SlotWise Development Stop Script
# ========================================
# This script stops all SlotWise development services
# ========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  Stopping SlotWise Development" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# Stop infrastructure services
Write-Host "🛑 Stopping infrastructure services..." -ForegroundColor Yellow
Set-Location infrastructure
docker-compose -f docker-compose.dev.yml down

Set-Location ..
Write-Host "✅ Infrastructure services stopped" -ForegroundColor Green

# Kill any remaining Node.js processes (services)
Write-Host "🛑 Stopping Node.js services..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ Node.js services stopped" -ForegroundColor Green

# Kill any remaining Go processes (services)
Write-Host "🛑 Stopping Go services..." -ForegroundColor Yellow
Get-Process -Name "main" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "go" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ Go services stopped" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 SlotWise Development Environment Stopped!" -ForegroundColor Green
Write-Host ""
