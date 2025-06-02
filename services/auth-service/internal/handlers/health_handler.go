package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/slotwise/auth-service/internal/database"
	"github.com/slotwise/auth-service/pkg/logger"
	"gorm.io/gorm"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	db     *gorm.DB
	redis  *redis.Client
	logger logger.Logger
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(db *gorm.DB, redis *redis.Client, logger logger.Logger) *HealthHandler {
	return &HealthHandler{
		db:     db,
		redis:  redis,
		logger: logger,
	}
}

// HealthStatus represents the health status of the service
type HealthStatus struct {
	Status      string                 `json:"status"`
	Timestamp   string                 `json:"timestamp"`
	Version     string                 `json:"version"`
	Environment string                 `json:"environment"`
	Uptime      string                 `json:"uptime"`
	Checks      map[string]CheckResult `json:"checks"`
}

// CheckResult represents the result of a health check
type CheckResult struct {
	Status    string `json:"status"`
	Message   string `json:"message,omitempty"`
	Duration  string `json:"duration"`
	Timestamp string `json:"timestamp"`
}

var (
	startTime = time.Now()
)

// Health returns the overall health status of the service
func (h *HealthHandler) Health(c *gin.Context) {
	checks := make(map[string]CheckResult)
	overallStatus := "healthy"

	// Check database
	dbCheck := h.checkDatabase()
	checks["database"] = dbCheck
	if dbCheck.Status != "healthy" {
		overallStatus = "unhealthy"
	}

	// Check Redis
	redisCheck := h.checkRedis()
	checks["redis"] = redisCheck
	if redisCheck.Status != "healthy" {
		overallStatus = "unhealthy"
	}

	// Calculate uptime
	uptime := time.Since(startTime)

	status := HealthStatus{
		Status:      overallStatus,
		Timestamp:   time.Now().UTC().Format(time.RFC3339),
		Version:     "1.0.0",       // TODO: Get from build info
		Environment: "development", // TODO: Get from config
		Uptime:      uptime.String(),
		Checks:      checks,
	}

	statusCode := http.StatusOK
	if overallStatus != "healthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, status)
}

// Readiness returns the readiness status of the service
func (h *HealthHandler) Readiness(c *gin.Context) {
	checks := make(map[string]CheckResult)
	ready := true

	// Check database connectivity
	dbCheck := h.checkDatabase()
	checks["database"] = dbCheck
	if dbCheck.Status != "healthy" {
		ready = false
	}

	// Check Redis connectivity
	redisCheck := h.checkRedis()
	checks["redis"] = redisCheck
	if redisCheck.Status != "healthy" {
		ready = false
	}

	status := map[string]interface{}{
		"ready":     ready,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"checks":    checks,
	}

	statusCode := http.StatusOK
	if !ready {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, status)
}

// Liveness returns the liveness status of the service
func (h *HealthHandler) Liveness(c *gin.Context) {
	// Simple liveness check - if we can respond, we're alive
	status := map[string]interface{}{
		"alive":     true,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"uptime":    time.Since(startTime).String(),
	}

	c.JSON(http.StatusOK, status)
}

// checkDatabase checks the database connection
func (h *HealthHandler) checkDatabase() CheckResult {
	start := time.Now()

	err := database.HealthCheck(h.db, nil)
	duration := time.Since(start)

	if err != nil {
		h.logger.Error("Database health check failed", "error", err)
		return CheckResult{
			Status:    "unhealthy",
			Message:   err.Error(),
			Duration:  duration.String(),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}

	return CheckResult{
		Status:    "healthy",
		Duration:  duration.String(),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

// checkRedis checks the Redis connection
func (h *HealthHandler) checkRedis() CheckResult {
	start := time.Now()

	err := database.HealthCheck(nil, h.redis)
	duration := time.Since(start)

	if err != nil {
		h.logger.Error("Redis health check failed", "error", err)
		return CheckResult{
			Status:    "unhealthy",
			Message:   err.Error(),
			Duration:  duration.String(),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}

	return CheckResult{
		Status:    "healthy",
		Duration:  duration.String(),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

// Metrics returns basic metrics about the service
func (h *HealthHandler) Metrics(c *gin.Context) {
	// Basic metrics - in production, you'd use Prometheus or similar
	metrics := map[string]interface{}{
		"uptime_seconds":  time.Since(startTime).Seconds(),
		"timestamp":       time.Now().UTC().Format(time.RFC3339),
		"go_version":      "1.21", // TODO: Get from runtime
		"service_name":    "auth-service",
		"service_version": "1.0.0",
		"environment":     "development", // TODO: Get from config
	}

	c.JSON(http.StatusOK, metrics)
}

// Info returns general information about the service
func (h *HealthHandler) Info(c *gin.Context) {
	info := map[string]interface{}{
		"service":     "auth-service",
		"version":     "1.0.0",
		"description": "Authentication and authorization service for SlotWise",
		"environment": "development",          // TODO: Get from config
		"build_time":  "2024-01-01T00:00:00Z", // TODO: Get from build info
		"git_commit":  "unknown",              // TODO: Get from build info
		"go_version":  "1.21",                 // TODO: Get from runtime
		"uptime":      time.Since(startTime).String(),
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, info)
}
