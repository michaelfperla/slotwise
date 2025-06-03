#!/bin/bash

# Development Environment Setup Script
# This script sets up the complete development environment for new team members

set -e

echo "🚀 SlotWise Development Environment Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists node; then
        missing_deps+=("Node.js (v18+)")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists go; then
        missing_deps+=("Go (v1.21+)")
    fi
    
    if ! command_exists docker; then
        missing_deps+=("Docker")
    fi
    
    if ! command_exists git; then
        missing_deps+=("Git")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        echo ""
        echo "Please install the missing dependencies and run this script again."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install service dependencies
    if [ -d "services/business-service" ]; then
        cd services/business-service && npm install && cd ../..
    fi
    
    if [ -d "services/notification-service" ]; then
        cd services/notification-service && npm install && cd ../..
    fi
    
    # Install frontend dependencies
    if [ -d "frontend" ]; then
        cd frontend && npm install && cd ..
    fi
    
    print_success "Dependencies installed"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Copy example environment files if they don't exist
    if [ -f ".env.example" ] && [ ! -f ".env" ]; then
        cp .env.example .env
        print_success "Created .env from .env.example"
    fi
    
    if [ -f ".env.test.example" ] && [ ! -f ".env.test" ]; then
        cp .env.test.example .env.test
        print_success "Created .env.test from .env.test.example"
    fi
    
    # Setup service environment files
    for service in services/*/; do
        if [ -f "$service/.env.example" ] && [ ! -f "$service/.env" ]; then
            cp "$service/.env.example" "$service/.env"
            print_success "Created $service/.env"
        fi
    done
}

# Setup databases
setup_databases() {
    print_status "Setting up databases..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_warning "PostgreSQL is not running. Starting with Docker..."
        
        # Start PostgreSQL with Docker
        docker run -d \
            --name slotwise-postgres \
            -e POSTGRES_PASSWORD=postgres \
            -e POSTGRES_DB=slotwise \
            -p 5432:5432 \
            postgres:15
        
        # Wait for PostgreSQL to be ready
        echo "Waiting for PostgreSQL to start..."
        sleep 10
    fi
    
    # Setup test environment
    if [ -f "scripts/setup-test-environment.sh" ]; then
        chmod +x scripts/setup-test-environment.sh
        ./scripts/setup-test-environment.sh
    fi
    
    print_success "Databases setup completed"
}

# Setup Git hooks
setup_git_hooks() {
    print_status "Setting up Git hooks..."
    
    # Install husky if package.json exists and has husky
    if [ -f "package.json" ] && grep -q "husky" package.json; then
        npx husky install
        print_success "Git hooks installed"
    else
        print_warning "Husky not found in package.json, skipping Git hooks"
    fi
}

# Verify setup
verify_setup() {
    print_status "Verifying setup..."
    
    # Check if we can build the project
    if npm run build >/dev/null 2>&1; then
        print_success "Build verification passed"
    else
        print_warning "Build verification failed - you may need to fix some issues"
    fi
    
    # Check if tests can run
    if npm run test >/dev/null 2>&1; then
        print_success "Test verification passed"
    else
        print_warning "Test verification failed - some tests may need attention"
    fi
}

# Print next steps
print_next_steps() {
    echo ""
    echo -e "${GREEN}🎉 Development environment setup completed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review and update .env files with your specific configuration"
    echo "2. Start the development servers:"
    echo "   npm run dev"
    echo ""
    echo "3. Run tests to ensure everything is working:"
    echo "   npm run test"
    echo ""
    echo "4. Check the README.md for additional setup instructions"
    echo ""
    echo "Happy coding! 🚀"
}

# Main execution
main() {
    check_prerequisites
    install_dependencies
    setup_environment
    setup_databases
    setup_git_hooks
    verify_setup
    print_next_steps
}

# Run main function
main "$@"
