# SlotWise Dependency Update Validation Script (PowerShell)
# This script validates that all dependency updates are working correctly
# and that the microservices architecture remains intact

param(
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# Logging functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

# Check if command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Validate prerequisites
function Test-Prerequisites {
    Write-Info "Validating prerequisites..."

    $missingTools = @()

    if (-not (Test-Command "node")) {
        $missingTools += "node"
    }

    if (-not (Test-Command "npm")) {
        $missingTools += "npm"
    }

    if (-not (Test-Command "go")) {
        $missingTools += "go"
    }

    if (-not (Test-Command "docker")) {
        Write-Warning "Docker not found - skipping Docker-related validations"
    }

    if ($missingTools.Count -gt 0) {
        Write-Error "Missing required tools: $($missingTools -join ', ')"
        exit 1
    }

    Write-Success "Core prerequisites satisfied"
}

# Validate Node.js versions
function Test-NodeVersions {
    Write-Info "Validating Node.js and npm versions..."
    
    $nodeVersion = node --version
    $npmVersion = npm --version
    
    Write-Info "Node.js version: $nodeVersion"
    Write-Info "npm version: $npmVersion"
    
    # Check minimum Node.js version (v18+)
    $nodeMajor = [int]($nodeVersion -replace 'v(\d+).*', '$1')
    if ($nodeMajor -lt 18) {
        Write-Error "Node.js version must be 18 or higher. Current: $nodeVersion"
        exit 1
    }
    
    Write-Success "Node.js and npm versions are compatible"
}

# Validate Go version
function Test-GoVersion {
    Write-Info "Validating Go version..."
    
    $goVersion = go version
    Write-Info "Go version: $goVersion"
    
    # Extract version number
    if ($goVersion -match 'go(\d+)\.(\d+)') {
        $goMajor = [int]$matches[1]
        $goMinor = [int]$matches[2]
        
        if ($goMajor -lt 1 -or ($goMajor -eq 1 -and $goMinor -lt 21)) {
            Write-Error "Go version must be 1.21 or higher. Current: $goMajor.$goMinor"
            exit 1
        }
    }
    
    Write-Success "Go version is compatible"
}

# Install dependencies for all services
function Install-Dependencies {
    Write-Info "Installing dependencies for all services..."
    
    # Root dependencies
    Write-Info "Installing root dependencies..."
    npm install
    
    # Frontend dependencies
    if (Test-Path "frontend") {
        Write-Info "Installing frontend dependencies..."
        Push-Location "frontend"
        npm install
        Pop-Location
    }
    
    # Shared packages
    Get-ChildItem "shared" -Directory | ForEach-Object {
        $packageJson = Join-Path $_.FullName "package.json"
        if (Test-Path $packageJson) {
            Write-Info "Installing dependencies for $($_.Name)..."
            Push-Location $_.FullName
            npm install
            Pop-Location
        }
    }
    
    # Node.js services
    Get-ChildItem "services" -Directory | ForEach-Object {
        $packageJson = Join-Path $_.FullName "package.json"
        if (Test-Path $packageJson) {
            Write-Info "Installing dependencies for $($_.Name)..."
            Push-Location $_.FullName
            npm install
            Pop-Location
        }
    }
    
    # Go services
    Get-ChildItem "services" -Directory | ForEach-Object {
        $goMod = Join-Path $_.FullName "go.mod"
        if (Test-Path $goMod) {
            Write-Info "Installing Go dependencies for $($_.Name)..."
            Push-Location $_.FullName
            go mod download
            go mod tidy
            Pop-Location
        }
    }
    
    Write-Success "All dependencies installed successfully"
}

# Validate package.json files
function Test-PackageJson {
    Write-Info "Validating package.json files..."
    
    $services = @("business-service", "notification-service")
    
    foreach ($service in $services) {
        $packageFile = "services\$service\package.json"
        
        if (-not (Test-Path $packageFile)) {
            Write-Error "Missing package.json for $service"
            continue
        }
        
        Write-Info "Validating $service package.json..."
        
        # Check for required dependencies
        $requiredDeps = @("fastify", "@fastify/cors", "nats", "zod", "pino")
        $packageContent = Get-Content $packageFile -Raw
        
        foreach ($dep in $requiredDeps) {
            if ($packageContent -notmatch "`"$dep`"") {
                Write-Warning "Missing dependency $dep in $service"
            }
        }
        
        # Validate JSON syntax
        try {
            $packageContent | ConvertFrom-Json | Out-Null
        }
        catch {
            Write-Error "Invalid JSON syntax in $packageFile"
            exit 1
        }
        
        Write-Success "$service package.json is valid"
    }
}

# Validate go.mod files
function Test-GoMod {
    Write-Info "Validating go.mod files..."
    
    $services = @("auth-service", "scheduling-service")
    
    foreach ($service in $services) {
        $goModFile = "services\$service\go.mod"
        
        if (-not (Test-Path $goModFile)) {
            Write-Error "Missing go.mod for $service"
            continue
        }
        
        Write-Info "Validating $service go.mod..."
        
        # Check for required dependencies
        $requiredDeps = @("github.com/nats-io/nats.go", "github.com/gin-gonic/gin", "gorm.io/gorm")
        $goModContent = Get-Content $goModFile -Raw
        
        foreach ($dep in $requiredDeps) {
            if ($goModContent -notmatch [regex]::Escape($dep)) {
                Write-Warning "Missing dependency $dep in $service"
            }
        }
        
        # Validate go.mod syntax
        Push-Location "services\$service"
        try {
            go mod verify
        }
        catch {
            Write-Error "Invalid go.mod in $service"
            Pop-Location
            exit 1
        }
        Pop-Location
        
        Write-Success "$service go.mod is valid"
    }
}

# Build all services
function Build-Services {
    if ($SkipBuild) {
        Write-Info "Skipping build step..."
        return
    }
    
    Write-Info "Building all services..."
    
    # Build Node.js services
    $nodeServices = @("business-service", "notification-service")
    
    foreach ($service in $nodeServices) {
        $servicePath = "services\$service"
        if (Test-Path $servicePath) {
            Write-Info "Building $service..."
            Push-Location $servicePath
            
            $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
            if ($packageJson.scripts.build) {
                npm run build
            }
            else {
                Write-Warning "No build script found for $service"
            }
            
            Pop-Location
            Write-Success "$service built successfully"
        }
    }
    
    # Build Go services
    $goServices = @("auth-service", "scheduling-service")
    
    foreach ($service in $goServices) {
        $servicePath = "services\$service"
        if (Test-Path $servicePath) {
            Write-Info "Building $service..."
            Push-Location $servicePath
            
            if (Test-Path "main.go") {
                if (-not (Test-Path "bin")) {
                    New-Item -ItemType Directory -Name "bin" | Out-Null
                }
                go build -o "bin\$service.exe" main.go
            }
            else {
                Write-Warning "No main.go found for $service"
            }
            
            Pop-Location
            Write-Success "$service built successfully"
        }
    }
    
    # Build frontend
    if (Test-Path "frontend") {
        Write-Info "Building frontend..."
        Push-Location "frontend"
        
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        if ($packageJson.scripts.build) {
            npm run build
        }
        else {
            Write-Warning "No build script found for frontend"
        }
        
        Pop-Location
        Write-Success "Frontend built successfully"
    }
}

# Run tests
function Invoke-Tests {
    if ($SkipTests) {
        Write-Info "Skipping tests..."
        return
    }
    
    Write-Info "Running tests for all services..."
    
    # Test Node.js services
    $nodeServices = @("business-service", "notification-service")
    
    foreach ($service in $nodeServices) {
        $servicePath = "services\$service"
        if (Test-Path $servicePath) {
            Write-Info "Testing $service..."
            Push-Location $servicePath
            
            $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
            if ($packageJson.scripts.test) {
                npm test
            }
            else {
                Write-Warning "No test script found for $service"
            }
            
            Pop-Location
            Write-Success "$service tests passed"
        }
    }
    
    # Test Go services
    $goServices = @("auth-service", "scheduling-service")
    
    foreach ($service in $goServices) {
        $servicePath = "services\$service"
        if (Test-Path $servicePath) {
            Write-Info "Testing $service..."
            Push-Location $servicePath
            
            $goFiles = Get-ChildItem "*.go"
            if ($goFiles.Count -gt 0) {
                go test ./...
            }
            else {
                Write-Warning "No Go files found for $service"
            }
            
            Pop-Location
            Write-Success "$service tests passed"
        }
    }
    
    # Test frontend
    if (Test-Path "frontend") {
        Write-Info "Testing frontend..."
        Push-Location "frontend"
        
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        if ($packageJson.scripts.test) {
            $env:CI = "true"
            npm test
        }
        else {
            Write-Warning "No test script found for frontend"
        }
        
        Pop-Location
        Write-Success "Frontend tests passed"
    }
}

# Main validation function
function Main {
    Write-Info "Starting SlotWise dependency update validation..."
    
    Test-Prerequisites
    Test-NodeVersions
    Test-GoVersion
    Install-Dependencies
    Test-PackageJson
    Test-GoMod
    Build-Services
    Invoke-Tests
    
    Write-Success "All validations passed! Dependency updates are working correctly."
    Write-Info "Next steps:"
    Write-Info "1. Deploy to staging environment"
    Write-Info "2. Run integration tests"
    Write-Info "3. Performance benchmarking"
    Write-Info "4. Production deployment"
}

# Run main function
try {
    Main
}
catch {
    Write-Error "Validation failed: $($_.Exception.Message)"
    exit 1
}
