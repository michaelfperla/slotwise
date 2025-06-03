package service

import (
	"context"
	"fmt"     // Added import
	"strconv" // Added import
	"strings" // Added import
	"time"

	"github.com/slotwise/scheduling-service/internal/models" // Added import
	"github.com/slotwise/scheduling-service/internal/repository"
	"github.com/slotwise/scheduling-service/pkg/events"
	"github.com/slotwise/scheduling-service/pkg/logger"
)

// BookingService handles booking business logic
type BookingService struct {
	bookingRepo         *repository.BookingRepository // Changed field name for clarity
	availabilityService *AvailabilityService
	serviceDefRepo      *repository.AvailabilityRepository // To get service definitions (duration)
	eventPublisher      EventPublisher                     // Interface
	logger              *logger.Logger
}

// AvailabilityService handles availability business logic
type AvailabilityService struct {
	availabilityRepo *repository.AvailabilityRepository // Renamed from 'repo'
	bookingRepo      *repository.BookingRepository      // Added for conflict checking in GetAvailableSlots
	cacheRepo        *repository.CacheRepository
	eventPublisher   EventPublisher // Interface
	logger           *logger.Logger
}

// EventPublisher defines the interface for publishing events.
// This allows for pkg/events.Publisher or a mock to be used.
type EventPublisher interface {
	Publish(subject string, data interface{}) error
}

// NewBookingService creates a new booking service
func NewBookingService(
	bookingRepo *repository.BookingRepository,
	availabilityService *AvailabilityService,
	serviceDefRepo *repository.AvailabilityRepository, // For fetching service definitions
	eventPublisher EventPublisher, // Interface
	logger *logger.Logger,
) *BookingService {
	return &BookingService{
		bookingRepo:         bookingRepo,
		availabilityService: availabilityService,
		serviceDefRepo:      serviceDefRepo,
		eventPublisher:      eventPublisher,
		logger:              logger,
	}
}

// CreateBookingRequest defines the input for creating a booking
type CreateBookingRequest struct {
	BusinessID string    `json:"businessId"`
	ServiceID  string    `json:"serviceId"`
	CustomerID string    `json:"customerId"`
	StartTime  time.Time `json:"startTime"`
}

// CreateBooking creates a new booking
func (s *BookingService) CreateBooking(ctx context.Context, req CreateBookingRequest) (*models.Booking, error) {
	s.logger.Info("Attempting to create booking", "serviceId", req.ServiceID, "customerId", req.CustomerID, "startTime", req.StartTime)

	// 1. Get ServiceDefinition for duration and to verify service
	serviceDef, err := s.serviceDefRepo.GetServiceDefinition(ctx, req.ServiceID)
	if err != nil {
		s.logger.Error("Failed to get service definition for booking", "serviceId", req.ServiceID, "error", err)
		return nil, fmt.Errorf("failed to retrieve service details: %w", err)
	}
	if serviceDef == nil {
		s.logger.Warn("Service definition not found for booking", "serviceId", req.ServiceID)
		return nil, fmt.Errorf("service with ID %s not found", req.ServiceID)
	}
	if serviceDef.BusinessID != req.BusinessID {
		s.logger.Warn("Service business ID mismatch", "serviceBusinessID", serviceDef.BusinessID, "requestBusinessID", req.BusinessID)
		return nil, fmt.Errorf("service does not belong to the specified business")
	}
	if !serviceDef.IsActive {
		s.logger.Warn("Attempt to book inactive service", "serviceId", req.ServiceID)
		return nil, fmt.Errorf("service %s is not active", req.ServiceID)
	}

	endTime := req.StartTime.Add(time.Duration(serviceDef.DurationMinutes) * time.Minute)

	// 2. Conflict Detection
	conflictingBookings, err := s.bookingRepo.FindConflictingBookings(ctx, req.BusinessID, req.ServiceID, req.StartTime, endTime)
	if err != nil {
		s.logger.Error("Error checking for conflicting bookings", "serviceId", req.ServiceID, "startTime", req.StartTime, "error", err)
		return nil, fmt.Errorf("error checking for booking conflicts: %w", err)
	}
	if len(conflictingBookings) > 0 {
		s.logger.Warn("Booking conflict detected", "serviceId", req.ServiceID, "startTime", req.StartTime, "conflicts", len(conflictingBookings))
		return nil, fmt.Errorf("requested time slot is not available due to a conflict")
	}

	// 3. Create Booking record
	newBooking := &models.Booking{
		// ID will be set by BeforeCreate hook
		BusinessID: req.BusinessID,
		ServiceID:  req.ServiceID,
		CustomerID: req.CustomerID,
		StartTime:  req.StartTime,
		EndTime:    endTime,
		Status:     models.BookingStatusPendingPayment, // Initial status, can be changed based on payment flow
	}

	if err := s.bookingRepo.CreateBooking(ctx, newBooking); err != nil {
		s.logger.Error("Failed to create booking in database", "error", err)
		return nil, fmt.Errorf("failed to save booking: %w", err)
	}
	s.logger.Info("Booking record created successfully", "bookingId", newBooking.ID)

	// 4. Publish NATS event: booking.requested
	eventPayload := map[string]interface{}{
		"bookingId":  newBooking.ID,
		"customerId": newBooking.CustomerID,
		"serviceId":  newBooking.ServiceID,
		"businessId": newBooking.BusinessID,
		"startTime":  newBooking.StartTime.Format(time.RFC3339),
		"endTime":    newBooking.EndTime.Format(time.RFC3339),
		"status":     string(newBooking.Status),
	}
	if err := s.eventPublisher.Publish(events.BookingRequestedEvent, eventPayload); err != nil {
		s.logger.Error("Failed to publish booking.requested event", "bookingId", newBooking.ID, "error", err)
		// Continue even if event publishing fails, booking is already in DB.
	} else {
		s.logger.Info("Published booking.requested event", "bookingId", newBooking.ID)
	}

	// If no payment is required, we might move to Confirmed and publish slot.reserved here.
	// For now, assuming payment comes next or manual confirmation.

	return newBooking, nil
}

