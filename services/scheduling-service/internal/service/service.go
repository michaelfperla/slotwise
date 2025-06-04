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

// APISlot represents a single time slot for API responses
type APISlot struct {
	StartTime      time.Time `json:"startTime"`
	EndTime        time.Time `json:"endTime"`
	Available      bool      `json:"available"`
	ConflictReason string    `json:"conflictReason,omitempty"`
}

// GetAvailableSlots gets available time slots
func (s *AvailabilityService) GetAvailableSlots(ctx context.Context, businessID string, serviceID string, dateToSchedule time.Time) ([]APISlot, error) {
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
		return []APISlot{}, nil // No rules means no slots
	}

	// 4. Fetch existing bookings for the day for conflict checking
	// Define the start and end of the day for fetching bookings
	dayStart := time.Date(dateToSchedule.Year(), dateToSchedule.Month(), dateToSchedule.Day(), 0, 0, 0, 0, dateToSchedule.Location())
	dayEnd := dayStart.Add(24 * time.Hour)

	// Assuming a method in bookingRepo to fetch relevant bookings.
	// GetBookingsInTimeRangeForBusinessAndStatuses fetches bookings that are CONFIRMED or PENDING_PAYMENT
	// This method needs to be implemented in the repository layer. For now, we define its expected signature.
	// If this method doesn't exist, this part would need adjustment or use a less optimal approach.
	relevantBookingStatuses := []models.BookingStatus{models.BookingStatusConfirmed, models.BookingStatusPendingPayment}
	existingBookings, err := s.bookingRepo.GetBookingsInTimeRangeForBusinessAndStatuses(ctx, businessID, dayStart, dayEnd, relevantBookingStatuses)
	if err != nil {
		s.logger.Error("Failed to fetch existing bookings for conflict checking", "businessID", businessID, "date", dateToSchedule.Format("2006-01-02"), "error", err)
		return nil, fmt.Errorf("could not fetch existing bookings: %w", err)
	}

	var generatedSlots []APISlot
	serviceDuration := time.Duration(serviceDef.DurationMinutes) * time.Minute

	for _, rule := range rules {
		ruleStartTimeStr := rule.StartTime
		ruleEndTimeStr := rule.EndTime
		loc := dateToSchedule.Location()

		stH, stM, errSt := parseHHMM(ruleStartTimeStr)
		if errSt != nil {
			s.logger.Error("Invalid rule start time format", "ruleId", rule.ID, "startTime", ruleStartTimeStr, "error", errSt)
			continue
		}
		etH, etM, errEt := parseHHMM(ruleEndTimeStr)
		if errEt != nil {
			s.logger.Error("Invalid rule end time format", "ruleId", rule.ID, "endTime", ruleEndTimeStr, "error", errEt)
			continue
		}

		periodStart := time.Date(dateToSchedule.Year(), dateToSchedule.Month(), dateToSchedule.Day(), stH, stM, 0, 0, loc)
		periodEnd := time.Date(dateToSchedule.Year(), dateToSchedule.Month(), dateToSchedule.Day(), etH, etM, 0, 0, loc)
		bufferDuration := time.Duration(rule.BufferMinutes) * time.Minute

		currentPotentialSlotStart := periodStart
		for {
			slotActualEnd := currentPotentialSlotStart.Add(serviceDuration)
			if slotActualEnd.After(periodEnd) {
				break
			}

			// Check for conflicts with existing bookings
			isConflict := false
			for _, booking := range existingBookings {
				// Check if [currentPotentialSlotStart, slotActualEnd) overlaps with [booking.StartTime, booking.EndTime)
				if currentPotentialSlotStart.Before(booking.EndTime) && slotActualEnd.After(booking.StartTime) {
					isConflict = true
					s.logger.Debug("Slot conflict detected", "slotStart", currentPotentialSlotStart, "slotEnd", slotActualEnd, "bookingID", booking.ID)
					break
				}
			}

			if !isConflict {
				generatedSlots = append(generatedSlots, APISlot{
					StartTime: currentPotentialSlotStart,
					EndTime:   slotActualEnd,
					Available: true, // By definition, if we're adding it, it's available
				})
			}

			// Advance to the next potential slot start time, including buffer
			currentPotentialSlotStart = slotActualEnd.Add(bufferDuration)
		}
	}

	s.logger.Info("Generated available slots", "count", len(generatedSlots), "businessID", businessID, "serviceID", serviceID, "date", dateToSchedule.Format("2006-01-02"))
	return generatedSlots, nil
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

// CreateAvailabilityRuleRequest defines the input for creating an availability rule.
type CreateAvailabilityRuleRequest struct {
	BusinessID    string                `json:"businessId"`
	DayOfWeek     models.DayOfWeekString `json:"dayOfWeek"`
	StartTime     string                `json:"startTime"` // "HH:MM"
	EndTime       string                `json:"endTime"`   // "HH:MM"
	BufferMinutes int                   `json:"bufferMinutes"`
}

