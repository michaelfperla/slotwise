# Error Handling Standards

## 🎯 Overview

This document defines comprehensive error handling standards for SlotWise microservices, ensuring consistent, informative, and actionable error responses across all services and client applications.

## 🏗️ Core Principles

### 1. Fail Fast and Fail Safe
- Detect errors as early as possible
- Fail in a predictable and safe manner
- Provide clear error information for debugging
- Never expose sensitive information in errors

### 2. Consistent Error Structure
- Standardized error response format
- Meaningful error codes and messages
- Contextual information for debugging
- Actionable guidance for users

### 3. Proper Error Propagation
- Wrap errors with context
- Maintain error chains for debugging
- Log errors at appropriate levels
- Handle errors at the right abstraction level

## 📋 Error Response Format

### 1. Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email must be a valid email address",
        "value": "invalid-email"
      }
    ],
    "metadata": {
      "timestamp": "2025-06-07T10:30:00Z",
      "path": "/api/v1/users",
      "method": "POST"
    }
  },
  "requestId": "req_123456789",
  "traceId": "trace_abc123def456"
}
```

### 2. Error Structure Definition
```go
type ErrorResponse struct {
    Error     ErrorDetail `json:"error"`
    RequestID string      `json:"requestId"`
    TraceID   string      `json:"traceId,omitempty"`
}

type ErrorDetail struct {
    Code     string            `json:"code"`
    Message  string            `json:"message"`
    Details  []ErrorFieldDetail `json:"details,omitempty"`
    Metadata ErrorMetadata     `json:"metadata"`
}

type ErrorFieldDetail struct {
    Field   string      `json:"field"`
    Code    string      `json:"code"`
    Message string      `json:"message"`
    Value   interface{} `json:"value,omitempty"`
}

type ErrorMetadata struct {
    Timestamp time.Time `json:"timestamp"`
    Path      string    `json:"path"`
    Method    string    `json:"method"`
    Service   string    `json:"service"`
    Version   string    `json:"version"`
}
```

## 🔢 Error Codes and Categories

### 1. Client Error Codes (4xx)
```go
const (
    // Validation Errors (400)
    ErrCodeValidation        = "VALIDATION_ERROR"
    ErrCodeInvalidFormat     = "INVALID_FORMAT"
    ErrCodeMissingField      = "MISSING_FIELD"
    ErrCodeInvalidValue      = "INVALID_VALUE"
    ErrCodeConstraintViolation = "CONSTRAINT_VIOLATION"
    
    // Authentication Errors (401)
    ErrCodeUnauthorized      = "UNAUTHORIZED"
    ErrCodeInvalidToken      = "INVALID_TOKEN"
    ErrCodeTokenExpired      = "TOKEN_EXPIRED"
    ErrCodeInvalidCredentials = "INVALID_CREDENTIALS"
    
    // Authorization Errors (403)
    ErrCodeForbidden         = "FORBIDDEN"
    ErrCodeInsufficientPermissions = "INSUFFICIENT_PERMISSIONS"
    ErrCodeResourceForbidden = "RESOURCE_FORBIDDEN"
    
    // Not Found Errors (404)
    ErrCodeNotFound          = "NOT_FOUND"
    ErrCodeUserNotFound      = "USER_NOT_FOUND"
    ErrCodeBookingNotFound   = "BOOKING_NOT_FOUND"
    ErrCodeBusinessNotFound  = "BUSINESS_NOT_FOUND"
    
    // Conflict Errors (409)
    ErrCodeConflict          = "CONFLICT"
    ErrCodeDuplicateEmail    = "DUPLICATE_EMAIL"
    ErrCodeBookingConflict   = "BOOKING_CONFLICT"
    ErrCodeResourceConflict  = "RESOURCE_CONFLICT"
    
    // Rate Limiting (429)
    ErrCodeRateLimit         = "RATE_LIMIT_EXCEEDED"
    ErrCodeQuotaExceeded     = "QUOTA_EXCEEDED"
)
```

### 2. Server Error Codes (5xx)
```go
const (
    // Internal Server Errors (500)
    ErrCodeInternal          = "INTERNAL_ERROR"
    ErrCodeDatabaseError     = "DATABASE_ERROR"
    ErrCodeExternalService   = "EXTERNAL_SERVICE_ERROR"
    ErrCodeConfigurationError = "CONFIGURATION_ERROR"
    
    // Service Unavailable (503)
    ErrCodeServiceUnavailable = "SERVICE_UNAVAILABLE"
    ErrCodeMaintenanceMode   = "MAINTENANCE_MODE"
    ErrCodeDatabaseUnavailable = "DATABASE_UNAVAILABLE"
    
    // Gateway Errors (502, 504)
    ErrCodeBadGateway        = "BAD_GATEWAY"
    ErrCodeGatewayTimeout    = "GATEWAY_TIMEOUT"
    ErrCodeUpstreamError     = "UPSTREAM_ERROR"
)
```

## 🔧 Go Error Handling Implementation

### 1. Custom Error Types
```go
package errors