// GetBookingDetails retrieves a booking by its ID.
func (s *BookingService) GetBookingDetails(ctx context.Context, bookingID string) (*models.Booking, error) {
	booking, err := s.bookingRepo.GetBookingByID(ctx, bookingID)
	if err != nil {
		s.logger.Error("Error fetching booking details from repo", "bookingId", bookingID, "error", err)
		return nil, fmt.Errorf("repository error fetching booking: %w", err)
	}
	if booking == nil {
		s.logger.Info("Booking not found", "bookingId", bookingID)
		return nil, nil // Or return a specific "not found" error
	}
	return booking, nil
}

// UpdateBookingStatusRequest defines the input for updating a booking's status.
type UpdateBookingStatusRequest struct {
	Status models.BookingStatus `json:"status"`
	// Potentially add other fields like cancellationReason, etc.
}

// UpdateBookingStatus changes the status of a booking.
func (s *BookingService) UpdateBookingStatus(ctx context.Context, bookingID string, newStatus models.BookingStatus) (*models.Booking, error) {
	s.logger.Info("Updating booking status", "bookingId", bookingID, "newStatus", newStatus)

	// Validate newStatus if necessary (e.g., allowed transitions)
	// For MVP, direct update.

	booking, err := s.bookingRepo.GetBookingByID(ctx, bookingID)
	if err != nil {
		s.logger.Error("Failed to get booking for status update", "bookingId", bookingID, "error", err)
		return nil, fmt.Errorf("failed to retrieve booking %s: %w", bookingID, err)
	}
	if booking == nil {
		s.logger.Warn("Booking not found for status update", "bookingId", bookingID)
		return nil, fmt.Errorf("booking %s not found", bookingID)
	}

	// TODO: Add logic to check if status transition is valid, e.g. cannot confirm a cancelled booking.
	// oldStatus := booking.Status

	if err := s.bookingRepo.UpdateBookingStatus(ctx, bookingID, newStatus); err != nil {
		s.logger.Error("Failed to update booking status in database", "bookingId", bookingID, "error", err)
		return nil, fmt.Errorf("failed to update status for booking %s: %w", bookingID, err)
	}

	booking.Status = newStatus     // Update status in the fetched object for return
	booking.UpdatedAt = time.Now() // Should be handled by GORM hooks ideally, or manually set

	// Publish NATS events based on status change
	var eventSubject string
	eventPayload := map[string]interface{}{
		"bookingId":  booking.ID,
		"customerId": booking.CustomerID,
		"serviceId":  booking.ServiceID,
		"businessId": booking.BusinessID,
		"newStatus":  string(newStatus),
		"startTime":  booking.StartTime.Format(time.RFC3339),
		"endTime":    booking.EndTime.Format(time.RFC3339),
	}

	switch newStatus {
	case models.BookingStatusConfirmed:
		eventSubject = events.BookingConfirmedEvent
		// Also publish slot.reserved
		slotReservedPayload := map[string]interface{}{
			"bookingId":  booking.ID,
			"serviceId":  booking.ServiceID,
			"businessId": booking.BusinessID,
			"startTime":  booking.StartTime.Format(time.RFC3339),
			"endTime":    booking.EndTime.Format(time.RFC3339),
		}
		if errPub := s.eventPublisher.Publish(events.SlotReservedEvent, slotReservedPayload); errPub != nil {
			s.logger.Error("Failed to publish slot.reserved event", "bookingId", booking.ID, "error", errPub)
		} else {
			s.logger.Info("Published slot.reserved event", "bookingId", booking.ID)
		}
	case models.BookingStatusCancelled:
		eventSubject = events.BookingCancelledEvent
		// eventPayload["reason"] = "..." // Add reason if available
	default:
		s.logger.Info("No specific NATS event for status update", "bookingId", booking.ID, "newStatus", newStatus)
		// Potentially a generic booking.updated event if needed
	}

	if eventSubject != "" {
		if errPub := s.eventPublisher.Publish(eventSubject, eventPayload); errPub != nil {
			s.logger.Error("Failed to publish booking status event", "subject", eventSubject, "bookingId", booking.ID, "error", errPub)
		} else {
			s.logger.Info("Published booking status event", "subject", eventSubject, "bookingId", booking.ID)
		}
	}

	return booking, nil
}

