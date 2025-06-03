# Security Patterns

## 🎯 Overview

This document defines comprehensive security patterns and standards for SlotWise, ensuring robust protection of user data, business information, and system integrity across all microservices.

## 🔐 Core Security Principles

### 1. Defense in Depth
- Multiple layers of security controls
- No single point of failure in security
- Assume breach mentality
- Fail securely by default

### 2. Principle of Least Privilege
- Grant minimum necessary permissions
- Regular access reviews and revocation
- Role-based access control (RBAC)
- Time-limited access tokens

### 3. Zero Trust Architecture
- Never trust, always verify
- Authenticate and authorize every request
- Encrypt all communications
- Monitor and log all activities

## 🔑 Authentication & Authorization

### 1. JWT Token Standards
```go
type JWTClaims struct {
    UserID     string   `json:"sub"`
    Email      string   `json:"email"`
    Role       string   `json:"role"`
    BusinessID *string  `json:"business_id,omitempty"`
    Scopes     []string `json:"scopes"`
    IssuedAt   int64    `json:"iat"`
    ExpiresAt  int64    `json:"exp"`
    Issuer     string   `json:"iss"`
    Audience   string   `json:"aud"`
}

// Token generation with proper claims
func GenerateJWT(user *User) (string, error) {
    claims := JWTClaims{
        UserID:    user.ID,
        Email:     user.Email,
        Role:      user.Role,
        BusinessID: user.BusinessID,
        Scopes:    getUserScopes(user),
        IssuedAt:  time.Now().Unix(),
        ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
        Issuer:    "slotwise-auth",
        Audience:  "slotwise-api",
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(jwtSecret))
}
```

### 2. Authentication Middleware
```go
func JWTAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(401, gin.H{"error": "Missing authorization header"})
            c.Abort()
            return
        }
        
        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        if tokenString == authHeader {
            c.JSON(401, gin.H{"error": "Invalid authorization format"})
            c.Abort()
            return
        }
        
        claims, err := validateJWT(tokenString)
        if err != nil {
            c.JSON(401, gin.H{"error": "Invalid token"})
            c.Abort()
            return
        }
        
        // Check token expiration
        if time.Now().Unix() > claims.ExpiresAt {
            c.JSON(401, gin.H{"error": "Token expired"})
            c.Abort()
            return
        }
        
        // Set user context
        c.Set("userID", claims.UserID)
        c.Set("userRole", claims.Role)
        c.Set("userScopes", claims.Scopes)
        c.Set("businessID", claims.BusinessID)
        
        c.Next()
    }
}
```

### 3. Role-Based Access Control
```go
type Permission string

const (
    PermissionReadUsers    Permission = "users:read"
    PermissionWriteUsers   Permission = "users:write"
    PermissionReadBookings Permission = "bookings:read"
    PermissionWriteBookings Permission = "bookings:write"
    PermissionManageBusiness Permission = "business:manage"
    PermissionViewReports   Permission = "reports:view"
)

type Role string

const (
    RoleClient        Role = "client"
    RoleBusinessOwner Role = "business_owner"
    RoleAdmin         Role = "admin"
    RoleSupport       Role = "support"
)

var rolePermissions = map[Role][]Permission{
    RoleClient: {
        PermissionReadUsers,
        PermissionReadBookings,
        PermissionWriteBookings,
    },
    RoleBusinessOwner: {
        PermissionReadUsers,
        PermissionReadBookings,
        PermissionWriteBookings,
        PermissionManageBusiness,
        PermissionViewReports,
    },
    RoleAdmin: {
        PermissionReadUsers,
        PermissionWriteUsers,
        PermissionReadBookings,
        PermissionWriteBookings,
        PermissionManageBusiness,
        PermissionViewReports,
    },
}

func RequirePermission(permission Permission) gin.HandlerFunc {
    return func(c *gin.Context) {
        userRole := c.GetString("userRole")
        if userRole == "" {
            c.JSON(401, gin.H{"error": "Authentication required"})
            c.Abort()
            return
        }
        
        if !hasPermission(Role(userRole), permission) {
            c.JSON(403, gin.H{"error": "Insufficient permissions"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}

func hasPermission(role Role, permission Permission) bool {
    permissions, exists := rolePermissions[role]
    if !exists {
        return false
    }
    
    for _, p := range permissions {
        if p == permission {
            return true
        }
    }
    return false
}
```

