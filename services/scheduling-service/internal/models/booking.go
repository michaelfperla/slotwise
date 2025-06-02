package models

import (
	"time"

	"github.com/google/uuid"
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
	ID              string        `gorm:"type:uuid;primary_key;" json:"id"`
	BusinessID      string        `gorm:"index;type:varchar(255);not null" json:"businessId"`
	ServiceID       string        `gorm:"index;type:varchar(255);not null" json:"serviceId"` // Links to ServiceDefinition.ID
	CustomerID      string        `gorm:"index;type:varchar(255);not null" json:"customerId"` // User ID of the customer
	StartTime       time.Time     `gorm:"index;not null" json:"startTime"`
	EndTime         time.Time     `gorm:"index;not null" json:"endTime"`
	Status          BookingStatus `gorm:"type:varchar(50);not null" json:"status"`
	PaymentIntentID *string       `gorm:"type:varchar(255);index" json:"paymentIntentId,omitempty"` // For Stripe or other payment integration

	// Timestamps
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Optional: Store denormalized info if needed often, but be wary of data duplication.
	// ServiceName string `gorm:"-" json:"serviceName,omitempty"` // Example, filled at runtime
	// CustomerName string `gorm:"-" json:"customerName,omitempty"` // Example, filled at runtime

	// Foreign key relations (optional, GORM can work without them if IDs are present)
	// ServiceDefinition ServiceDefinition `gorm:"foreignKey:ServiceID;references:ID"`
}

// BeforeCreate will set a UUID for the booking ID.
func (booking *Booking) BeforeCreate(tx *gorm.DB) (err error) {
	if booking.ID == "" {
		booking.ID = uuid.New().String()
	}
	return
}

// TableName explicitly sets the table name.
func (Booking) TableName() string {
	return "bookings"
}
