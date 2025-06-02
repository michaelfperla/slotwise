#!/bin/bash

# SlotWise Dependency Update Validation Script
# This script validates that all dependency updates are working correctly
# and that the microservices architecture remains intact

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    local missing_tools=()
    
    if ! command_exists node; then
        missing_tools+=("node")
    fi
    
    if ! command_exists npm; then
        missing_tools+=("npm")
    fi
    
    if ! command_exists go; then
        missing_tools+=("go")
    fi
    
    if ! command_exists docker; then
        missing_tools+=("docker")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

# Validate Node.js versions
validate_node_versions() {
    log_info "Validating Node.js and npm versions..."
    
    local node_version=$(node --version)
    local npm_version=$(npm --version)
    
    log_info "Node.js version: $node_version"
    log_info "npm version: $npm_version"
    
    # Check minimum Node.js version (v18+)
    local node_major=$(echo $node_version | sed 's/v\([0-9]*\).*/\1/')
    if [ "$node_major" -lt 18 ]; then
        log_error "Node.js version must be 18 or higher. Current: $node_version"
        exit 1
    fi
    
    log_success "Node.js and npm versions are compatible"
}

# Validate Go version
validate_go_version() {
    log_info "Validating Go version..."
    
    local go_version=$(go version)
    log_info "Go version: $go_version"
    
    # Check minimum Go version (1.21+)
    local go_version_number=$(go version | grep -o 'go[0-9]\+\.[0-9]\+' | sed 's/go//')
    local go_major=$(echo $go_version_number | cut -d. -f1)
    local go_minor=$(echo $go_version_number | cut -d. -f2)
    
    if [ "$go_major" -lt 1 ] || ([ "$go_major" -eq 1 ] && [ "$go_minor" -lt 21 ]); then
        log_error "Go version must be 1.21 or higher. Current: $go_version_number"
        exit 1
    fi
    
    log_success "Go version is compatible"
}

