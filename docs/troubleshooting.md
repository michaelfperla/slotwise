# SlotWise Troubleshooting Guide

## Table of Contents

- [Common Development Issues](#common-development-issues)
- [Service-Specific Issues](#service-specific-issues)
- [Infrastructure Issues](#infrastructure-issues)
- [Database Issues](#database-issues)
- [Performance Issues](#performance-issues)
- [Deployment Issues](#deployment-issues)
- [Debugging Tools](#debugging-tools)
- [Getting Help](#getting-help)

## Common Development Issues

### Setup and Installation

#### Issue: `npm install` fails with permission errors

**Symptoms:**

```bash
Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

**Solution:**

```bash
# Use nvm to manage Node.js versions
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or configure npm to use a different directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### Issue: Docker containers won't start

**Symptoms:**

```bash
ERROR: Couldn't connect to Docker daemon
```

**Solution:**

```bash
# Start Docker service
sudo systemctl start docker

# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker is running
docker --version
docker ps
```

#### Issue: Port already in use

**Symptoms:**

```bash
Error: listen EADDRINUSE: address already in use :::8001
```

**Solution:**

```bash
# Find process using the port
lsof -i :8001
# or on Windows
netstat -ano | findstr :8001

# Kill the process
kill -9 <PID>
# or on Windows
taskkill /PID <PID> /F

# Or use different ports in .env files
```

### Environment Configuration

#### Issue: Environment variables not loading

**Symptoms:**

- Services can't connect to database
- JWT secret not found
- External API keys missing

**Solution:**

```bash
# Check if .env files exist
ls -la services/*/.*env*

# Copy from examples
cp services/business-service/.env.example services/business-service/.env
cp services/notification-service/.env.example services/notification-service/.env

# Verify environment variables are loaded
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
```

#### Issue: Database connection fails

**Symptoms:**

```bash
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start infrastructure services
npm run infra:up

# Check database logs
docker logs slotwise-postgres

# Test connection manually
psql -h localhost -U slotwise -d slotwise
```

## Service-Specific Issues

### Auth Service (Go)

#### Issue: JWT token validation fails

**Symptoms:**

```bash
Error: token is malformed
```

**Solution:**

```bash
# Check JWT secret consistency across services
grep -r "JWT_SECRET" services/*/

# Verify token format
echo "eyJ..." | base64 -d

# Check token expiration
# Use jwt.io to decode and inspect token
```

#### Issue: Go module dependencies

**Symptoms:**

```bash
go: module not found
```

**Solution:**

```bash
cd services/auth-service
go mod tidy
go mod download
go mod verify
```

### Business Service (Node.js)

#### Issue: Prisma client not generated

**Symptoms:**

```bash
Error: Cannot find module '@prisma/client'
```

**Solution:**

```bash
cd services/business-service
npx prisma generate
npm run build
```

#### Issue: Database migration fails

**Symptoms:**

```bash
Error: Migration failed to apply
```

**Solution:**

```bash
# Reset database (development only)
npx prisma migrate reset

# Apply migrations manually
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

### Frontend (Next.js)

#### Issue: Build fails with TypeScript errors

**Symptoms:**

```bash
Type error: Cannot find module '@slotwise/types'
```

**Solution:**

```bash
# Build shared packages first
cd shared/types && npm run build
cd ../utils && npm run build

# Clear Next.js cache
cd frontend
rm -rf .next
npm run build
```

#### Issue: API calls fail with CORS errors

**Symptoms:**

```bash
Access to fetch at 'http://localhost:8003' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**

```bash
# Check CORS configuration in services
grep -r "CORS_ORIGINS" services/*/

# Update .env files with correct origins
echo "CORS_ORIGINS=http://localhost:3000,http://localhost:3001" >> services/business-service/.env
```

## Infrastructure Issues

### NATS Connection Issues

#### Issue: NATS server unreachable

**Symptoms:**

```bash
Error: nats: no servers available for connection
```

**Solution:**

```bash
# Check NATS container status
docker ps | grep nats

# Check NATS logs
docker logs slotwise-nats

# Test NATS connection
nats pub test.subject "hello world"
nats sub test.subject

# Restart NATS
docker restart slotwise-nats
```

### Redis Connection Issues

#### Issue: Redis connection timeout

**Symptoms:**

```bash
Error: Redis connection timeout
```

**Solution:**

```bash
# Check Redis container
docker ps | grep redis

# Test Redis connection
redis-cli ping

# Check Redis logs
docker logs slotwise-redis

# Clear Redis cache
redis-cli FLUSHALL
```

## Database Issues

### PostgreSQL Issues

#### Issue: Database connection pool exhausted

**Symptoms:**

```bash
Error: remaining connection slots are reserved
```

**Solution:**

```bash
# Check active connections
psql -h localhost -U slotwise -d slotwise -c "SELECT count(*) FROM pg_stat_activity;"

# Increase connection limit in postgresql.conf
# max_connections = 200

# Optimize connection pooling in services
# Prisma: connection_limit = 10
# GORM: SetMaxOpenConns(25)
```

#### Issue: Migration conflicts

**Symptoms:**

```bash
Error: Migration 20240101000000_init failed
```

**Solution:**

```bash
# Check migration history
npx prisma migrate status

# Resolve conflicts manually
psql -h localhost -U slotwise -d slotwise

# Mark migration as applied (if manually fixed)
npx prisma migrate resolve --applied 20240101000000_init
```

### Data Consistency Issues

#### Issue: Event sourcing out of sync

**Symptoms:**

- Events published but not processed
- Data inconsistency between services

**Solution:**

```bash
# Check NATS message queues
nats stream ls
nats consumer ls <stream-name>

# Replay events from specific sequence
nats consumer next <stream-name> <consumer-name>

# Check event processing logs
docker logs slotwise-business-service | grep "event"
```

## Performance Issues

### Slow API Responses

#### Issue: Database queries taking too long

**Symptoms:**

- API timeouts
- High database CPU usage

**Solution:**

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_bookings_start_time ON bookings(start_time);
```

#### Issue: High memory usage

**Symptoms:**

- Services crashing with OOM errors
- Slow response times

**Solution:**

```bash
# Monitor memory usage
docker stats

# Check for memory leaks in Node.js
node --inspect services/business-service/dist/index.js

# Optimize database queries
# Use LIMIT and pagination
# Implement proper caching
```

### High CPU Usage

#### Issue: Event processing bottleneck

**Symptoms:**

- High CPU usage in notification service
- Event queue backing up

**Solution:**

```bash
# Scale notification service
docker-compose up --scale notification-service=3

# Implement batch processing
# Add rate limiting to external API calls
# Use worker queues for heavy processing
```

## Deployment Issues

### Docker Issues

#### Issue: Image build fails

**Symptoms:**

```bash
Error: failed to solve: process "/bin/sh -c npm install" did not complete successfully
```

**Solution:**

```bash
# Clear Docker cache
docker system prune -a

# Build with no cache
docker build --no-cache -t slotwise-auth-service .

# Check Dockerfile syntax
docker run --rm -i hadolint/hadolint < Dockerfile
```

#### Issue: Container health checks failing

**Symptoms:**

```bash
Status: unhealthy
```

**Solution:**

```bash
# Check health check endpoint manually
curl http://localhost:8001/health

# Increase health check timeout
# In docker-compose.yml:
healthcheck:
  timeout: 30s
  interval: 30s
  retries: 5

# Check container logs
docker logs slotwise-auth-service
```

### Kubernetes Issues

#### Issue: Pods stuck in Pending state

**Symptoms:**

```bash
NAME                    READY   STATUS    RESTARTS   AGE
auth-service-xxx        0/1     Pending   0          5m
```

**Solution:**

```bash
# Check pod events
kubectl describe pod auth-service-xxx

# Check node resources
kubectl top nodes

# Check resource requests/limits
kubectl get pod auth-service-xxx -o yaml | grep -A 10 resources
```

#### Issue: Service discovery not working

**Symptoms:**

- Services can't communicate
- DNS resolution fails

**Solution:**

```bash
# Check service endpoints
kubectl get endpoints

# Test DNS resolution from pod
kubectl exec -it auth-service-xxx -- nslookup business-service

# Check network policies
kubectl get networkpolicies
```

## Debugging Tools

### Logging

```bash
# Centralized logging with Docker Compose
docker-compose logs -f

# Service-specific logs
docker logs -f slotwise-auth-service

# Structured logging search
docker logs slotwise-business-service | jq '.level == "error"'
```

### Health Checks

```bash
# Check all service health
curl http://localhost:8080/health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health

# Detailed health check
curl http://localhost:8003/health/ready
```

### Database Debugging

```bash
# Connect to database
psql -h localhost -U slotwise -d slotwise

# Check active queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

# Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

### NATS Debugging

```bash
# Install NATS CLI
go install github.com/nats-io/natscli/nats@latest

# Check server info
nats server info

# Monitor messages
nats sub "slotwise.>"

# Check streams
nats stream ls
nats stream info slotwise-events
```

## Getting Help

### Before Asking for Help

1. **Check the logs** for error messages
2. **Search existing issues** on GitHub
3. **Try the solutions** in this troubleshooting guide
4. **Reproduce the issue** with minimal steps
5. **Gather relevant information** (logs, environment, versions)

### Where to Get Help

1. **GitHub Issues**: For bugs and feature requests
2. **GitHub Discussions**: For questions and community help
3. **Documentation**: Check the [docs](docs/) directory
4. **Discord**: Join our community server (link in README)
5. **Email**: support@slotwise.com for urgent issues

### Information to Include

When asking for help, please include:

- **SlotWise version** you're using
- **Operating system** and version
- **Node.js and Go versions**
- **Docker version** (if using containers)
- **Complete error messages** and stack traces
- **Steps to reproduce** the issue
- **What you've already tried**
- **Relevant configuration** (sanitized)

### Creating a Minimal Reproduction

```bash
# Create a minimal test case
git clone https://github.com/your-org/slotwise.git
cd slotwise
git checkout <problematic-commit>

# Follow setup instructions
./scripts/setup-dev.sh

# Document exact steps that cause the issue
```

This troubleshooting guide covers the most common issues you might encounter
while developing with SlotWise. If you encounter an issue not covered here,
please consider contributing to this guide by submitting a pull request with the
solution.