## 🔒 Data Protection

### 1. Password Security
```go
import "golang.org/x/crypto/bcrypt"

const (
    MinPasswordLength = 8
    BcryptCost       = 12
)

func HashPassword(password string) (string, error) {
    if len(password) < MinPasswordLength {
        return "", errors.New("password too short")
    }
    
    // Check password complexity
    if !isPasswordComplex(password) {
        return "", errors.New("password does not meet complexity requirements")
    }
    
    hash, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
    if err != nil {
        return "", fmt.Errorf("failed to hash password: %w", err)
    }
    
    return string(hash), nil
}

func VerifyPassword(hashedPassword, password string) error {
    return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

func isPasswordComplex(password string) bool {
    var (
        hasUpper   = false
        hasLower   = false
        hasNumber  = false
        hasSpecial = false
    )
    
    for _, char := range password {
        switch {
        case unicode.IsUpper(char):
            hasUpper = true
        case unicode.IsLower(char):
            hasLower = true
        case unicode.IsNumber(char):
            hasNumber = true
        case unicode.IsPunct(char) || unicode.IsSymbol(char):
            hasSpecial = true
        }
    }
    
    return hasUpper && hasLower && hasNumber && hasSpecial
}
```

### 2. Data Encryption
```go
import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/base64"
)

type EncryptionService struct {
    gcm cipher.AEAD
}

func NewEncryptionService(key []byte) (*EncryptionService, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }
    
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    
    return &EncryptionService{gcm: gcm}, nil
}

func (e *EncryptionService) Encrypt(plaintext string) (string, error) {
    nonce := make([]byte, e.gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return "", err
    }
    
    ciphertext := e.gcm.Seal(nonce, nonce, []byte(plaintext), nil)
    return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (e *EncryptionService) Decrypt(ciphertext string) (string, error) {
    data, err := base64.StdEncoding.DecodeString(ciphertext)
    if err != nil {
        return "", err
    }
    
    nonceSize := e.gcm.NonceSize()
    if len(data) < nonceSize {
        return "", errors.New("ciphertext too short")
    }
    
    nonce, ciphertext := data[:nonceSize], data[nonceSize:]
    plaintext, err := e.gcm.Open(nil, nonce, ciphertext, nil)
    if err != nil {
        return "", err
    }
    
    return string(plaintext), nil
}
```

### 3. PII Data Handling
```go
type PIIField struct {
    Value     string `json:"-"` // Never serialize directly
    Encrypted string `json:"encrypted_value,omitempty"`
    Hash      string `json:"hash,omitempty"`
}

func (p *PIIField) SetValue(value string, encSvc *EncryptionService) error {
    // Store encrypted value
    encrypted, err := encSvc.Encrypt(value)
    if err != nil {
        return err
    }
    p.Encrypted = encrypted
    
    // Store hash for searching
    hash := sha256.Sum256([]byte(value))
    p.Hash = hex.EncodeToString(hash[:])
    
    // Store plaintext in memory only
    p.Value = value
    return nil
}

func (p *PIIField) GetValue(encSvc *EncryptionService) (string, error) {
    if p.Value != "" {
        return p.Value, nil
    }
    
    if p.Encrypted == "" {
        return "", nil
    }
    
    decrypted, err := encSvc.Decrypt(p.Encrypted)
    if err != nil {
        return "", err
    }
    
    p.Value = decrypted
    return decrypted, nil
}

// Example usage in models
type User struct {
    ID       string   `gorm:"type:uuid;primary_key;" json:"id"`
    Email    PIIField `gorm:"embedded;embeddedPrefix:email_" json:"email"`
    Phone    PIIField `gorm:"embedded;embeddedPrefix:phone_" json:"phone"`
    Name     string   `json:"name"` // Non-PII
}
```

