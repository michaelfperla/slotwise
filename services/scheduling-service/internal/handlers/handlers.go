package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"github.com/slotwise/scheduling-service/internal/repository"
	"github.com/slotwise/scheduling-service/internal/service"
	"github.com/slotwise/scheduling-service/pkg/logger"
	"gorm.io/gorm"
)

// BookingHandler handles booking HTTP requests
type BookingHandler struct {
	service *service.BookingService
	logger  *logger.Logger
}

// AvailabilityHandler handles availability HTTP requests
type AvailabilityHandler struct {
	service *service.AvailabilityService
	logger  *logger.Logger
}

// HealthHandler handles health check requests
type HealthHandler struct {
	db     *gorm.DB
	redis  *redis.Client
	nats   *nats.Conn
	logger *logger.Logger
}

// NewBookingHandler creates a new booking handler
func NewBookingHandler(service *service.BookingService, logger *logger.Logger) *BookingHandler {
	return &BookingHandler{service: service, logger: logger}
}

// CreateBooking handles POST /bookings
func (h *BookingHandler) CreateBooking(c *gin.Context) {
	// TODO: Implement booking creation
	h.logger.Info("Creating booking")
	c.JSON(http.StatusCreated, gin.H{"message": "Booking created (stub)"})
}

// GetBooking handles GET /bookings/:id
func (h *BookingHandler) GetBooking(c *gin.Context) {
	id := c.Param("id")
	h.logger.Info("Getting booking", "id", id)
	c.JSON(http.StatusOK, gin.H{"id": id, "status": "confirmed"})
}

// UpdateBooking handles PUT /bookings/:id
func (h *BookingHandler) UpdateBooking(c *gin.Context) {
	id := c.Param("id")
	h.logger.Info("Updating booking", "id", id)
	c.JSON(http.StatusOK, gin.H{"message": "Booking updated (stub)"})
}

// CancelBooking handles DELETE /bookings/:id
func (h *BookingHandler) CancelBooking(c *gin.Context) {
	id := c.Param("id")
	h.logger.Info("Canceling booking", "id", id)
	c.JSON(http.StatusOK, gin.H{"message": "Booking canceled (stub)"})
}

// ListBookings handles GET /bookings
func (h *BookingHandler) ListBookings(c *gin.Context) {
	h.logger.Info("Listing bookings")
	c.JSON(http.StatusOK, gin.H{"bookings": []repository.Booking{}})
}

// ConfirmBooking handles POST /bookings/:id/confirm
func (h *BookingHandler) ConfirmBooking(c *gin.Context) {
	id := c.Param("id")
	h.logger.Info("Confirming booking", "id", id)
	c.JSON(http.StatusOK, gin.H{"message": "Booking confirmed (stub)"})
}

// RescheduleBooking handles POST /bookings/:id/reschedule
func (h *BookingHandler) RescheduleBooking(c *gin.Context) {
	id := c.Param("id")
	h.logger.Info("Rescheduling booking", "id", id)
	c.JSON(http.StatusOK, gin.H{"message": "Booking rescheduled (stub)"})
}

// NewAvailabilityHandler creates a new availability handler
func NewAvailabilityHandler(service *service.AvailabilityService, logger *logger.Logger) *AvailabilityHandler {
	return &AvailabilityHandler{service: service, logger: logger}
}

// GetAvailability handles GET /availability - This seems like a general/public endpoint.
// The new one will be /internal/availability/:businessId/slots
func (h *AvailabilityHandler) GetAvailability(c *gin.Context) {
	// This existing GetAvailability might be for a different purpose or can be removed if not used.
	// For now, let's assume it's distinct or will be deprecated.
	// To avoid confusion, I'll name the new handler method specifically.
	h.logger.Info("Getting general availability (stub)")
	c.JSON(http.StatusOK, gin.H{"message": "General availability endpoint (stub)"})
}

// GetSlotsForBusinessServiceDate handles GET /internal/availability/:businessId/slots
// Query params: serviceId, date
func (h *AvailabilityHandler) GetSlotsForBusinessServiceDate(c *gin.Context) {
	businessID := c.Param("businessId")
	serviceID := c.Query("serviceId")
	dateStr := c.Query("date") // Expects YYYY-MM-DD

	if businessID == "" || serviceID == "" || dateStr == "" {
		h.logger.Error("Missing required parameters for GetSlots", "businessId", businessID, "serviceId", serviceID, "date", dateStr)
		c.JSON(http.StatusBadRequest, gin.H{"error": "businessId, serviceId, and date are required query parameters"})
		return
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		h.logger.Error("Invalid date format for GetSlots", "dateStr", dateStr, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, please use YYYY-MM-DD"})
		return
	}

	h.logger.Info("Getting specific slots for business/service/date", "businessId", businessID, "serviceId", serviceID, "date", dateStr)

	slots, err := h.service.GetAvailableSlots(c.Request.Context(), businessID, serviceID, date)
	if err != nil {
		// Error logging is done in the service, here we just map to HTTP response
		if err.Error().Contains("not found") { // Basic error checking, could be more robust
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve slots: " + err.Error()})
		}
		return
	}

	if len(slots) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "No slots available for the given criteria.", "slots": []string{}}) // Return empty array for slots
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"slots": slots})
}

