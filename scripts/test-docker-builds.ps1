# Test Docker Builds Locally
# Run this script to test all Docker builds before pushing to GitHub

Write-Host "🐳 Testing SlotWise Docker Builds Locally" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if Docker is available
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not available. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Function to test a Docker build
function Test-DockerBuild {
    param(
        [string]$ServiceName,
        [string]$DockerfilePath,
        [string]$Context = "."
    )
    
    Write-Host "`n🔨 Building $ServiceName..." -ForegroundColor Yellow
    
    $buildCommand = "docker build -f $DockerfilePath -t test-$ServiceName $Context"
    Write-Host "Command: $buildCommand" -ForegroundColor Gray
    
    try {
        Invoke-Expression $buildCommand
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $ServiceName build successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $ServiceName build failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $ServiceName build failed with exception: $_" -ForegroundColor Red
        return $false
    }
}

# Test all services
$results = @{}

# Test Node.js services (these are the problematic ones)
$results["business-service"] = Test-DockerBuild -ServiceName "business-service" -DockerfilePath "services/business-service/Dockerfile"
$results["notification-service"] = Test-DockerBuild -ServiceName "notification-service" -DockerfilePath "services/notification-service/Dockerfile"
$results["frontend"] = Test-DockerBuild -ServiceName "frontend" -DockerfilePath "frontend/Dockerfile" -Context "frontend"

# Test Go services (these usually work)
$results["auth-service"] = Test-DockerBuild -ServiceName "auth-service" -DockerfilePath "services/auth-service/Dockerfile" -Context "services/auth-service"
$results["scheduling-service"] = Test-DockerBuild -ServiceName "scheduling-service" -DockerfilePath "services/scheduling-service/Dockerfile" -Context "services/scheduling-service"

# Summary
Write-Host "`n📊 Build Results Summary" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

$allPassed = $true
foreach ($service in $results.Keys) {
    if ($results[$service]) {
        Write-Host "✅ $service" -ForegroundColor Green
    } else {
        Write-Host "❌ $service" -ForegroundColor Red
        $allPassed = $false
    }
}

if ($allPassed) {
    Write-Host "`n🎉 All Docker builds passed! Safe to push to GitHub." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  Some Docker builds failed. Fix issues before pushing." -ForegroundColor Yellow
    exit 1
}
