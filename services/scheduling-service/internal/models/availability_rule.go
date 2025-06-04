package models

import (
	"time"

	"gorm.io/gorm"
)

// DayOfWeekString type for representing days, could be an enum or just string/int
// Using string for direct compatibility with NATS event if it sends "MONDAY", "TUESDAY" etc.
// Or can use time.Weekday if preferred and handle conversion.
// Renamed to DayOfWeekString to avoid conflict with potential built-in time.DayOfWeek if used directly.
type DayOfWeekString string

const (
	Monday    DayOfWeekString = "MONDAY"
	Tuesday   DayOfWeekString = "TUESDAY"
	Wednesday DayOfWeekString = "WEDNESDAY"
	Thursday  DayOfWeekString = "THURSDAY"
	Friday    DayOfWeekString = "FRIDAY"
	Saturday  DayOfWeekString = "SATURDAY"
	Sunday    DayOfWeekString = "SUNDAY"
)

// AvailabilityRule stores the processed availability rules for a business.
// These are used by the Scheduling Service to determine open time slots.
type AvailabilityRule struct {
	ID         uint            `gorm:"primaryKey;autoIncrement" json:"id"`
	BusinessID string          `gorm:"index:idx_availability_business_day,priority:1;type:varchar(255);not null" json:"businessId"`
	DayOfWeek  DayOfWeekString `gorm:"index:idx_availability_business_day,priority:2;type:varchar(10);not null" json:"dayOfWeek"`   // e.g., "MONDAY", "TUESDAY"
	StartTime  string          `gorm:"type:varchar(5);not null" json:"startTime"` // "HH:MM" format, e.g., "09:00"
	EndTime    string          `gorm:"type:varchar(5);not null" json:"endTime"`   // "HH:MM" format, e.g., "17:00"
	BufferMinutes int          `gorm:"default:0" json:"bufferMinutes"` // Buffer time in minutes after a service

	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName explicitly sets the table name.
func (AvailabilityRule) TableName() string {
	return "availability_rules"
}
