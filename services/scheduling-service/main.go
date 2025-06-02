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

	"github.com/gin-gonic/gin"
	"github.com/slotwise/scheduling-service/internal/config"
	"github.com/slotwise/scheduling-service/internal/database"
	"github.com/slotwise/scheduling-service/internal/handlers"
	"github.com/slotwise/scheduling-service/internal/middleware"
	"github.com/slotwise/scheduling-service/internal/repository"
	"github.com/slotwise/scheduling-service/internal/service"
	"github.com/slotwise/scheduling-service/pkg/events"
	"github.com/slotwise/scheduling-service/pkg/logger"
	"github.com/slotwise/scheduling-service/pkg/scheduler"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize logger
	logger := logger.New(cfg.LogLevel)

	// Initialize database
	db, err := database.Connect(cfg.Database)
	if err != nil {
		logger.Fatal("Failed to connect to database", "error", err)
	}

	// Run database migrations
	if err := database.Migrate(db); err != nil {
		logger.Fatal("Failed to run database migrations", "error", err)
	}

	// Initialize Redis
	redisClient, err := database.ConnectRedis(cfg.Redis)
	if err != nil {
		logger.Fatal("Failed to connect to Redis", "error", err)
	}

	// Initialize NATS
	natsConn, err := events.Connect(cfg.NATS)
	if err != nil {
		logger.Fatal("Failed to connect to NATS", "error", err)
	}
	defer natsConn.Close()

	// Initialize event publisher
	eventPublisher := events.NewPublisher(natsConn, logger)

	// Initialize repositories
	bookingRepo := repository.NewBookingRepository(db)
	availabilityRepo := repository.NewAvailabilityRepository(db)
	cacheRepo := repository.NewCacheRepository(redisClient)

	// Initialize services
	availabilityService := service.NewAvailabilityService(availabilityRepo, cacheRepo, eventPublisher, logger)
	bookingService := service.NewBookingService(bookingRepo, availabilityService, eventPublisher, logger)
	
	// Initialize background scheduler
	cronScheduler := scheduler.New(bookingService, logger)
	cronScheduler.Start()
	defer cronScheduler.Stop()

	// Initialize handlers
	bookingHandler := handlers.NewBookingHandler(bookingService, logger)
	availabilityHandler := handlers.NewAvailabilityHandler(availabilityService, logger)
	healthHandler := handlers.NewHealthHandler(db, redisClient, natsConn, logger)

	// Setup event subscribers
	eventSubscriber := events.NewSubscriber(natsConn, logger)
	if err := setupEventSubscribers(eventSubscriber, bookingService, availabilityService); err != nil {
		logger.Fatal("Failed to setup event subscribers", "error", err)
	}

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger(logger))
	router.Use(middleware.CORS())
	router.Use(middleware.RequestID())

	// Health check routes
	router.GET("/health", healthHandler.Health)
	router.GET("/health/ready", healthHandler.Ready)
	router.GET("/health/live", healthHandler.Live)

	// API routes
	v1 := router.Group("/api/v1")
	{
		// Booking routes
		bookings := v1.Group("/bookings")
		{
			bookings.POST("/", bookingHandler.CreateBooking)
			bookings.GET("/:id", bookingHandler.GetBooking)
			bookings.PUT("/:id", bookingHandler.UpdateBooking)
			bookings.DELETE("/:id", bookingHandler.CancelBooking)
			bookings.GET("/", bookingHandler.ListBookings)
			bookings.POST("/:id/confirm", bookingHandler.ConfirmBooking)
			bookings.POST("/:id/reschedule", bookingHandler.RescheduleBooking)
		}

		// Availability routes
		availability := v1.Group("/availability")
		{
			availability.GET("/", availabilityHandler.GetAvailability)
			availability.POST("/rules", availabilityHandler.CreateAvailabilityRule)
			availability.PUT("/rules/:id", availabilityHandler.UpdateAvailabilityRule)
			availability.DELETE("/rules/:id", availabilityHandler.DeleteAvailabilityRule)
			availability.POST("/exceptions", availabilityHandler.CreateAvailabilityException)
			availability.PUT("/exceptions/:id", availabilityHandler.UpdateAvailabilityException)
			availability.DELETE("/exceptions/:id", availabilityHandler.DeleteAvailabilityException)
		}
	}

	// Create HTTP server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.Info("Starting Scheduling Service", "port", cfg.Port, "environment", cfg.Environment)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", "error", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down Scheduling Service...")

	// Give outstanding requests 30 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", "error", err)
	}

	logger.Info("Scheduling Service stopped")
}

func setupEventSubscribers(subscriber *events.Subscriber, bookingService *service.BookingService, availabilityService *service.AvailabilityService) error {
	// Subscribe to payment events
	if err := subscriber.Subscribe("payment.succeeded", bookingService.HandlePaymentSucceeded); err != nil {
		return fmt.Errorf("failed to subscribe to payment.succeeded: %w", err)
	}

	if err := subscriber.Subscribe("payment.failed", bookingService.HandlePaymentFailed); err != nil {
		return fmt.Errorf("failed to subscribe to payment.failed: %w", err)
	}

	// Subscribe to business events
	if err := subscriber.Subscribe("service.updated", availabilityService.HandleServiceUpdated); err != nil {
		return fmt.Errorf("failed to subscribe to service.updated: %w", err)
	}

	return nil
}
