# SlotWise Architecture Documentation

## 🎯 **Overview**

SlotWise is a microservices-based booking platform built with event-driven
architecture, designed for scalability, maintainability, and high performance.
This document outlines the system architecture, service interactions, and
technical decisions.

## 📋 **Table of Contents**

- [System Architecture](#system-architecture)
- [Service Overview](#service-overview)
- [Database Architecture](#database-architecture)
- [Event-Driven Architecture](#event-driven-architecture)
- [API Gateway & Communication](#api-gateway--communication)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Monitoring & Observability](#monitoring--observability)

## 🏗️ **System Architecture**

### **High-Level Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │  Admin Panel    │
│   (React/Next)  │    │   (React Native)│    │   (React)       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      API Gateway          │
                    │      (nginx/Kong)         │
                    └─────────────┬─────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
    ┌─────▼─────┐         ┌─────▼─────┐         ┌─────▼─────┐
    │   Auth    │         │ Business  │         │Scheduling │
    │ Service   │         │ Service   │         │ Service   │
    │   (Go)    │         │(Node.js)  │         │   (Go)    │
    └─────┬─────┘         └─────┬─────┘         └─────┬─────┘
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                │
                    ┌─────────────▼─────────────┐
                    │    Notification Service   │
                    │       (Node.js)           │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      NATS Message Bus     │
                    │    (Event Streaming)      │
                    └───────────────────────────┘
```

### **Technology Stack**

- **Frontend**: React, Next.js, TypeScript, Tailwind CSS
- **Backend Services**: Node.js (TypeScript), Go
- **Database**: PostgreSQL with Prisma ORM
- **Message Bus**: NATS for event-driven communication
- **API Gateway**: nginx (production), direct routing (development)
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes (production)
- **Monitoring**: Prometheus, Grafana, Jaeger
- **CI/CD**: GitHub Actions, Nx build system

## 🔧 **Service Overview**

### **Auth Service (Go)**

**Responsibilities:**

- User authentication and authorization
- JWT token management and validation
- Password hashing and verification
- OAuth2 integration (future)

**Key Features:**

- Stateless JWT authentication
- Role-based access control (RBAC)
- Password security with bcrypt
- Token refresh mechanism

### **Business Service (Node.js/TypeScript)**

**Responsibilities:**

- Business profile management
- Service catalog management
- Availability rule configuration
- Business settings and preferences

**Key Features:**

- Multi-tenant business isolation
- Service creation and management
- Availability scheduling
- NATS event publishing

### **Scheduling Service (Go)**

**Responsibilities:**

- Appointment booking and management
- Calendar integration
- Booking conflict resolution
- Time slot availability calculation

**Key Features:**

- Real-time availability checking
- Booking confirmation workflow
- Cancellation and rescheduling
- Calendar synchronization

### **Notification Service (Node.js/TypeScript)**

**Responsibilities:**

- Email and SMS notifications
- Event-driven notification triggers
- Template management
- Delivery tracking

**Key Features:**

- Multi-channel notifications
- Template-based messaging
- Event subscription handling
- Delivery status tracking

## 🗄️ **Database Architecture**

### **Database Strategy**

- **Database per Service**: Each microservice has its own PostgreSQL database
- **Shared Nothing Architecture**: No direct database access between services
- **Event Sourcing**: Critical events stored for audit and replay capabilities

### **Database Schemas**

**Auth Database:**

```sql
-- Users table
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Sessions table (optional for refresh tokens)
sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  refresh_token VARCHAR(255),
  expires_at TIMESTAMP,
  created_at TIMESTAMP
);
```

**Business Database:**

```sql
-- Businesses table
businesses (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL, -- Reference to auth.users
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING_SETUP',
  timezone VARCHAR(100) DEFAULT 'UTC',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Services table
services (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- minutes
  price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Availability rules table
availability_rules (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Scheduling Database:**

```sql
-- Bookings table
bookings (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL, -- Reference to business.businesses
  service_id UUID NOT NULL,  -- Reference to business.services
  customer_id UUID NOT NULL, -- Reference to auth.users
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  total_amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Time slots table (for pre-calculated availability)
time_slots (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL,
  service_id UUID,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_available BOOLEAN DEFAULT true,
  booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMP
);
```

### **Data Consistency Strategy**

- **Eventual Consistency**: Services synchronize via NATS events
- **Saga Pattern**: Complex transactions span multiple services
- **Compensation Actions**: Rollback mechanisms for failed operations
- **Idempotency**: All operations are idempotent to handle retries

## 📡 **Event-Driven Architecture**

### **NATS Event Bus**

NATS serves as our central message bus for service communication:

```
                    ┌─────────────────────────────────┐
                    │           NATS Server           │
                    │                                 │
                    │  Subjects:                      │
                    │  ├── business.business.*        │
                    │  ├── business.service.*         │
                    │  ├── business.availability.*    │
                    │  ├── scheduling.booking.*       │
                    │  ├── notification.email.*       │
                    │  └── notification.sms.*         │
                    └─────────────────────────────────┘
                              │           │
                    ┌─────────┴───┐   ┌───┴─────────┐
                    │ Publishers  │   │ Subscribers │
                    │             │   │             │
                    │ • Business  │   │ • Scheduling│
                    │ • Scheduling│   │ • Notification│
                    │ • Auth      │   │ • Analytics │
                    └─────────────┘   └─────────────┘
```

### **Event Flow Examples**

**Business Service Creation Flow:**

```
1. User creates service via Business Service API
2. Business Service validates and stores service
3. Business Service publishes "business.service.created" event
4. Scheduling Service subscribes and creates availability slots
5. Notification Service subscribes and sends confirmation email
```

**Booking Creation Flow:**

```
1. Customer creates booking via Scheduling Service API
2. Scheduling Service validates availability and creates booking
3. Scheduling Service publishes "scheduling.booking.created" event
4. Business Service subscribes and updates service statistics
5. Notification Service subscribes and sends confirmation notifications
```

### **Event Schema Standards**

```typescript
// Base event structure
interface BaseEvent {
  id: string; // Unique event ID
  type: string; // Event type
  version: string; // Schema version
  timestamp: string; // ISO 8601 timestamp
  source: string; // Source service
  correlationId?: string; // Request correlation
  userId?: string; // User context
}

// Example: Service created event
interface ServiceCreatedEvent extends BaseEvent {
  type: 'business.service.created';
  data: {
    serviceId: string;
    businessId: string;
    name: string;
    duration: number;
    price: number;
    currency: string;
  };
}
```

## 🌐 **API Gateway & Communication**

### **API Gateway (nginx)**

```nginx
# Production nginx configuration
upstream auth_service {
    server auth-service:8080;
}

upstream business_service {
    server business-service:3000;
}

upstream scheduling_service {
    server scheduling-service:8081;
}

server {
    listen 80;
    server_name api.slotwise.com;

    # Auth endpoints
    location /api/v1/auth/ {
        proxy_pass http://auth_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Business endpoints
    location /api/v1/businesses/ {
        proxy_pass http://business_service/api/v1/businesses/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Scheduling endpoints
    location /api/v1/bookings/ {
        proxy_pass http://scheduling_service/api/v1/bookings/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### **Service Communication Patterns**

1. **Synchronous**: Direct HTTP calls for immediate responses
2. **Asynchronous**: NATS events for eventual consistency
3. **Request-Reply**: NATS request-reply for service queries
4. **Pub-Sub**: NATS publish-subscribe for event broadcasting

## 🔒 **Security Architecture**

### **Authentication Flow**

```
1. User submits credentials to Auth Service
2. Auth Service validates and returns JWT access token
3. Client includes JWT in Authorization header
4. Each service validates JWT independently
5. Services extract user context from JWT claims
```

### **Authorization Strategy**

- **JWT Claims**: User ID, role, permissions
- **Service-Level**: Each service validates permissions
- **Resource-Level**: Business ownership validation
- **API Gateway**: Rate limiting and basic security

### **Security Measures**

- **HTTPS Everywhere**: TLS encryption for all communications
- **JWT Security**: Short-lived tokens with refresh mechanism
- **Input Validation**: Comprehensive validation at API boundaries
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **CORS Configuration**: Proper cross-origin resource sharing
- **Rate Limiting**: API rate limiting to prevent abuse

## 🚀 **Deployment Architecture**

### **Container Strategy**

```dockerfile
# Multi-stage build example
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### **Kubernetes Deployment**

```yaml
# Service deployment example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: business-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: business-service
  template:
    metadata:
      labels:
        app: business-service
    spec:
      containers:
        - name: business-service
          image: slotwise/business-service:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
            - name: NATS_URL
              value: 'nats://nats-service:4222'
```

## 📊 **Monitoring & Observability**

### **Logging Strategy**

- **Structured Logging**: JSON format with consistent fields
- **Correlation IDs**: Track requests across services
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Centralized Logging**: ELK stack or similar

### **Metrics Collection**

- **Application Metrics**: Request rates, response times, error rates
- **Business Metrics**: Bookings created, revenue, user activity
- **Infrastructure Metrics**: CPU, memory, disk, network
- **Custom Metrics**: Service-specific KPIs

### **Health Checks**

```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'business-service',
    version: process.env.APP_VERSION,
    checks: {
      database: await checkDatabase(),
      nats: await checkNATS(),
      memory: process.memoryUsage(),
    },
  };

  const isHealthy = Object.values(health.checks).every(
    check => check.status === 'healthy'
  );

  res.status(isHealthy ? 200 : 503).json(health);
});
```
