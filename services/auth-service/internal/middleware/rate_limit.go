package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/slotwise/auth-service/pkg/logger"
)

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	Requests    int                       // Number of requests allowed
	Window      time.Duration             // Time window
	KeyFunc     func(*gin.Context) string // Function to generate rate limit key
	SkipFunc    func(*gin.Context) bool   // Function to skip rate limiting
	OnLimitFunc func(*gin.Context)        // Function called when limit is exceeded
}

// RateLimiter provides rate limiting functionality
type RateLimiter struct {
	redis  *redis.Client
	config RateLimitConfig
	logger logger.Logger
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(redis *redis.Client, config RateLimitConfig, logger logger.Logger) *RateLimiter {
	// Set default key function if not provided
	if config.KeyFunc == nil {
		config.KeyFunc = func(c *gin.Context) string {
			return c.ClientIP()
		}
	}

	// Set default skip function if not provided
	if config.SkipFunc == nil {
		config.SkipFunc = func(c *gin.Context) bool {
			return false
		}
	}

	// Set default on limit function if not provided
	if config.OnLimitFunc == nil {
		config.OnLimitFunc = func(c *gin.Context) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": "Too many requests",
				},
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			c.Abort()
		}
	}

	return &RateLimiter{
		redis:  redis,
		config: config,
		logger: logger,
	}
}

// Middleware returns the rate limiting middleware
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip rate limiting if skip function returns true
		if rl.config.SkipFunc(c) {
			c.Next()
			return
		}

		key := rl.generateKey(c)
		allowed, remaining, resetTime, err := rl.checkLimit(key)
		if err != nil {
			rl.logger.Error("Rate limit check failed", "error", err, "key", key)
			// On error, allow the request to proceed
			c.Next()
			return
		}

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", strconv.Itoa(rl.config.Requests))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(resetTime.Unix(), 10))

		if !allowed {
			rl.logger.Warn("Rate limit exceeded",
				"key", key,
				"ip", c.ClientIP(),
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
			)
			rl.config.OnLimitFunc(c)
			return
		}

		c.Next()
	}
}

// checkLimit checks if the request is within the rate limit
func (rl *RateLimiter) checkLimit(key string) (allowed bool, remaining int, resetTime time.Time, err error) {
	ctx := context.Background()
	now := time.Now()
	window := rl.config.Window

	// Use sliding window log approach with Redis sorted sets
	pipe := rl.redis.Pipeline()

	// Remove expired entries
	expiredBefore := now.Add(-window).UnixNano()
	pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(expiredBefore, 10))

	// Count current requests in window
	pipe.ZCard(ctx, key)

	// Add current request
	pipe.ZAdd(ctx, key, redis.Z{
		Score:  float64(now.UnixNano()),
		Member: fmt.Sprintf("%d", now.UnixNano()),
	})

	// Set expiration on the key
	pipe.Expire(ctx, key, window+time.Minute) // Add buffer to prevent key leaks

	results, err := pipe.Exec(ctx)
	if err != nil {
		return false, 0, time.Time{}, err
	}

	// Get current count (before adding the new request)
	currentCount := results[1].(*redis.IntCmd).Val()

	// Calculate remaining requests
	remaining = rl.config.Requests - int(currentCount) - 1
	if remaining < 0 {
		remaining = 0
	}

	// Calculate reset time (end of current window)
	resetTime = now.Add(window)

	// Check if limit is exceeded
	allowed = currentCount < int64(rl.config.Requests)

	return allowed, remaining, resetTime, nil
}

// generateKey generates the rate limit key for the request
func (rl *RateLimiter) generateKey(c *gin.Context) string {
	baseKey := rl.config.KeyFunc(c)
	return fmt.Sprintf("rate_limit:%s", baseKey)
}

// IPBasedRateLimit creates a rate limiter based on IP address
func IPBasedRateLimit(redis *redis.Client, requests int, window time.Duration, logger logger.Logger) gin.HandlerFunc {
	config := RateLimitConfig{
		Requests: requests,
		Window:   window,
		KeyFunc: func(c *gin.Context) string {
			return c.ClientIP()
		},
	}

	limiter := NewRateLimiter(redis, config, logger)
	return limiter.Middleware()
}

// UserBasedRateLimit creates a rate limiter based on authenticated user
func UserBasedRateLimit(redis *redis.Client, requests int, window time.Duration, logger logger.Logger) gin.HandlerFunc {
	config := RateLimitConfig{
		Requests: requests,
		Window:   window,
		KeyFunc: func(c *gin.Context) string {
			// Try to get user ID from context (set by auth middleware)
			if userID, exists := c.Get("user_id"); exists {
				return fmt.Sprintf("user:%s", userID.(string))
			}
			// Fall back to IP if user is not authenticated
			return fmt.Sprintf("ip:%s", c.ClientIP())
		},
		SkipFunc: func(c *gin.Context) bool {
			// Skip rate limiting for admin users
			if role, exists := c.Get("user_role"); exists {
				return role.(string) == "admin"
			}
			return false
		},
	}

	limiter := NewRateLimiter(redis, config, logger)
	return limiter.Middleware()
}

// EndpointBasedRateLimit creates a rate limiter based on endpoint and IP
func EndpointBasedRateLimit(redis *redis.Client, requests int, window time.Duration, logger logger.Logger) gin.HandlerFunc {
	config := RateLimitConfig{
		Requests: requests,
		Window:   window,
		KeyFunc: func(c *gin.Context) string {
			return fmt.Sprintf("%s:%s:%s", c.Request.Method, c.Request.URL.Path, c.ClientIP())
		},
	}

	limiter := NewRateLimiter(redis, config, logger)
	return limiter.Middleware()
}

// AuthEndpointRateLimit creates a rate limiter for auth endpoints
func AuthEndpointRateLimit(redis *redis.Client, logger logger.Logger, requestsPerMinute int) gin.HandlerFunc {
	// Rate limits for authentication endpoints to prevent brute force attacks
	return IPBasedRateLimit(redis, requestsPerMinute, time.Minute, logger)
}

// GeneralRateLimit creates a general rate limiter for all endpoints
func GeneralRateLimit(redis *redis.Client, logger logger.Logger, requestsPerMinute int) gin.HandlerFunc {
	// General rate limiting for all endpoints
	return IPBasedRateLimit(redis, requestsPerMinute, time.Minute, logger)
}
