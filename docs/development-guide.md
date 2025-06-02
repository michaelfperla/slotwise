# SlotWise Development Guide

## Table of Contents
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Architecture Overview](#architecture-overview)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [API Development](#api-development)
- [Database Management](#database-management)
- [Event-Driven Architecture](#event-driven-architecture)
- [Security Guidelines](#security-guidelines)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **Go** 1.21 or higher
- **Docker** and **Docker Compose**
- **Git** for version control
- **VS Code** (recommended) with extensions:
  - Go extension
  - TypeScript and JavaScript Language Features
  - Prisma extension
  - Docker extension

### Quick Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/michaelfperla/slotwise.git
   cd slotwise
   ```

2. **Run automated setup**:
   ```bash
   chmod +x scripts/setup-dev.sh
   ./scripts/setup-dev.sh
   ```

3. **Start development**:
   ```bash
   npm run dev
   ```

## Development Environment Setup

### Manual Setup (Alternative to Automated Script)

1. **Install dependencies**:
   ```bash
   npm install
   npm run install:all
   ```

2. **Setup environment files**:
   ```bash
   cp services/business-service/.env.example services/business-service/.env
   cp services/notification-service/.env.example services/notification-service/.env
   cp frontend/.env.example frontend/.env.local
   ```

3. **Start infrastructure services**:
   ```bash
   npm run infra:up
   ```

4. **Run database migrations**:
   ```bash
   cd services/business-service && npx prisma migrate dev
   cd ../notification-service && npx prisma migrate dev
   ```

5. **Build shared packages**:
   ```bash
   cd shared/types && npm run build
   cd ../utils && npm run build
   ```

### Development Workflow

1. **Start all services**:
   ```bash
   npm run dev
   ```

2. **Individual service development**:
   ```bash
   # Frontend only
   npm run dev:frontend
   
   # Specific service
   npm run dev:auth
   npm run dev:business
   npm run dev:scheduling
   npm run dev:notification
   ```

3. **Running tests**:
   ```bash
   # All tests
   npm run test:all
   
   # Specific service
   cd services/business-service && npm test
   cd services/auth-service && go test ./...
   ```

## Architecture Overview

### Service Architecture

SlotWise follows a microservices architecture with the following services:

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │
│   (Next.js)     │◄──►│   (Nginx)       │
│   Port: 3000    │    │   Port: 8080    │
└─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │ Auth Service │ │Business Svc │ │Schedule Svc│
        │   (Go)       │ │ (Node.js)   │ │   (Go)     │
        │ Port: 8001   │ │ Port: 8003  │ │ Port: 8002 │
        └──────────────┘ └─────────────┘ └────────────┘
                │               │               │
                └───────────────┼───────────────┘
                                │
                        ┌───────▼──────┐
                        │Notification  │
                        │Service       │
                        │(Node.js)     │
                        │Port: 8004    │
                        └──────────────┘
```

### Data Flow

1. **Request Flow**: Frontend → API Gateway → Service
2. **Event Flow**: Service → NATS → Subscribing Services
3. **Data Flow**: Service → Database (PostgreSQL)
4. **Cache Flow**: Service → Redis → Service

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Go (Auth/Scheduling), Node.js (Business/Notification)
- **Database**: PostgreSQL with Prisma (Node.js) and GORM (Go)
- **Message Broker**: NATS.io for event-driven communication
- **Cache**: Redis for session storage and caching
- **API Gateway**: Nginx for load balancing and routing
- **Containerization**: Docker and Docker Compose

## Coding Standards

### TypeScript/JavaScript Standards

1. **Use TypeScript** for all new JavaScript code
2. **Strict mode** enabled in tsconfig.json
3. **ESLint** and **Prettier** for code formatting
4. **Naming conventions**:
   - Variables and functions: `camelCase`
   - Classes and interfaces: `PascalCase`
   - Constants: `UPPER_SNAKE_CASE`
   - Files: `kebab-case` or `camelCase`

5. **Import organization**:
   ```typescript
   // External libraries
   import React from 'react';
   import { NextPage } from 'next';
   
   // Internal modules
   import { BusinessService } from '../services/BusinessService';
   import { logger } from '../utils/logger';
   
   // Types
   import type { Business } from '@slotwise/types';
   ```

### Go Standards

1. **Follow Go conventions**: Use `gofmt`, `golint`, and `go vet`
2. **Package naming**: Short, lowercase, single words
3. **Error handling**: Always handle errors explicitly
4. **Documentation**: Use GoDoc comments for public functions
5. **Testing**: Write tests for all public functions

### Database Standards

1. **Naming conventions**:
   - Tables: `snake_case` (e.g., `user_profiles`)
   - Columns: `snake_case` (e.g., `created_at`)
   - Indexes: `idx_table_column` (e.g., `idx_users_email`)

2. **Migrations**:
   - Always use migrations for schema changes
   - Include both up and down migrations
   - Test migrations on sample data

3. **Queries**:
   - Use prepared statements
   - Implement proper indexing
   - Avoid N+1 queries

## Testing Guidelines

### Unit Testing

1. **Coverage target**: Minimum 80% code coverage
2. **Test structure**: Arrange, Act, Assert (AAA)
3. **Naming**: `TestFunctionName_Scenario_ExpectedResult`

**Example (Go)**:
```go
func TestUserService_CreateUser_ValidInput_ReturnsUser(t *testing.T) {
    // Arrange
    service := NewUserService(mockRepo)
    userData := UserData{Email: "test@example.com"}
    
    // Act
    user, err := service.CreateUser(userData)
    
    // Assert
    assert.NoError(t, err)
    assert.Equal(t, "test@example.com", user.Email)
}
```

**Example (TypeScript)**:
```typescript
describe('BusinessService', () => {
  it('should create business with valid data', async () => {
    // Arrange
    const businessData = { name: 'Test Business' };
    
    // Act
    const result = await businessService.createBusiness(businessData);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Test Business');
  });
});
```

### Integration Testing

1. **Database testing**: Use test databases
2. **API testing**: Test complete request/response cycles
3. **Event testing**: Verify event publishing and consumption

### End-to-End Testing

1. **User flows**: Test complete user journeys
2. **Cross-service**: Test service interactions
3. **Performance**: Include load testing scenarios

## API Development

### REST API Standards

1. **HTTP Methods**:
   - `GET`: Retrieve resources
   - `POST`: Create resources
   - `PUT`: Update entire resources
   - `PATCH`: Partial updates
   - `DELETE`: Remove resources

2. **Status Codes**:
   - `200`: Success
   - `201`: Created
   - `400`: Bad Request
   - `401`: Unauthorized
   - `403`: Forbidden
   - `404`: Not Found
   - `409`: Conflict
   - `500`: Internal Server Error

3. **Response Format**:
   ```json
   {
     "success": true,
     "data": { ... },
     "timestamp": "2024-01-01T00:00:00Z"
   }
   ```

4. **Error Format**:
   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Invalid input data",
       "details": [...]
     },
     "timestamp": "2024-01-01T00:00:00Z"
   }
   ```

### OpenAPI Documentation

1. **Document all endpoints** with OpenAPI/Swagger
2. **Include examples** for requests and responses
3. **Specify validation rules** and constraints
4. **Document authentication** requirements

## Database Management

### Prisma (Node.js Services)

1. **Schema changes**:
   ```bash
   npx prisma migrate dev --name description_of_change
   ```

2. **Generate client**:
   ```bash
   npx prisma generate
   ```

3. **Reset database**:
   ```bash
   npx prisma migrate reset
   ```

### GORM (Go Services)

1. **Auto-migration**:
   ```go
   db.AutoMigrate(&User{}, &Session{})
   ```

2. **Manual migrations**: Use migration files in `migrations/` directory

### Best Practices

1. **Always backup** before migrations
2. **Test migrations** on staging first
3. **Use transactions** for data consistency
4. **Index frequently queried columns**
5. **Implement soft deletes** where appropriate

## Event-Driven Architecture

### Event Publishing

```typescript
// TypeScript example
await eventPublisher.publish('business.created', {
  businessId: business.id,
  name: business.name,
  ownerId: business.ownerId
});
```

```go
// Go example
event := Event{
    Type: "user.created",
    Data: userData,
}
publisher.Publish("slotwise.user.created", event)
```

### Event Subscription

```typescript
// TypeScript example
eventSubscriber.subscribe('payment.succeeded', async (event) => {
  await bookingService.confirmBooking(event.data.bookingId);
});
```

### Event Naming Convention

- Format: `domain.action` (e.g., `user.created`, `booking.cancelled`)
- Use past tense for actions
- Be specific and descriptive

## Security Guidelines

### Authentication

1. **JWT tokens** with short expiration times
2. **Refresh tokens** for session management
3. **Secure token storage** (httpOnly cookies)

### Authorization

1. **Role-based access control** (RBAC)
2. **Resource-level permissions**
3. **Principle of least privilege**

### Input Validation

1. **Validate all inputs** at API boundaries
2. **Sanitize data** before database operations
3. **Use parameterized queries** to prevent SQL injection

### Security Headers

1. **CORS** configuration
2. **Rate limiting** on all endpoints
3. **Security headers** (CSP, HSTS, etc.)

## Performance Considerations

### Caching Strategy

1. **Redis caching** for frequently accessed data
2. **Cache invalidation** on data updates
3. **Cache warming** for critical data

### Database Optimization

1. **Query optimization** with proper indexes
2. **Connection pooling** for database connections
3. **Read replicas** for read-heavy operations

### API Performance

1. **Pagination** for large datasets
2. **Field selection** to reduce payload size
3. **Compression** for API responses

## Troubleshooting

### Common Issues

1. **Service won't start**: Check environment variables and dependencies
2. **Database connection errors**: Verify database is running and credentials
3. **NATS connection issues**: Ensure NATS server is accessible
4. **Build failures**: Clear node_modules and reinstall dependencies

### Debugging Tools

1. **Logs**: Check service logs for error details
2. **Health checks**: Use `/health` endpoints to verify service status
3. **Database admin**: Use Adminer for database inspection
4. **Redis commander**: Monitor Redis cache and sessions

### Performance Issues

1. **Slow queries**: Use database query analysis tools
2. **Memory leaks**: Monitor service memory usage
3. **High CPU**: Profile application performance
4. **Network issues**: Check service-to-service communication

For more specific troubleshooting, see the [Troubleshooting Guide](troubleshooting.md).
