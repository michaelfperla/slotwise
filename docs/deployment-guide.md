# SlotWise Deployment Guide

## Table of Contents
- [Development Deployment](#development-deployment)
- [Staging Deployment](#staging-deployment)
- [Production Deployment](#production-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)
- [Security Considerations](#security-considerations)

## Development Deployment

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ and Go 1.21+
- Git

### Quick Start

1. **Clone and setup**:
   ```bash
   git clone https://github.com/your-org/slotwise.git
   cd slotwise
   chmod +x scripts/setup-dev.sh
   ./scripts/setup-dev.sh
   ```

2. **Start development environment**:
   ```bash
   npm run dev
   ```

3. **Access services**:
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:8080
   - Database Admin: http://localhost:8080 (Adminer)

### Development with Docker

```bash
# Start infrastructure only
npm run infra:up

# Build and start all services
npm run docker:build
npm run docker:up

# View logs
npm run infra:logs
```

## Staging Deployment

### Docker Compose Staging

1. **Create staging environment file**:
   ```bash
   cp .env.example .env.staging
   ```

2. **Update staging configuration**:
   ```env
   NODE_ENV=staging
   DATABASE_URL=postgresql://user:pass@staging-db:5432/slotwise
   REDIS_URL=redis://staging-redis:6379
   NATS_URL=nats://staging-nats:4222
   JWT_SECRET=your-staging-jwt-secret
   ```

3. **Deploy to staging**:
   ```bash
   docker-compose -f infrastructure/docker-compose.staging.yml up -d
   ```

### Staging Verification

```bash
# Health checks
curl http://staging.slotwise.com/health
curl http://staging.slotwise.com/health/auth
curl http://staging.slotwise.com/health/business
curl http://staging.slotwise.com/health/scheduling
curl http://staging.slotwise.com/health/notification

# Run integration tests
npm run test:integration -- --env=staging
```

## Production Deployment

### Prerequisites

- **Domain**: Configured DNS for your domain
- **SSL Certificate**: Let's Encrypt or commercial certificate
- **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
- **Cache**: Managed Redis (AWS ElastiCache, etc.)
- **Message Broker**: Managed NATS or self-hosted cluster

### Production Environment Setup

1. **Create production environment file**:
   ```env
   NODE_ENV=production
   
   # Database
   DATABASE_URL=postgresql://user:pass@prod-db.amazonaws.com:5432/slotwise
   
   # Redis
   REDIS_URL=redis://prod-redis.amazonaws.com:6379
   
   # NATS
   NATS_URL=nats://prod-nats.amazonaws.com:4222
   
   # Security
   JWT_SECRET=your-super-secure-production-jwt-secret
   
   # External Services
   SENDGRID_API_KEY=your-sendgrid-api-key
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   STRIPE_SECRET_KEY=your-stripe-secret-key
   
   # Monitoring
   SENTRY_DSN=your-sentry-dsn
   ```

2. **Build production images**:
   ```bash
   # Build all services
   docker-compose -f infrastructure/docker-compose.yml build
   
   # Tag for registry
   docker tag slotwise-auth-service:latest your-registry/slotwise-auth-service:v1.0.0
   docker tag slotwise-business-service:latest your-registry/slotwise-business-service:v1.0.0
   docker tag slotwise-scheduling-service:latest your-registry/slotwise-scheduling-service:v1.0.0
   docker tag slotwise-notification-service:latest your-registry/slotwise-notification-service:v1.0.0
   docker tag slotwise-frontend:latest your-registry/slotwise-frontend:v1.0.0
   
   # Push to registry
   docker push your-registry/slotwise-auth-service:v1.0.0
   # ... repeat for all services
   ```

3. **Deploy to production**:
   ```bash
   docker-compose -f infrastructure/docker-compose.prod.yml up -d
   ```

### Production Docker Compose

Create `infrastructure/docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  auth-service:
    image: your-registry/slotwise-auth-service:v1.0.0
    restart: unless-stopped
    environment:
      - DATABASE_HOST=${DATABASE_HOST}
      - DATABASE_USER=${DATABASE_USER}
      - DATABASE_PASSWORD=${DATABASE_PASSWORD}
      - REDIS_URL=${REDIS_URL}
      - NATS_URL=${NATS_URL}
      - JWT_SECRET=${JWT_SECRET}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ... other services
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (EKS, GKE, AKS, or self-managed)
- kubectl configured
- Helm (optional, for package management)

### Kubernetes Manifests

1. **Create namespace**:
   ```bash
   kubectl create namespace slotwise
   ```

2. **Apply configurations**:
   ```bash
   kubectl apply -f infrastructure/k8s/
   ```

### Example Kubernetes Deployment

Create `infrastructure/k8s/auth-service.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: slotwise
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: your-registry/slotwise-auth-service:v1.0.0
        ports:
        - containerPort: 8001
        env:
        - name: DATABASE_HOST
          valueFrom:
            secretKeyRef:
              name: slotwise-secrets
              key: database-host
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: slotwise-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: slotwise
spec:
  selector:
    app: auth-service
  ports:
  - port: 8001
    targetPort: 8001
  type: ClusterIP
```

### Helm Deployment (Optional)

1. **Create Helm chart**:
   ```bash
   helm create slotwise
   ```

2. **Deploy with Helm**:
   ```bash
   helm install slotwise ./helm/slotwise -n slotwise
   ```

3. **Upgrade deployment**:
   ```bash
   helm upgrade slotwise ./helm/slotwise -n slotwise
   ```

## Environment Variables

### Required Environment Variables

#### Auth Service
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=slotwise_auth_user
DATABASE_PASSWORD=secure_password
DATABASE_NAME=slotwise_auth
REDIS_HOST=localhost
REDIS_PORT=6379
NATS_URL=nats://localhost:4222
JWT_SECRET=your-jwt-secret
ENVIRONMENT=production
LOG_LEVEL=info
```

#### Business Service
```env
DATABASE_URL=postgresql://user:pass@host:5432/slotwise_business
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222
JWT_SECRET=your-jwt-secret
NODE_ENV=production
PORT=8003
```

#### Scheduling Service
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=slotwise_scheduling_user
DATABASE_PASSWORD=secure_password
DATABASE_NAME=slotwise_scheduling
REDIS_HOST=localhost
REDIS_PORT=6379
NATS_URL=nats://localhost:4222
ENVIRONMENT=production
LOG_LEVEL=info
```

#### Notification Service
```env
DATABASE_URL=postgresql://user:pass@host:5432/slotwise_notification
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222
NODE_ENV=production
PORT=8004
SENDGRID_API_KEY=your-sendgrid-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
```

#### Frontend
```env
NEXT_PUBLIC_API_URL=https://api.slotwise.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
NODE_ENV=production
```

## Database Setup

### Production Database Configuration

1. **Create databases**:
   ```sql
   CREATE DATABASE slotwise_auth;
   CREATE DATABASE slotwise_business;
   CREATE DATABASE slotwise_scheduling;
   CREATE DATABASE slotwise_notification;
   
   -- Create users
   CREATE USER slotwise_auth_user WITH PASSWORD 'secure_password';
   CREATE USER slotwise_business_user WITH PASSWORD 'secure_password';
   CREATE USER slotwise_scheduling_user WITH PASSWORD 'secure_password';
   CREATE USER slotwise_notification_user WITH PASSWORD 'secure_password';
   
   -- Grant permissions
   GRANT ALL PRIVILEGES ON DATABASE slotwise_auth TO slotwise_auth_user;
   GRANT ALL PRIVILEGES ON DATABASE slotwise_business TO slotwise_business_user;
   GRANT ALL PRIVILEGES ON DATABASE slotwise_scheduling TO slotwise_scheduling_user;
   GRANT ALL PRIVILEGES ON DATABASE slotwise_notification TO slotwise_notification_user;
   ```

2. **Run migrations**:
   ```bash
   # Node.js services
   cd services/business-service && npx prisma migrate deploy
   cd services/notification-service && npx prisma migrate deploy
   
   # Go services (run migration commands)
   cd services/auth-service && go run migrations/migrate.go
   cd services/scheduling-service && go run migrations/migrate.go
   ```

### Database Backup

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DB_HOST -U $DB_USER slotwise_auth > backup_auth_$DATE.sql
pg_dump -h $DB_HOST -U $DB_USER slotwise_business > backup_business_$DATE.sql
pg_dump -h $DB_HOST -U $DB_USER slotwise_scheduling > backup_scheduling_$DATE.sql
pg_dump -h $DB_HOST -U $DB_USER slotwise_notification > backup_notification_$DATE.sql
```

## Monitoring and Logging

### Health Checks

All services provide health check endpoints:
- `/health` - Basic health status
- `/health/ready` - Readiness check
- `/health/live` - Liveness check

### Logging Configuration

```yaml
# docker-compose.yml logging
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Monitoring Stack

1. **Prometheus** for metrics collection
2. **Grafana** for visualization
3. **Alertmanager** for alerting
4. **Jaeger** for distributed tracing

## Security Considerations

### Production Security Checklist

- [ ] Use HTTPS with valid SSL certificates
- [ ] Implement proper CORS policies
- [ ] Use strong JWT secrets (256-bit minimum)
- [ ] Enable rate limiting on all endpoints
- [ ] Use secure database connections (SSL)
- [ ] Implement proper input validation
- [ ] Use security headers (HSTS, CSP, etc.)
- [ ] Regular security updates for dependencies
- [ ] Implement proper logging and monitoring
- [ ] Use secrets management (Kubernetes secrets, AWS Secrets Manager, etc.)

### Firewall Configuration

```bash
# Allow only necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw deny 5432   # PostgreSQL (internal only)
ufw deny 6379   # Redis (internal only)
ufw deny 4222   # NATS (internal only)
```

### SSL/TLS Configuration

Use Let's Encrypt for free SSL certificates:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.slotwise.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Troubleshooting

### Common Deployment Issues

1. **Service won't start**: Check environment variables and logs
2. **Database connection errors**: Verify database credentials and network access
3. **High memory usage**: Check for memory leaks and optimize queries
4. **Slow response times**: Implement caching and database optimization

### Rollback Procedure

```bash
# Docker Compose rollback
docker-compose -f infrastructure/docker-compose.prod.yml down
docker-compose -f infrastructure/docker-compose.prod.yml up -d

# Kubernetes rollback
kubectl rollout undo deployment/auth-service -n slotwise
kubectl rollout undo deployment/business-service -n slotwise
kubectl rollout undo deployment/scheduling-service -n slotwise
kubectl rollout undo deployment/notification-service -n slotwise
```

For more troubleshooting information, see the [Troubleshooting Guide](troubleshooting.md).