import (
    "fmt"
    "net/http"
)

// AppError represents an application-specific error
type AppError struct {
    Code       string                 `json:"code"`
    Message    string                 `json:"message"`
    HTTPStatus int                    `json:"-"`
    Details    []ErrorFieldDetail     `json:"details,omitempty"`
    Cause      error                  `json:"-"`
    Context    map[string]interface{} `json:"-"`
}

func (e *AppError) Error() string {
    if e.Cause != nil {
        return fmt.Sprintf("%s: %v", e.Message, e.Cause)
    }
    return e.Message
}

func (e *AppError) Unwrap() error {
    return e.Cause
}

func (e *AppError) WithContext(key string, value interface{}) *AppError {
    if e.Context == nil {
        e.Context = make(map[string]interface{})
    }
    e.Context[key] = value
    return e
}

func (e *AppError) WithCause(cause error) *AppError {
    e.Cause = cause
    return e
}

// Error constructors
func NewValidationError(message string, details []ErrorFieldDetail) *AppError {
    return &AppError{
        Code:       ErrCodeValidation,
        Message:    message,
        HTTPStatus: http.StatusBadRequest,
        Details:    details,
    }
}

func NewNotFoundError(resource, id string) *AppError {
    return &AppError{
        Code:       ErrCodeNotFound,
        Message:    fmt.Sprintf("%s not found", resource),
        HTTPStatus: http.StatusNotFound,
        Context:    map[string]interface{}{"resource": resource, "id": id},
    }
}

func NewUnauthorizedError(message string) *AppError {
    return &AppError{
        Code:       ErrCodeUnauthorized,
        Message:    message,
        HTTPStatus: http.StatusUnauthorized,
    }
}

func NewForbiddenError(message string) *AppError {
    return &AppError{
        Code:       ErrCodeForbidden,
        Message:    message,
        HTTPStatus: http.StatusForbidden,
    }
}

func NewConflictError(message string) *AppError {
    return &AppError{
        Code:       ErrCodeConflict,
        Message:    message,
        HTTPStatus: http.StatusConflict,
    }
}

func NewInternalError(message string, cause error) *AppError {
    return &AppError{
        Code:       ErrCodeInternal,
        Message:    message,
        HTTPStatus: http.StatusInternalServerError,
        Cause:      cause,
    }
}
```

### 2. Error Handling Middleware
```go
func ErrorHandlingMiddleware(logger logger.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()
        
        // Handle any errors that occurred during request processing
        if len(c.Errors) > 0 {
            err := c.Errors.Last().Err
            handleError(c, err, logger)
        }
    }
}

func handleError(c *gin.Context, err error, logger logger.Logger) {
    requestID := c.GetString("requestId")
    traceID := c.GetString("traceId")
    
    var appErr *AppError
    if errors.As(err, &appErr) {
        // Handle application-specific errors
        logError(logger, appErr, requestID, c.Request)
        
        response := ErrorResponse{
            Error: ErrorDetail{
                Code:    appErr.Code,
                Message: appErr.Message,
                Details: appErr.Details,
                Metadata: ErrorMetadata{
                    Timestamp: time.Now(),
                    Path:      c.Request.URL.Path,
                    Method:    c.Request.Method,
                    Service:   "auth-service", // Should be configurable
                    Version:   "v1",
                },
            },
            RequestID: requestID,
            TraceID:   traceID,
        }
        
        c.JSON(appErr.HTTPStatus, response)
        return
    }
    
    // Handle unexpected errors
    logger.Error("Unexpected error", err,
        logger.Field("requestId", requestID),
        logger.Field("path", c.Request.URL.Path),
        logger.Field("method", c.Request.Method),
    )
    
    response := ErrorResponse{
        Error: ErrorDetail{
            Code:    ErrCodeInternal,
            Message: "An unexpected error occurred",
            Metadata: ErrorMetadata{
                Timestamp: time.Now(),
                Path:      c.Request.URL.Path,
                Method:    c.Request.Method,
                Service:   "auth-service",
                Version:   "v1",
            },
        },
        RequestID: requestID,
        TraceID:   traceID,
    }
    
    c.JSON(http.StatusInternalServerError, response)
}

