# Code Quality Standards

## 🎯 Overview

This document defines comprehensive code quality standards for SlotWise, ensuring consistent, maintainable, and high-quality code across all services and technologies.

## 🏗️ General Principles

### 1. Clean Code Principles
- **Readability**: Code should be self-documenting and easy to understand
- **Simplicity**: Prefer simple solutions over complex ones
- **Consistency**: Follow established patterns and conventions
- **Testability**: Write code that is easy to test
- **Maintainability**: Consider future developers who will work with the code

### 2. SOLID Principles
- **Single Responsibility**: Each class/function should have one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Subtypes must be substitutable for their base types
- **Interface Segregation**: Clients shouldn't depend on interfaces they don't use
- **Dependency Inversion**: Depend on abstractions, not concretions

## 🔧 Language-Specific Standards

### Go Standards

#### 1. Formatting and Style
```go
// ✅ Correct - Use gofmt formatting
func CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
    if err := validateRequest(req); err != nil {
        return nil, fmt.Errorf("invalid request: %w", err)
    }
    
    user := &User{
        Email:     req.Email,
        FirstName: req.FirstName,
        LastName:  req.LastName,
    }
    
    return user, nil
}

// ❌ Incorrect - Poor formatting and naming
func createuser(r CreateUserRequest) (*User,error){
if r.Email=="" {
return nil,errors.New("email required")
}
u:=&User{Email:r.Email,FirstName:r.FirstName}
return u,nil
}
```

#### 2. Error Handling
```go
// ✅ Correct - Wrap errors with context
func (s *userService) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
    if err := s.validator.Validate(req); err != nil {
        return nil, fmt.Errorf("validation failed: %w", err)
    }
    
    user, err := s.repo.Create(ctx, req)
    if err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }
    
    return user, nil
}

// ❌ Incorrect - Swallow errors or poor error messages
func (s *userService) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
    s.validator.Validate(req) // Ignoring error
    
    user, err := s.repo.Create(ctx, req)
    if err != nil {
        return nil, errors.New("error") // Vague error message
    }
    
    return user, nil
}
```

#### 3. Interface Design
```go
// ✅ Correct - Small, focused interfaces
type UserRepository interface {
    Create(ctx context.Context, user *User) error
    GetByID(ctx context.Context, id string) (*User, error)
    GetByEmail(ctx context.Context, email string) (*User, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
}

type UserValidator interface {
    Validate(user *User) error
}

// ❌ Incorrect - Large, unfocused interface
type UserManager interface {
    Create(ctx context.Context, user *User) error
    GetByID(ctx context.Context, id string) (*User, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
    SendEmail(to, subject, body string) error
    LogActivity(userID, action string) error
    ValidatePermissions(userID, resource string) bool
}
```

#### 4. Struct Design
```go
// ✅ Correct - Clear field tags and validation
type User struct {
    ID        string    `gorm:"type:uuid;primary_key;" json:"id"`
    Email     string    `gorm:"type:text;not null;unique" json:"email" validate:"required,email"`
    FirstName string    `gorm:"type:text;not null" json:"firstName" validate:"required,min=1,max=50"`
    LastName  string    `gorm:"type:text;not null" json:"lastName" validate:"required,min=1,max=50"`
    CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"createdAt"`
    UpdatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updatedAt"`
}

// ❌ Incorrect - Missing tags and validation
type User struct {
    ID        string
    Email     string
    FirstName string
    LastName  string
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

### TypeScript/JavaScript Standards

#### 1. Type Safety
```typescript
// ✅ Correct - Explicit types and interfaces
interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

async function createUser(req: CreateUserRequest): Promise<User> {
  const response = await fetch('/api/v1/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create user: ${response.statusText}`);
  }
  
  return response.json() as User;
}

