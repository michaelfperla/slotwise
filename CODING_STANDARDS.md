# SlotWise Coding Standards

## 🎯 **Overview**

This document establishes comprehensive coding standards for the SlotWise
platform to ensure code quality, maintainability, and team productivity as we
scale toward MVP delivery and beyond.

## 📋 **Table of Contents**

- [General Principles](#general-principles)
- [TypeScript/Node.js Standards](#typescriptnojs-standards)
- [Go Standards](#go-standards)
- [React/Frontend Standards](#reactfrontend-standards)
- [Database Standards](#database-standards)
- [API Design Standards](#api-design-standards)
- [NATS Event Standards](#nats-event-standards)
- [Testing Standards](#testing-standards)
- [Documentation Standards](#documentation-standards)

## 🎯 **General Principles**

### **Code Quality Principles**

1. **Clarity over Cleverness**: Write code that is easy to read and understand
2. **Consistency**: Follow established patterns throughout the codebase
3. **Maintainability**: Design for future changes and team growth
4. **Performance**: Optimize for scalability and efficiency
5. **Security**: Implement secure coding practices by default

### **Team Collaboration**

- **Self-Documenting Code**: Use descriptive names and clear structure
- **Progressive Enhancement**: Build incrementally with backward compatibility
- **Error Handling**: Implement comprehensive error handling and logging
- **Testing First**: Write tests alongside or before implementation

## 🔧 **TypeScript/Node.js Standards**

### **File and Directory Naming**

```
services/
├── business-service/
│   ├── src/
│   │   ├── controllers/     # PascalCase: UserController.ts
│   │   ├── services/        # PascalCase: BusinessService.ts
│   │   ├── models/          # PascalCase: Business.ts
│   │   ├── routes/          # camelCase: business.ts
│   │   ├── middleware/      # camelCase: auth.ts
│   │   ├── utils/           # camelCase: logger.ts
│   │   ├── types/           # camelCase: api.ts
│   │   └── __tests__/       # Match source: UserController.test.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
```

### **Variable and Function Naming**

```typescript
// Variables: camelCase
const businessId = 'biz-123';
const userPreferences = { theme: 'dark' };

// Functions: camelCase with descriptive verbs
const createBusiness = async (data: CreateBusinessData) => {};
const validateUserPermissions = (userId: string, businessId: string) => {};

// Classes: PascalCase
class BusinessService {}
class UserController {}

// Interfaces: PascalCase with descriptive names
interface CreateBusinessData {
  name: string;
  subdomain: string;
}

// Types: PascalCase
type BusinessStatus = 'ACTIVE' | 'PENDING_SETUP' | 'SUSPENDED';

// Constants: SCREAMING_SNAKE_CASE
const MAX_BUSINESS_NAME_LENGTH = 100;
const DEFAULT_TIMEZONE = 'UTC';
```

### **Code Structure Standards**

```typescript
// File structure template
import {} from /* external dependencies */ 'library';
import {} from /* internal types */ '../types';
import {} from /* internal utilities */ '../utils';

// Type definitions
interface ServiceConfig {
  port: number;
  database: DatabaseConfig;
}

// Constants
const DEFAULT_CONFIG: ServiceConfig = {
  port: 3000,
  database: {
    /* ... */
  },
};

// Main implementation
export class BusinessService {
  private readonly prisma: PrismaClient;

  constructor(config: ServiceConfig) {
    this.prisma = new PrismaClient();
  }

  async createBusiness(data: CreateBusinessData): Promise<Business> {
    // Implementation
  }
}
```

### **Error Handling Standards**

```typescript
// Custom error classes
export class BusinessNotFoundError extends Error {
  constructor(businessId: string) {
    super(`Business not found: ${businessId}`);
    this.name = 'BusinessNotFoundError';
  }
}

// Service layer error handling
async createService(userId: string, data: CreateServiceData): Promise<Service> {
  try {
    const business = await this.findUserBusiness(userId);
    if (!business) {
      throw new BusinessNotFoundError(userId);
    }

    return await this.prisma.service.create({ data });
  } catch (error) {
    this.logger.error('Service creation failed', { userId, error });
    throw error;
  }
}
```

## 🐹 **Go Standards**

### **File and Package Naming**

```
services/auth-service/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── handlers/        # snake_case files: user_handler.go
│   ├── service/         # snake_case files: auth_service.go
│   ├── repository/      # snake_case files: user_repository.go
│   ├── models/          # snake_case files: user.go
│   └── middleware/      # snake_case files: auth_middleware.go
├── pkg/
│   ├── jwt/
│   └── logger/
└── go.mod
```

### **Naming Conventions**

```go
// Package names: lowercase, single word
package handlers

// Variables: camelCase
var userID string
var businessConfig Config

// Functions: PascalCase for exported, camelCase for private
func CreateUser(data UserData) (*User, error) { }
func validateUserData(data UserData) error { }

// Structs: PascalCase
type User struct {
    ID       string    `json:"id" db:"id"`
    Email    string    `json:"email" db:"email"`
    CreateAt time.Time `json:"createdAt" db:"created_at"`
}

// Interfaces: PascalCase with -er suffix
type UserRepository interface {
    CreateUser(user *User) error
    FindUserByEmail(email string) (*User, error)
}

// Constants: PascalCase or SCREAMING_SNAKE_CASE
const DefaultTimeout = 30 * time.Second
const MAX_LOGIN_ATTEMPTS = 5
```

## ⚛️ **React/Frontend Standards**

### **Component Structure**

```typescript
// Component file: UserProfile.tsx
import React, { useState, useEffect } from 'react';
import { User } from '../types/user';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  onUpdate
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      const userData = await fetchUser(userId);
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="user-profile">
      {/* Component JSX */}
    </div>
  );
};
```

## 🗄️ **Database Standards**

### **Table Naming**

```sql
-- Table names: snake_case, plural
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Prisma Schema Standards**

```prisma
// Model names: PascalCase, singular
model Business {
  id          String   @id @default(cuid())
  name        String   @db.VarChar(255)
  subdomain   String   @unique @db.VarChar(100)
  ownerId     String   @map("owner_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  owner       User     @relation(fields: [ownerId], references: [id])
  services    Service[]

  @@map("businesses")
}
```

## 🌐 **API Design Standards**

### **REST Endpoint Patterns**

```
# Resource-based URLs
GET    /api/v1/businesses              # List businesses
POST   /api/v1/businesses              # Create business
GET    /api/v1/businesses/{id}         # Get business
PUT    /api/v1/businesses/{id}         # Update business
DELETE /api/v1/businesses/{id}         # Delete business

# Nested resources
GET    /api/v1/businesses/{id}/services     # List business services
POST   /api/v1/businesses/{id}/services     # Create service for business
GET    /api/v1/services/{id}                # Get specific service
PUT    /api/v1/services/{id}                # Update service
DELETE /api/v1/services/{id}                # Delete service

# Actions on resources
POST   /api/v1/businesses/{id}/activate     # Activate business
POST   /api/v1/services/{id}/publish        # Publish service
```

### **Request/Response Format Standards**

```typescript
// Request body structure
interface CreateBusinessRequest {
  name: string;
  subdomain: string;
  timezone?: string;
  settings?: BusinessSettings;
}

// Success response structure
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
  };
}

// Error response structure
interface ApiErrorResponse {
  success: false;
  error: string; // Error code: BUSINESS_NOT_FOUND
  message: string; // Human-readable message
  details?: unknown; // Additional error details
  timestamp: string;
}

// Pagination structure
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### **HTTP Status Code Standards**

```typescript
// Success responses
200; // OK - Successful GET, PUT
201; // Created - Successful POST
204; // No Content - Successful DELETE

// Client error responses
400; // Bad Request - Invalid request data
401; // Unauthorized - Authentication required
403; // Forbidden - Insufficient permissions
404; // Not Found - Resource doesn't exist
409; // Conflict - Resource already exists
422; // Unprocessable Entity - Validation errors

// Server error responses
500; // Internal Server Error - Unexpected server error
503; // Service Unavailable - Service temporarily down
```

## 📡 **NATS Event Standards**

### **Event Naming Convention**

```
# Pattern: {service}.{entity}.{action}
business.business.created
business.business.updated
business.business.activated
business.service.created
business.service.updated
business.availability.updated

scheduling.booking.created
scheduling.booking.confirmed
scheduling.booking.cancelled

notification.email.sent
notification.sms.sent
```

### **Event Payload Structure**

```typescript
// Base event interface
interface BaseEvent {
  id: string; // Unique event ID
  type: string; // Event type (business.service.created)
  version: string; // Event schema version (1.0.0)
  timestamp: string; // ISO 8601 timestamp
  source: string; // Source service (business-service)
  correlationId?: string; // Request correlation ID
  userId?: string; // User who triggered the event
}

// Business service created event
interface BusinessServiceCreatedEvent extends BaseEvent {
  type: 'business.service.created';
  data: {
    serviceId: string;
    businessId: string;
    name: string;
    duration: number;
    price: number;
    currency: string;
    isActive: boolean;
  };
}

// Booking created event
interface BookingCreatedEvent extends BaseEvent {
  type: 'scheduling.booking.created';
  data: {
    bookingId: string;
    businessId: string;
    serviceId: string;
    customerId: string;
    startTime: string;
    endTime: string;
    status: 'PENDING' | 'CONFIRMED';
    totalAmount: number;
    currency: string;
  };
}
```

### **Event Publishing Standards**

```typescript
// Event publisher service
export class EventPublisher {
  constructor(private nats: NatsConnection) {}

  async publishEvent<T extends BaseEvent>(event: T): Promise<void> {
    try {
      const subject = event.type;
      const payload = JSON.stringify(event);

      await this.nats.publish(subject, payload);

      this.logger.info('Event published', {
        eventId: event.id,
        type: event.type,
        correlationId: event.correlationId
      });
    } catch (error) {
      this.logger.error('Failed to publish event', {
        eventId: event.id,
        type: event.type,
        error
      });
      throw error;
    }
  }
}

// Usage in service
async createService(userId: string, data: CreateServiceData): Promise<Service> {
  const service = await this.prisma.service.create({ data });

  // Publish event
  await this.eventPublisher.publishEvent({
    id: generateEventId(),
    type: 'business.service.created',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    source: 'business-service',
    userId,
    data: {
      serviceId: service.id,
      businessId: service.businessId,
      name: service.name,
      duration: service.duration,
      price: service.price,
      currency: service.currency,
      isActive: service.isActive
    }
  });

  return service;
}
```

## 🧪 **Testing Standards**

### **Test File Organization**

```
src/
├── services/
│   ├── BusinessService.ts
│   └── __tests__/
│       ├── BusinessService.unit.test.ts      # Unit tests
│       └── BusinessService.integration.test.ts # Integration tests
├── controllers/
│   ├── BusinessController.ts
│   └── __tests__/
│       └── BusinessController.test.ts
└── __tests__/
    ├── setup.ts                              # Test setup
    ├── helpers/                              # Test utilities
    └── fixtures/                             # Test data
```

### **Test Naming Standards**

```typescript
// Test suite naming: describe('ClassName/FunctionName')
describe('BusinessService', () => {
  describe('createBusiness', () => {
    it('should create a business with valid data', async () => {
      // Test implementation
    });

    it('should throw BusinessAlreadyExistsError when subdomain exists', async () => {
      // Test implementation
    });

    it('should publish business.created event after successful creation', async () => {
      // Test implementation
    });
  });
});

// Integration test naming
describe('Business API Integration', () => {
  describe('POST /api/v1/businesses', () => {
    it('should create business and return 201 with business data', async () => {
      // Test implementation
    });
  });
});
```

### **Test Coverage Requirements**

```typescript
// Minimum coverage thresholds (jest.config.js)
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

### **Mock Standards**

```typescript
// Service mocking
const mockPrisma = {
  business: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as jest.Mocked<PrismaClient>;

// Event publisher mocking
const mockEventPublisher = {
  publishEvent: jest.fn(),
} as jest.Mocked<EventPublisher>;

// Test setup
beforeEach(() => {
  jest.clearAllMocks();
});
```

```

```
