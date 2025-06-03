# Service Architecture Standards

## 🎯 Overview

This document defines the microservices architecture standards for SlotWise, ensuring consistent service design, communication patterns, and deployment strategies across all services.

## 🏗️ Architecture Principles

### 1. Domain-Driven Design
- Services organized around business domains
- Clear service boundaries and responsibilities
- Shared nothing architecture
- Domain models encapsulated within services

### 2. Microservices Patterns
- Single responsibility per service
- Database per service
- Stateless service design
- Fault tolerance and resilience

### 3. Event-Driven Architecture
- Asynchronous communication via NATS
- Event sourcing for critical business events
- Eventual consistency between services
- Saga pattern for distributed transactions

## 🏢 Service Structure

### 1. Standard Directory Layout
```
services/
├── auth-service/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── config/
│   │   ├── handlers/
│   │   ├── models/
│   │   ├── repository/
│   │   ├── service/
│   │   └── subscribers/
│   ├── pkg/
│   │   ├── events/
│   │   ├── logger/
│   │   └── middleware/
│   ├── migrations/
│   ├── Dockerfile
│   ├── go.mod
│   └── README.md
```

### 2. Layer Responsibilities

#### **Handler Layer** (`internal/handlers/`)
- HTTP request/response handling
- Request validation and transformation
- Authentication and authorization
- Response formatting

```go
type UserHandler struct {
    service UserService
    logger  logger.Logger
}

func (h *UserHandler) CreateUser(c *gin.Context) {
    // Handle HTTP concerns only
}
```

#### **Service Layer** (`internal/service/`)
- Business logic implementation
- Orchestration of repository calls
- Event publishing
- Cross-cutting concerns

```go
type UserService interface {
    CreateUser(ctx context.Context, req CreateUserRequest) (*User, error)
    GetUser(ctx context.Context, id string) (*User, error)
}

type userService struct {
    repo      UserRepository
    publisher EventPublisher
    logger    logger.Logger
}
```

#### **Repository Layer** (`internal/repository/`)
- Data access and persistence
- Database query implementation
- Data mapping and transformation
- Transaction management

```go
type UserRepository interface {
    Create(ctx context.Context, user *User) error
    GetByID(ctx context.Context, id string) (*User, error)
    GetByEmail(ctx context.Context, email string) (*User, error)
}
```

#### **Model Layer** (`internal/models/`)
- Domain entities and value objects
- Business rules and validation
- Database schema definitions

```go
type User struct {
    ID        string    `gorm:"type:uuid;primary_key;" json:"id"`
    Email     string    `gorm:"type:text;not null;unique" json:"email"`
    CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"createdAt"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
    if u.ID == "" {
        u.ID = uuid.New().String()
    }
    return nil
}
```

## 🔄 Communication Patterns

### 1. Synchronous Communication
Use HTTP for:
- Real-time queries
- User-facing operations
- External API integrations

```go
// Service-to-service HTTP call
type BusinessServiceClient struct {
    baseURL string
    client  *http.Client
}

func (c *BusinessServiceClient) GetBusiness(ctx context.Context, id string) (*Business, error) {
    url := fmt.Sprintf("%s/api/v1/businesses/%s", c.baseURL, id)
    req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
    
    resp, err := c.client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var business Business
    return &business, json.NewDecoder(resp.Body).Decode(&business)
}
```

### 2. Asynchronous Communication
Use NATS for:
- Event notifications
- Background processing
- Cross-service data synchronization

```go
// Event publishing
type EventPublisher interface {
    Publish(ctx context.Context, subject string, event interface{}) error
}

func (s *userService) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
    user, err := s.repo.Create(ctx, &User{...})
    if err != nil {
        return nil, err
    }
    
    // Publish event asynchronously
    event := UserCreatedEvent{
        UserID:    user.ID,
        Email:     user.Email,
        Timestamp: time.Now(),
    }
    s.publisher.Publish(ctx, "user.created", event)
    
    return user, nil
}
```

### 3. Event Schema Standards
```go
// Base event structure
type BaseEvent struct {
    ID        string    `json:"id"`
    Type      string    `json:"type"`
    Source    string    `json:"source"`
    Timestamp time.Time `json:"timestamp"`
    Version   string    `json:"version"`
}

// Domain event
type UserCreatedEvent struct {
    BaseEvent
    Data UserCreatedData `json:"data"`
}

type UserCreatedData struct {
    UserID    string `json:"userId"`
    Email     string `json:"email"`
    Role      string `json:"role"`
    BusinessID *string `json:"businessId,omitempty"`
}
```

## 🗄️ Data Management

### 1. Database per Service
- Each service owns its data
- No direct database access between services
- Service-specific schema design
- Independent scaling and optimization

### 2. Data Consistency Patterns

#### **Eventual Consistency**
```go
// Saga pattern for distributed transactions
type BookingCreationSaga struct {
    steps []SagaStep
}

func (s *BookingCreationSaga) Execute(ctx context.Context, booking *Booking) error {
    for _, step := range s.steps {
        if err := step.Execute(ctx, booking); err != nil {
            // Compensate previous steps
            s.compensate(ctx, booking)
            return err
        }
    }
    return nil
}
```

#### **Event Sourcing** (for critical domains)
```go
type BookingAggregate struct {
    ID     string
    Events []DomainEvent
    State  BookingState
}

func (a *BookingAggregate) CreateBooking(cmd CreateBookingCommand) error {
    event := BookingCreatedEvent{
        BookingID:  cmd.BookingID,
        CustomerID: cmd.CustomerID,
        ServiceID:  cmd.ServiceID,
        StartTime:  cmd.StartTime,
    }
    
    a.Apply(event)
    return nil
}
```