// ❌ Incorrect - Using any and no type safety
async function createUser(req: any): Promise<any> {
  const response = await fetch('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(req),
  });
  
  return response.json();
}
```

#### 2. React Component Standards
```tsx
// ✅ Correct - Functional component with proper types
interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete }) => {
  const handleEdit = useCallback(() => {
    onEdit(user);
  }, [user, onEdit]);
  
  const handleDelete = useCallback(() => {
    onDelete(user.id);
  }, [user.id, onDelete]);
  
  return (
    <div className="user-card">
      <h3>{user.firstName} {user.lastName}</h3>
      <p>{user.email}</p>
      <button onClick={handleEdit}>Edit</button>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
};

// ❌ Incorrect - Class component with poor practices
class UserCard extends React.Component {
  render() {
    return (
      <div>
        <h3>{this.props.user.firstName} {this.props.user.lastName}</h3>
        <p>{this.props.user.email}</p>
        <button onClick={() => this.props.onEdit(this.props.user)}>Edit</button>
        <button onClick={() => this.props.onDelete(this.props.user.id)}>Delete</button>
      </div>
    );
  }
}
```

## 📏 Naming Conventions

### 1. Variables and Functions
```go
// ✅ Correct - Descriptive names
var userRepository UserRepository
var maxRetryAttempts = 3
var isEmailVerified bool

func calculateTotalAmount(items []Item) decimal.Decimal {}
func validateEmailAddress(email string) error {}

// ❌ Incorrect - Unclear abbreviations
var ur UserRepository
var max = 3
var flag bool

func calc(items []Item) decimal.Decimal {}
func validate(email string) error {}
```

### 2. Constants
```go
// ✅ Correct - Clear constant naming
const (
    DefaultPageSize     = 20
    MaxPageSize         = 100
    TokenExpiryDuration = 24 * time.Hour
    
    StatusActive   = "active"
    StatusInactive = "inactive"
    StatusPending  = "pending"
)

// ❌ Incorrect - Unclear constants
const (
    PAGE_SIZE = 20
    MAX       = 100
    DURATION  = 24
    
    ACTIVE = "active"
    INACTIVE = "inactive"
)
```

### 3. File and Package Names
```
✅ Correct
- user_service.go
- booking_handler.go
- email_validator.go
- internal/repository/
- internal/service/
- pkg/logger/

❌ Incorrect
- UserService.go
- bookingHandler.go
- emailvalidator.go
- internal/Repository/
- internal/Services/
- pkg/Logger/
```

## 📝 Documentation Standards

### 1. Code Comments
```go
// ✅ Correct - Meaningful comments
// UserService handles user-related business operations including
// registration, authentication, and profile management.
type UserService interface {
    // CreateUser creates a new user account with email verification.
    // Returns ErrDuplicateEmail if email already exists.
    CreateUser(ctx context.Context, req CreateUserRequest) (*User, error)
    
    // GetUser retrieves a user by ID.
    // Returns ErrUserNotFound if user doesn't exist.
    GetUser(ctx context.Context, id string) (*User, error)
}

// calculateDiscountAmount determines the discount amount based on
// the user's membership tier and the total order value.
func calculateDiscountAmount(user *User, orderTotal decimal.Decimal) decimal.Decimal {
    // Premium members get 15% discount on orders over $100
    if user.MembershipTier == TierPremium && orderTotal.GreaterThan(decimal.NewFromInt(100)) {
        return orderTotal.Mul(decimal.NewFromFloat(0.15))
    }
    
    // Regular members get 5% discount on orders over $50
    if user.MembershipTier == TierRegular && orderTotal.GreaterThan(decimal.NewFromInt(50)) {
        return orderTotal.Mul(decimal.NewFromFloat(0.05))
    }
    
    return decimal.Zero
}

// ❌ Incorrect - Useless or outdated comments
// UserService is a service for users
type UserService interface {
    CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) // creates user
}

// This function calculates something
func calculateDiscountAmount(user *User, orderTotal decimal.Decimal) decimal.Decimal {
    // TODO: implement this later
    return decimal.Zero
}
```

### 2. README Documentation
```markdown
# Service Name

Brief description of what this service does.

## Features

- Feature 1
- Feature 2
- Feature 3

## API Endpoints

### Create User
```http
POST /api/v1/users
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 8080 |
| DB_URL | Database URL | - |

## Development

```bash
# Install dependencies
go mod download

# Run tests
go test ./...

# Start server
go run cmd/server/main.go
```
```

## 🧪 Testing Standards

