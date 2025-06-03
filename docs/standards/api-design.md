# API Design Standards

## 🎯 Overview

This document defines REST API design standards for SlotWise microservices to ensure consistency, usability, and maintainability across all service endpoints.

## 🏗️ Core Principles

### 1. RESTful Design
- Use HTTP methods semantically (GET, POST, PUT, PATCH, DELETE)
- Use nouns for resources, not verbs
- Maintain stateless interactions
- Use proper HTTP status codes

### 2. Consistency
- Uniform URL structure across all services
- Consistent request/response formats
- Standardized error handling
- Common authentication patterns

### 3. Developer Experience
- Clear, predictable API behavior
- Comprehensive documentation
- Helpful error messages
- Logical resource relationships

## 🛣️ URL Structure Standards

### 1. Base URL Pattern
```
https://api.slotwise.com/v1/{service}/{resource}
```

### 2. Resource Naming
- Use plural nouns for collections: `/users`, `/bookings`, `/businesses`
- Use singular nouns for single resources: `/user/{id}`, `/booking/{id}`
- Use kebab-case for multi-word resources: `/booking-slots`, `/service-categories`

### 3. URL Examples
```
✅ Correct
GET    /api/v1/users                    # List users
GET    /api/v1/users/{id}               # Get specific user
POST   /api/v1/users                    # Create user
PUT    /api/v1/users/{id}               # Update user (full)
PATCH  /api/v1/users/{id}               # Update user (partial)
DELETE /api/v1/users/{id}               # Delete user

GET    /api/v1/users/{id}/bookings      # Get user's bookings
POST   /api/v1/bookings                 # Create booking
PUT    /api/v1/bookings/{id}/status     # Update booking status

❌ Incorrect
GET    /api/v1/getUsers                 # Don't use verbs
POST   /api/v1/user                     # Use plural for collections
GET    /api/v1/users/{id}/getBookings   # Don't use verbs in paths
```

## 📝 Request/Response Standards

### 1. Request Format
```json
{
  "data": {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "metadata": {
    "requestId": "req_123456789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Response Format
```json
{
  "data": {
    "id": "user_123456789",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "metadata": {
    "requestId": "req_123456789",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "v1"
  }
}
```

### 3. Collection Response Format
```json
{
  "data": [
    {
      "id": "user_123456789",
      "email": "user1@example.com",
      "firstName": "John"
    },
    {
      "id": "user_987654321",
      "email": "user2@example.com",
      "firstName": "Jane"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "metadata": {
    "requestId": "req_123456789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 🔢 HTTP Status Codes

### 1. Success Codes
- `200 OK` - Successful GET, PUT, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `206 Partial Content` - Partial response (pagination)

### 2. Client Error Codes
- `400 Bad Request` - Invalid request format/data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Resource conflict (duplicate email)
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded

### 3. Server Error Codes
- `500 Internal Server Error` - Unexpected server error
- `502 Bad Gateway` - Upstream service error
- `503 Service Unavailable` - Service temporarily down
- `504 Gateway Timeout` - Upstream service timeout

## ❌ Error Response Standards

### 1. Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email must be a valid email address"
      },
      {
        "field": "password",
        "code": "TOO_SHORT",
        "message": "Password must be at least 8 characters"
      }
    ]
  },
  "metadata": {
    "requestId": "req_123456789",
    "timestamp": "2024-01-15T10:30:00Z",
    "traceId": "trace_abc123"
  }
}
```

### 2. Error Codes
```go
// Standard error codes
const (
    ErrCodeValidation     = "VALIDATION_ERROR"
    ErrCodeNotFound       = "NOT_FOUND"
    ErrCodeUnauthorized   = "UNAUTHORIZED"
    ErrCodeForbidden      = "FORBIDDEN"
    ErrCodeConflict       = "CONFLICT"
    ErrCodeRateLimit      = "RATE_LIMIT_EXCEEDED"
    ErrCodeInternal       = "INTERNAL_ERROR"
    ErrCodeServiceDown    = "SERVICE_UNAVAILABLE"
)
```

## 🔍 Query Parameters

### 1. Filtering
```
GET /api/v1/bookings?status=confirmed&date=2024-01-15
GET /api/v1/users?role=business_owner&status=active
```

### 2. Sorting
```
GET /api/v1/bookings?sort=createdAt:desc
GET /api/v1/users?sort=lastName:asc,firstName:asc
```

### 3. Pagination
```
GET /api/v1/bookings?page=2&limit=20
GET /api/v1/users?offset=40&limit=20
```

### 4. Field Selection
```
GET /api/v1/users?fields=id,email,firstName
GET /api/v1/bookings?include=user,service
```

## 🔐 Authentication & Authorization

### 1. Authentication Header
```
Authorization: Bearer <jwt_token>
```

### 2. API Key (for service-to-service)
```
X-API-Key: <api_key>
```

### 3. Request ID Tracking
```
X-Request-ID: req_123456789
```

## 📊 Pagination Standards

### 1. Cursor-based Pagination (Recommended)
```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6IjEyMyIsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMTUifQ==",
    "hasNext": true,
    "limit": 20
  }
}
```

### 2. Offset-based Pagination
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## 🏷️ Versioning Strategy

### 1. URL Versioning (Current)
```
/api/v1/users
/api/v2/users
```

### 2. Header Versioning (Future)
```
Accept: application/vnd.slotwise.v1+json
```

### 3. Version Compatibility
- Maintain backward compatibility within major versions
- Deprecate endpoints with proper notice
- Provide migration guides for breaking changes

## 🔄 CRUD Operations

### 1. Create Resource
```http
POST /api/v1/users
Content-Type: application/json