// CreateAvailabilityRule creates a new availability rule for a business.
func (s *AvailabilityService) CreateAvailabilityRule(ctx context.Context, req CreateAvailabilityRuleRequest) (*models.AvailabilityRule, error) {
	s.logger.Info("Creating availability rule", "businessID", req.BusinessID, "day", req.DayOfWeek)

	// TODO: Add validation for StartTime < EndTime, valid HH:MM format, valid DayOfWeek enum, etc.
	// For example, using parseHHMM to validate time formats.
	_, _, errSt := parseHHMM(req.StartTime)
	if errSt != nil {
		s.logger.Error("Invalid StartTime format for new rule", "startTime", req.StartTime, "error", errSt)
		return nil, fmt.Errorf("invalid startTime format: %w", errSt)
	}
	_, _, errEt := parseHHMM(req.EndTime)
	if errEt != nil {
		s.logger.Error("Invalid EndTime format for new rule", "endTime", req.EndTime, "error", errEt)
		return nil, fmt.Errorf("invalid endTime format: %w", errEt)
	}
	// Basic validation: StartTime must be before EndTime
	if req.StartTime >= req.EndTime {
		s.logger.Warn("Rule creation failed: startTime must be before endTime", "startTime", req.StartTime, "endTime", req.EndTime)
		return nil, fmt.Errorf("startTime (%s) must be before endTime (%s)", req.StartTime, req.EndTime)
	}


	rule := &models.AvailabilityRule{
		BusinessID:    req.BusinessID,
		DayOfWeek:     req.DayOfWeek,
		StartTime:     req.StartTime,
		EndTime:       req.EndTime,
		BufferMinutes: req.BufferMinutes,
	}

	if err := s.availabilityRepo.CreateAvailabilityRule(ctx, rule); err != nil {
		s.logger.Error("Failed to create availability rule in repository", "error", err)
		return nil, fmt.Errorf("could not save availability rule: %w", err)
	}

	s.logger.Info("Availability rule created successfully", "ruleId", rule.ID)

	// Publish NATS event for availability rule update
	eventPayload := map[string]interface{}{
		"businessId":    req.BusinessID,
		"ruleId":        rule.ID, // Send the ID of the created rule
		"dayOfWeek":     req.DayOfWeek,
		"startTime":     req.StartTime,
		"endTime":       req.EndTime,
		"bufferMinutes": req.BufferMinutes,
		// Add a generic message or let subscriber decide
		"message": "Availability rule has been created/updated.",
	}
	if err := s.eventPublisher.Publish(events.AvailabilityRuleUpdatedEvent, eventPayload); err != nil {
		s.logger.Error("Failed to publish AvailabilityRuleUpdatedEvent", "ruleId", rule.ID, "businessId", req.BusinessID, "error", err)
		// Non-fatal error, rule is created, but real-time update might not happen.
	} else {
		s.logger.Info("Published AvailabilityRuleUpdatedEvent", "ruleId", rule.ID, "businessId", req.BusinessID)
	}

	return rule, nil
}

// GetBusinessCalendarRequest defines the input for fetching the business calendar.
// (This is a placeholder, actual params might be businessID, startDate, endDate directly in method signature)
type GetBusinessCalendarRequest struct {
	BusinessID string    `json:"businessId"`
	StartDate  time.Time `json:"startDate"`
	EndDate    time.Time `json:"endDate"`
}

// DailyCalendarSlotSummary provides a summary of slots for a specific day.
type DailyCalendarSlotSummary struct {
	Date           string `json:"date"` // "YYYY-MM-DD"
	TotalSlots     int    `json:"totalSlots"`
	BookedSlots    int    `json:"bookedSlots"`
	AvailableSlots int    `json:"availableSlots"` // TotalSlots - BookedSlots (considering only whole slot bookings)
}

// BusinessCalendarResponse is the structure for the business calendar API response.
type BusinessCalendarResponse struct {
	BusinessID string                     `json:"businessId"`
	StartDate  string                     `json:"startDate"`  // "YYYY-MM-DD"
	EndDate    string                     `json:"endDate"`    // "YYYY-MM-DD"
	Days       []DailyCalendarSlotSummary `json:"days"`
	// TODO: Consider adding overall summary statistics if useful
}