### 1. Test Organization
```go
// ✅ Correct - Clear test structure
func TestUserService_CreateUser(t *testing.T) {
    tests := []struct {
        name        string
        request     CreateUserRequest
        setupMocks  func(*MockUserRepository)
        expectedErr string
    }{
        {
            name: "valid request creates user successfully",
            request: CreateUserRequest{
                Email:     "test@example.com",
                FirstName: "John",
                LastName:  "Doe",
            },
            setupMocks: func(repo *MockUserRepository) {
                repo.On("Create", mock.Anything, mock.AnythingOfType("*User")).Return(nil)
            },
            expectedErr: "",
        },
        {
            name: "duplicate email returns error",
            request: CreateUserRequest{
                Email:     "existing@example.com",
                FirstName: "John",
                LastName:  "Doe",
            },
            setupMocks: func(repo *MockUserRepository) {
                repo.On("Create", mock.Anything, mock.AnythingOfType("*User")).Return(ErrDuplicateEmail)
            },
            expectedErr: "duplicate email",
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Arrange
            mockRepo := &MockUserRepository{}
            tt.setupMocks(mockRepo)
            service := NewUserService(mockRepo)
            
            // Act
            user, err := service.CreateUser(context.Background(), tt.request)
            
            // Assert
            if tt.expectedErr != "" {
                assert.Error(t, err)
                assert.Contains(t, err.Error(), tt.expectedErr)
                assert.Nil(t, user)
            } else {
                assert.NoError(t, err)
                assert.NotNil(t, user)
                assert.NotEmpty(t, user.ID)
            }
            
            mockRepo.AssertExpectations(t)
        })
    }
}
```

### 2. Test Data Management
```go
// ✅ Correct - Use test factories
func TestUserFactory() *User {
    return &User{
        ID:        uuid.New().String(),
        Email:     fmt.Sprintf("test-%s@example.com", uuid.New().String()[:8]),
        FirstName: "Test",
        LastName:  "User",
        CreatedAt: time.Now(),
    }
}

func TestUserFactoryWithEmail(email string) *User {
    user := TestUserFactory()
    user.Email = email
    return user
}

// Usage in tests
func TestSomething(t *testing.T) {
    user := TestUserFactory()
    // Test with factory-created user
}
```

## 🔍 Code Review Standards

### 1. Review Checklist
- [ ] Code follows established conventions
- [ ] Functions are small and focused
- [ ] Error handling is comprehensive
- [ ] Tests cover happy path and edge cases
- [ ] Documentation is clear and up-to-date
- [ ] No hardcoded values or magic numbers
- [ ] Security considerations addressed
- [ ] Performance implications considered

### 2. Review Comments
```
✅ Good review comments:
- "Consider extracting this logic into a separate function for better testability"
- "This could cause a race condition. Consider using a mutex here"
- "The error message could be more descriptive for better debugging"

❌ Poor review comments:
- "This is wrong"
- "Fix this"
- "Bad code"
```

## 🛠️ Tooling and Automation

### 1. Go Tools
```yaml
# .golangci.yml
linters:
  enable:
    - gofmt
    - goimports
    - govet
    - golint
    - ineffassign
    - misspell
    - errcheck
    - staticcheck
    - unused
    - gosimple
    - structcheck
    - varcheck
    - deadcode
    - typecheck

linters-settings:
  gofmt:
    simplify: true
  goimports:
    local-prefixes: github.com/slotwise
```

### 2. TypeScript Tools
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### 3. Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: go-fmt
        name: Go Format
        entry: gofmt -l -s -w
        language: system
        files: \.go$
        
      - id: go-imports
        name: Go Imports
        entry: goimports -l -w
        language: system
        files: \.go$
        
      - id: go-vet
        name: Go Vet
        entry: go vet
        language: system
        files: \.go$
        pass_filenames: false
        
      - id: go-test
        name: Go Test
        entry: go test ./...
        language: system
        pass_filenames: false
```

## 📊 Code Quality Metrics

### 1. Coverage Requirements
- **Unit Tests**: Minimum 80% coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Happy path scenarios

### 2. Complexity Limits
- **Cyclomatic Complexity**: Maximum 10 per function
- **Function Length**: Maximum 50 lines
- **File Length**: Maximum 500 lines
- **Parameter Count**: Maximum 5 parameters

### 3. Quality Gates
```yaml
# SonarQube quality gate
coverage: 80%
duplicated_lines_density: 3%
maintainability_rating: A
reliability_rating: A
security_rating: A
```

## 📚 Resources

### Go Resources
- [Effective Go](https://golang.org/doc/effective_go.html)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)

### TypeScript Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [ESLint TypeScript Rules](https://typescript-eslint.io/rules/)

### General Resources
- [Clean Code by Robert Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350884)
- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- [Code Complete by Steve McConnell](https://www.amazon.com/Code-Complete-Practical-Handbook-Construction/dp/0735619670)