// GetPublicSlotsForService handles GET /api/v1/services/:serviceId/slots
// Query params: date, businessId (important: serviceId alone is not unique across businesses)
func (h *AvailabilityHandler) GetPublicSlotsForService(c *gin.Context) {
	serviceID := c.Param("serviceId")
	dateStr := c.Query("date")       // Expects YYYY-MM-DD
	businessID := c.Query("businessId") // Crucial to scope the service

	if serviceID == "" || dateStr == "" || businessID == "" {
		h.logger.Error("Missing required parameters for GetPublicSlotsForService", "serviceId", serviceID, "date", dateStr, "businessId", businessID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "serviceId, date, and businessId are required"})
		return
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		h.logger.Error("Invalid date format for GetPublicSlotsForService", "dateStr", dateStr, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, please use YYYY-MM-DD"})
		return
	}

	h.logger.Info("Getting public slots for service/date", "serviceId", serviceID, "date", dateStr, "businessId", businessID)

	// Note: AvailabilityService.GetAvailableSlots takes businessID, serviceID, date
	slots, err := h.service.GetAvailableSlots(c.Request.Context(), businessID, serviceID, date)
	if err != nil {
		if err.Error().Contains("not found") || err.Error().Contains("does not belong") || err.Error().Contains("not active") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve slots: " + err.Error()})
		}
		return
	}
	
	// For public view, we might want to simplify the TimeSlot struct or ensure it's what frontend expects.
	// Current TimeSlot: { StartTime time.Time, EndTime time.Time } - this is fine.
	if len(slots) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "No slots available for the selected service and date.", "slots": []service.TimeSlot{}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"slots": slots})
}


// CreateAvailabilityRule handles POST /availability/rules
func (h *AvailabilityHandler) CreateAvailabilityRule(c *gin.Context) {
	h.logger.Info("Creating availability rule")
	c.JSON(http.StatusCreated, gin.H{"message": "Availability rule created (stub)"})
}

// UpdateAvailabilityRule handles PUT /availability/rules/:id
func (h *AvailabilityHandler) UpdateAvailabilityRule(c *gin.Context) {
	id := c.Param("id")
	h.logger.Info("Updating availability rule", "id", id)
	c.JSON(http.StatusOK, gin.H{"message": "Availability rule updated (stub)"})
}

// DeleteAvailabilityRule handles DELETE /availability/rules/:id
func (h *AvailabilityHandler) DeleteAvailabilityRule(c *gin.Context) {
	id := c.Param("id")
	h.logger.Info("Deleting availability rule", "id", id)
	c.JSON(http.StatusOK, gin.H{"message": "Availability rule deleted (stub)"})
}

// CreateAvailabilityException handles POST /availability/exceptions
func (h *AvailabilityHandler) CreateAvailabilityException(c *gin.Context) {
	h.logger.Info("Creating availability exception")
	c.JSON(http.StatusCreated, gin.H{"message": "Availability exception created (stub)"})
}

// UpdateAvailabilityException handles PUT /availability/exceptions/:id
func (h *AvailabilityHandler) UpdateAvailabilityException(c *gin.Context) {
	id := c.Param("id")
	h.logger.Info("Updating availability exception", "id", id)
	c.JSON(http.StatusOK, gin.H{"message": "Availability exception updated (stub)"})
}

// DeleteAvailabilityException handles DELETE /availability/exceptions/:id
func (h *AvailabilityHandler) DeleteAvailabilityException(c *gin.Context) {
	id := c.Param("id")
	h.logger.Info("Deleting availability exception", "id", id)
	c.JSON(http.StatusOK, gin.H{"message": "Availability exception deleted (stub)"})
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(db *gorm.DB, redis *redis.Client, nats *nats.Conn, logger *logger.Logger) *HealthHandler {
	return &HealthHandler{db: db, redis: redis, nats: nats, logger: logger}
}

// Health handles GET /health
func (h *HealthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "scheduling-service"})
}

// Ready handles GET /health/ready
func (h *HealthHandler) Ready(c *gin.Context) {
	// TODO: Add actual readiness checks
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

// Live handles GET /health/live
func (h *HealthHandler) Live(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "alive"})
}