## 🛡️ Input Validation & Sanitization

### 1. Request Validation
```go
import "github.com/go-playground/validator/v10"

type CreateUserRequest struct {
    Email     string `json:"email" validate:"required,email,max=255"`
    Password  string `json:"password" validate:"required,min=8,max=128"`
    FirstName string `json:"firstName" validate:"required,min=1,max=50,alpha"`
    LastName  string `json:"lastName" validate:"required,min=1,max=50,alpha"`
    Phone     string `json:"phone" validate:"omitempty,e164"`
}

func ValidateRequest(req interface{}) error {
    validate := validator.New()
    
    // Register custom validators
    validate.RegisterValidation("alpha", validateAlpha)
    validate.RegisterValidation("e164", validateE164Phone)
    
    return validate.Struct(req)
}

func validateAlpha(fl validator.FieldLevel) bool {
    value := fl.Field().String()
    for _, char := range value {
        if !unicode.IsLetter(char) && !unicode.IsSpace(char) {
            return false
        }
    }
    return true
}
```

### 2. SQL Injection Prevention
```go
// ✅ Correct - Use parameterized queries
func (r *userRepository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
    var user User
    err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
    if err != nil {
        return nil, err
    }
    return &user, nil
}

// ❌ Incorrect - Vulnerable to SQL injection
func (r *userRepository) GetUserByEmailUnsafe(ctx context.Context, email string) (*User, error) {
    var user User
    query := fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", email)
    err := r.db.WithContext(ctx).Raw(query).First(&user).Error
    return &user, err
}
```

### 3. XSS Prevention
```go
import "html"

func SanitizeHTML(input string) string {
    // Escape HTML entities
    escaped := html.EscapeString(input)
    
    // Remove potentially dangerous characters
    escaped = strings.ReplaceAll(escaped, "<script", "&lt;script")
    escaped = strings.ReplaceAll(escaped, "javascript:", "")
    escaped = strings.ReplaceAll(escaped, "data:", "")
    
    return escaped
}

// For rich text content, use a proper HTML sanitizer
import "github.com/microcosm-cc/bluemonday"

func SanitizeRichText(input string) string {
    p := bluemonday.UGCPolicy()
    return p.Sanitize(input)
}
```

## 🔍 Security Monitoring

### 1. Security Event Logging
```go
type SecurityEvent struct {
    Type        string    `json:"type"`
    UserID      string    `json:"user_id,omitempty"`
    IP          string    `json:"ip"`
    UserAgent   string    `json:"user_agent"`
    Resource    string    `json:"resource"`
    Action      string    `json:"action"`
    Success     bool      `json:"success"`
    Reason      string    `json:"reason,omitempty"`
    Timestamp   time.Time `json:"timestamp"`
    RequestID   string    `json:"request_id"`
}

const (
    SecurityEventLogin          = "login"
    SecurityEventLogout         = "logout"
    SecurityEventPasswordReset = "password_reset"
    SecurityEventPermissionDenied = "permission_denied"
    SecurityEventSuspiciousActivity = "suspicious_activity"
)

func LogSecurityEvent(event SecurityEvent) {
    logger.Info("Security event",
        logger.Field("type", event.Type),
        logger.Field("user_id", event.UserID),
        logger.Field("ip", event.IP),
        logger.Field("success", event.Success),
        logger.Field("resource", event.Resource),
        logger.Field("action", event.Action),
    )
    
    // Send to security monitoring system
    securityMonitor.RecordEvent(event)
}
```