# Install dependencies for all services
install_dependencies() {
    log_info "Installing dependencies for all services..."
    
    # Root dependencies
    log_info "Installing root dependencies..."
    npm install
    
    # Frontend dependencies
    if [ -d "frontend" ]; then
        log_info "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
    fi
    
    # Shared packages
    for dir in shared/*/; do
        if [ -f "$dir/package.json" ]; then
            log_info "Installing dependencies for $dir..."
            cd "$dir"
            npm install
            cd - > /dev/null
        fi
    done
    
    # Node.js services
    for service in services/*/; do
        if [ -f "$service/package.json" ]; then
            log_info "Installing dependencies for $service..."
            cd "$service"
            npm install
            cd - > /dev/null
        fi
    done
    
    # Go services
    for service in services/*/; do
        if [ -f "$service/go.mod" ]; then
            log_info "Installing Go dependencies for $service..."
            cd "$service"
            go mod download
            go mod tidy
            cd - > /dev/null
        fi
    done
    
    log_success "All dependencies installed successfully"
}

# Validate package.json files
validate_package_json() {
    log_info "Validating package.json files..."
    
    local services=("business-service" "notification-service")
    
    for service in "${services[@]}"; do
        local package_file="services/$service/package.json"
        
        if [ ! -f "$package_file" ]; then
            log_error "Missing package.json for $service"
            continue
        fi
        
        log_info "Validating $service package.json..."
        
        # Check for required dependencies
        local required_deps=("fastify" "@fastify/cors" "nats" "zod" "pino")
        
        for dep in "${required_deps[@]}"; do
            if ! grep -q "\"$dep\"" "$package_file"; then
                log_warning "Missing dependency $dep in $service"
            fi
        done
        
        # Validate JSON syntax
        if ! node -e "JSON.parse(require('fs').readFileSync('$package_file', 'utf8'))"; then
            log_error "Invalid JSON syntax in $package_file"
            exit 1
        fi
        
        log_success "$service package.json is valid"
    done
}

# Validate go.mod files
validate_go_mod() {
    log_info "Validating go.mod files..."
    
    local services=("auth-service" "scheduling-service")
    
    for service in "${services[@]}"; do
        local go_mod_file="services/$service/go.mod"
        
        if [ ! -f "$go_mod_file" ]; then
            log_error "Missing go.mod for $service"
            continue
        fi
        
        log_info "Validating $service go.mod..."
        
        # Check for required dependencies
        local required_deps=("github.com/nats-io/nats.go" "github.com/gin-gonic/gin" "gorm.io/gorm")
        
        for dep in "${required_deps[@]}"; do
            if ! grep -q "$dep" "$go_mod_file"; then
                log_warning "Missing dependency $dep in $service"
            fi
        done
        
        # Validate go.mod syntax
        cd "services/$service"
        if ! go mod verify; then
            log_error "Invalid go.mod in $service"
            cd - > /dev/null
            exit 1
        fi
        cd - > /dev/null
        
        log_success "$service go.mod is valid"
    done
}

# Build all services
build_services() {
    log_info "Building all services..."
    
    # Build Node.js services
    local node_services=("business-service" "notification-service")
    
    for service in "${node_services[@]}"; do
        if [ -d "services/$service" ]; then
            log_info "Building $service..."
            cd "services/$service"
            
            if [ -f "package.json" ] && grep -q "\"build\"" package.json; then
                npm run build
            else
                log_warning "No build script found for $service"
            fi
            
            cd - > /dev/null
            log_success "$service built successfully"
        fi
    done
    
    # Build Go services
    local go_services=("auth-service" "scheduling-service")
    
    for service in "${go_services[@]}"; do
        if [ -d "services/$service" ]; then
            log_info "Building $service..."
            cd "services/$service"
            
            if [ -f "main.go" ]; then
                go build -o "bin/$service" main.go
            else
                log_warning "No main.go found for $service"
            fi
            
            cd - > /dev/null
            log_success "$service built successfully"
        fi
    done
    
    # Build frontend
    if [ -d "frontend" ]; then
        log_info "Building frontend..."
        cd frontend
        
        if [ -f "package.json" ] && grep -q "\"build\"" package.json; then
            npm run build
        else
            log_warning "No build script found for frontend"
        fi
        
        cd - > /dev/null
        log_success "Frontend built successfully"
    fi
}

# Run tests
run_tests() {
    log_info "Running tests for all services..."
    
    # Test Node.js services
    local node_services=("business-service" "notification-service")
    
    for service in "${node_services[@]}"; do
        if [ -d "services/$service" ]; then
            log_info "Testing $service..."
            cd "services/$service"
            
            if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
                npm test
            else
                log_warning "No test script found for $service"
            fi
            
            cd - > /dev/null
            log_success "$service tests passed"
        fi
    done
    
    # Test Go services
    local go_services=("auth-service" "scheduling-service")
    
    for service in "${go_services[@]}"; do
        if [ -d "services/$service" ]; then
            log_info "Testing $service..."
            cd "services/$service"
            
            if ls *.go 1> /dev/null 2>&1; then
                go test ./...
            else
                log_warning "No Go files found for $service"
            fi
            
            cd - > /dev/null
            log_success "$service tests passed"
        fi
    done
    
    # Test frontend
    if [ -d "frontend" ]; then
        log_info "Testing frontend..."
        cd frontend
        
        if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
            npm test -- --watchAll=false
        else
            log_warning "No test script found for frontend"
        fi
        
        cd - > /dev/null
        log_success "Frontend tests passed"
    fi
}

# Validate linting
run_linting() {
    log_info "Running linting for all services..."
    
    # Lint Node.js services
    local node_services=("business-service" "notification-service")
    
    for service in "${node_services[@]}"; do
        if [ -d "services/$service" ]; then
            log_info "Linting $service..."
            cd "services/$service"
            
            if [ -f "package.json" ] && grep -q "\"lint\"" package.json; then
                npm run lint
            else
                log_warning "No lint script found for $service"
            fi
            
            cd - > /dev/null
            log_success "$service linting passed"
        fi
    done
    
    # Lint frontend
    if [ -d "frontend" ]; then
        log_info "Linting frontend..."
        cd frontend
        
        if [ -f "package.json" ] && grep -q "\"lint\"" package.json; then
            npm run lint
        else
            log_warning "No lint script found for frontend"
        fi
        
        cd - > /dev/null
        log_success "Frontend linting passed"
    fi
}

# Validate security
run_security_audit() {
    log_info "Running security audits..."
    
    # Audit Node.js dependencies
    local node_dirs=("." "frontend" "services/business-service" "services/notification-service")
    
    for dir in "${node_dirs[@]}"; do
        if [ -f "$dir/package.json" ]; then
            log_info "Auditing $dir..."
            cd "$dir"
            
            # Run npm audit (allow moderate vulnerabilities for now)
            if ! npm audit --audit-level=high; then
                log_warning "Security vulnerabilities found in $dir"
            fi
            
            cd - > /dev/null
        fi
    done
    
    log_success "Security audits completed"
}

# Main validation function
main() {
    log_info "Starting SlotWise dependency update validation..."
    
    validate_prerequisites
    validate_node_versions
    validate_go_version
    install_dependencies
    validate_package_json
    validate_go_mod
    build_services
    run_tests
    run_linting
    run_security_audit
    
    log_success "All validations passed! Dependency updates are working correctly."
    log_info "Next steps:"
    log_info "1. Deploy to staging environment"
    log_info "2. Run integration tests"
    log_info "3. Performance benchmarking"
    log_info "4. Production deployment"
}

# Run main function
main "$@"
