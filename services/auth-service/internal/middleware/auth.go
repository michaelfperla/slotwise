package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/slotwise/auth-service/internal/service"
	"github.com/slotwise/auth-service/pkg/jwt"
	"github.com/slotwise/auth-service/pkg/logger"
)

// AuthMiddleware provides JWT authentication middleware
type AuthMiddleware struct {
	authService service.AuthService
	jwtManager  *jwt.Manager
	logger      logger.Logger
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(authService service.AuthService, jwtManager *jwt.Manager, logger logger.Logger) *AuthMiddleware {
	return &AuthMiddleware{
		authService: authService,
		jwtManager:  jwtManager,
		logger:      logger,
	}
}

// RequireAuth middleware that requires valid authentication
func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := m.extractToken(c)
		if err != nil {
			m.respondUnauthorized(c, "MISSING_TOKEN", "Authorization token required")
			return
		}

		user, err := m.authService.ValidateToken(token)
		if err != nil {
			m.handleTokenError(c, err)
			return
		}

		// Extract session ID from token claims
		claims, err := m.jwtManager.ValidateAccessToken(token)
		if err != nil {
			m.handleTokenError(c, err)
			return
		}

		// Set user context
		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("user_email", user.Email)
		c.Set("user_role", user.Role)
		c.Set("session_id", claims.SessionID)

		m.logger.Debug("User authenticated",
			"user_id", user.ID,
			"email", user.Email,
			"role", user.Role,
			"path", c.Request.URL.Path,
		)

		c.Next()
	}
}

// RequireRole middleware that requires specific role(s)
func (m *AuthMiddleware) RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			m.respondForbidden(c, "MISSING_USER_CONTEXT", "User context not found")
			return
		}

		role := userRole.(string)
		for _, requiredRole := range roles {
			if role == requiredRole {
				c.Next()
				return
			}
		}

		m.logger.Warn("Access denied - insufficient role",
			"user_role", role,
			"required_roles", roles,
			"path", c.Request.URL.Path,
		)

		m.respondForbidden(c, "INSUFFICIENT_ROLE", "Insufficient permissions")
	}
}

// RequireAdmin middleware that requires admin role
func (m *AuthMiddleware) RequireAdmin() gin.HandlerFunc {
	return m.RequireRole("admin")
}

// RequireBusinessOwner middleware that requires business owner role
func (m *AuthMiddleware) RequireBusinessOwner() gin.HandlerFunc {
	return m.RequireRole("business_owner", "admin")
}

// OptionalAuth middleware that optionally authenticates users
func (m *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := m.extractToken(c)
		if err != nil {
			// No token provided, continue without authentication
			c.Next()
			return
		}

		user, err := m.authService.ValidateToken(token)
		if err != nil {
			// Invalid token, continue without authentication
			m.logger.Debug("Optional auth failed", "error", err)
			c.Next()
			return
		}

		// Extract session ID from token claims
		claims, err := m.jwtManager.ValidateAccessToken(token)
		if err != nil {
			c.Next()
			return
		}

		// Set user context
		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("user_email", user.Email)
		c.Set("user_role", user.Role)
		c.Set("session_id", claims.SessionID)

		c.Next()
	}
}

// extractToken extracts the JWT token from the Authorization header
func (m *AuthMiddleware) extractToken(c *gin.Context) (string, error) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return "", jwt.ErrMissingToken
	}

	return m.jwtManager.ExtractTokenFromHeader(authHeader)
}

// handleTokenError handles JWT token validation errors
func (m *AuthMiddleware) handleTokenError(c *gin.Context, err error) {
	switch err {
	case jwt.ErrTokenExpired:
		m.respondUnauthorized(c, "TOKEN_EXPIRED", "Token has expired")
	case jwt.ErrTokenNotValidYet:
		m.respondUnauthorized(c, "TOKEN_NOT_VALID_YET", "Token is not valid yet")
	case jwt.ErrInvalidToken:
		m.respondUnauthorized(c, "INVALID_TOKEN", "Invalid token")
	case jwt.ErrInvalidTokenType:
		m.respondUnauthorized(c, "INVALID_TOKEN_TYPE", "Invalid token type")
	case jwt.ErrInvalidIssuer:
		m.respondUnauthorized(c, "INVALID_ISSUER", "Invalid token issuer")
	case jwt.ErrMissingToken:
		m.respondUnauthorized(c, "MISSING_TOKEN", "Authorization token required")
	case jwt.ErrInvalidTokenFormat:
		m.respondUnauthorized(c, "INVALID_TOKEN_FORMAT", "Invalid token format")
	case service.ErrAccountDisabled:
		m.respondForbidden(c, "ACCOUNT_DISABLED", "Account is disabled")
	default:
		m.logger.Error("Token validation error", "error", err)
		m.respondUnauthorized(c, "TOKEN_VALIDATION_ERROR", "Token validation failed")
	}
}

// respondUnauthorized sends an unauthorized response
func (m *AuthMiddleware) respondUnauthorized(c *gin.Context, code, message string) {
	response := gin.H{
		"success": false,
		"error": gin.H{
			"code":    code,
			"message": message,
		},
		"timestamp": getCurrentTimestamp(),
	}

	m.logger.Warn("Unauthorized access attempt",
		"error_code", code,
		"message", message,
		"path", c.Request.URL.Path,
		"method", c.Request.Method,
		"ip_address", c.ClientIP(),
		"user_agent", c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusUnauthorized, response)
	c.Abort()
}

// respondForbidden sends a forbidden response
func (m *AuthMiddleware) respondForbidden(c *gin.Context, code, message string) {
	response := gin.H{
		"success": false,
		"error": gin.H{
			"code":    code,
			"message": message,
		},
		"timestamp": getCurrentTimestamp(),
	}

	m.logger.Warn("Forbidden access attempt",
		"error_code", code,
		"message", message,
		"path", c.Request.URL.Path,
		"method", c.Request.Method,
		"ip_address", c.ClientIP(),
		"user_agent", c.GetHeader("User-Agent"),
	)

	c.JSON(http.StatusForbidden, response)
	c.Abort()
}

// getCurrentTimestamp returns the current timestamp in ISO 8601 format
func getCurrentTimestamp() string {
	return time.Now().UTC().Format(time.RFC3339)
}