// GetBusinessCalendar generates a daily summary of slot availability for a business.
func (s *AvailabilityService) GetBusinessCalendar(ctx context.Context, businessID string, startDate time.Time, endDate time.Time) (*BusinessCalendarResponse, error) {
	s.logger.Info("Getting business calendar", "businessID", businessID, "startDate", startDate.Format("2006-01-02"), "endDate", endDate.Format("2006-01-02"))

	if businessID == "" {
		return nil, fmt.Errorf("businessID cannot be empty")
	}
	if startDate.After(endDate) {
		return nil, fmt.Errorf("startDate cannot be after endDate")
	}

	// 1. Fetch all availability rules for the business.
	// No day filter here, as we need rules for all days to iterate through the date range.
	allRules, err := s.availabilityRepo.GetAvailabilityRulesFiltered(ctx, businessID, "") // Empty dayOfWeek means get all for business
	if err != nil {
		s.logger.Error("Failed to get all availability rules for business", "businessID", businessID, "error", err)
		return nil, fmt.Errorf("could not get availability rules for %s: %w", businessID, err)
	}
	if len(allRules) == 0 {
		s.logger.Info("No availability rules found for business, calendar will be empty", "businessID", businessID)
		// Return an empty calendar response for the date range
		resp := &BusinessCalendarResponse{
			BusinessID: businessID,
			StartDate:  startDate.Format("2006-01-02"),
			EndDate:    endDate.Format("2006-01-02"),
			Days:       []DailyCalendarSlotSummary{},
		}
		// Populate 'Days' with entries for each day in the range, showing 0 slots
		currentDate := startDate
		for !currentDate.After(endDate) {
			resp.Days = append(resp.Days, DailyCalendarSlotSummary{
				Date:           currentDate.Format("2006-01-02"),
				TotalSlots:     0,
				BookedSlots:    0,
				AvailableSlots: 0,
			})
			currentDate = currentDate.AddDate(0, 0, 1)
		}
		return resp, nil
	}

	// Group rules by DayOfWeek for easier lookup
	rulesByDay := make(map[models.DayOfWeekString][]models.AvailabilityRule)
	for _, rule := range allRules {
		rulesByDay[rule.DayOfWeek] = append(rulesByDay[rule.DayOfWeek], rule)
	}

	// 2. Fetch all relevant bookings (CONFIRMED, PENDING_PAYMENT) for the business within the startDate and endDate.
	bookingStatuses := []models.BookingStatus{models.BookingStatusConfirmed, models.BookingStatusPendingPayment}
	// Ensure endDate for bookings covers the entire last day.
	queryEndDate := endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	allBookings, err := s.bookingRepo.GetBookingsInTimeRangeForBusinessAndStatuses(ctx, businessID, startDate, queryEndDate, bookingStatuses)
	if err != nil {
		s.logger.Error("Failed to fetch bookings for calendar", "businessID", businessID, "error", err)
		return nil, fmt.Errorf("could not fetch bookings for calendar: %w", err)
	}

	// Group bookings by date for faster lookup
	bookingsByDate := make(map[string][]models.Booking)
	for _, booking := range allBookings {
		dateStr := booking.StartTime.Format("2006-01-02")
		bookingsByDate[dateStr] = append(bookingsByDate[dateStr], booking)
	}


	var dailySummaries []DailyCalendarSlotSummary
	currentDate := startDate
	loc := startDate.Location() // Assuming all dates/times should be in this location.

	// This requires knowledge of all service definitions for the business to calculate slots accurately.
	// This is a simplification: it assumes an average or a specific service's duration.
	// For a truly accurate calendar, we'd need to know WHICH service's slots are being counted,
	// or calculate based on a 'standard' service duration for the business.
	// Let's assume, for now, we need a way to get service definitions.
	// This is a complex part: GetAvailableSlots is for a *specific* service. The calendar is for the *business*.
	// One approach: iterate through services, get slots, then aggregate. Complex.
	// Simpler (but less accurate) approach: use a fixed or average duration to estimate "total slots".
	// For now, this implementation will count slots based on a hardcoded/configurable "standard service duration"
	// if a specific service context isn't provided. This is a known limitation.
	// Let's assume a default/average service duration (e.g., 30 minutes) for generating potential total slots.
	// A more robust solution would be to associate rules with specific services or use a default business service duration.
	// For now, GetBusinessCalendar CANNOT accurately calculate total slots without a service definition.
	// The GetAvailableSlots method is service-specific.
	// This method needs rethink or simplification.
	// OPTION: We can count "occupied time blocks" rather than "slots" if service duration is variable.
	// Or, the request could be for a *specific service's* calendar view for the business.
	// The current API GET /api/v1/businesses/{businessId}/calendar doesn't specify a service.
	//
	// Let's assume for now the task implies using the GetAvailableSlots logic repeatedly for each day,
	// for a *default* or *most common* service of the business. This is a big assumption.
	// The problem is that GetAvailableSlots requires a serviceID.
	// If no serviceID is provided, we cannot calculate slots.
	//
	// Revised approach for GetBusinessCalendar:
	// It will count "booked blocks" based on actual bookings.
	// For "total slots" and "available slots", it's more complex without a reference service.
	// Let's focus on reporting booked time and leave "total/available slots" as a conceptual challenge
	// for this iteration or assume a "standard" service for slot calculation.
	//
	// For now, let's make a placeholder for "total slots" and "available slots" and focus on booked slots.
	// To truly implement total/available, we need a reference service ID for the calendar.
	// The API contract implies these numbers, so we must provide something.
	//
	// Let's assume we need to iterate through *all* services for the business, calculate their slots for each day,
	// and then aggregate. This could be very computationally intensive.
	//
	// Alternative: The business might have a "standard slot duration" (e.g. 30 min).
	// We can use this to calculate total theoretical slots based on availability rules.
	// Then count how many of these standard slots are booked.
	// This seems like a more plausible interpretation for a general business calendar.
	// Let's assume a hypothetical "standard service duration" for the business, e.g., 30 minutes.
	// This value should ideally come from business settings, not hardcoded.
	// For now, I'll use a placeholder. This is a critical point for requirements clarification.
	const standardServiceDurationMinutes = 30 // Placeholder!
	standardServiceDuration := time.Duration(standardServiceDurationMinutes) * time.Minute

	for !currentDate.After(endDate) {
		dayOfWeek := models.DayOfWeekString(strings.ToUpper(currentDate.Weekday().String()))
		dailyTotalSlots := 0
		dailyBookedSlots := 0

		daySpecificRules, hasRules := rulesByDay[dayOfWeek]
		if hasRules {
			for _, rule := range daySpecificRules {
				stH, stM, _ := parseHHMM(rule.StartTime)
				etH, etM, _ := parseHHMM(rule.EndTime)
				periodStart := time.Date(currentDate.Year(), currentDate.Month(), currentDate.Day(), stH, stM, 0, 0, loc)
				periodEnd := time.Date(currentDate.Year(), currentDate.Month(), currentDate.Day(), etH, etM, 0, 0, loc)
				bufferDuration := time.Duration(rule.BufferMinutes) * time.Minute

				slotStart := periodStart
				for {
					slotEnd := slotStart.Add(standardServiceDuration)
					if slotEnd.After(periodEnd) {
						break
					}
					dailyTotalSlots++

					// Check if this "standard slot" is booked
					// This is also a simplification. A booking might partially overlap or span multiple standard slots.
					// A more accurate way is to check the time range of the slot against all bookings for the day.
					isBooked := false
					dateStr := currentDate.Format("2006-01-02")
					if dayBookings, found := bookingsByDate[dateStr]; found {
						for _, booking := range dayBookings {
							// Check if [slotStart, slotEnd) overlaps with [booking.StartTime, booking.EndTime)
							if slotStart.Before(booking.EndTime) && slotEnd.After(booking.StartTime) {
								isBooked = true
								break
							}
						}
					}
					if isBooked {
						dailyBookedSlots++
					}
					slotStart = slotEnd.Add(bufferDuration)
				}
			}
		}

		dailySummaries = append(dailySummaries, DailyCalendarSlotSummary{
			Date:           currentDate.Format("2006-01-02"),
			TotalSlots:     dailyTotalSlots,
			BookedSlots:    dailyBookedSlots,
			AvailableSlots: dailyTotalSlots - dailyBookedSlots,
		})
		currentDate = currentDate.AddDate(0, 0, 1) // Move to next day
	}

	response := &BusinessCalendarResponse{
		BusinessID: businessID,
		StartDate:  startDate.Format("2006-01-02"),
		EndDate:    endDate.Format("2006-01-02"),
		Days:       dailySummaries,
	}

	s.logger.Info("Business calendar generated", "businessID", businessID, "daysCount", len(dailySummaries))
	return response, nil
}

// HandleServiceUpdated handles service update events (stub)
// func (s *AvailabilityService) HandleServiceUpdated(data []byte) error {
// This handler is for the "service.updated" event.
// The new "business.service.created" event is handled by NatsEventHandlers.HandleBusinessServiceCreated.
// This might need to be updated or removed if its functionality is covered by HandleBusinessServiceCreated's upsert.
// For now, keeping it as a distinct handler for a potentially different "service.updated" event.
// s.logger.Info("Handling service.updated event (distinct from business.service.created)")
// Example: payload might only contain changes, not full service definition
// Or it might be an event internal to scheduling service.
// If it's from Business Service and implies an update to ServiceDefinition, its logic would be similar
// to HandleBusinessServiceCreated (i.e., unmarshal and upsert).
// For now, this remains a stub for its original unspecified purpose.
// return nil
// }
