package middleware

import (
	"bytes"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/slotwise/auth-service/pkg/logger"
)

// LoggingConfig holds logging middleware configuration
type LoggingConfig struct {
	SkipPaths   []string // Paths to skip logging
	LogBody     bool     // Whether to log request/response bodies
	MaxBodySize int      // Maximum body size to log (in bytes)
}

// DefaultLoggingConfig returns default logging configuration
func DefaultLoggingConfig() LoggingConfig {
	return LoggingConfig{
		SkipPaths: []string{
			"/health",
			"/health/liveness",
			"/health/readiness",
			"/metrics",
		},
		LogBody:     false, // Don't log bodies by default for security
		MaxBodySize: 1024,  // 1KB max body size to log
	}
}

// RequestLogging returns a logging middleware
func RequestLogging(logger logger.Logger, config LoggingConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip logging for specified paths
		for _, skipPath := range config.SkipPaths {
			if c.Request.URL.Path == skipPath {
				c.Next()
				return
			}
		}

		// Generate request ID
		requestID := uuid.New().String()
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)

		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method
		clientIP := c.ClientIP()
		userAgent := c.Request.UserAgent()

		// Log request body if enabled
		var requestBody string
		if config.LogBody && c.Request.Body != nil {
			bodyBytes, err := io.ReadAll(c.Request.Body)
			if err == nil && len(bodyBytes) <= config.MaxBodySize {
				requestBody = string(bodyBytes)
				// Restore the body for the actual handler
				c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			}
		}

		// Create response writer wrapper to capture response
		writer := &responseWriter{
			ResponseWriter: c.Writer,
			body:           &bytes.Buffer{},
		}
		c.Writer = writer

		// Log request start
		requestLogger := logger.With(
			"request_id", requestID,
			"method", method,
			"path", path,
			"client_ip", clientIP,
			"user_agent", userAgent,
		)

		if requestBody != "" {
			requestLogger = requestLogger.With("request_body", requestBody)
		}

		requestLogger.Info("Request started")

		// Process request
		c.Next()

		// Calculate duration
		duration := time.Since(start)
		statusCode := c.Writer.Status()

		// Get user info if available
		var userID, userEmail string
		if uid, exists := c.Get("user_id"); exists {
			userID = uid.(string)
		}
		if email, exists := c.Get("user_email"); exists {
			userEmail = email.(string)
		}

		// Log response body if enabled and not too large
		var responseBody string
		if config.LogBody && writer.body.Len() <= config.MaxBodySize {
			responseBody = writer.body.String()
		}

		// Create response logger
		responseLogger := requestLogger.With(
			"status_code", statusCode,
			"duration_ms", duration.Milliseconds(),
			"response_size", writer.body.Len(),
		)

		if userID != "" {
			responseLogger = responseLogger.With("user_id", userID)
		}
		if userEmail != "" {
			responseLogger = responseLogger.With("user_email", userEmail)
		}
		if responseBody != "" {
			responseLogger = responseLogger.With("response_body", responseBody)
		}

		// Log based on status code
		if statusCode >= 500 {
			responseLogger.Error("Request completed with server error")
		} else if statusCode >= 400 {
			responseLogger.Warn("Request completed with client error")
		} else {
			responseLogger.Info("Request completed successfully")
		}
	}
}

// DefaultRequestLogging returns a logging middleware with default configuration
func DefaultRequestLogging(logger logger.Logger) gin.HandlerFunc {
	return RequestLogging(logger, DefaultLoggingConfig())
}

// SecurityLogging returns a middleware that logs security-related events
func SecurityLogging(logger logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		method := c.Request.Method
		clientIP := c.ClientIP()
		userAgent := c.Request.UserAgent()

		// Log security events for auth endpoints
		if isAuthEndpoint(path) {
			securityLogger := logger.With(
				"security_event", "auth_attempt",
				"method", method,
				"path", path,
				"client_ip", clientIP,
				"user_agent", userAgent,
			)

			securityLogger.Info("Authentication attempt")
		}

		c.Next()

		// Log failed authentication attempts
		statusCode := c.Writer.Status()
		if isAuthEndpoint(path) && (statusCode == 401 || statusCode == 403) {
			securityLogger := logger.With(
				"security_event", "auth_failure",
				"method", method,
				"path", path,
				"status_code", statusCode,
				"client_ip", clientIP,
				"user_agent", userAgent,
			)

			if userID, exists := c.Get("user_id"); exists {
				securityLogger = securityLogger.With("user_id", userID)
			}

			securityLogger.Warn("Authentication failed")
		}
	}
}

// responseWriter wraps gin.ResponseWriter to capture response body
type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseWriter) Write(data []byte) (int, error) {
	// Write to both the original writer and our buffer
	w.body.Write(data)
	return w.ResponseWriter.Write(data)
}

// isAuthEndpoint checks if the path is an authentication endpoint
func isAuthEndpoint(path string) bool {
	authPaths := []string{
		"/auth/register",
		"/auth/login",
		"/auth/logout",
		"/auth/refresh",
		"/auth/verify-email",
		"/auth/forgot-password",
		"/auth/reset-password",
	}

	for _, authPath := range authPaths {
		if path == authPath {
			return true
		}
	}
	return false
}

// ErrorLogging returns a middleware that logs errors
func ErrorLogging(logger logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Log any errors that occurred during request processing
		if len(c.Errors) > 0 {
			errorLogger := logger.With(
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"client_ip", c.ClientIP(),
			)

			if requestID, exists := c.Get("request_id"); exists {
				errorLogger = errorLogger.With("request_id", requestID)
			}

			if userID, exists := c.Get("user_id"); exists {
				errorLogger = errorLogger.With("user_id", userID)
			}

			for _, err := range c.Errors {
				errorLogger.Error("Request error", "error", err.Error())
			}
		}
	}
}