// ListBookingsForCustomer retrieves bookings for a specific customer with pagination.
func (s *BookingService) ListBookingsForCustomer(ctx context.Context, customerID string, limit, offset int) ([]models.Booking, int64, error) {
	s.logger.Info("Listing bookings for customer", "customerId", customerID, "limit", limit, "offset", offset)
	bookings, total, err := s.bookingRepo.GetBookingsByCustomerID(ctx, customerID, limit, offset)
	if err != nil {
		s.logger.Error("Error listing customer bookings from repo", "customerId", customerID, "error", err)
		return nil, 0, fmt.Errorf("repository error listing customer bookings: %w", err)
	}
	return bookings, total, nil
}

// ListBookingsForBusiness retrieves bookings for a specific business with pagination.
func (s *BookingService) ListBookingsForBusiness(ctx context.Context, businessID string, limit, offset int) ([]models.Booking, int64, error) {
	s.logger.Info("Listing bookings for business", "businessId", businessID, "limit", limit, "offset", offset)
	bookings, total, err := s.bookingRepo.GetBookingsByBusinessID(ctx, businessID, limit, offset)
	if err != nil {
		s.logger.Error("Error listing business bookings from repo", "businessId", businessID, "error", err)
		return nil, 0, fmt.Errorf("repository error listing business bookings: %w", err)
	}
	return bookings, total, nil
}

// HandlePaymentSucceeded handles payment success events (stub)
func (s *BookingService) HandlePaymentSucceeded(data []byte) error {
	// Example: Update booking status to Confirmed
	// bookingId := ... // extract from data
	// s.UpdateBookingStatus(context.Background(), bookingId, models.BookingStatusConfirmed)
	s.logger.Info("Handling payment succeeded event (stub)")
	return nil
}

// HandlePaymentFailed handles payment failure events (stub)
func (s *BookingService) HandlePaymentFailed(data []byte) error {
	// Example: Update booking status to Cancelled or PaymentFailed
	// bookingId := ... // extract from data
	// s.UpdateBookingStatus(context.Background(), bookingId, models.BookingStatusCancelled)
	s.logger.Info("Handling payment failed event (stub)")
	return nil
}

