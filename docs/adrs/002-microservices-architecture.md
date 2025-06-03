# ADR-002: Microservices Architecture

## Status

**Accepted** - June 7, 2025

## Context

SlotWise is a booking platform that needs to handle multiple business domains
including user authentication, business management, service scheduling, payment
processing, and notifications. We need to decide on an architectural approach
that supports scalability, team autonomy, and rapid feature development.

### Current Situation

- Single monolithic application becoming difficult to maintain
- Multiple teams working on different business domains
- Need for independent deployment and scaling
- Different technology requirements for different domains
- Requirement for high availability and fault tolerance

### Business Requirements

1. **Scalability**: Handle growing user base and booking volume
2. **Team Autonomy**: Multiple teams can work independently
3. **Technology Flexibility**: Use best tools for each domain
4. **Deployment Independence**: Deploy services independently
5. **Fault Isolation**: Failure in one service shouldn't affect others
6. **Performance**: Low latency for user-facing operations

## Decision

We will adopt a **microservices architecture** for SlotWise, decomposing the
system into domain-driven services that can be developed, deployed, and scaled
independently.

### Service Decomposition Strategy

#### **Core Services**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │Business Service │    │Scheduling Service│
│                 │    │                 │    │                 │
│ • User mgmt     │    │ • Business mgmt │    │ • Bookings      │
│ • Authentication│    │ • Service mgmt  │    │ • Availability  │
│ • Authorization │    │ • Staff mgmt    │    │ • Calendar      │
└─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Payment Service │    │Notification Svc │    │  Gateway/BFF    │
│                 │    │                 │    │                 │
│ • Payments      │    │ • Email         │    │ • API Gateway   │
│ • Billing       │    │ • SMS           │    │ • Rate limiting │
│ • Invoicing     │    │ • Push notifs   │    │ • Authentication│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### **Service Boundaries**

1. **Auth Service** - User management, authentication, authorization
2. **Business Service** - Business profiles, services, staff management
3. **Scheduling Service** - Bookings, availability, calendar management
4. **Payment Service** - Payment processing, billing, invoicing
5. **Notification Service** - Email, SMS, push notifications
6. **API Gateway** - Request routing, authentication, rate limiting

### Implementation Architecture

#### **Technology Stack per Service**

```yaml
auth-service:
  language: Go
  database: PostgreSQL
  cache: Redis

business-service:
  language: TypeScript/Node.js
  database: PostgreSQL (via Prisma)
  cache: Redis

scheduling-service:
  language: Go
  database: PostgreSQL
  cache: Redis

notification-service:
  language: TypeScript/Node.js
  database: PostgreSQL (via Prisma)
  queue: NATS
# Note: Payment service and API Gateway are planned but not yet implemented
```

#### **Communication Patterns**

```go
// Synchronous communication for real-time queries
type BusinessServiceClient interface {
    GetBusiness(ctx context.Context, id string) (*Business, error)
    GetService(ctx context.Context, id string) (*Service, error)
}

// Asynchronous communication for events
type EventPublisher interface {
    PublishUserCreated(ctx context.Context, event UserCreatedEvent) error
    PublishBookingConfirmed(ctx context.Context, event BookingConfirmedEvent) error
    PublishPaymentCompleted(ctx context.Context, event PaymentCompletedEvent) error
}
```

#### **Data Management**

- **Database per Service**: Each service owns its data
- **Event Sourcing**: For critical domains (bookings, payments)
- **CQRS**: Separate read/write models where beneficial
- **Eventual Consistency**: Accept eventual consistency between services

### Service Design Principles

#### **1. Domain-Driven Design**

```go
// Each service encapsulates a business domain
package auth

type User struct {
    ID       string
    Email    string
    Role     UserRole
    Business *BusinessReference // Reference, not full object
}

type UserService interface {
    CreateUser(ctx context.Context, req CreateUserRequest) (*User, error)
    AuthenticateUser(ctx context.Context, email, password string) (*AuthToken, error)
}
```

#### **2. API-First Design**

```yaml
# Each service defines its API contract first
openapi: 3.0.0
info:
  title: Auth Service API
  version: 1.0.0
paths:
  /api/v1/users:
    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
```

#### **3. Fault Tolerance**

```go
// Circuit breaker pattern for external service calls
type CircuitBreaker struct {
    maxFailures int
    timeout     time.Duration
    state       State
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    if cb.state == Open {
        return ErrCircuitBreakerOpen
    }

    err := fn()
    if err != nil {
        cb.recordFailure()
        return err
    }

    cb.recordSuccess()
    return nil
}
```

## Consequences

### Positive

- ✅ **Independent Development**: Teams can work autonomously on different
  services
- ✅ **Technology Flexibility**: Each service can use optimal technology stack
- ✅ **Scalability**: Services can be scaled independently based on demand
- ✅ **Fault Isolation**: Failure in one service doesn't bring down the entire
  system
- ✅ **Deployment Independence**: Services can be deployed independently
- ✅ **Team Ownership**: Clear ownership and responsibility boundaries
- ✅ **Performance**: Optimized performance per service domain
- ✅ **Testability**: Easier to test individual services in isolation

