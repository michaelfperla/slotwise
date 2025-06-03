# SlotWise Quick Start Guide

**Get SlotWise running in 5 minutes** ⚡

## 🎯 Prerequisites

```bash
# Required software (check versions)
node --version    # >= 18.0.0
go version       # >= 1.21.0
docker --version # >= 20.0.0
```

## 🚀 One-Command Setup

```bash
# Clone and setup everything
git clone https://github.com/michaelfperla/slotwise.git
cd slotwise
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

**What this does:**
- ✅ Installs all dependencies
- ✅ Starts PostgreSQL, Redis, NATS
- ✅ Runs database migrations
- ✅ Sets up environment files

## 🏃‍♂️ Start Development

```bash
# Start all services
npm run dev
```

**Services will start on:**
- 🌐 Frontend: http://localhost:3000
- 🔐 Auth Service: http://localhost:8001
- 📅 Scheduling Service: http://localhost:8002
- 🏢 Business Service: http://localhost:8003
- 📧 Notification Service: http://localhost:8004

## 🌱 Add Sample Data

```bash
# Create sample businesses and services
node scripts/seed-dev-data.js
```

**Creates:**
- 2 sample businesses
- 4 sample services
- Email templates

## 🧪 Test Everything Works

```bash
# Run API integration tests
chmod +x scripts/test-api-endpoints.sh
./scripts/test-api-endpoints.sh
```

## 🎯 What You Can Do Now

### 1. **Explore the Business API**
Visit: http://localhost:8003/docs

Try these endpoints:
```bash
# Get all businesses
curl http://localhost:8003/api/v1/businesses

# Get business by subdomain
curl http://localhost:8003/api/v1/businesses/subdomain/acme-consulting
```

### 2. **Test Authentication**
```bash
# Register a user
curl -X POST http://localhost:8001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "business_owner"
  }'

# Login
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### 3. **Check Service Health**
```bash
# All services should return "healthy"
curl http://localhost:8001/api/v1/health
curl http://localhost:8003/health
curl http://localhost:8002/api/v1/health
curl http://localhost:8004/health
```

## 🛠️ Development Commands

```bash
# Install dependencies
npm run install:all

# Start infrastructure only
npm run infra:up

# Run tests
npm run test:all

# Build everything
npm run build:all

# Clean everything
npm run clean:all

# Database operations
npm run db:migrate
npm run db:reset
```

## 🐛 Troubleshooting

### Services won't start?
```bash
# Check if ports are free
lsof -i :3000,8001,8002,8003,8004,5432,6379,4222

# Restart infrastructure
npm run infra:down
npm run infra:up
```

### Database connection issues?
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Reset database
npm run db:reset
node scripts/seed-dev-data.js
```

### NATS connection issues?
```bash
# Check NATS is running
docker ps | grep nats

# View NATS logs
docker logs slotwise-nats
```

## 📚 Next Steps

### For Frontend Development:
1. Open `frontend/` directory
2. Start with `app/page.tsx`
3. Add components in `components/`

### For Backend Development:
1. Check `services/` directory
2. Each service has its own README
3. Follow the coding standards in `docs/standards/`

### For Database Changes:
1. Modify Prisma schemas in `services/*/prisma/`
2. Run `npm run db:migrate`
3. Update seed data if needed

## 🎯 MVP Development Priorities

**Phase 1: Core Booking Flow**
1. ✅ User registration/login
2. ✅ Business setup
3. 🔄 Booking creation (in progress)
4. 🔄 Payment processing (planned)
5. 🔄 Email notifications (planned)

**Phase 2: Frontend**
1. 🔄 Customer booking interface
2. 🔄 Business dashboard
3. 🔄 Service management UI

## 🆘 Getting Help

- 📖 **Documentation**: `docs/` directory
- 🐛 **Troubleshooting**: `docs/troubleshooting.md`
- 🏗️ **Architecture**: `ARCHITECTURE.md`
- 📋 **Standards**: `docs/standards/`

## 🎉 Success!

If you see all services running and tests passing, you're ready to start building! 

**Happy coding!** 🚀
