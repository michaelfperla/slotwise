#!/bin/bash

# SlotWise Test Runner Script

set -e

echo "🧪 Running SlotWise test suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local service_name=$1
    local test_command=$2
    local service_dir=$3
    
    echo -e "${YELLOW}Testing $service_name...${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if cd "$service_dir" && eval "$test_command"; then
        echo -e "${GREEN}✅ $service_name tests passed${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        cd - > /dev/null
    else
        echo -e "${RED}❌ $service_name tests failed${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        cd - > /dev/null
    fi
    echo ""
}

# Test shared packages
echo "📦 Testing shared packages..."
run_test "Shared Types" "npm test" "shared/types"
run_test "Shared Utils" "npm test" "shared/utils"

# Test frontend
echo "🎨 Testing frontend..."
run_test "Frontend" "npm test -- --watchAll=false" "frontend"

# Test Node.js services
echo "🟢 Testing Node.js services..."
run_test "Business Service" "npm test" "services/business-service"
run_test "Notification Service" "npm test" "services/notification-service"

# Test Go services
echo "🔵 Testing Go services..."
run_test "Auth Service" "go test ./..." "services/auth-service"
run_test "Scheduling Service" "go test ./..." "services/scheduling-service"

# Integration tests
echo "🔗 Running integration tests..."
run_test "Integration Tests" "npm test" "tests/integration"

# API tests
echo "🌐 Running API tests..."
run_test "API Tests" "npm test" "tests/api"

# Performance tests
echo "⚡ Running performance tests..."
run_test "Performance Tests" "npm test" "tests/performance"

# Print summary
echo "📊 Test Summary:"
echo "=================="
echo -e "Total test suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}💥 Some tests failed!${NC}"
    exit 1
fi