// NewAvailabilityService creates a new availability service
func NewAvailabilityService(
	availabilityRepo *repository.AvailabilityRepository,
	bookingRepo *repository.BookingRepository, // Added
	cacheRepo *repository.CacheRepository,
	eventPublisher EventPublisher, // Interface
	logger *logger.Logger,
) *AvailabilityService {
	return &AvailabilityService{
		availabilityRepo: availabilityRepo,
		bookingRepo:      bookingRepo, // Added
		cacheRepo:        cacheRepo,
		eventPublisher:   eventPublisher,
		logger:           logger,
	}
}

// TimeSlot represents a single available time slot
type TimeSlot struct {
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
}

// GetAvailableSlots gets available time slots
func (s *AvailabilityService) GetAvailableSlots(ctx context.Context, businessID string, serviceID string, dateToSchedule time.Time) ([]TimeSlot, error) {
	s.logger.Info("Getting available slots", "businessID", businessID, "serviceID", serviceID, "date", dateToSchedule.Format("2006-01-02"))

	// 1. Get Service Definition to find duration
	serviceDef, err := s.availabilityRepo.GetServiceDefinition(ctx, serviceID) // Use injected availabilityRepo
	if err != nil {
		s.logger.Error("Failed to get service definition", "serviceID", serviceID, "error", err)
		return nil, fmt.Errorf("service definition for %s not found: %w", serviceID, err)
	}
	if serviceDef == nil {
		s.logger.Warn("Service definition not found", "serviceID", serviceID)
		return nil, fmt.Errorf("service definition %s not found", serviceID)
	}

	// 2. Check if service is active
	if !serviceDef.IsActive {
		s.logger.Warn("Service definition is not active", "serviceID", serviceID)
		return nil, fmt.Errorf("service %s not found or is not active", serviceID)
	}
	if serviceDef.BusinessID != businessID {
		s.logger.Error("Service definition does not belong to the given business", "serviceID", serviceID, "serviceBusinessID", serviceDef.BusinessID, "queryBusinessID", businessID)
		return nil, fmt.Errorf("service %s does not belong to business %s", serviceID, businessID)
	}

	// 2. Determine DayOfWeek for the given date
	dayOfWeekToSchedule := models.DayOfWeekString(dateToSchedule.Weekday().String()) // time.Weekday.String() returns "Monday", "Tuesday" etc.
	// Our DayOfWeekString enum is "MONDAY", "TUESDAY". Need to convert.
	dayOfWeekToSchedule = models.DayOfWeekString(strings.ToUpper(dateToSchedule.Weekday().String()))

	// 3. Get Availability Rules for that business and day
	rules, err := s.availabilityRepo.GetAvailabilityRulesFiltered(ctx, businessID, dayOfWeekToSchedule) // Use injected availabilityRepo
	if err != nil {
		s.logger.Error("Failed to get availability rules", "businessID", businessID, "dayOfWeek", dayOfWeekToSchedule, "error", err)
		return nil, fmt.Errorf("could not get availability rules for %s on %s: %w", businessID, dayOfWeekToSchedule, err)
	}

	if len(rules) == 0 {
		s.logger.Info("No availability rules found for business", "businessID", businessID, "dayOfWeek", dayOfWeekToSchedule)
		return []TimeSlot{}, nil // No rules means no slots
	}

	var availableSlots []TimeSlot

	// 4. Generate slots based on rules and service duration
	serviceDuration := time.Duration(serviceDef.DurationMinutes) * time.Minute

	for _, rule := range rules {
		// Parse rule's StartTime and EndTime (HH:MM) for the specific dateToSchedule
		ruleStartTimeStr := rule.StartTime // e.g., "09:00"
		ruleEndTimeStr := rule.EndTime     // e.g., "17:00"

		loc := dateToSchedule.Location() // Use the location of the input date

		// Parse HH:MM from rule.StartTime
		stH, stM, errSt := parseHHMM(ruleStartTimeStr)
		if errSt != nil {
			s.logger.Error("Invalid rule start time format", "ruleId", rule.ID, "startTime", ruleStartTimeStr, "error", errSt)
			continue // Skip this rule
		}
		// Parse HH:MM from rule.EndTime
		etH, etM, errEt := parseHHMM(ruleEndTimeStr)
		if errEt != nil {
			s.logger.Error("Invalid rule end time format", "ruleId", rule.ID, "endTime", ruleEndTimeStr, "error", errEt)
			continue // Skip this rule
		}

		periodStart := time.Date(dateToSchedule.Year(), dateToSchedule.Month(), dateToSchedule.Day(), stH, stM, 0, 0, loc)
		periodEnd := time.Date(dateToSchedule.Year(), dateToSchedule.Month(), dateToSchedule.Day(), etH, etM, 0, 0, loc)

		currentSlotStart := periodStart
		for {
			currentSlotEnd := currentSlotStart.Add(serviceDuration)
			if currentSlotEnd.After(periodEnd) { // If currentSlotEnd exceeds periodEnd, break
				break
			}

			availableSlots = append(availableSlots, TimeSlot{
				StartTime: currentSlotStart,
				EndTime:   currentSlotEnd,
			})
			currentSlotStart = currentSlotEnd // Next slot starts right after the current one ends
		}
	}

	// 5. Conflict Detection with existing bookings
	// Fetch relevant bookings for the entire day to minimize DB calls.
	// Bookings could potentially span across the start/end of the day if they are long.
	// For simplicity, fetching bookings that overlap with the dateToSchedule's full day range.
	// dayStart := time.Date(dateToSchedule.Year(), dateToSchedule.Month(), dateToSchedule.Day(), 0, 0, 0, 0, dateToSchedule.Location()) // Unused
	// dayEnd := dayStart.Add(24 * time.Hour) // Unused

	// FindConflictingBookings needs to be adjusted or a new method in bookingRepo created
	// to fetch bookings for a business in a given time range (e.g., dayStart to dayEnd)
	// that are 'CONFIRMED' or 'PENDING_PAYMENT'.
	// Let's assume bookingRepo.FindBookingsInTimeRangeForBusiness(ctx, businessID, dayStart, dayEnd)
	// For now, I'll use the existing FindConflictingBookings and iterate, which is less efficient.
	// A better approach would be to fetch all confirmed/pending bookings for the day once.

	var finalSlots []TimeSlot
	for _, slot := range availableSlots {
		// Check conflict for this specific slot
		// FindConflictingBookings checks for a specific proposedStartTime and proposedEndTime.
		// This is okay if we check each generated slot individually.
		conflicts, err := s.bookingRepo.FindConflictingBookings(ctx, businessID, serviceID, slot.StartTime, slot.EndTime)
		if err != nil {
			s.logger.Error("Error checking conflicts for a slot", "slotStartTime", slot.StartTime, "error", err)
			// Decide: skip slot or return error? For now, skip slot.
			continue
		}
		if len(conflicts) == 0 {
			finalSlots = append(finalSlots, slot)
		}
	}

	s.logger.Info("Generated and filtered available slots", "count", len(finalSlots), "businessID", businessID, "serviceID", serviceID, "date", dateToSchedule.Format("2006-01-02"))
	return finalSlots, nil
}

