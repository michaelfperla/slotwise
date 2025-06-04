package handlers

import (
	"net/http"
	"strings" // Added import
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"github.com/slotwise/scheduling-service/internal/service"
	"github.com/slotwise/scheduling-service/pkg/logger"
	"gorm.io/gorm"
)

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
		if strings.Contains(err.Error(), "not found") { // Basic error checking, could be more robust
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
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "does not belong") || strings.Contains(err.Error(), "not active") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve slots: " + err.Error()})
		}
		return
	}
	
	// For public view, we might want to simplify the TimeSlot struct or ensure it's what frontend expects.
	// Current service.APISlot: { StartTime time.Time, EndTime time.Time, Available bool, ConflictReason string }
	// The API contract requires a "lastUpdated" field in the response.
	response := gin.H{
		"slots":       slots, // slots will be an array of APISlot
		"lastUpdated": time.Now().UTC().Format(time.RFC3339),
	}

	if len(slots) == 0 {
		// To ensure "slots" is always an array in JSON, even if empty.
		response["slots"] = []service.APISlot{}
		// Optionally, include a message if desired, but the primary data is the empty slots array.
		// response["message"] = "No slots available for the selected service and date."
	}

	c.JSON(http.StatusOK, response)
}

// CreateAvailabilityRule handles POST /api/v1/availability/rules
func (h *AvailabilityHandler) CreateAvailabilityRule(c *gin.Context) {
	var req service.CreateAvailabilityRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind JSON for CreateAvailabilityRule", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	// Basic validation, more can be added in the service layer
	if req.BusinessID == "" || req.DayOfWeek == "" || req.StartTime == "" || req.EndTime == "" {
		h.logger.Warn("Missing required fields for CreateAvailabilityRule", "request", req)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields: businessId, dayOfWeek, startTime, endTime"})
		return
	}

	h.logger.Info("Attempting to create availability rule", "businessId", req.BusinessID, "day", req.DayOfWeek)

	rule, err := h.service.CreateAvailabilityRule(c.Request.Context(), req)
	if err != nil {
		h.logger.Error("Failed to create availability rule via service", "error", err)
		if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "must be before") { // crude way to check for validation errors
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create availability rule: " + err.Error()})
		}
		return
	}

	h.logger.Info("Availability rule created successfully", "ruleId", rule.ID)
	c.JSON(http.StatusCreated, rule)
}

// GetBusinessCalendarHandler handles GET /api/v1/businesses/{businessId}/calendar
// Query params: start, end (YYYY-MM-DD)
func (h *AvailabilityHandler) GetBusinessCalendarHandler(c *gin.Context) {
	businessID := c.Param("businessId")
	startDateStr := c.Query("start")
	endDateStr := c.Query("end")

	if businessID == "" {
		h.logger.Warn("GetBusinessCalendarHandler called with no businessId")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Business ID is required"})
		return
	}
	if startDateStr == "" || endDateStr == "" {
		h.logger.Warn("GetBusinessCalendarHandler called without start or end date", "businessId", businessID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Start and end dates are required (YYYY-MM-DD)"})
		return
	}

	startDate, err := time.ParseInLocation("2006-01-02", startDateStr, time.Local) // Assuming server local time for date parsing
	if err != nil {
		h.logger.Error("Invalid start date format for GetBusinessCalendarHandler", "startDate", startDateStr, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format, please use YYYY-MM-DD"})
		return
	}
	endDate, err := time.ParseInLocation("2006-01-02", endDateStr, time.Local) // Assuming server local time
	if err != nil {
		h.logger.Error("Invalid end date format for GetBusinessCalendarHandler", "endDate", endDateStr, "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format, please use YYYY-MM-DD"})
		return
	}

	// It's common to want the endDate to be inclusive for the whole day.
	// The service layer currently handles this by adding 23h59m59s for booking queries.
	// For the date range itself, startDate and endDate are sufficient.

	h.logger.Info("Getting business calendar", "businessId", businessID, "start", startDateStr, "end", endDateStr)

	calendarResponse, err := h.service.GetBusinessCalendar(c.Request.Context(), businessID, startDate, endDate)
	if err != nil {
		h.logger.Error("Failed to get business calendar from service", "businessId", businessID, "error", err)
		// Distinguish between not found / bad input vs internal errors
		if strings.Contains(err.Error(), "cannot be after") || strings.Contains(err.Error(), "cannot be empty") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve business calendar: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, calendarResponse)
}


// UpdateAvailabilityRule handles PUT /availability/rules/:id
func (h *AvailabilityHandler) UpdateAvailabilityRule(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual update logic
	// 1. Bind JSON to an update request struct
	// 2. Call a service method e.g., h.service.UpdateAvailabilityRule(ctx, id, updateReq)
	// 3. Return updated rule or error
	h.logger.Info("Updating availability rule (stub)", "id", id)
	c.JSON(http.StatusOK, gin.H{"message": "Availability rule updated (stub) - NOT IMPLEMENTED", "id": id})
}

// DeleteAvailabilityRule handles DELETE /availability/rules/:id
func (h *AvailabilityHandler) DeleteAvailabilityRule(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual delete logic
	// 1. Call a service method e.g., h.service.DeleteAvailabilityRule(ctx, id)
	// 2. Return success (e.g., 204 No Content) or error
	h.logger.Info("Deleting availability rule (stub)", "id", id)
	c.JSON(http.StatusOK, gin.H{"message": "Availability rule deleted (stub) - NOT IMPLEMENTED", "id": id})
}

// CreateAvailabilityException handles POST /availability/exceptions
func (h *AvailabilityHandler) CreateAvailabilityException(c *gin.Context) {
	// TODO: Implement actual exception creation logic
	// 1. Bind JSON to a create exception request struct
	// 2. Call a service method e.g., h.service.CreateAvailabilityException(ctx, createReq)
	// 3. Return created exception or error
	h.logger.Info("Creating availability exception (stub)")
	c.JSON(http.StatusCreated, gin.H{"message": "Availability exception created (stub) - NOT IMPLEMENTED"})
}

// UpdateAvailabilityException handles PUT /availability/exceptions/:id
func (h *AvailabilityHandler) UpdateAvailabilityException(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual exception update logic
	h.logger.Info("Updating availability exception (stub)", "id", id)
	c.JSON(http.StatusOK, gin.H{"message": "Availability exception updated (stub) - NOT IMPLEMENTED", "id": id})
}

// DeleteAvailabilityException handles DELETE /availability/exceptions/:id
func (h *AvailabilityHandler) DeleteAvailabilityException(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual exception delete logic
	h.logger.Info("Deleting availability exception (stub)", "id", id)
	c.JSON(http.StatusOK, gin.H{"message": "Availability exception deleted (stub) - NOT IMPLEMENTED", "id": id})
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
