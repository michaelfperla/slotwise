# SlotWise Docker Management Script (PowerShell)
# This script helps manage the Docker containers for the SlotWise application

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    
    [Parameter(Position=1)]
    [string]$Service = "",
    
    [Parameter(Position=2)]
    [string]$Environment = "dev"
)

# Configuration
$InfrastructureDir = "infrastructure"
$DevComposeFile = "$InfrastructureDir/docker-compose.dev.yml"
$ProdComposeFile = "$InfrastructureDir/docker-compose.yml"

# Helper functions
function Write-Header {
    Write-Host "================================" -ForegroundColor Blue
    Write-Host "  SlotWise Docker Manager" -ForegroundColor Blue
    Write-Host "================================" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Blue
}

# Check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        Write-Error "Docker is not running. Please start Docker and try again."
        exit 1
    }
}

# Check if docker-compose is available
function Test-DockerCompose {
    try {
        docker-compose --version | Out-Null
        return $true
    }
    catch {
        Write-Error "docker-compose is not installed. Please install docker-compose and try again."
        exit 1
    }
}

# Function to start development environment
function Start-DevEnvironment {
    Write-Info "Starting development environment..."
    
    Push-Location $InfrastructureDir
    
    try {
        # Pull latest images
        Write-Info "Pulling latest images..."
        docker-compose -f docker-compose.dev.yml pull
        
        # Start infrastructure services first
        Write-Info "Starting infrastructure services..."
        docker-compose -f docker-compose.dev.yml up -d postgres redis nats
        
        # Wait for services to be healthy
        Write-Info "Waiting for infrastructure services to be ready..."
        Start-Sleep -Seconds 10
        
        # Start development tools
        Write-Info "Starting development tools..."
        docker-compose -f docker-compose.dev.yml up -d adminer redis-commander nats-surveyor
        
        Write-Success "Development environment started!"
        Write-Info "Available services:"
        Write-Host "  - PostgreSQL: localhost:5432"
        Write-Host "  - Redis: localhost:6379"
        Write-Host "  - NATS: localhost:4222"
        Write-Host "  - Adminer (DB UI): http://localhost:8080"
        Write-Host "  - Redis Commander: http://localhost:8081"
        Write-Host "  - NATS Surveyor: http://localhost:8082"
    }
    finally {
        Pop-Location
    }
}

# Function to start production environment
function Start-ProdEnvironment {
    Write-Info "Starting production environment..."
    
    Push-Location $InfrastructureDir
    
    try {
        # Build and start all services
        Write-Info "Building and starting all services..."
        docker-compose -f docker-compose.yml up -d --build
        
        Write-Success "Production environment started!"
        Write-Info "Available services:"
        Write-Host "  - Frontend: http://localhost:3000"
        Write-Host "  - API Gateway: http://localhost:8080"
        Write-Host "  - Auth Service: http://localhost:8001"
        Write-Host "  - Scheduling Service: http://localhost:8002"
        Write-Host "  - Business Service: http://localhost:8003"
        Write-Host "  - Notification Service: http://localhost:8004"
    }
    finally {
        Pop-Location
    }
}

# Function to stop all services
function Stop-AllServices {
    Write-Info "Stopping all services..."
    
    Push-Location $InfrastructureDir
    
    try {
        # Stop production services
        if (Test-Path "docker-compose.yml") {
            docker-compose -f docker-compose.yml down
        }
        
        # Stop development services
        if (Test-Path "docker-compose.dev.yml") {
            docker-compose -f docker-compose.dev.yml down
        }
        
        Write-Success "All services stopped!"
    }
    finally {
        Pop-Location
    }
}

# Function to show logs
function Show-Logs {
    param(
        [string]$ServiceName,
        [string]$Env = "dev"
    )
    
    Push-Location $InfrastructureDir
    
    try {
        if ($Env -eq "prod") {
            if ($ServiceName) {
                docker-compose -f docker-compose.yml logs -f $ServiceName
            } else {
                docker-compose -f docker-compose.yml logs -f
            }
        } else {
            if ($ServiceName) {
                docker-compose -f docker-compose.dev.yml logs -f $ServiceName
            } else {
                docker-compose -f docker-compose.dev.yml logs -f
            }
        }
    }
    finally {
        Pop-Location
    }
}

