# Configuration Management Standards

## 🎯 Overview

This document defines configuration management standards for SlotWise microservices, ensuring consistent, secure, and maintainable configuration across all environments.

## 🏗️ Core Principles

### 1. 12-Factor App Configuration
- Store configuration in environment variables
- Strict separation between code and configuration
- Configuration varies between environments
- No secrets in code or version control

### 2. Environment Parity
- Keep development, staging, and production as similar as possible
- Use the same configuration mechanism across environments
- Minimize configuration drift between environments

### 3. Security First
- Never store secrets in code or configuration files
- Use secure secret management systems
- Encrypt sensitive configuration data
- Implement least-privilege access

## 📁 Configuration Structure

### 1. Configuration Hierarchy
```
config/
├── default.yaml          # Default values for all environments
├── development.yaml       # Development-specific overrides
├── staging.yaml          # Staging-specific overrides
├── production.yaml       # Production-specific overrides
└── local.yaml           # Local development overrides (gitignored)
```

### 2. Environment Variable Naming
```bash
# Pattern: {SERVICE}_{COMPONENT}_{SETTING}
SLOTWISE_AUTH_DATABASE_URL=postgresql://...
SLOTWISE_AUTH_JWT_SECRET=...
SLOTWISE_AUTH_REDIS_URL=redis://...

# Common prefixes
SLOTWISE_AUTH_*     # Auth service configuration
SLOTWISE_BOOKING_*  # Booking service configuration
SLOTWISE_PAYMENT_*  # Payment service configuration
SLOTWISE_SHARED_*   # Shared configuration
```

## 🔧 Go Configuration Implementation

### 1. Configuration Structure
```go
package config

import (
    "fmt"
    "strings"
    "time"
    
    "github.com/spf13/viper"
)

type Config struct {
    Environment string         `mapstructure:"environment"`
    Service     ServiceConfig  `mapstructure:"service"`
    Server      ServerConfig   `mapstructure:"server"`
    Database    DatabaseConfig `mapstructure:"database"`
    Redis       RedisConfig    `mapstructure:"redis"`
    NATS        NATSConfig     `mapstructure:"nats"`
    JWT         JWTConfig      `mapstructure:"jwt"`
    Logging     LoggingConfig  `mapstructure:"logging"`
    Metrics     MetricsConfig  `mapstructure:"metrics"`
}

type ServiceConfig struct {
    Name    string `mapstructure:"name" validate:"required"`
    Version string `mapstructure:"version" validate:"required"`
}

type ServerConfig struct {
    Host         string        `mapstructure:"host"`
    Port         int           `mapstructure:"port" validate:"min=1,max=65535"`
    ReadTimeout  time.Duration `mapstructure:"read_timeout"`
    WriteTimeout time.Duration `mapstructure:"write_timeout"`
    IdleTimeout  time.Duration `mapstructure:"idle_timeout"`
}

type DatabaseConfig struct {
    Host         string `mapstructure:"host" validate:"required"`
    Port         int    `mapstructure:"port" validate:"min=1,max=65535"`
    User         string `mapstructure:"user" validate:"required"`
    Password     string `mapstructure:"password" validate:"required"`
    Name         string `mapstructure:"name" validate:"required"`
    SSLMode      string `mapstructure:"ssl_mode"`
    MaxOpenConns int    `mapstructure:"max_open_conns"`
    MaxIdleConns int    `mapstructure:"max_idle_conns"`
    MaxLifetime  time.Duration `mapstructure:"max_lifetime"`
}

type RedisConfig struct {
    URL         string        `mapstructure:"url" validate:"required"`
    Password    string        `mapstructure:"password"`
    DB          int           `mapstructure:"db"`
    MaxRetries  int           `mapstructure:"max_retries"`
    PoolSize    int           `mapstructure:"pool_size"`
    IdleTimeout time.Duration `mapstructure:"idle_timeout"`
}

type NATSConfig struct {
    URL           string        `mapstructure:"url" validate:"required"`
    ClusterID     string        `mapstructure:"cluster_id"`
    ClientID      string        `mapstructure:"client_id"`
    MaxReconnects int           `mapstructure:"max_reconnects"`
    ReconnectWait time.Duration `mapstructure:"reconnect_wait"`
}

type JWTConfig struct {
    Secret         string        `mapstructure:"secret" validate:"required"`
    ExpiryDuration time.Duration `mapstructure:"expiry_duration"`
    Issuer         string        `mapstructure:"issuer"`
}

type LoggingConfig struct {
    Level  string `mapstructure:"level" validate:"oneof=debug info warn error"`
    Format string `mapstructure:"format" validate:"oneof=json text"`
    Output string `mapstructure:"output"`
}

type MetricsConfig struct {
    Enabled bool   `mapstructure:"enabled"`
    Port    int    `mapstructure:"port"`
    Path    string `mapstructure:"path"`
}
```