func logError(logger logger.Logger, err *AppError, requestID string, req *http.Request) {
    level := logger.Error
    if err.HTTPStatus < 500 {
        level = logger.Warn
    }
    
    fields := []logger.Field{
        logger.Field("errorCode", err.Code),
        logger.Field("httpStatus", err.HTTPStatus),
        logger.Field("requestId", requestID),
        logger.Field("path", req.URL.Path),
        logger.Field("method", req.Method),
    }
    
    // Add context fields
    for key, value := range err.Context {
        fields = append(fields, logger.Field(key, value))
    }
    
    level(err.Message, err.Cause, fields...)
}
```

### 3. Service Layer Error Handling
```go
func (s *userService) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
    // Validate request
    if err := s.validator.Validate(req); err != nil {
        var details []ErrorFieldDetail
        for _, fieldErr := range err.(validator.ValidationErrors) {
            details = append(details, ErrorFieldDetail{
                Field:   fieldErr.Field(),
                Code:    getValidationErrorCode(fieldErr.Tag()),
                Message: getValidationErrorMessage(fieldErr),
                Value:   fieldErr.Value(),
            })
        }
        return nil, NewValidationError("Invalid user data", details)
    }
    
    // Check for duplicate email
    existingUser, err := s.repo.GetByEmail(ctx, req.Email)
    if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, NewInternalError("Failed to check email uniqueness", err).
            WithContext("email", req.Email)
    }
    if existingUser != nil {
        return nil, NewConflictError("Email address already exists").
            WithContext("email", req.Email)
    }
    
    // Hash password
    hashedPassword, err := s.hasher.Hash(req.Password)
    if err != nil {
        return nil, NewInternalError("Failed to hash password", err)
    }
    
    // Create user
    user := &User{
        Email:        req.Email,
        PasswordHash: hashedPassword,
        FirstName:    req.FirstName,
        LastName:     req.LastName,
        Role:         RoleClient,
        Status:       StatusPendingVerification,
    }
    
    if err := s.repo.Create(ctx, user); err != nil {
        return nil, NewInternalError("Failed to create user", err).
            WithContext("email", req.Email)
    }
    
    return user, nil
}
```

### 4. Repository Layer Error Handling
```go
func (r *userRepository) Create(ctx context.Context, user *User) error {
    if err := r.db.WithContext(ctx).Create(user).Error; err != nil {
        // Handle specific database errors
        if isDuplicateKeyError(err) {
            return NewConflictError("User already exists")
        }
        if isConnectionError(err) {
            return NewInternalError("Database connection failed", err)
        }
        return NewInternalError("Failed to create user", err)
    }
    return nil
}

func (r *userRepository) GetByID(ctx context.Context, id string) (*User, error) {
    var user User
    err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, NewNotFoundError("User", id)
        }
        return nil, NewInternalError("Failed to get user", err).
            WithContext("userId", id)
    }
    return &user, nil
}

func isDuplicateKeyError(err error) bool {
    // PostgreSQL duplicate key error
    return strings.Contains(err.Error(), "duplicate key value violates unique constraint")
}

func isConnectionError(err error) bool {
    return strings.Contains(err.Error(), "connection refused") ||
           strings.Contains(err.Error(), "connection timeout")
}
```

## 🔍 Error Monitoring and Alerting

### 1. Error Metrics
```go
import "github.com/prometheus/client_golang/prometheus"

var (
    errorCounter = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_errors_total",
            Help: "Total number of HTTP errors",
        },
        []string{"service", "endpoint", "error_code", "status_code"},
    )
    
    errorDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "error_handling_duration_seconds",
            Help: "Time spent handling errors",
        },
        []string{"service", "error_code"},
    )
)

func recordErrorMetrics(service, endpoint, errorCode string, statusCode int) {
    errorCounter.WithLabelValues(service, endpoint, errorCode, fmt.Sprintf("%d", statusCode)).Inc()
}
```

### 2. Error Aggregation
```go
type ErrorAggregator struct {
    errors map[string]*ErrorStats
    mu     sync.RWMutex
}

type ErrorStats struct {
    Count       int64     `json:"count"`
    LastSeen    time.Time `json:"last_seen"`
    FirstSeen   time.Time `json:"first_seen"`
    ErrorCode   string    `json:"error_code"`
    Message     string    `json:"message"`
    Occurrences []ErrorOccurrence `json:"recent_occurrences"`
}