// parseHHMM is a helper to parse "HH:MM" string to hours and minutes
func parseHHMM(timeStr string) (int, int, error) {
	parts := strings.Split(timeStr, ":")
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("invalid time format: expected HH:MM, got %s", timeStr)
	}
	hour, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, fmt.Errorf("invalid hour: %s", parts[0])
	}
	minute, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, fmt.Errorf("invalid minute: %s", parts[1])
	}
	if hour < 0 || hour > 23 || minute < 0 || minute > 59 {
		return 0, 0, fmt.Errorf("time out of range: %s", timeStr)
	}
	return hour, minute, nil
}

// HandleServiceUpdated handles service update events (stub)
func (s *AvailabilityService) HandleServiceUpdated(data []byte) error {
	// This handler is for the "service.updated" event.
	// The new "business.service.created" event is handled by NatsEventHandlers.HandleBusinessServiceCreated.
	// This might need to be updated or removed if its functionality is covered by HandleBusinessServiceCreated's upsert.
	// For now, keeping it as a distinct handler for a potentially different "service.updated" event.
	s.logger.Info("Handling service.updated event (distinct from business.service.created)")
	// Example: payload might only contain changes, not full service definition
	// Or it might be an event internal to scheduling service.
	// If it's from Business Service and implies an update to ServiceDefinition, its logic would be similar
	// to HandleBusinessServiceCreated (i.e., unmarshal and upsert).
	// For now, this remains a stub for its original unspecified purpose.
	return nil
}
