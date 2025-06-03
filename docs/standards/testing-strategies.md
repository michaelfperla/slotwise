# Testing Strategies

## 🎯 Overview

This document defines comprehensive testing strategies for SlotWise
microservices, ensuring reliable, maintainable, and fast test suites across all
services.

## 🏗️ Testing Pyramid

### 1. Unit Tests (70%)

- **Scope**: Individual functions, methods, and components
- **Speed**: Fast (< 1ms per test)
- **Dependencies**: Mocked/stubbed
- **Location**: `*_test.go` files alongside source code

### 2. Integration Tests (20%)

- **Scope**: Service interactions, database operations, external APIs
- **Speed**: Medium (< 100ms per test)
- **Dependencies**: Real database, mocked external services
- **Location**: `internal/*/integration_test.go`

### 3. End-to-End Tests (10%)

- **Scope**: Complete user workflows across services
- **Speed**: Slow (< 5s per test)
- **Dependencies**: Full system with test data
- **Location**: `e2e/` directory

## 🧪 Unit Testing Standards

### 1. Test Structure

Use **Arrange-Act-Assert** pattern:

```go
func TestUserService_CreateUser(t *testing.T) {
    // Arrange
    mockRepo := &MockUserRepository{}
    mockPublisher := &MockEventPublisher{}
    service := NewUserService(mockRepo, mockPublisher, logger.New("test"))

    userReq := CreateUserRequest{
        Email:     "test@example.com",
        FirstName: "Test",
        LastName:  "User",
    }

    // Act
    user, err := service.CreateUser(context.Background(), userReq)

    // Assert
    assert.NoError(t, err)
    assert.Equal(t, userReq.Email, user.Email)
    assert.NotEmpty(t, user.ID)
    mockRepo.AssertExpectations(t)
}
```

### 2. Test Naming Convention

```go
// Pattern: TestFunction_Scenario_ExpectedBehavior
func TestUserService_CreateUser_WithValidData_ReturnsUser(t *testing.T) {}
func TestUserService_CreateUser_WithDuplicateEmail_ReturnsError(t *testing.T) {}
func TestUserService_CreateUser_WithInvalidEmail_ReturnsValidationError(t *testing.T) {}
```

### 3. Table-Driven Tests

For multiple scenarios:

```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name     string
        email    string
        expected bool
    }{
        {"valid email", "user@example.com", true},
        {"invalid email", "invalid-email", false},
        {"empty email", "", false},
        {"email with spaces", " user@example.com ", false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := ValidateEmail(tt.email)
            assert.Equal(t, tt.expected, result)
        })
    }
}
```

### 4. Mock Standards

Use testify/mock for consistent mocking:

```go
type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) Create(ctx context.Context, user *User) error {
    args := m.Called(ctx, user)
    return args.Error(0)
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
    args := m.Called(ctx, email)
    return args.Get(0).(*User), args.Error(1)
}
```

## 🔗 Integration Testing Standards

### 1. Database Integration Tests

Use real PostgreSQL with test database:

```go
type UserRepositoryIntegrationTest struct {
    suite.Suite
    DB   *gorm.DB
    Repo *UserRepository
}

func (suite *UserRepositoryIntegrationTest) SetupSuite() {
    // Connect to test database
    dsn := "host=localhost user=postgres password=postgres dbname=slotwise_test port=5432 sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    suite.Require().NoError(err)

    // Create tables manually to avoid circular dependencies
    suite.createTestTables(db)

    suite.DB = db
    suite.Repo = NewUserRepository(db)
}

func (suite *UserRepositoryIntegrationTest) SetupTest() {
    // Clean database before each test
    suite.DB.Exec("TRUNCATE TABLE users CASCADE")
}

func (suite *UserRepositoryIntegrationTest) TestCreate_ValidUser_Success() {
    // Arrange
    user := &User{
        Email:     "test@example.com",
        FirstName: "Test",
        LastName:  "User",
    }

    // Act
    err := suite.Repo.Create(context.Background(), user)

    // Assert
    suite.NoError(err)
    suite.NotEmpty(user.ID)

    // Verify in database
    var dbUser User
    err = suite.DB.Where("email = ?", user.Email).First(&dbUser).Error
    suite.NoError(err)
    suite.Equal(user.Email, dbUser.Email)
}
```

