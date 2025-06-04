package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Business represents a business entity in the system
type Business struct {
	ID        string         `gorm:"type:uuid;primary_key;" json:"id"`
	OwnerID   string         `gorm:"type:uuid;not null;index" json:"ownerId"` // Foreign key to User
	Name      string         `gorm:"type:varchar(255);not null" json:"name"`
	CreatedAt time.Time      `gorm:"default:CURRENT_TIMESTAMP" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"default:CURRENT_TIMESTAMP" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete

	// Relationships - temporarily disabled for initial migration
	// Owner *User `gorm:"foreignKey:OwnerID" json:"owner,omitempty"` // Belongs to User
}

// BeforeCreate will set a UUID rather than numeric ID.
func (business *Business) BeforeCreate(tx *gorm.DB) (err error) {
	if business.ID == "" {
		business.ID = uuid.New().String()
	}
	return
}

// Minimal representation of Business for some responses if needed
type BusinessInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (b *Business) ToBusinessInfo() *BusinessInfo {
	return &BusinessInfo{
		ID:   b.ID,
		Name: b.Name,
	}
}
