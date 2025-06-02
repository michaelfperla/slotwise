package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/slotwise/scheduling-service/internal/models"
	"gorm.io/gorm"
)

// BookingRepository handles booking data operations
type BookingRepository struct {
	db *gorm.DB
}

// NewBookingRepository creates a new booking repository
func NewBookingRepository(db *gorm.DB) *BookingRepository {
	return &BookingRepository{db: db}
}

// CreateBooking creates a new booking record in the database.
func (r *BookingRepository) CreateBooking(ctx context.Context, booking *models.Booking) error {
	if err := r.db.WithContext(ctx).Create(booking).Error; err != nil {
		return fmt.Errorf("error creating booking: %w", err)
	}
	return nil
}

// GetBookingByID retrieves a booking by its ID.
func (r *BookingRepository) GetBookingByID(ctx context.Context, bookingID string) (*models.Booking, error) {
	var booking models.Booking
	if err := r.db.WithContext(ctx).First(&booking, "id = ?", bookingID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // Return nil, nil if not found
		}
		return nil, fmt.Errorf("error fetching booking %s: %w", bookingID, err)
	}
	return &booking, nil
}

// GetBookingsByCustomerID retrieves all bookings for a given customer, with pagination.
func (r *BookingRepository) GetBookingsByCustomerID(ctx context.Context, customerID string, limit, offset int) ([]models.Booking, int64, error) {
	var bookings []models.Booking
	var total int64

	if err := r.db.WithContext(ctx).Model(&models.Booking{}).Where("customer_id = ?", customerID).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("error counting customer bookings: %w", err)
	}

	if err := r.db.WithContext(ctx).
		Where("customer_id = ?", customerID).
		Order("start_time desc").
		Limit(limit).
		Offset(offset).
		Find(&bookings).Error; err != nil {
		return nil, 0, fmt.Errorf("error fetching customer bookings: %w", err)
	}
	return bookings, total, nil
}

// GetBookingsByBusinessID retrieves all bookings for a given business, with pagination.
func (r *BookingRepository) GetBookingsByBusinessID(ctx context.Context, businessID string, limit, offset int) ([]models.Booking, int64, error) {
	var bookings []models.Booking
	var total int64

	if err := r.db.WithContext(ctx).Model(&models.Booking{}).Where("business_id = ?", businessID).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("error counting business bookings: %w", err)
	}
	
	if err := r.db.WithContext(ctx).
		Where("business_id = ?", businessID).
		Order("start_time desc").
		Limit(limit).
		Offset(offset).
		Find(&bookings).Error; err != nil {
		return nil, 0, fmt.Errorf("error fetching business bookings: %w", err)
	}
	return bookings, total, nil
}

// UpdateBookingStatus updates the status of a specific booking.
func (r *BookingRepository) UpdateBookingStatus(ctx context.Context, bookingID string, newStatus models.BookingStatus) error {
	result := r.db.WithContext(ctx).Model(&models.Booking{}).Where("id = ?", bookingID).Update("status", newStatus)
	if result.Error != nil {
		return fmt.Errorf("error updating booking status for %s: %w", bookingID, result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("booking %s not found for status update", bookingID)
	}
	return nil
}

// FindConflictingBookings retrieves bookings that conflict with the given time range for a specific business and service.
// It checks for bookings that are either 'CONFIRMED' or 'PENDING_PAYMENT'.
// A conflict exists if:
// (ExistingStartTime < ProposedEndTime) AND (ExistingEndTime > ProposedStartTime)
func (r *BookingRepository) FindConflictingBookings(ctx context.Context, businessID string, serviceID string, proposedStartTime time.Time, proposedEndTime time.Time) ([]models.Booking, error) {
	var conflictingBookings []models.Booking
	
	// Define statuses that are considered conflicting
	conflictingStatuses := []models.BookingStatus{
		models.BookingStatusConfirmed,
		models.BookingStatusPendingPayment,
	}

	err := r.db.WithContext(ctx).
		Where("business_id = ?", businessID).
		// Where("service_id = ?", serviceID). // Conflicts should ideally be for the business, not just specific service, unless services can overlap. For now, let's scope to business.
		// If a business can have multiple services at the same time (e.g. different staff), then service_id might not be needed here,
		// or a more complex resource/staff ID would be required.
		// For MVP, let's assume a conflict for the business means the time is taken.
		Where("status IN (?)", conflictingStatuses).
		Where("start_time < ?", proposedEndTime). // Existing booking starts before the proposed one ends
		Where("end_time > ?", proposedStartTime). // Existing booking ends after the proposed one starts
		Find(&conflictingBookings).Error

	if err != nil {
		return nil, fmt.Errorf("error finding conflicting bookings for business %s: %w", businessID, err)
	}
	return conflictingBookings, nil
}
