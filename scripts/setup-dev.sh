#!/bin/bash

# SlotWise Development Setup Script

set -e

echo "🚀 Setting up SlotWise development environment..."

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "📋 Checking required tools..."
check_tool "node"
check_tool "npm"
check_tool "go"
check_tool "docker"
check_tool "docker-compose"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

# Check Go version
GO_VERSION=$(go version | cut -d' ' -f3 | cut -d'o' -f2 | cut -d'.' -f1-2)
if [ "$(echo "$GO_VERSION < 1.21" | bc)" -eq 1 ]; then
    echo "❌ Go version 1.21 or higher is required. Current version: $GO_VERSION"
    exit 1
fi

echo "✅ All required tools are installed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install shared package dependencies
echo "📦 Installing shared package dependencies..."
cd shared/types && npm install && npm run build && cd ../..
cd shared/utils && npm install && npm run build && cd ../..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Install Node.js service dependencies
echo "📦 Installing Node.js service dependencies..."
cd services/business-service && npm install && cd ../..
cd services/notification-service && npm install && cd ../..

# Install Go service dependencies
echo "📦 Installing Go service dependencies..."
cd services/auth-service && go mod download && cd ../..
cd services/scheduling-service && go mod download && cd ../..

# Setup environment files
echo "🔧 Setting up environment files..."
cp services/business-service/.env.example services/business-service/.env
cp services/notification-service/.env.example services/notification-service/.env

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p data/postgres
mkdir -p data/redis

# Start infrastructure services
echo "🐳 Starting infrastructure services..."
docker-compose -f infrastructure/docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for infrastructure services to be ready..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
cd services/business-service && npx prisma migrate dev --name init && cd ../..
cd services/notification-service && npx prisma migrate dev --name init && cd ../..

echo "✅ Development environment setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Start the development servers: npm run dev"
echo "2. Open http://localhost:3000 for the frontend"
echo "3. API Gateway is available at http://localhost:8080"
echo "4. Individual services:"
echo "   - Auth Service: http://localhost:8001"
echo "   - Scheduling Service: http://localhost:8002"
echo "   - Business Service: http://localhost:8003"
echo "   - Notification Service: http://localhost:8004"
echo ""
echo "📚 Documentation:"
echo "   - API Docs: http://localhost:8003/docs (Business Service)"
echo "   - Database Admin: http://localhost:8080 (Adminer)"
echo "   - Redis Admin: http://localhost:8081 (Redis Commander)"
echo "   - NATS Monitoring: http://localhost:8082 (NATS Surveyor)"
