package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/slotwise/auth-service/internal/config"
	"github.com/slotwise/auth-service/internal/database"
	"github.com/slotwise/auth-service/internal/repository"
	"github.com/slotwise/auth-service/internal/router"
	"github.com/slotwise/auth-service/internal/service"
	"github.com/slotwise/auth-service/pkg/events"
	"github.com/slotwise/auth-service/pkg/jwt"
	"github.com/slotwise/auth-service/pkg/logger"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize logger
	appLogger := logger.New(cfg.LogLevel)
	appLogger.Info("Starting auth service", "version", "1.0.0", "environment", cfg.Environment)

	// Connect to database
	db, err := database.Connect(cfg.Database)
	if err != nil {
		appLogger.Fatal("Failed to connect to database", "error", err)
	}
	appLogger.Info("Connected to database successfully")

	// Run migrations
	if err := database.Migrate(db); err != nil {
		appLogger.Fatal("Failed to run migrations", "error", err)
	}
	appLogger.Info("Database migrations completed successfully")

	// Connect to Redis
	redis, err := database.ConnectRedis(cfg.Redis)
	if err != nil {
		appLogger.Fatal("Failed to connect to Redis", "error", err)
	}
	appLogger.Info("Connected to Redis successfully")

	// Connect to NATS
	natsConn, err := events.Connect(cfg.NATS)
	if err != nil {
		appLogger.Fatal("Failed to connect to NATS", "error", err)
	}
	defer natsConn.Close()
	appLogger.Info("Connected to NATS successfully")

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	sessionRepo := repository.NewSessionRepository(redis)
	appLogger.Info("Repositories initialized")

	// Initialize event publisher
	eventPublisher := events.NewPublisher(natsConn, appLogger)
	appLogger.Info("Event publisher initialized")

	// Initialize JWT manager
	jwtManager := jwt.NewManager(cfg.JWT)
	appLogger.Info("JWT manager initialized")

	// Initialize services
	authService := service.NewAuthService(userRepo, sessionRepo, eventPublisher, cfg.JWT, appLogger)
	appLogger.Info("Services initialized")

	// Setup router with all components
	routerConfig := router.RouterConfig{
		DB:          db,
		Redis:       redis,
		AuthService: authService,
		JWTManager:  jwtManager,
		Config:      cfg,
		Logger:      appLogger,
	}

	ginRouter := router.SetupRouter(routerConfig)
	appLogger.Info("Router configured with all middleware and handlers")

	// Create HTTP server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      ginRouter,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		appLogger.Info("Starting HTTP server", "port", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			appLogger.Fatal("Failed to start server", "error", err)
		}
	}()

	appLogger.Info("Auth service started successfully",
		"port", cfg.Port,
		"environment", cfg.Environment,
		"log_level", cfg.LogLevel,
	)

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	appLogger.Info("Received shutdown signal, starting graceful shutdown...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown HTTP server
	if err := server.Shutdown(ctx); err != nil {
		appLogger.Error("Server shutdown error", "error", err)
	}

	// Close database connections
	if err := database.Close(db, redis); err != nil {
		appLogger.Error("Failed to close database connections", "error", err)
	}

	appLogger.Info("Auth service shutdown completed")
}
