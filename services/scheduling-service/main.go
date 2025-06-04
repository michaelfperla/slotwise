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
	"github.com/slotwise-app/services/scheduling-service/internal/client" // Import notification client
	"github.com/slotwise-app/services/scheduling-service/internal/config"
	"github.com/slotwise-app/services/scheduling-service/internal/database"
	"github.com/slotwise-app/services/scheduling-service/internal/handlers"
	"github.com/slotwise-app/services/scheduling-service/internal/middleware"
	"github.com/slotwise-app/services/scheduling-service/internal/repository"
	"github.com/slotwise-app/services/scheduling-service/internal/service"
	"github.com/slotwise-app/services/scheduling-service/internal/subscribers" // Added import
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
	// AvailabilityService now needs BookingRepository
	availabilityService := service.NewAvailabilityService(availabilityRepo, bookingRepo, cacheRepo, eventPublisher, logger)

	// Initialize Notification Client
	notificationClient := client.NewNotificationServiceClient(cfg)

	// BookingService now needs AvailabilityRepository for service definitions and NotificationClient
	bookingService := service.NewBookingService(bookingRepo, availabilityService, availabilityRepo, eventPublisher, notificationClient, logger)
	
	// Initialize background scheduler
	cronScheduler := scheduler.New(bookingService, logger)
	cronScheduler.Start()
	defer cronScheduler.Stop()

	// Initialize handlers
	bookingHandler := handlers.NewBookingHandler(bookingService, logger)
	availabilityHandler := handlers.NewAvailabilityHandler(availabilityService, logger)
	healthHandler := handlers.NewHealthHandler(db, redisClient, natsConn, logger)

	// Initialize NATS event handlers (from subscribers package)
	natsEventHandlers := subscribers.NewNatsEventHandlers(db, logger)

	// Setup event subscribers
	eventSubscriber := events.NewSubscriber(natsConn, logger)
	if err := setupEventSubscribers(eventSubscriber, bookingService, availabilityService, natsEventHandlers); err != nil { // Pass natsEventHandlers
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
		// Booking routes (ensure these use the new methods from booking_handler.go)
		bookings := v1.Group("/bookings")
		// TODO: Add appropriate auth middleware for these routes.
		// Example: bookings.Use(middleware.RequireAuth())
		{
			bookings.POST("", bookingHandler.CreateBooking)          // POST /api/v1/bookings
			bookings.GET("/:bookingId", bookingHandler.GetBookingByID) // GET /api/v1/bookings/:bookingId
			bookings.GET("", bookingHandler.ListBookings)             // GET /api/v1/bookings?customerId=... or ?businessId=...
			bookings.PUT("/:bookingId/status", bookingHandler.UpdateBookingStatus) // PUT /api/v1/bookings/:bookingId/status

			// Remove or update old stubbed routes if they are different:
			// bookings.GET("/:id", bookingHandler.GetBooking) // This was likely the old GetBookingByID
			// bookings.PUT("/:id", bookingHandler.UpdateBooking) // This was likely the old UpdateBookingStatus or a general update
			// bookings.DELETE("/:id", bookingHandler.CancelBooking) // This might map to UpdateBookingStatus with "CANCELLED"
			// bookings.POST("/:id/confirm", bookingHandler.ConfirmBooking) // This might map to UpdateBookingStatus with "CONFIRMED"
			// bookings.POST("/:id/reschedule", bookingHandler.RescheduleBooking) // Future feature
		}

		// Availability routes
		availability := v1.Group("/availability")
		{
			availability.GET("/", availabilityHandler.GetAvailability) // Existing general availability endpoint
			// Add other existing availability rule/exception routes if they are still relevant
			// For example:
			// availability.POST("/rules", availabilityHandler.CreateAvailabilityRule)
			// availability.PUT("/rules/:id", availabilityHandler.UpdateAvailabilityRule)
			// ...
		}

		// Internal API for scheduling service (e.g. for slot generation)
		internal := v1.Group("/internal")
		// Add auth middleware if needed for internal APIs, e.g. service-to-service auth
		{
			internalAvailability := internal.Group("/availability")
			{
				internalAvailability.GET("/:businessId/slots", availabilityHandler.GetSlotsForBusinessServiceDate)
			}
		}

		// Publicly accessible slots endpoint for a specific service
		// GET /api/v1/services/:serviceId/slots?date=YYYY-MM-DD&businessId=...
		v1.GET("/services/:serviceId/slots", availabilityHandler.GetPublicSlotsForService)
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

// Updated function signature to include NatsEventHandlers
func setupEventSubscribers(
	subscriber *events.Subscriber,
	bookingService *service.BookingService,
	availabilityService *service.AvailabilityService,
	natsEventHandlers *subscribers.NatsEventHandlers, // Added
) error {
	// Subscribe to payment events (existing)
	if err := subscriber.Subscribe("payment.succeeded", bookingService.HandlePaymentSucceeded); err != nil {
		return fmt.Errorf("failed to subscribe to payment.succeeded: %w", err)
	}

	if err := subscriber.Subscribe("payment.failed", bookingService.HandlePaymentFailed); err != nil {
		return fmt.Errorf("failed to subscribe to payment.failed: %w", err)
	}

	// Subscribe to business events (existing - related to availability service)
	// Assuming availabilityService.HandleServiceUpdated is different from natsEventHandlers.HandleBusinessServiceCreated
	if err := subscriber.Subscribe("service.updated", availabilityService.HandleServiceUpdated); err != nil { // Keep if distinct
		return fmt.Errorf("failed to subscribe to service.updated: %w", err)
	}

	// Add new subscriptions for business events from Business Service
	if err := subscriber.Subscribe("business.service.created", natsEventHandlers.HandleBusinessServiceCreated); err != nil {
		return fmt.Errorf("failed to subscribe to business.service.created: %w", err)
	}

	if err := subscriber.Subscribe("business.availability.updated", natsEventHandlers.HandleBusinessAvailabilityUpdated); err != nil {
		return fmt.Errorf("failed to subscribe to business.availability.updated: %w", err)
	}

	return nil
}
