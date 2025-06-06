# ========================================
# SlotWise Pure Docker Development
# ========================================
# This script starts ALL SlotWise services in Docker
# One command, everything in containers, full e2e testing
# ========================================

param(
    [switch]$Clean,
    [switch]$Help,
    [switch]$Build
)

if ($Help) {
    Write-Host "SlotWise Pure Docker Development" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\start-docker.ps1          # Start all services in Docker"
    Write-Host "  .\start-docker.ps1 -Clean   # Clean start (remove containers & images)"
    Write-Host "  .\start-docker.ps1 -Build   # Force rebuild all images"
    Write-Host ""
    Write-Host "This script will:" -ForegroundColor Green
    Write-Host "  1. Start ALL services in Docker containers"
    Write-Host "  2. Infrastructure: PostgreSQL, Redis, NATS"
    Write-Host "  3. Applications: Auth, Business, Scheduling, Notification"
    Write-Host "  4. Frontend: Next.js application"
    Write-Host "  5. Management UIs for debugging"
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SlotWise Pure Docker Development" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "infrastructure/docker-compose.dev.yml")) {
    Write-Host "ERROR: Please run this script from the SlotWise root directory" -ForegroundColor Red
    exit 1
}

# Clean start if requested
if ($Clean) {
    Write-Host "Cleaning up everything..." -ForegroundColor Yellow
    Set-Location infrastructure
    docker-compose -f docker-compose.dev.yml down -v --remove-orphans
    docker system prune -af
    Set-Location ..
    Write-Host "Cleanup complete" -ForegroundColor Green
    Write-Host ""
}

# Build flag
$buildFlag = ""
if ($Build) {
    $buildFlag = "--build"
    Write-Host "Force rebuilding all images..." -ForegroundColor Yellow
}

# Start everything in Docker
Write-Host "Starting SlotWise in Docker..." -ForegroundColor Yellow
Write-Host "This includes:" -ForegroundColor Gray
Write-Host "  - Infrastructure: PostgreSQL, Redis, NATS" -ForegroundColor Gray
Write-Host "  - Services: Auth, Business, Scheduling, Notification" -ForegroundColor Gray
Write-Host "  - Frontend: Next.js application" -ForegroundColor Gray
Write-Host "  - Management UIs: Adminer, Redis Commander, NATS Surveyor" -ForegroundColor Gray
Write-Host ""

Set-Location infrastructure

if ($buildFlag) {
    docker-compose -f docker-compose.dev.yml up -d --build
} else {
    docker-compose -f docker-compose.dev.yml up -d
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start services" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..
Write-Host ""
Write-Host "All services are starting in Docker..." -ForegroundColor Green
Write-Host ""
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Write-Host "This may take 2-3 minutes for first-time builds..." -ForegroundColor Gray

# Wait for services to be ready
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "SlotWise Pure Docker Environment Started!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Application URLs" -ForegroundColor Cyan
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
Write-Host "  Docker Commands" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   View logs:     docker-compose -f infrastructure/docker-compose.dev.yml logs -f" -ForegroundColor White
Write-Host "   Stop all:      docker-compose -f infrastructure/docker-compose.dev.yml down" -ForegroundColor White
Write-Host "   Restart:       .\start-docker.ps1" -ForegroundColor White
Write-Host "   Clean restart: .\start-docker.ps1 -Clean" -ForegroundColor White
Write-Host ""
Write-Host "Ready for full e2e testing!" -ForegroundColor Green
Write-Host ""
