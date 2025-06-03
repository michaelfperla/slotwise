#!/bin/bash

# Setup Test Environment Script
# This script sets up the complete test environment for all services

set -e

echo "🔧 Setting up test environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_PORT=${DB_PORT:-5432}

# Test database names
AUTH_TEST_DB="slotwise_auth_test"
BUSINESS_TEST_DB="slotwise_business_test"
SCHEDULING_TEST_DB="slotwise_scheduling_test"
NOTIFICATION_TEST_DB="slotwise_notification_test"

echo "📊 Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"

# Function to create database if it doesn't exist
create_database() {
    local db_name=$1
    echo "🗄️  Creating database: $db_name"
    
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -p $DB_PORT -tc "SELECT 1 FROM pg_database WHERE datname = '$db_name'" | grep -q 1 || \
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -p $DB_PORT -c "CREATE DATABASE $db_name;"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database $db_name ready${NC}"
    else
        echo -e "${RED}❌ Failed to create database $db_name${NC}"
        exit 1
    fi
}

# Function to check if PostgreSQL is running
check_postgres() {
    echo "🔍 Checking PostgreSQL connection..."
    
    if PGPASSWORD=$DB_PASSWORD pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; then
        echo -e "${GREEN}✅ PostgreSQL is running${NC}"
    else
        echo -e "${RED}❌ PostgreSQL is not accessible${NC}"
        echo "Please ensure PostgreSQL is running and accessible at $DB_HOST:$DB_PORT"
        exit 1
    fi
}

# Function to run database migrations
run_migrations() {
    echo "🚀 Running database migrations..."
    
    # Business service migrations
    if [ -d "services/business-service" ]; then
        echo "📦 Running business service migrations..."
        cd services/business-service
        DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$BUSINESS_TEST_DB" npx prisma migrate deploy
        cd ../..
    fi
    
    # Notification service migrations
    if [ -d "services/notification-service" ]; then
        echo "📦 Running notification service migrations..."
        cd services/notification-service
        DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$NOTIFICATION_TEST_DB" npx prisma migrate deploy
        cd ../..
    fi
    
    echo -e "${GREEN}✅ Migrations completed${NC}"
}

# Function to generate Prisma clients
generate_prisma_clients() {
    echo "🔧 Generating Prisma clients..."
    
    if [ -d "services/business-service" ]; then
        cd services/business-service && npx prisma generate && cd ../..
    fi
    
    if [ -d "services/notification-service" ]; then
        cd services/notification-service && npx prisma generate && cd ../..
    fi
    
    echo -e "${GREEN}✅ Prisma clients generated${NC}"
}

# Main execution
main() {
    echo "🎯 Starting test environment setup..."
    
    # Check prerequisites
    check_postgres
    
    # Create test databases
    create_database $AUTH_TEST_DB
    create_database $BUSINESS_TEST_DB
    create_database $SCHEDULING_TEST_DB
    create_database $NOTIFICATION_TEST_DB
    
    # Generate Prisma clients
    generate_prisma_clients
    
    # Run migrations
    run_migrations
    
    echo -e "${GREEN}🎉 Test environment setup completed successfully!${NC}"
    echo ""
    echo "Environment variables for testing:"
    echo "  AUTH_TEST_DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$AUTH_TEST_DB"
    echo "  BUSINESS_TEST_DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$BUSINESS_TEST_DB"
    echo "  SCHEDULING_TEST_DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$SCHEDULING_TEST_DB"
    echo "  NOTIFICATION_TEST_DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$NOTIFICATION_TEST_DB"
}

# Run main function
main "$@"