## 🔐 Security Standards

### 1. Authentication
- JWT tokens for user authentication
- API keys for service-to-service communication
- Token validation middleware

```go
func JWTAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := extractToken(c.GetHeader("Authorization"))
        if token == "" {
            c.JSON(401, gin.H{"error": "Missing authorization token"})
            c.Abort()
            return
        }
        
        claims, err := validateJWT(token)
        if err != nil {
            c.JSON(401, gin.H{"error": "Invalid token"})
            c.Abort()
            return
        }
        
        c.Set("userID", claims.UserID)
        c.Set("role", claims.Role)
        c.Next()
    }
}
```

### 2. Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- Service-level authorization

```go
func RequireRole(role string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userRole := c.GetString("role")
        if userRole != role {
            c.JSON(403, gin.H{"error": "Insufficient permissions"})
            c.Abort()
            return
        }
        c.Next()
    }
}
```

## 📊 Observability

### 1. Logging Standards
```go
type Logger interface {
    Info(msg string, fields ...Field)
    Error(msg string, err error, fields ...Field)
    Debug(msg string, fields ...Field)
    Warn(msg string, fields ...Field)
}

// Structured logging
logger.Info("User created",
    Field("userId", user.ID),
    Field("email", user.Email),
    Field("requestId", requestID),
)
```

### 2. Metrics Collection
```go
// Prometheus metrics
var (
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "HTTP request duration in seconds",
        },
        []string{"method", "endpoint", "status"},
    )
    
    requestCount = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )
)
```

### 3. Distributed Tracing
```go
func TracingMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        span := opentracing.StartSpan(c.Request.URL.Path)
        defer span.Finish()
        
        c.Set("span", span)
        c.Next()
    }
}
```

## 🚀 Deployment Standards

### 1. Docker Configuration
```dockerfile
# Multi-stage build
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
```

### 2. Health Checks
```go
func (h *HealthHandler) HealthCheck(c *gin.Context) {
    status := "healthy"
    checks := map[string]string{
        "database": h.checkDatabase(),
        "redis":    h.checkRedis(),
        "nats":     h.checkNATS(),
    }
    
    for _, check := range checks {
        if check != "healthy" {
            status = "unhealthy"
            break
        }
    }
    
    c.JSON(200, gin.H{
        "status": status,
        "checks": checks,
        "timestamp": time.Now(),
    })
}
```

### 3. Configuration Management
```go
type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
    Redis    RedisConfig    `mapstructure:"redis"`
    NATS     NATSConfig     `mapstructure:"nats"`
    JWT      JWTConfig      `mapstructure:"jwt"`
}

func Load() (*Config, error) {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath(".")
    viper.AddConfigPath("./config")
    
    // Environment variable overrides
    viper.AutomaticEnv()
    viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
    
    if err := viper.ReadInConfig(); err != nil {
        return nil, err
    }
    
    var config Config
    return &config, viper.Unmarshal(&config)
}
```

## 🔄 Service Lifecycle

### 1. Service Bootstrap
```go
func main() {
    // Load configuration
    cfg, err := config.Load()
    if err != nil {
        log.Fatal("Failed to load config:", err)
    }
    
    // Initialize dependencies
    db := database.Connect(cfg.Database)
    redis := database.ConnectRedis(cfg.Redis)
    nats := messaging.Connect(cfg.NATS)
    
    // Initialize repositories
    userRepo := repository.NewUserRepository(db)
    
    // Initialize services
    userService := service.NewUserService(userRepo, nats)
    
    // Initialize handlers
    userHandler := handlers.NewUserHandler(userService)
    
    // Setup routes
    router := setupRoutes(userHandler)
    
    // Start server
    server := &http.Server{
        Addr:    cfg.Server.Port,
        Handler: router,
    }
    
    log.Printf("Server starting on port %s", cfg.Server.Port)
    log.Fatal(server.ListenAndServe())
}
```

### 2. Graceful Shutdown
```go
func gracefulShutdown(server *http.Server, db *gorm.DB, nats *nats.Conn) {
    c := make(chan os.Signal, 1)
    signal.Notify(c, os.Interrupt, syscall.SIGTERM)
    
    <-c
    log.Println("Shutting down gracefully...")
    
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    // Shutdown HTTP server
    server.Shutdown(ctx)
    
    // Close database connections
    sqlDB, _ := db.DB()
    sqlDB.Close()
    
    // Close NATS connection
    nats.Close()
    
    log.Println("Shutdown complete")
}
```

## 📋 Service Checklist

### Before Deployment
- [ ] Health check endpoint implemented
- [ ] Metrics collection configured
- [ ] Logging properly structured
- [ ] Configuration externalized
- [ ] Database migrations tested
- [ ] Event schemas documented
- [ ] API documentation updated
- [ ] Security middleware applied
- [ ] Error handling comprehensive
- [ ] Tests passing (unit, integration, e2e)

### Production Readiness
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Performance benchmarks met
- [ ] Monitoring dashboards created
- [ ] Alerting rules configured
- [ ] Backup procedures tested
- [ ] Disaster recovery plan documented
- [ ] Runbook created for operations team

## 📚 Examples

See `examples/service-architecture/` for:
- Complete service implementation examples
- Event-driven communication patterns
- Configuration management examples
- Deployment configurations
- Monitoring and observability setup