### 2. Configuration Loading
```go
func Load() (*Config, error) {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath(".")
    viper.AddConfigPath("./config")
    viper.AddConfigPath("/etc/slotwise")
    
    // Set defaults
    setDefaults()
    
    // Read configuration file
    if err := viper.ReadInConfig(); err != nil {
        if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
            return nil, fmt.Errorf("failed to read config file: %w", err)
        }
    }
    
    // Environment variable overrides
    viper.AutomaticEnv()
    viper.SetEnvPrefix("SLOTWISE")
    viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
    
    // Unmarshal configuration
    var config Config
    if err := viper.Unmarshal(&config); err != nil {
        return nil, fmt.Errorf("failed to unmarshal config: %w", err)
    }
    
    // Validate configuration
    if err := validateConfig(&config); err != nil {
        return nil, fmt.Errorf("invalid configuration: %w", err)
    }
    
    return &config, nil
}

func setDefaults() {
    // Service defaults
    viper.SetDefault("service.name", "unknown")
    viper.SetDefault("service.version", "dev")
    
    // Server defaults
    viper.SetDefault("server.host", "0.0.0.0")
    viper.SetDefault("server.port", 8080)
    viper.SetDefault("server.read_timeout", "30s")
    viper.SetDefault("server.write_timeout", "30s")
    viper.SetDefault("server.idle_timeout", "120s")
    
    // Database defaults
    viper.SetDefault("database.host", "localhost")
    viper.SetDefault("database.port", 5432)
    viper.SetDefault("database.ssl_mode", "disable")
    viper.SetDefault("database.max_open_conns", 25)
    viper.SetDefault("database.max_idle_conns", 5)
    viper.SetDefault("database.max_lifetime", "5m")
    
    // Redis defaults
    viper.SetDefault("redis.url", "redis://localhost:6379")
    viper.SetDefault("redis.db", 0)
    viper.SetDefault("redis.max_retries", 3)
    viper.SetDefault("redis.pool_size", 10)
    viper.SetDefault("redis.idle_timeout", "5m")
    
    // NATS defaults
    viper.SetDefault("nats.url", "nats://localhost:4222")
    viper.SetDefault("nats.max_reconnects", 10)
    viper.SetDefault("nats.reconnect_wait", "2s")
    
    // JWT defaults
    viper.SetDefault("jwt.expiry_duration", "24h")
    viper.SetDefault("jwt.issuer", "slotwise")
    
    // Logging defaults
    viper.SetDefault("logging.level", "info")
    viper.SetDefault("logging.format", "json")
    viper.SetDefault("logging.output", "stdout")
    
    // Metrics defaults
    viper.SetDefault("metrics.enabled", true)
    viper.SetDefault("metrics.port", 9090)
    viper.SetDefault("metrics.path", "/metrics")
}

func validateConfig(config *Config) error {
    validate := validator.New()
    return validate.Struct(config)
}
```