{
  "data": {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}

Response: 201 Created
{
  "data": {
    "id": "user_123456789",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Read Resource
```http
GET /api/v1/users/user_123456789

Response: 200 OK
{
  "data": {
    "id": "user_123456789",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### 3. Update Resource (Full)
```http
PUT /api/v1/users/user_123456789
Content-Type: application/json

{
  "data": {
    "email": "newemail@example.com",
    "firstName": "John",
    "lastName": "Smith"
  }
}

Response: 200 OK
```

### 4. Update Resource (Partial)
```http
PATCH /api/v1/users/user_123456789
Content-Type: application/json

{
  "data": {
    "lastName": "Smith"
  }
}

Response: 200 OK
```

### 5. Delete Resource
```http
DELETE /api/v1/users/user_123456789

Response: 204 No Content
```

## 🎯 Go Implementation Standards

### 1. Handler Structure
```go
type UserHandler struct {
    service UserService
    logger  logger.Logger
}

func (h *UserHandler) CreateUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        h.handleValidationError(c, err)
        return
    }
    
    user, err := h.service.CreateUser(c.Request.Context(), req)
    if err != nil {
        h.handleServiceError(c, err)
        return
    }
    
    response := APIResponse{
        Data: user,
        Metadata: ResponseMetadata{
            RequestID: c.GetString("requestId"),
            Timestamp: time.Now(),
        },
    }
    
    c.JSON(http.StatusCreated, response)
}
```

### 2. Request/Response DTOs
```go
type CreateUserRequest struct {
    Email     string `json:"email" binding:"required,email"`
    FirstName string `json:"firstName" binding:"required,min=1,max=50"`
    LastName  string `json:"lastName" binding:"required,min=1,max=50"`
    Password  string `json:"password" binding:"required,min=8"`
}

type UserResponse struct {
    ID        string    `json:"id"`
    Email     string    `json:"email"`
    FirstName string    `json:"firstName"`
    LastName  string    `json:"lastName"`
    CreatedAt time.Time `json:"createdAt"`
}
```

## 📚 Documentation Standards

### 1. OpenAPI/Swagger
- Document all endpoints with OpenAPI 3.0
- Include request/response examples
- Document error responses
- Provide authentication details

### 2. Code Comments
```go
// CreateUser creates a new user account
// @Summary Create user
// @Description Create a new user account with email verification
// @Tags users
// @Accept json
// @Produce json
// @Param request body CreateUserRequest true "User creation data"
// @Success 201 {object} APIResponse{data=UserResponse}
// @Failure 400 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Router /api/v1/users [post]
func (h *UserHandler) CreateUser(c *gin.Context) {
    // Implementation
}
```

## 🧪 Testing Standards

### 1. Handler Tests
```go
func TestUserHandler_CreateUser_ValidRequest_ReturnsCreated(t *testing.T) {
    // Arrange
    mockService := &MockUserService{}
    handler := NewUserHandler(mockService, logger.New("test"))
    
    reqBody := CreateUserRequest{
        Email:     "test@example.com",
        FirstName: "Test",
        LastName:  "User",
        Password:  "password123",
    }
    body, _ := json.Marshal(APIRequest{Data: reqBody})
    
    // Act
    req := httptest.NewRequest(http.MethodPost, "/api/v1/users", bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    rr := httptest.NewRecorder()
    
    router := gin.New()
    router.POST("/api/v1/users", handler.CreateUser)
    router.ServeHTTP(rr, req)
    
    // Assert
    assert.Equal(t, http.StatusCreated, rr.Code)
    
    var response APIResponse
    err := json.Unmarshal(rr.Body.Bytes(), &response)
    assert.NoError(t, err)
    assert.NotEmpty(t, response.Data)
}
```

## 📊 Performance Standards

### 1. Response Time Targets
- **Simple queries**: < 100ms
- **Complex queries**: < 500ms
- **File uploads**: < 2s
- **Bulk operations**: < 5s

### 2. Rate Limiting
```go
// Rate limiting configuration
const (
    RateLimitPerMinute = 60
    RateLimitBurst     = 10
)
```

## 🔧 Tools and Validation

- **Gin**: HTTP framework
- **Validator**: Request validation
- **Swagger**: API documentation
- **Postman**: API testing
- **Newman**: Automated API testing
