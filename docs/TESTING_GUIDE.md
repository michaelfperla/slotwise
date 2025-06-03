# Testing Guide

This guide covers the testing strategy and practices for the SlotWise platform.

## 🎯 Testing Philosophy

Our testing strategy prioritizes:
- **Team Confidence**: Tests should give developers confidence to make changes
- **Business Logic Protection**: Critical booking and scheduling logic is thoroughly tested
- **Fast Feedback**: Tests run quickly and provide immediate feedback
- **Maintainability**: Tests are easy to understand and maintain

## 🏗️ Testing Architecture

### Test Types

1. **Unit Tests**: Test individual functions and components in isolation
2. **Integration Tests**: Test service interactions and database operations
3. **End-to-End Tests**: Test complete user workflows (planned)

### Test Structure by Service

```
services/
├── auth-service/           # Go service
│   └── internal/
│       └── handlers/
│           └── *_test.go   # HTTP handler tests
├── business-service/       # Node.js service
│   └── src/
│       └── __tests__/      # Jest tests
├── scheduling-service/     # Go service
│   └── internal/
│       └── service/
│           └── *_test.go   # Business logic tests
└── notification-service/   # Node.js service
    └── src/
        └── __tests__/      # Jest tests
```

## 🚀 Running Tests

### Local Development

```bash
# Run all tests
npm run test

# Run tests for specific service
npx nx run @slotwise/scheduling-service:test
npx nx run @slotwise/business-service:test

# Run tests in watch mode (Node.js services)
cd services/business-service && npm run test:watch

# Run integration tests
npm run test:integration
```

### CI/CD Pipeline

Tests run automatically on:
- Pull request creation/updates
- Pushes to main branch
- Manual workflow dispatch

## 🗄️ Database Testing

### Test Database Setup

Each service has its own test database:
- `slotwise_auth_test`
- `slotwise_business_test`
- `slotwise_scheduling_test`
- `slotwise_notification_test`

### Environment Variables

```bash
# Local testing
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/slotwise_scheduling_test

# CI testing (automatically set)
AUTH_TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/slotwise_auth_test
BUSINESS_TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/slotwise_business_test
```

### Database Migrations in Tests

- **Go services**: Use GORM AutoMigrate in test setup
- **Node.js services**: Use Prisma migrations

## 📝 Writing Tests

### Go Service Tests (Example: Scheduling Service)

```go
func (suite *BookingServiceTestSuite) TestCreateBooking_Success() {
    // Arrange
    svcDef := models.ServiceDefinition{
        ID: "svc1", 
        BusinessID: "biz1", 
        Name: "Service 1", 
        DurationMinutes: 60, 
        IsActive: true,
    }
    suite.DB.Create(&svcDef)

    // Act
    booking, err := suite.BookingService.CreateBooking(ctx, req)

    // Assert
    assert.NoError(t, err)
    assert.Equal(t, models.BookingStatusPendingPayment, booking.Status)
    
    // Verify database state
    var dbBooking models.Booking
    err = suite.DB.First(&dbBooking, "id = ?", booking.ID).Error
    assert.NoError(t, err)
    
    // Verify events published
    assert.Len(t, suite.MockNatsPublisher.PublishedEvents, 1)
}
```

### Node.js Service Tests (Example: Business Service)

```typescript
describe('Business Service', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it('should create a business successfully', async () => {
    // Arrange
    const businessData = {
      name: 'Test Business',
      email: 'test@example.com'
    };

    // Act
    const result = await businessService.create(businessData);

    // Assert
    expect(result.id).toBeDefined();
    expect(result.name).toBe(businessData.name);
  });
});
```

## 🔧 Test Configuration

### Go Services

Test configuration is handled via environment variables:
- Tests automatically detect CI environment
- Local tests use localhost PostgreSQL
- CI tests use GitHub Actions PostgreSQL service

### Node.js Services

Jest configuration in each service:
```javascript
// jest.config.cjs
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

## 🚨 Test Failures and Debugging

### Common Issues

1. **Database Connection Failures**
   ```bash
   # Check PostgreSQL is running
   pg_isready -h localhost -p 5432
   
   # Setup test environment
   ./scripts/setup-test-environment.sh
   ```

2. **Test Database Not Found**
   ```bash
   # Recreate test databases
   ./scripts/setup-test-environment.sh
   ```

3. **Prisma Client Issues**
   ```bash
   # Regenerate Prisma clients
   cd services/business-service && npx prisma generate
   ```

### Debugging Tests

```bash
# Run tests with verbose output
npm run test -- --verbose

# Run specific test file
npx jest services/business-service/src/__tests__/config.test.ts

# Debug Go tests
cd services/scheduling-service && go test -v ./internal/service/
```

## 📊 Test Coverage

### Current Coverage

- **Scheduling Service**: Comprehensive booking logic tests
- **Business Service**: Basic configuration and integration tests
- **Auth Service**: Handler tests (in development)
- **Notification Service**: Basic tests (in development)

### Coverage Goals

- **Critical Business Logic**: 90%+ coverage
- **API Endpoints**: 80%+ coverage
- **Configuration**: 70%+ coverage

## 🔄 Continuous Integration

### GitHub Actions Workflow

1. **Setup**: Install dependencies, setup databases
2. **Lint**: Code formatting and style checks
3. **Build**: Compile TypeScript, build Go binaries
4. **Test**: Run unit and integration tests
5. **Security**: Vulnerability scanning

### Test Environment

- **PostgreSQL 15**: Test database service
- **Redis**: Caching service for integration tests
- **NATS**: Event streaming for integration tests

## 🎯 Best Practices

### Test Organization

1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test names explain what is being tested
3. **Independent Tests**: Each test can run in isolation
4. **Clean Setup/Teardown**: Consistent test environment

### Mock Strategy

- **External Services**: Always mocked (NATS, Redis, external APIs)
- **Database**: Real database for integration tests
- **Time**: Mock time-dependent operations

### Test Data

- **Factories**: Use test data factories for consistent setup
- **Cleanup**: Always clean up test data between tests
- **Isolation**: Tests don't depend on each other's data

## 🚀 Future Improvements

1. **End-to-End Tests**: Full user workflow testing
2. **Performance Tests**: Load testing for booking endpoints
3. **Contract Tests**: API contract validation
4. **Visual Regression**: Frontend component testing
