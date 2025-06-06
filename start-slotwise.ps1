# ========================================
# SlotWise Development Startup Script
# ========================================
# This script starts SlotWise in DEVELOPMENT mode only
# It uses Docker for infrastructure and runs services locally
# ========================================

param(
    [switch]$Clean,
    [switch]$Help
)

if ($Help) {
    Write-Host "SlotWise Development Startup Script" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\start-slotwise.ps1          # Start normally"
    Write-Host "  .\start-slotwise.ps1 -Clean   # Clean start (remove old containers)"
    Write-Host ""
    Write-Host "This script will:" -ForegroundColor Green
    Write-Host "  1. Start infrastructure services (PostgreSQL, Redis, NATS)"
    Write-Host "  2. Wait for services to be healthy"
    Write-Host "  3. Start all SlotWise microservices"
    Write-Host "  4. Start the frontend"
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SlotWise Development Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "infrastructure/docker-compose.dev.yml")) {
    Write-Host "ERROR: Please run this script from the SlotWise root directory" -ForegroundColor Red
    exit 1
}

# Clean start if requested
if ($Clean) {
    Write-Host "Cleaning up old containers..." -ForegroundColor Yellow
    Set-Location infrastructure
    docker-compose -f docker-compose.dev.yml down -v
    docker system prune -f
    Set-Location ..
    Write-Host "Cleanup complete" -ForegroundColor Green
}

# Step 1: Start infrastructure services
Write-Host "Starting infrastructure services..." -ForegroundColor Yellow
Write-Host "   - PostgreSQL (Database)" -ForegroundColor Gray
Write-Host "   - Redis (Cache)" -ForegroundColor Gray
Write-Host "   - NATS (Message Broker)" -ForegroundColor Gray
Write-Host "   - Management UIs" -ForegroundColor Gray

Set-Location infrastructure
docker-compose -f docker-compose.dev.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start infrastructure services" -ForegroundColor Red
    exit 1
}

Set-Location ..
Write-Host "Infrastructure services started" -ForegroundColor Green

# Step 2: Wait for services to be healthy
Write-Host ""
Write-Host "Waiting for infrastructure to be ready..." -ForegroundColor Yellow
Write-Host "   This may take 30-60 seconds..." -ForegroundColor Gray

$maxWait = 60
$waited = 0
$allHealthy = $false

while ($waited -lt $maxWait -and -not $allHealthy) {
    Start-Sleep -Seconds 5
    $waited += 5

    # Check if all services are healthy
    $postgresHealthy = docker ps --filter "name=slotwise-postgres-dev" --filter "health=healthy" -q
    $redisHealthy = docker ps --filter "name=slotwise-redis-dev" --filter "health=healthy" -q
    $natsHealthy = docker ps --filter "name=slotwise-nats-dev" --filter "health=healthy" -q

    if ($postgresHealthy -and $redisHealthy -and $natsHealthy) {
        $allHealthy = $true
    }
    else {
        Write-Host "   Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
    }
}

if (-not $allHealthy) {
    Write-Host "ERROR: Infrastructure services did not become healthy in time" -ForegroundColor Red
    Write-Host "   Check Docker logs: docker-compose -f infrastructure/docker-compose.dev.yml logs" -ForegroundColor Yellow
    exit 1
}

Write-Host "Infrastructure is ready!" -ForegroundColor Green

# Step 3: Start all SlotWise services
Write-Host ""
Write-Host "Starting SlotWise services..." -ForegroundColor Yellow

# Start services in background using npm scripts
Write-Host "   Starting all services with npm..." -ForegroundColor Gray
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow

Write-Host "Services are starting..." -ForegroundColor Green

# Give services time to start
Write-Host ""
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "SlotWise Development Environment Started!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Service URLs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Frontend:      http://localhost:3000" -ForegroundColor White
Write-Host "   Auth API:      http://localhost:8001" -ForegroundColor White
Write-Host "   Business API:  http://localhost:8003" -ForegroundColor White
Write-Host "   Scheduling:    http://localhost:8002" -ForegroundColor White
Write-Host "   Notification:  http://localhost:8004" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Management UIs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Database:      http://localhost:8080 (Adminer)" -ForegroundColor White
Write-Host "   Redis:         http://localhost:8081 (Redis Commander)" -ForegroundColor White
Write-Host "   NATS:          http://localhost:8082 (NATS Surveyor)" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Development Tips" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   • All services are in DEVELOPMENT mode" -ForegroundColor Green
Write-Host "   • Database: slotwise / slotwise_dev_password" -ForegroundColor Green
Write-Host "   • Check logs: npm run logs" -ForegroundColor Green
Write-Host "   • Stop all: Ctrl+C then npm run stop" -ForegroundColor Green
Write-Host ""
Write-Host "Ready for development!" -ForegroundColor Green
Write-Host ""