# Function to show status
function Show-Status {
    Write-Info "Docker container status:"
    docker ps -a --filter "name=slotwise" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Function to clean up
function Invoke-Cleanup {
    Write-Warning "This will remove all SlotWise containers, networks, and volumes!"
    $confirmation = Read-Host "Are you sure? (y/N)"
    
    if ($confirmation -eq "y" -or $confirmation -eq "Y") {
        Write-Info "Cleaning up..."
        
        Push-Location $InfrastructureDir
        
        try {
            # Stop and remove containers
            docker-compose -f docker-compose.yml down -v --remove-orphans 2>$null
            docker-compose -f docker-compose.dev.yml down -v --remove-orphans 2>$null
            
            # Remove SlotWise containers
            $containers = docker ps -a --filter "name=slotwise" -q
            if ($containers) {
                docker rm -f $containers
            }
            
            # Remove SlotWise images
            $images = docker images --filter "reference=*slotwise*" -q
            if ($images) {
                docker rmi -f $images
            }
            
            $infraImages = docker images --filter "reference=infrastructure*" -q
            if ($infraImages) {
                docker rmi -f $infraImages
            }
            
            # Remove networks
            $networks = docker network ls --filter "name=slotwise" -q
            if ($networks) {
                docker network rm $networks
            }
            
            Write-Success "Cleanup completed!"
        }
        finally {
            Pop-Location
        }
    } else {
        Write-Info "Cleanup cancelled."
    }
}

# Function to rebuild services
function Invoke-Rebuild {
    param([string]$Env = "dev")
    
    Write-Info "Rebuilding services for $Env environment..."
    
    Push-Location $InfrastructureDir
    
    try {
        if ($Env -eq "prod") {
            docker-compose -f docker-compose.yml build --no-cache
            docker-compose -f docker-compose.yml up -d
        } else {
            # For dev, we typically only rebuild infrastructure
            docker-compose -f docker-compose.dev.yml build --no-cache
            docker-compose -f docker-compose.dev.yml up -d
        }
        
        Write-Success "Rebuild completed!"
    }
    finally {
        Pop-Location
    }
}

# Function to show help
function Show-Help {
    Write-Host "SlotWise Docker Manager (PowerShell)"
    Write-Host ""
    Write-Host "Usage: .\docker-manager.ps1 [COMMAND] [SERVICE] [ENVIRONMENT]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  start-dev     Start development environment (infrastructure only)"
    Write-Host "  start-prod    Start production environment (full application)"
    Write-Host "  stop          Stop all services"
    Write-Host "  status        Show container status"
    Write-Host "  logs          Show logs (SERVICE optional, ENVIRONMENT: dev|prod, default: dev)"
    Write-Host "  rebuild       Rebuild services (ENVIRONMENT: dev|prod, default: dev)"
    Write-Host "  cleanup       Remove all containers, networks, and volumes"
    Write-Host "  help          Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\docker-manager.ps1 start-dev                 # Start development infrastructure"
    Write-Host "  .\docker-manager.ps1 start-prod                # Start full production environment"
    Write-Host "  .\docker-manager.ps1 logs postgres             # Show postgres logs (dev)"
    Write-Host "  .\docker-manager.ps1 logs auth-service prod    # Show auth service logs (prod)"
    Write-Host "  .\docker-manager.ps1 rebuild prod              # Rebuild production services"
}

# Main script logic
function Main {
    Write-Header
    
    # Check prerequisites
    Test-Docker
    Test-DockerCompose
    
    switch ($Command.ToLower()) {
        "start-dev" {
            Start-DevEnvironment
        }
        "start-prod" {
            Start-ProdEnvironment
        }
        "stop" {
            Stop-AllServices
        }
        "status" {
            Show-Status
        }
        "logs" {
            Show-Logs -ServiceName $Service -Env $Environment
        }
        "rebuild" {
            Invoke-Rebuild -Env $Service
        }
        "cleanup" {
            Invoke-Cleanup
        }
        default {
            Show-Help
        }
    }
}

# Run main function
Main