type ErrorOccurrence struct {
    Timestamp time.Time `json:"timestamp"`
    RequestID string    `json:"request_id"`
    UserID    string    `json:"user_id,omitempty"`
    Context   map[string]interface{} `json:"context,omitempty"`
}

func (ea *ErrorAggregator) RecordError(err *AppError, requestID, userID string) {
    ea.mu.Lock()
    defer ea.mu.Unlock()
    
    key := fmt.Sprintf("%s:%s", err.Code, err.Message)
    stats, exists := ea.errors[key]
    if !exists {
        stats = &ErrorStats{
            ErrorCode: err.Code,
            Message:   err.Message,
            FirstSeen: time.Now(),
        }
        ea.errors[key] = stats
    }
    
    stats.Count++
    stats.LastSeen = time.Now()
    
    // Keep only recent occurrences
    occurrence := ErrorOccurrence{
        Timestamp: time.Now(),
        RequestID: requestID,
        UserID:    userID,
        Context:   err.Context,
    }
    
    stats.Occurrences = append(stats.Occurrences, occurrence)
    if len(stats.Occurrences) > 10 {
        stats.Occurrences = stats.Occurrences[1:]
    }
}
```

## 🧪 Error Testing Patterns

### 1. Error Testing
```go
func TestUserService_CreateUser_DuplicateEmail_ReturnsConflictError(t *testing.T) {
    // Arrange
    mockRepo := &MockUserRepository{}
    service := NewUserService(mockRepo, &MockValidator{}, &MockHasher{})
    
    existingUser := &User{ID: "existing-id", Email: "test@example.com"}
    mockRepo.On("GetByEmail", mock.Anything, "test@example.com").Return(existingUser, nil)
    
    req := CreateUserRequest{
        Email:     "test@example.com",
        Password:  "password123",
        FirstName: "Test",
        LastName:  "User",
    }
    
    // Act
    user, err := service.CreateUser(context.Background(), req)
    
    // Assert
    assert.Nil(t, user)
    assert.Error(t, err)
    
    var appErr *AppError
    assert.True(t, errors.As(err, &appErr))
    assert.Equal(t, ErrCodeConflict, appErr.Code)
    assert.Equal(t, http.StatusConflict, appErr.HTTPStatus)
    assert.Contains(t, appErr.Message, "already exists")
    
    mockRepo.AssertExpectations(t)
}

func TestErrorHandlingMiddleware_AppError_ReturnsCorrectResponse(t *testing.T) {
    // Arrange
    gin.SetMode(gin.TestMode)
    router := gin.New()
    router.Use(ErrorHandlingMiddleware(logger.New("test")))
    
    router.GET("/test", func(c *gin.Context) {
        err := NewValidationError("Invalid data", []ErrorFieldDetail{
            {
                Field:   "email",
                Code:    "INVALID_FORMAT",
                Message: "Invalid email format",
                Value:   "invalid-email",
            },
        })
        c.Error(err)
    })
    
    // Act
    req := httptest.NewRequest("GET", "/test", nil)
    rr := httptest.NewRecorder()
    router.ServeHTTP(rr, req)
    
    // Assert
    assert.Equal(t, http.StatusBadRequest, rr.Code)
    
    var response ErrorResponse
    err := json.Unmarshal(rr.Body.Bytes(), &response)
    assert.NoError(t, err)
    assert.Equal(t, ErrCodeValidation, response.Error.Code)
    assert.Len(t, response.Error.Details, 1)
    assert.Equal(t, "email", response.Error.Details[0].Field)
}
```

## 📋 Error Handling Checklist

### Development
- [ ] All errors use standardized error types
- [ ] Error messages are user-friendly and actionable
- [ ] Sensitive information is not exposed in errors
- [ ] Errors include sufficient context for debugging
- [ ] Error codes are consistent across services
- [ ] Validation errors include field-level details

### Production
- [ ] Error monitoring and alerting configured
- [ ] Error aggregation and analysis in place
- [ ] Error metrics collected and dashboards created
- [ ] Error logs structured and searchable
- [ ] Error recovery mechanisms implemented
- [ ] Circuit breakers for external service errors

### Security
- [ ] No sensitive data in error messages
- [ ] Error responses don't leak system information
- [ ] Rate limiting on error-prone endpoints
- [ ] Error-based attacks (timing, enumeration) prevented

## 📚 Error Handling Resources

- [Go Error Handling Best Practices](https://blog.golang.org/error-handling-and-go)
- [Error Handling in Distributed Systems](https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/)
- [HTTP Status Code Definitions](https://httpstatuses.com/)
- [API Error Design Guidelines](https://cloud.google.com/apis/design/errors)
