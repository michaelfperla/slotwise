package router

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/slotwise/auth-service/internal/config"
	"github.com/slotwise/auth-service/internal/handlers"
	"github.com/slotwise/auth-service/internal/middleware"
	"github.com/slotwise/auth-service/internal/service"
	"github.com/slotwise/auth-service/pkg/jwt"
	"github.com/slotwise/auth-service/pkg/logger"
	"gorm.io/gorm"
)

// RouterConfig holds router configuration
type RouterConfig struct {
	DB          *gorm.DB
	Redis       *redis.Client
	AuthService service.AuthService
	JWTManager  *jwt.Manager
	Config      *config.Config
	Logger      logger.Logger
}

// SetupRouter sets up the Gin router with all routes and middleware
func SetupRouter(cfg RouterConfig) *gin.Engine {
	// Set Gin mode based on environment
	if cfg.Config.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	router := gin.New()

	// Recovery middleware
	router.Use(gin.Recovery())

	// CORS middleware
	if cfg.Config.Environment == "production" {
		// In production, use specific allowed origins
		allowedOrigins := []string{
			"https://app.slotwise.com",
			"https://slotwise.com",
		}
		router.Use(middleware.ProductionCORS(allowedOrigins))
	} else {
		// In development, use permissive CORS
		router.Use(middleware.DevelopmentCORS())
	}

	// Logging middleware
	router.Use(middleware.DefaultRequestLogging(cfg.Logger))
	router.Use(middleware.SecurityLogging(cfg.Logger))
	router.Use(middleware.ErrorLogging(cfg.Logger))

	// General rate limiting (configurable per environment)
	generalRateLimit := cfg.Config.RateLimit.RequestsPerMinute
	if generalRateLimit == 0 {
		generalRateLimit = 100 // fallback default
	}
	router.Use(middleware.GeneralRateLimit(cfg.Redis, cfg.Logger, generalRateLimit))

	// Create handlers
	authHandler := handlers.NewAuthHandler(cfg.AuthService, cfg.Logger)
	healthHandler := handlers.NewHealthHandler(cfg.DB, cfg.Redis, cfg.Logger)

	// Create auth middleware
	authMiddleware := middleware.NewAuthMiddleware(cfg.AuthService, cfg.JWTManager, cfg.Logger)

	// Health check routes (no authentication required)
	health := router.Group("/health")
	{
		health.GET("", healthHandler.Health)
		health.GET("/liveness", healthHandler.Liveness)
		health.GET("/readiness", healthHandler.Readiness)
	}

	// Metrics route (no authentication required)
	router.GET("/metrics", healthHandler.Metrics)

	// Info route (no authentication required)
	router.GET("/info", healthHandler.Info)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Public auth routes (no authentication required)
		auth := v1.Group("/auth")
		{
			// Apply rate limiting for auth endpoints (configurable per environment)
			authRateLimit := cfg.Config.RateLimit.AuthRequestsPerMinute
			if authRateLimit == 0 {
				authRateLimit = 5 // fallback to strict limit if not configured
			}
			auth.Use(middleware.AuthEndpointRateLimit(cfg.Redis, cfg.Logger, authRateLimit))

			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/verify-email", authHandler.VerifyEmail)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password", authHandler.ResetPassword)
			// Magic login endpoints
			auth.POST("/phone-login", authHandler.PhoneLogin)
			auth.POST("/email-login", authHandler.EmailLogin)
			auth.POST("/verify-code", authHandler.VerifyCode)
		}

		// Protected auth routes (authentication required)
		authProtected := v1.Group("/auth")
		authProtected.Use(authMiddleware.RequireAuth())
		{
			authProtected.POST("/logout", authHandler.Logout)
			authProtected.GET("/me", authHandler.Me)
		}

		// User management routes (authentication required)
		users := v1.Group("/users")
		users.Use(authMiddleware.RequireAuth())
		{
			users.GET("/profile", authHandler.Me) // Alias for /auth/me
			// TODO: Add user profile update endpoints
		}

		// Admin routes (admin authentication required)
		admin := v1.Group("/admin")
		admin.Use(authMiddleware.RequireAuth())
		admin.Use(authMiddleware.RequireAdmin())
		{
			// TODO: Add admin-specific endpoints
			// admin.GET("/users", adminHandler.ListUsers)
			// admin.PUT("/users/:id/status", adminHandler.UpdateUserStatus)
		}
	}

	// Catch-all route for undefined endpoints
	router.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Endpoint not found",
			},
			"timestamp": getCurrentTimestamp(),
		})
	})

	// Handle method not allowed
	router.NoMethod(func(c *gin.Context) {
		c.JSON(405, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "METHOD_NOT_ALLOWED",
				"message": "Method not allowed",
			},
			"timestamp": getCurrentTimestamp(),
		})
	})

	return router
}

// getCurrentTimestamp returns the current timestamp in ISO 8601 format
func getCurrentTimestamp() string {
	return time.Now().UTC().Format(time.RFC3339)
}