### 3. Database Connection String Builder
```go
func (c *DatabaseConfig) ConnectionString() string {
    return fmt.Sprintf(
        "host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
        c.Host, c.Port, c.User, c.Password, c.Name, c.SSLMode,
    )
}

func (c *DatabaseConfig) ConnectionStringWithoutPassword() string {
    return fmt.Sprintf(
        "host=%s port=%d user=%s dbname=%s sslmode=%s",
        c.Host, c.Port, c.User, c.Name, c.SSLMode,
    )
}
```

## 📄 Configuration Files

### 1. Default Configuration (config/default.yaml)
```yaml
environment: development

service:
  name: auth-service
  version: "1.0.0"

server:
  host: 0.0.0.0
  port: 8080
  read_timeout: 30s
  write_timeout: 30s
  idle_timeout: 120s

database:
  host: localhost
  port: 5432
  user: postgres
  name: slotwise_auth
  ssl_mode: disable
  max_open_conns: 25
  max_idle_conns: 5
  max_lifetime: 5m

redis:
  url: redis://localhost:6379
  db: 0
  max_retries: 3
  pool_size: 10
  idle_timeout: 5m

nats:
  url: nats://localhost:4222
  cluster_id: slotwise
  max_reconnects: 10
  reconnect_wait: 2s

jwt:
  expiry_duration: 24h
  issuer: slotwise

logging:
  level: info
  format: json
  output: stdout

metrics:
  enabled: true
  port: 9090
  path: /metrics
```

### 2. Production Configuration (config/production.yaml)
```yaml
environment: production

server:
  port: 8080

database:
  host: postgres.slotwise.internal
  port: 5432
  ssl_mode: require
  max_open_conns: 50
  max_idle_conns: 10

redis:
  url: redis://redis.slotwise.internal:6379
  pool_size: 20

nats:
  url: nats://nats.slotwise.internal:4222
  cluster_id: slotwise-prod

logging:
  level: warn
  format: json

metrics:
  enabled: true
  port: 9090
```

## 🔐 Secret Management

### 1. Environment Variables for Secrets
```bash
# Never store these in configuration files
export SLOTWISE_AUTH_DATABASE_PASSWORD="secure_password"
export SLOTWISE_AUTH_JWT_SECRET="jwt_secret_key"
export SLOTWISE_AUTH_REDIS_PASSWORD="redis_password"
```

### 2. Secret Loading
```go
func loadSecrets(config *Config) error {
    // Database password
    if password := os.Getenv("SLOTWISE_AUTH_DATABASE_PASSWORD"); password != "" {
        config.Database.Password = password
    }
    
    // JWT secret
    if secret := os.Getenv("SLOTWISE_AUTH_JWT_SECRET"); secret != "" {
        config.JWT.Secret = secret
    }
    
    // Redis password
    if password := os.Getenv("SLOTWISE_AUTH_REDIS_PASSWORD"); password != "" {
        config.Redis.Password = password
    }
    
    return nil
}
```

### 3. Kubernetes Secrets Integration
```yaml
# kubernetes/auth-service-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth-service-secrets
type: Opaque
data:
  database-password: <base64-encoded-password>
  jwt-secret: <base64-encoded-secret>
  redis-password: <base64-encoded-password>
```

```yaml
# kubernetes/auth-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  template:
    spec:
      containers:
      - name: auth-service
        env:
        - name: SLOTWISE_AUTH_DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: auth-service-secrets
              key: database-password
        - name: SLOTWISE_AUTH_JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-service-secrets
              key: jwt-secret
```

## 🧪 Testing Configuration

