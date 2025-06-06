#!/bin/bash

# SlotWise Docker Management Script
# This script helps manage the Docker containers for the SlotWise application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INFRASTRUCTURE_DIR="infrastructure"
DEV_COMPOSE_FILE="$INFRASTRUCTURE_DIR/docker-compose.dev.yml"
PROD_COMPOSE_FILE="$INFRASTRUCTURE_DIR/docker-compose.yml"

# Helper functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  SlotWise Docker Manager${NC}"
    echo -e "${BLUE}================================${NC}"
    echo
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1; then
        print_error "docker-compose is not installed. Please install docker-compose and try again."
        exit 1
    fi
}

# Function to start development environment
start_dev() {
    print_info "Starting development environment..."
    
    cd "$INFRASTRUCTURE_DIR"
    
    # Pull latest images
    print_info "Pulling latest images..."
    docker-compose -f docker-compose.dev.yml pull
    
    # Start infrastructure services first
    print_info "Starting infrastructure services..."
    docker-compose -f docker-compose.dev.yml up -d postgres redis nats
    
    # Wait for services to be healthy
    print_info "Waiting for infrastructure services to be ready..."
    sleep 10
    
    # Start development tools
    print_info "Starting development tools..."
    docker-compose -f docker-compose.dev.yml up -d adminer redis-commander nats-surveyor
    
    print_success "Development environment started!"
    print_info "Available services:"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis: localhost:6379"
    echo "  - NATS: localhost:4222"
    echo "  - Adminer (DB UI): http://localhost:8080"
    echo "  - Redis Commander: http://localhost:8081"
    echo "  - NATS Surveyor: http://localhost:8082"
    
    cd ..
}

# Function to start production environment
start_prod() {
    print_info "Starting production environment..."
    
    cd "$INFRASTRUCTURE_DIR"
    
    # Build and start all services
    print_info "Building and starting all services..."
    docker-compose -f docker-compose.yml up -d --build
    
    print_success "Production environment started!"
    print_info "Available services:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - API Gateway: http://localhost:8080"
    echo "  - Auth Service: http://localhost:8001"
    echo "  - Scheduling Service: http://localhost:8002"
    echo "  - Business Service: http://localhost:8003"
    echo "  - Notification Service: http://localhost:8004"
    
    cd ..
}

# Function to stop all services
stop_all() {
    print_info "Stopping all services..."
    
    cd "$INFRASTRUCTURE_DIR"
    
    # Stop production services
    if [ -f docker-compose.yml ]; then
        docker-compose -f docker-compose.yml down
    fi
    
    # Stop development services
    if [ -f docker-compose.dev.yml ]; then
        docker-compose -f docker-compose.dev.yml down
    fi
    
    print_success "All services stopped!"
    
    cd ..
}

# Function to show logs
show_logs() {
    local service=$1
    local environment=${2:-dev}
    
    cd "$INFRASTRUCTURE_DIR"
    
    if [ "$environment" = "prod" ]; then
        if [ -n "$service" ]; then
            docker-compose -f docker-compose.yml logs -f "$service"
        else
            docker-compose -f docker-compose.yml logs -f
        fi
    else
        if [ -n "$service" ]; then
            docker-compose -f docker-compose.dev.yml logs -f "$service"
        else
            docker-compose -f docker-compose.dev.yml logs -f
        fi
    fi
    
    cd ..
}

# Function to show status
show_status() {
    print_info "Docker container status:"
    docker ps -a --filter "name=slotwise" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Function to clean up
cleanup() {
    print_warning "This will remove all SlotWise containers, networks, and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleaning up..."
        
        cd "$INFRASTRUCTURE_DIR"
        
        # Stop and remove containers
        docker-compose -f docker-compose.yml down -v --remove-orphans 2>/dev/null || true
        docker-compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true
        
        # Remove SlotWise containers
        docker ps -a --filter "name=slotwise" -q | xargs -r docker rm -f
        
        # Remove SlotWise images
        docker images --filter "reference=*slotwise*" -q | xargs -r docker rmi -f
        docker images --filter "reference=infrastructure*" -q | xargs -r docker rmi -f
        
        # Remove networks
        docker network ls --filter "name=slotwise" -q | xargs -r docker network rm
        
        print_success "Cleanup completed!"
        
        cd ..
    else
        print_info "Cleanup cancelled."
    fi
}

# Function to rebuild services
rebuild() {
    local environment=${1:-dev}
    
    print_info "Rebuilding services for $environment environment..."
    
    cd "$INFRASTRUCTURE_DIR"
    
    if [ "$environment" = "prod" ]; then
        docker-compose -f docker-compose.yml build --no-cache
        docker-compose -f docker-compose.yml up -d
    else
        # For dev, we typically only rebuild infrastructure
        docker-compose -f docker-compose.dev.yml build --no-cache
        docker-compose -f docker-compose.dev.yml up -d
    fi
    
    print_success "Rebuild completed!"
    
    cd ..
}

# Function to show help
show_help() {
    echo "SlotWise Docker Manager"
    echo
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  start-dev     Start development environment (infrastructure only)"
    echo "  start-prod    Start production environment (full application)"
    echo "  stop          Stop all services"
    echo "  status        Show container status"
    echo "  logs [SERVICE] [ENV]  Show logs (ENV: dev|prod, default: dev)"
    echo "  rebuild [ENV] Rebuild services (ENV: dev|prod, default: dev)"
    echo "  cleanup       Remove all containers, networks, and volumes"
    echo "  help          Show this help message"
    echo
    echo "Examples:"
    echo "  $0 start-dev                 # Start development infrastructure"
    echo "  $0 start-prod                # Start full production environment"
    echo "  $0 logs postgres             # Show postgres logs (dev)"
    echo "  $0 logs auth-service prod    # Show auth service logs (prod)"
    echo "  $0 rebuild prod              # Rebuild production services"
}

# Main script logic
main() {
    print_header
    
    # Check prerequisites
    check_docker
    check_docker_compose
    
    case "${1:-help}" in
        "start-dev")
            start_dev
            ;;
        "start-prod")
            start_prod
            ;;
        "stop")
            stop_all
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$2" "$3"
            ;;
        "rebuild")
            rebuild "$2"
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