### 2. Rate Limiting
```go
import "github.com/gin-gonic/gin"
import "golang.org/x/time/rate"

type RateLimiter struct {
    limiters map[string]*rate.Limiter
    mu       sync.RWMutex
    rate     rate.Limit
    burst    int
}

func NewRateLimiter(r rate.Limit, b int) *RateLimiter {
    return &RateLimiter{
        limiters: make(map[string]*rate.Limiter),
        rate:     r,
        burst:    b,
    }
}

func (rl *RateLimiter) getLimiter(key string) *rate.Limiter {
    rl.mu.Lock()
    defer rl.mu.Unlock()
    
    limiter, exists := rl.limiters[key]
    if !exists {
        limiter = rate.NewLimiter(rl.rate, rl.burst)
        rl.limiters[key] = limiter
    }
    
    return limiter
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        key := c.ClientIP()
        limiter := rl.getLimiter(key)
        
        if !limiter.Allow() {
            LogSecurityEvent(SecurityEvent{
                Type:      "rate_limit_exceeded",
                IP:        c.ClientIP(),
                UserAgent: c.GetHeader("User-Agent"),
                Timestamp: time.Now(),
                RequestID: c.GetString("requestId"),
            })
            
            c.JSON(429, gin.H{
                "error": "Rate limit exceeded",
                "retry_after": "60s",
            })
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

## 🔐 API Security

### 1. CORS Configuration
```go
import "github.com/gin-contrib/cors"

func CORSMiddleware() gin.HandlerFunc {
    config := cors.Config{
        AllowOrigins: []string{
            "https://app.slotwise.com",
            "https://admin.slotwise.com",
        },
        AllowMethods: []string{
            "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
        },
        AllowHeaders: []string{
            "Origin", "Content-Type", "Accept", "Authorization",
            "X-Requested-With", "X-Request-ID",
        },
        ExposeHeaders: []string{
            "X-Request-ID", "X-Rate-Limit-Remaining",
        },
        AllowCredentials: true,
        MaxAge:          12 * time.Hour,
    }
    
    return cors.New(config)
}
```

### 2. Security Headers
```go
func SecurityHeadersMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Prevent clickjacking
        c.Header("X-Frame-Options", "DENY")
        
        // Prevent MIME type sniffing
        c.Header("X-Content-Type-Options", "nosniff")
        
        // Enable XSS protection
        c.Header("X-XSS-Protection", "1; mode=block")
        
        // Enforce HTTPS
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        
        // Content Security Policy
        c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
        
        // Referrer Policy
        c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
        
        c.Next()
    }
}
```

## 🔒 Infrastructure Security

### 1. TLS Configuration
```go
import "crypto/tls"

func GetTLSConfig() *tls.Config {
    return &tls.Config{
        MinVersion:               tls.VersionTLS12,
        CurvePreferences:         []tls.CurveID{tls.CurveP521, tls.CurveP384, tls.CurveP256},
        PreferServerCipherSuites: true,
        CipherSuites: []uint16{
            tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
            tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
        },
    }
}
```

### 2. Database Security
```sql
-- Create dedicated database users for each service
CREATE USER slotwise_auth_user WITH PASSWORD 'secure_random_password';
CREATE USER slotwise_booking_user WITH PASSWORD 'secure_random_password';

-- Grant minimal necessary permissions
GRANT CONNECT ON DATABASE slotwise_auth TO slotwise_auth_user;
GRANT USAGE ON SCHEMA public TO slotwise_auth_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO slotwise_auth_user;

-- Enable row-level security for multi-tenant data
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY booking_isolation ON bookings
    FOR ALL TO slotwise_booking_user
    USING (business_id = current_setting('app.current_business_id'));
```

## 📋 Security Checklist

### Development
- [ ] All inputs validated and sanitized
- [ ] Parameterized queries used (no SQL injection)
- [ ] Passwords properly hashed with bcrypt
- [ ] Sensitive data encrypted at rest
- [ ] Authentication required for all protected endpoints
- [ ] Authorization checks implemented
- [ ] Security headers configured
- [ ] Rate limiting implemented

### Deployment
- [ ] TLS/HTTPS enforced
- [ ] Security headers configured
- [ ] Database users have minimal permissions
- [ ] Secrets managed securely (not in code)
- [ ] Security monitoring enabled
- [ ] Regular security scans scheduled
- [ ] Incident response plan documented

### Monitoring
- [ ] Failed authentication attempts logged
- [ ] Permission denied events logged
- [ ] Suspicious activity detection enabled
- [ ] Security metrics collected
- [ ] Alerting configured for security events

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Go Security Checklist](https://github.com/Checkmarx/Go-SCP)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