### 1. Test Configuration
```go
func LoadTestConfig() *Config {
    return &Config{
        Environment: "test",
        Service: ServiceConfig{
            Name:    "auth-service",
            Version: "test",
        },
        Server: ServerConfig{
            Host: "localhost",
            Port: 0, // Random port
        },
        Database: DatabaseConfig{
            Host:     "localhost",
            Port:     5432,
            User:     "postgres",
            Password: "postgres",
            Name:     "slotwise_auth_test",
            SSLMode:  "disable",
        },
        Redis: RedisConfig{
            URL: "redis://localhost:6379",
            DB:  1, // Use different DB for tests
        },
        JWT: JWTConfig{
            Secret:         "test-secret",
            ExpiryDuration: time.Hour,
        },
        Logging: LoggingConfig{
            Level:  "debug",
            Format: "text",
        },
    }
}
```

### 2. Configuration Testing
```go
func TestConfigLoad(t *testing.T) {
    // Set test environment variables
    os.Setenv("SLOTWISE_AUTH_DATABASE_PASSWORD", "test-password")
    defer os.Unsetenv("SLOTWISE_AUTH_DATABASE_PASSWORD")
    
    config, err := Load()
    assert.NoError(t, err)
    assert.Equal(t, "test-password", config.Database.Password)
}

func TestConfigValidation(t *testing.T) {
    config := &Config{
        Server: ServerConfig{
            Port: 99999, // Invalid port
        },
    }
    
    err := validateConfig(config)
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "port")
}
```

## 🐳 Docker Configuration

### 1. Dockerfile Configuration
```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o main cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/config ./config
EXPOSE 8080
CMD ["./main"]
```

### 2. Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  auth-service:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SLOTWISE_AUTH_ENVIRONMENT=development
      - SLOTWISE_AUTH_DATABASE_HOST=postgres
      - SLOTWISE_AUTH_DATABASE_PASSWORD=${DATABASE_PASSWORD}
      - SLOTWISE_AUTH_REDIS_URL=redis://redis:6379
      - SLOTWISE_AUTH_NATS_URL=nats://nats:4222
    depends_on:
      - postgres
      - redis
      - nats
    volumes:
      - ./config:/root/config
```

## 📊 Configuration Monitoring

### 1. Configuration Validation Metrics
```go
var (
    configLoadDuration = prometheus.NewHistogram(
        prometheus.HistogramOpts{
            Name: "config_load_duration_seconds",
            Help: "Time taken to load configuration",
        },
    )
    
    configValidationErrors = prometheus.NewCounter(
        prometheus.CounterOpts{
            Name: "config_validation_errors_total",
            Help: "Total number of configuration validation errors",
        },
    )
)

func LoadWithMetrics() (*Config, error) {
    start := time.Now()
    defer func() {
        configLoadDuration.Observe(time.Since(start).Seconds())
    }()
    
    config, err := Load()
    if err != nil {
        configValidationErrors.Inc()
        return nil, err
    }
    
    return config, nil
}
```

### 2. Configuration Health Check
```go
func (h *HealthHandler) ConfigCheck(c *gin.Context) {
    checks := map[string]string{
        "database": h.checkDatabaseConfig(),
        "redis":    h.checkRedisConfig(),
        "nats":     h.checkNATSConfig(),
    }
    
    status := "healthy"
    for _, check := range checks {
        if check != "healthy" {
            status = "unhealthy"
            break
        }
    }
    
    c.JSON(200, gin.H{
        "status": status,
        "checks": checks,
    })
}
```

## 📋 Configuration Checklist

### Development
- [ ] Configuration loads from files and environment variables
- [ ] Secrets are not in configuration files
- [ ] Default values are sensible for development
- [ ] Configuration validation works
- [ ] Test configuration is isolated

### Production
- [ ] All secrets are provided via environment variables
- [ ] Configuration is validated on startup
- [ ] Sensitive values are not logged
- [ ] Configuration monitoring is enabled
- [ ] Backup configuration strategy exists

## 📚 Examples

See `examples/configuration/` for:
- Complete service configuration examples
- Kubernetes configuration manifests
- Docker Compose configurations
- Configuration testing patterns
- Secret management examples
