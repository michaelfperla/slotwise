package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/slotwise/scheduling-service/internal/models"
	"github.com/slotwise/scheduling-service/internal/service"
	"github.com/slotwise/scheduling-service/pkg/logger"
	// "github.com/slotwise/scheduling-service/internal/middleware" // For CustomerID from context
)

// BookingHandler handles booking HTTP requests
type BookingHandler struct {
	service *service.BookingService
	logger  *logger.Logger
}

// NewBookingHandler creates a new booking handler
func NewBookingHandler(service *service.BookingService, logger *logger.Logger) *BookingHandler {
	return &BookingHandler{service: service, logger: logger}
}

// CreateBookingRequestDTO an DTO for POST /bookings (renamed from CreateBookingRequest to avoid conflict if any)
type CreateBookingRequestDTO struct {
	BusinessID string    `json:"businessId" binding:"required"`
	ServiceID  string    `json:"serviceId" binding:"required"`
	CustomerID string    `json:"customerId" binding:"required"` // Should ideally come from JWT auth context
	StartTime  time.Time `json:"startTime" binding:"required"`
}

// UpdateBookingStatusRequestDTO is a DTO for PUT /bookings/:bookingId/status
type UpdateBookingStatusRequestDTO struct {
	Status models.BookingStatus `json:"status" binding:"required"`
}

// CreateBooking handles POST /api/v1/bookings
func (h *BookingHandler) CreateBooking(c *gin.Context) {
	var req CreateBookingRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind CreateBooking request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	// TODO: In a real app, CustomerID should be extracted from authenticated user context (e.g., JWT claims)
	// customerID := c.GetString(middleware.ContextKeyCustomerID) // Example if using a middleware
	// For MVP, we are taking it from request body but this is not secure / ideal.
	// If req.CustomerID != customerIDFromAuth { return c.Status(http.StatusForbidden) }

	serviceReq := service.CreateBookingRequest{
		BusinessID: req.BusinessID,
		ServiceID:  req.ServiceID,
		CustomerID: req.CustomerID, // Use authenticated customer ID here
		StartTime:  req.StartTime,
	}

	booking, err := h.service.CreateBooking(c.Request.Context(), serviceReq)
	if err != nil {
		h.logger.Error("Failed to create booking", "error", err, "request", serviceReq)
		if strings.Contains(err.Error(), "not available due to a conflict") {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "does not belong") || strings.Contains(err.Error(), "not active") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create booking: " + err.Error()})
		}
		return
	}

	h.logger.Info("Booking created successfully via API", "bookingId", booking.ID)
	c.JSON(http.StatusCreated, booking)
}

// GetBookingByID handles GET /api/v1/bookings/:bookingId
func (h *BookingHandler) GetBookingByID(c *gin.Context) {
	bookingID := c.Param("bookingId")
	// TODO: Add authorization check: ensure the requester is the customer or business owner.

	h.logger.Info("Getting booking by ID via API", "bookingId", bookingID)
	booking, err := h.service.GetBookingDetails(c.Request.Context(), bookingID)
	if err != nil {
		h.logger.Error("Failed to get booking by ID", "bookingId", bookingID, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve booking: " + err.Error()})
		return
	}
	if booking == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}
	c.JSON(http.StatusOK, booking)
}

// ListBookings handles GET /api/v1/bookings (with query params customerId or businessId)
func (h *BookingHandler) ListBookings(c *gin.Context) {
	customerID := c.Query("customerId")
	businessID := c.Query("businessId")
	// TODO: Authorization: If customerId is present, ensure it matches authenticated user.
	// If businessId is present, ensure authenticated user is owner of that business.

	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)
	if page < 1 { page = 1 }
	if limit < 1 || limit > 100 { limit = 10 }
	offset := (page - 1) * limit

	var bookings []models.Booking
	var total int64
	var err error

	if customerID != "" {
		h.logger.Info("Listing bookings for customer via API", "customerId", customerID)
		bookings, total, err = h.service.ListBookingsForCustomer(c.Request.Context(), customerID, limit, offset)

	} else if businessID != "" {
		h.logger.Info("Listing bookings for business via API", "businessId", businessID)
		bookings, total, err = h.service.ListBookingsForBusiness(c.Request.Context(), businessID, limit, offset)
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Either customerId or businessId query parameter is required"})
		return
	}

	if err != nil {
		h.logger.Error("Failed to list bookings", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve bookings: " + err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data": bookings,
		"pagination": gin.H{
			"total": total,
			"page": page,
			"limit": limit,
			"totalPages": (total + int64(limit) -1) / int64(limit), // ceiling division
		},
	})
}

// UpdateBookingStatus handles PUT /api/v1/bookings/:bookingId/status
func (h *BookingHandler) UpdateBookingStatus(c *gin.Context) {
	bookingID := c.Param("bookingId")
	// TODO: Authorization: Ensure only authorized users (e.g., admin, or business owner for their bookings) can update status.

	var req UpdateBookingStatusRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error("Failed to bind UpdateBookingStatus request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	h.logger.Info("Updating booking status via API", "bookingId", bookingID, "newStatus", req.Status)
	updatedBooking, err := h.service.UpdateBookingStatus(c.Request.Context(), bookingID, req.Status)
	if err != nil {
		h.logger.Error("Failed to update booking status", "bookingId", bookingID, "error", err)
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update booking status: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, updatedBooking)
}

// The placeholder BookingRepo_INTERNAL_... helper methods are no longer needed and should be removed.
// They were illustrative and have been replaced by actual methods on BookingService.
