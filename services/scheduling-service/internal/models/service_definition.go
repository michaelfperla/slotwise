package models

import (
	"time"

	"gorm.io/gorm"
)

// ServiceDefinition represents a simplified local copy of a service's core details needed for scheduling.
type ServiceDefinition struct {
	ID              string    `gorm:"primaryKey;type:varchar(255)" json:"id"` // Use the original ServiceID from Business Service
	BusinessID      string    `gorm:"index;type:varchar(255);not null" json:"businessId"`
	Name            string    `gorm:"type:varchar(255);not null" json:"name"`
	Description     string    `gorm:"type:text" json:"description"`
	DurationMinutes int       `gorm:"not null" json:"durationMinutes"` // Duration in minutes
	Price           int64     `gorm:"not null" json:"price"`           // Price in cents to avoid floating point issues
	Currency        string    `gorm:"type:varchar(10);not null" json:"currency"` // e.g., "USD"
	IsActive        bool      `gorm:"default:true" json:"isActive"`

	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName explicitly sets the table name.
func (ServiceDefinition) TableName() string {
	return "service_definitions"
}