### 2. HTTP Handler Integration Tests

Test complete HTTP request/response cycle:

```go
type AuthHandlerIntegrationTest struct {
    suite.Suite
    Router *gin.Engine
    DB     *gorm.DB
}

func (suite *AuthHandlerIntegrationTest) TestRegister_ValidRequest_ReturnsCreated() {
    // Arrange
    reqBody := RegisterRequest{
        Email:     "test@example.com",
        Password:  "Password123!",
        FirstName: "Test",
        LastName:  "User",
    }
    body, _ := json.Marshal(reqBody)

    // Act
    req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()
    suite.Router.ServeHTTP(rr, req)

    // Assert
    suite.Equal(http.StatusCreated, rr.Code)

    var response RegisterResponse
    err := json.Unmarshal(rr.Body.Bytes(), &response)
    suite.NoError(err)
    suite.NotEmpty(response.UserID)
}
```

## 🌐 End-to-End Testing Standards

### 1. Test Environment Setup

```yaml
# docker-compose.e2e.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: slotwise_e2e
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  redis:
    image: redis:7-alpine

  nats:
    image: nats:2.9-alpine
```

### 2. E2E Test Structure

```go
func TestCompleteBookingFlow(t *testing.T) {
    // Setup test environment
    env := setupE2EEnvironment(t)
    defer env.Cleanup()

    // Test complete user journey
    t.Run("User Registration", func(t *testing.T) {
        user := env.RegisterUser("customer@example.com", "password123")
        assert.NotEmpty(t, user.ID)
    })

    t.Run("Business Owner Registration", func(t *testing.T) {
        owner := env.RegisterBusinessOwner("owner@example.com", "password123", "Test Business")
        assert.NotEmpty(t, owner.BusinessID)
    })

    t.Run("Service Creation", func(t *testing.T) {
        service := env.CreateService(owner.BusinessID, "Consultation", 60, 10000)
        assert.NotEmpty(t, service.ID)
    })

    t.Run("Booking Creation", func(t *testing.T) {
        booking := env.CreateBooking(user.ID, service.ID, time.Now().Add(24*time.Hour))
        assert.Equal(t, "pending_payment", booking.Status)
    })

    t.Run("Payment Processing", func(t *testing.T) {
        payment := env.ProcessPayment(booking.ID, "card_token_123")
        assert.Equal(t, "completed", payment.Status)

        // Verify booking is confirmed
        updatedBooking := env.GetBooking(booking.ID)
        assert.Equal(t, "confirmed", updatedBooking.Status)
    })
}
```

## 🏭 Test Data Management

### 1. Factory Pattern

Create reusable test data factories:

```go
// pkg/testing/factories.go
package testing

import (
    "fmt"
    "time"
    "github.com/google/uuid"
)

type UserFactory struct {
    email     string
    firstName string
    lastName  string
    role      UserRole
    status    UserStatus
}

func NewUserFactory() *UserFactory {
    return &UserFactory{
        email:     fmt.Sprintf("test-%s@example.com", uuid.New().String()[:8]),
        firstName: "Test",
        lastName:  "User",
        role:      RoleClient,
        status:    StatusActive,
    }
}

func (f *UserFactory) WithEmail(email string) *UserFactory {
    f.email = email
    return f
}

func (f *UserFactory) WithRole(role UserRole) *UserFactory {
    f.role = role
    return f
}

func (f *UserFactory) Build() *User {
    return &User{
        Email:     f.email,
        FirstName: f.firstName,
        LastName:  f.lastName,
        Role:      f.role,
        Status:    f.status,
        Timezone:  "UTC",
    }
}

// Usage in tests
func TestUserService_CreateUser(t *testing.T) {
    user := testing.NewUserFactory().
        WithEmail("specific@example.com").
        WithRole(RoleBusinessOwner).
        Build()

    // Test with factory-created user
}
```

