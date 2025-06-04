package models

import (
	"time"

	"gorm.io/gorm"
)

// BookingStatus defines the possible statuses of a booking.
type BookingStatus string

const (
	BookingStatusPendingPayment BookingStatus = "PENDING_PAYMENT" // Initial status if payment is required
	BookingStatusConfirmed      BookingStatus = "CONFIRMED"       // Confirmed after payment or if no payment needed
	BookingStatusCancelled      BookingStatus = "CANCELLED"       // Cancelled by user or system
	BookingStatusCompleted      BookingStatus = "COMPLETED"       // Service delivered
	// Potentially add: BookingStatusNoShow, BookingStatusRescheduled etc.
)

// Booking represents a booking made by a customer for a service.
type Booking struct {
	ID              string        `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	BusinessID      string        `gorm:"index;type:varchar(255);not null" json:"businessId"`
	ServiceID       string        `gorm:"index:idx_bookings_service_time,priority:1;type:varchar(255);not null" json:"serviceId"` // Links to ServiceDefinition.ID
	CustomerID      string        `gorm:"index;type:varchar(255);not null" json:"customerId"`                                     // User ID of the customer
	StartTime       time.Time     `gorm:"index:idx_bookings_service_time,priority:2;not null" json:"startTime"`
	EndTime         time.Time     `gorm:"index;not null" json:"endTime"`
	Status          BookingStatus `gorm:"type:varchar(50);not null;default:'PENDING_PAYMENT'" json:"status"`
	PaymentIntentID *string       `gorm:"type:varchar(255);index" json:"paymentIntentId,omitempty"` // For Stripe or other payment integration

	// Additional booking metadata
	Notes       *string `gorm:"type:text" json:"notes,omitempty"`
	ClientNotes *string `gorm:"type:text" json:"clientNotes,omitempty"`
	TotalAmount *int64  `gorm:"type:bigint" json:"totalAmount,omitempty"` // Amount in cents
	Currency    string  `gorm:"type:varchar(3);default:'USD'" json:"currency"`

	// Timestamps
	CreatedAt time.Time      `gorm:"default:CURRENT_TIMESTAMP" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"default:CURRENT_TIMESTAMP" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Runtime fields (not stored in database)
	ServiceName  string `gorm:"-" json:"serviceName,omitempty"`
	CustomerName string `gorm:"-" json:"customerName,omitempty"`
}

// BeforeCreate hook for additional validation before creating a booking
func (booking *Booking) BeforeCreate(tx *gorm.DB) (err error) {
	// Database will generate UUID automatically via gen_random_uuid()
	// Set default currency if not provided
	if booking.Currency == "" {
		booking.Currency = "USD"
	}

	// Set default status if not provided
	if booking.Status == "" {
		booking.Status = BookingStatusPendingPayment
	}

	return nil
}

// TableName explicitly sets the table name.
func (Booking) TableName() string {
	return "bookings"
}