### Negative

- ❌ **Complexity**: Increased operational and development complexity
- ❌ **Network Latency**: Inter-service communication adds latency
- ❌ **Data Consistency**: Eventual consistency challenges
- ❌ **Distributed Debugging**: Harder to debug across service boundaries
- ❌ **Infrastructure Overhead**: More infrastructure to manage
- ❌ **Transaction Management**: Distributed transactions are complex
- ❌ **Service Discovery**: Need service discovery and load balancing
- ❌ **Monitoring**: Need distributed tracing and monitoring

### Mitigation Strategies

#### **Complexity Management**

- Standardize service templates and tooling
- Implement comprehensive monitoring and observability
- Use infrastructure as code for consistent deployments
- Establish clear service contracts and API versioning

#### **Performance Optimization**

- Implement caching strategies at multiple levels
- Use asynchronous communication where possible
- Optimize database queries and connections
- Implement proper load balancing

#### **Data Consistency**

- Use saga pattern for distributed transactions
- Implement event sourcing for critical business events
- Design for eventual consistency from the start
- Implement compensation patterns for rollbacks

## Alternatives Considered

### 1. Monolithic Architecture

```go
// Single application with all functionality
type SlotWiseApp struct {
    UserService     *UserService
    BusinessService *BusinessService
    BookingService  *BookingService
    PaymentService  *PaymentService
}
```

**Rejected because:**

- Difficult to scale individual components
- Technology lock-in for entire application
- Team coordination bottlenecks
- Single point of failure
- Deployment coupling

### 2. Modular Monolith

```go
// Single deployment with modular structure
package main

import (
    "slotwise/internal/auth"
    "slotwise/internal/business"
    "slotwise/internal/booking"
    "slotwise/internal/payment"
)
```

**Rejected because:**

- Still has deployment coupling
- Shared database creates bottlenecks
- Difficult to scale individual modules
- Technology constraints across modules

### 3. Service-Oriented Architecture (SOA)

```xml
<!-- Traditional SOA with SOAP/XML -->
<service name="UserService">
    <endpoint>http://services.slotwise.com/user</endpoint>
    <protocol>SOAP</protocol>
</service>
```

**Rejected because:**

- Heavy protocols (SOAP/XML)
- Centralized service registry complexity
- Less flexibility than microservices
- Outdated technology approach

## Implementation Plan

### Phase 1: Foundation (Weeks 1-4)

1. **Infrastructure Setup**

   - Set up Kubernetes cluster
   - Implement service mesh (Istio)
   - Set up monitoring (Prometheus, Grafana)
   - Implement distributed tracing (Jaeger)

2. **Core Services**
   - Extract Auth Service from monolith
   - Implement API Gateway
   - Set up NATS for messaging

### Phase 2: Business Logic (Weeks 5-8)

1. **Domain Services**

   - Extract Business Service
   - Extract Scheduling Service
   - Implement service-to-service communication

2. **Data Migration**
   - Migrate data to service-specific databases
   - Implement data synchronization

### Phase 3: Advanced Features (Weeks 9-12)

1. **Payment and Notifications**

   - Extract Payment Service
   - Extract Notification Service
   - Implement event-driven workflows

2. **Optimization**
   - Performance tuning
   - Caching implementation
   - Load testing and optimization

### Phase 4: Production Readiness (Weeks 13-16)

1. **Reliability**

   - Circuit breakers implementation
   - Retry mechanisms
   - Chaos engineering testing

2. **Monitoring and Operations**
   - Complete observability stack
   - Alerting and incident response
   - Documentation and runbooks

## Success Metrics

### Technical Metrics

- **Service Independence**: 95% of deployments are independent
- **Performance**: 99th percentile response time < 500ms
- **Availability**: 99.9% uptime per service
- **Scalability**: Ability to scale individual services 10x

### Business Metrics

- **Development Velocity**: 50% faster feature delivery
- **Team Autonomy**: Teams can deploy independently
- **Time to Market**: Reduced time for new features
- **System Reliability**: Reduced system-wide outages

## Monitoring and Review

### Success Criteria

- All services deployed independently
- Inter-service communication working reliably
- Performance targets met
- Team productivity improved
- System reliability increased

### Review Schedule

- **3-month review**: Assess initial implementation and performance
- **6-month review**: Evaluate team productivity and system reliability
- **Annual review**: Consider architectural improvements and lessons learned

## References

- [Microservices Patterns by Chris Richardson](https://microservices.io/patterns/)
- [Building Microservices by Sam Newman](https://samnewman.io/books/building_microservices/)
- [Domain-Driven Design by Eric Evans](https://domainlanguage.com/ddd/)
- [The Twelve-Factor App](https://12factor.net/)
- [Microservices at Netflix](https://netflixtechblog.com/tagged/microservices)

---

**Decision Made By**: Architecture Team  
**Date**: June 7, 2025  
**Next Review**: September 7, 2025