### 2. Database Fixtures

For complex test scenarios:

```go
type TestFixtures struct {
    Users      map[string]*User
    Businesses map[string]*Business
    Services   map[string]*Service
}

func LoadFixtures(db *gorm.DB) *TestFixtures {
    fixtures := &TestFixtures{
        Users:      make(map[string]*User),
        Businesses: make(map[string]*Business),
        Services:   make(map[string]*Service),
    }

    // Create test users
    fixtures.Users["customer"] = testing.NewUserFactory().
        WithEmail("customer@example.com").
        Build()
    db.Create(fixtures.Users["customer"])

    fixtures.Users["owner"] = testing.NewUserFactory().
        WithEmail("owner@example.com").
        WithRole(RoleBusinessOwner).
        Build()
    db.Create(fixtures.Users["owner"])

    // Create test business
    fixtures.Businesses["salon"] = &Business{
        OwnerID: fixtures.Users["owner"].ID,
        Name:    "Test Salon",
    }
    db.Create(fixtures.Businesses["salon"])

    return fixtures
}
```

## 🚀 Performance Testing

### 1. Benchmark Tests

```go
func BenchmarkUserService_CreateUser(b *testing.B) {
    service := setupUserService()

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        user := testing.NewUserFactory().Build()
        _, err := service.CreateUser(context.Background(), user)
        if err != nil {
            b.Fatal(err)
        }
    }
}
```

### 2. Load Testing

Use tools like k6 for API load testing:

```javascript
// scripts/load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  let response = http.post('http://localhost:8080/api/v1/auth/register', {
    email: `test-${Math.random()}@example.com`,
    password: 'Password123!',
    firstName: 'Load',
    lastName: 'Test',
  });

  check(response, {
    'status is 201': r => r.status === 201,
    'response time < 500ms': r => r.timings.duration < 500,
  });
}
```

## 🔧 Test Automation

### 1. Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: go-test
        name: Go Tests
        entry: go test ./...
        language: system
        pass_filenames: false

      - id: go-test-coverage
        name: Go Test Coverage
        entry: scripts/test-coverage.sh
        language: system
        pass_filenames: false
```

### 2. CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Run Unit Tests
        run: go test -v -race -coverprofile=coverage.out ./...

      - name: Run Integration Tests
        run: go test -v -tags=integration ./...
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.out
```

## 📊 Test Metrics and Reporting

### 1. Coverage Requirements

- **Unit Tests**: Minimum 80% coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Happy path and major error scenarios

### 2. Test Reporting

```bash
# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# Generate test report
go test -json ./... | tee test-report.json
```

## 🛠️ Testing Tools

### Required Tools

- **testify**: Assertions and mocking
- **gorm**: Database testing
- **httptest**: HTTP handler testing
- **dockertest**: Integration testing with Docker

### Recommended Tools

- **k6**: Load testing
- **testcontainers**: Integration testing with real services
- **gomock**: Advanced mocking
- **ginkgo**: BDD-style testing

## 🎯 Testing Checklist

### Before Committing

- [ ] All unit tests pass
- [ ] Integration tests pass for modified services
- [ ] Test coverage meets minimum requirements
- [ ] No hardcoded test data (use factories)
- [ ] Tests are isolated and can run in parallel

### Before Deploying

- [ ] E2E tests pass in staging environment
- [ ] Performance tests show no regressions
- [ ] Database migrations tested with realistic data
- [ ] Error scenarios properly tested

## 📚 Examples

See `examples/testing/` for complete examples of:

- Unit test suites with factories
- Integration test setup patterns
- E2E test scenarios
- Performance benchmarks
- Mock implementations
