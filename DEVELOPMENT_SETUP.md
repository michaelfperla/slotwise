# SlotWise Development Setup

## 🎯 Overview

This is a **DEVELOPMENT-ONLY** setup for SlotWise. Everything is configured for local development with Docker providing infrastructure services.

## 🚀 Quick Start

### 1. Start Everything
```powershell
.\start-slotwise.ps1
```

### 2. Stop Everything
```powershell
.\stop-slotwise.ps1
```

### 3. Clean Start (if having issues)
```powershell
.\start-slotwise.ps1 -Clean
```

## 📍 Service URLs

### Application Services
- **Frontend**: http://localhost:3000
- **Auth API**: http://localhost:8001
- **Business API**: http://localhost:8003
- **Scheduling API**: http://localhost:8002
- **Notification API**: http://localhost:8004

### Management UIs
- **Database (Adminer)**: http://localhost:8080
- **Redis (Commander)**: http://localhost:8081
- **NATS (Surveyor)**: http://localhost:8082

## 🔧 Development Configuration

### Database Access
- **Host**: localhost:5432
- **Username**: slotwise
- **Password**: slotwise_dev_password
- **Databases**: 
  - slotwise_auth
  - slotwise_business
  - slotwise_scheduling
  - slotwise_notification

### Environment Variables
All services use the same configuration from `.env` file:
- JWT Secret: `development-jwt-secret-not-for-production`
- Rate Limits: Relaxed (1000 requests/minute)
- Log Level: Debug
- All external APIs use test credentials

## 🛠️ Troubleshooting

### Services Won't Start
```powershell
# Check if ports are in use
netstat -ano | findstr :8001
netstat -ano | findstr :3000

# Clean restart
.\start-slotwise.ps1 -Clean
```

### Database Connection Issues
```powershell
# Check if PostgreSQL is running
docker ps | findstr postgres

# Check database logs
docker logs slotwise-postgres-dev
```

### Check Service Health
```powershell
# Test API endpoints
curl http://localhost:8001/health
curl http://localhost:8003/health
```

## 📁 File Structure

```
slotwise/
├── .env                          # Main development config
├── start-slotwise.ps1           # Start script
├── stop-slotwise.ps1            # Stop script
├── infrastructure/
│   └── docker-compose.dev.yml   # Development infrastructure
├── services/
│   ├── business-service/.env    # Service config
│   └── notification-service/.env # Service config
```

## ⚠️ Important Notes

- **This is DEVELOPMENT ONLY** - No production settings
- All passwords are development-only
- External APIs use test credentials
- Rate limits are relaxed for development
- Logging is verbose for debugging

## 🔄 Common Commands

```powershell
# Start development environment
.\start-slotwise.ps1

# Start with clean slate
.\start-slotwise.ps1 -Clean

# Stop everything
.\stop-slotwise.ps1

# Check what's running
docker ps

# View logs
docker-compose -f infrastructure/docker-compose.dev.yml logs

# Access database
# Use Adminer at http://localhost:8080
# Or: docker exec -it slotwise-postgres-dev psql -U slotwise -d slotwise_business
```
