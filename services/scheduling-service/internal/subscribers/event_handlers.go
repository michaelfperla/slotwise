package subscribers

import (
	"encoding/json"
	"fmt"

	"github.com/slotwise/scheduling-service/internal/models"
	"github.com/slotwise/scheduling-service/pkg/logger"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// NatsEventHandlers holds dependencies for handling NATS events.
type NatsEventHandlers struct {
	DB     *gorm.DB
	Logger *logger.Logger
}

// NewNatsEventHandlers creates a new NatsEventHandlers.
func NewNatsEventHandlers(db *gorm.DB, logger *logger.Logger) *NatsEventHandlers {
	return &NatsEventHandlers{DB: db, Logger: logger}
}

// --- Event Payloads ---

// BusinessServiceCreatedPayload matches the structure of the 'business.service.created' event.
type BusinessServiceCreatedPayload struct {
	BusinessID     string `json:"businessId"`
	ServiceID      string `json:"serviceId"`
	ServiceDetails struct {
		Name            string  `json:"name"`
		Description     *string `json:"description"` // Pointer to handle optional field
		DurationMinutes int     `json:"durationMinutes"`
		Price           float64 `json:"price"` // Assuming price from NATS might be float
		Currency        string  `json:"currency"`
		IsActive        *bool   `json:"isActive"` // Pointer to handle optional field
		// Add other fields if they become part of the event
	} `json:"serviceDetails"`
}

// AvailabilityRulePayload matches one rule in the 'business.availability.updated' event.
type AvailabilityRulePayload struct {
	DayOfWeek string `json:"dayOfWeek"` // e.g., "MONDAY"
	StartTime string `json:"startTime"` // "HH:MM"
	EndTime   string `json:"endTime"`   // "HH:MM"
}

// BusinessAvailabilityUpdatedPayload matches the 'business.availability.updated' event.
type BusinessAvailabilityUpdatedPayload struct {
	BusinessID string                  `json:"businessId"`
	Rules      []AvailabilityRulePayload `json:"rules"`
}

// --- Event Handler Functions ---

// HandleBusinessServiceCreated processes the 'business.service.created' event.
func (h *NatsEventHandlers) HandleBusinessServiceCreated(data []byte) error {
	var payload BusinessServiceCreatedPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		h.Logger.Error("Failed to unmarshal BusinessServiceCreatedPayload", "error", err, "rawData", string(data))
		return fmt.Errorf("unmarshal BusinessServiceCreatedPayload: %w", err)
	}

	h.Logger.Info("Processing business.service.created event", "serviceId", payload.ServiceID, "businessId", payload.BusinessID)

	serviceDef := models.ServiceDefinition{
		ID:              payload.ServiceID,
		BusinessID:      payload.BusinessID,
		Name:            payload.ServiceDetails.Name,
		DurationMinutes: payload.ServiceDetails.DurationMinutes,
		Price:           int64(payload.ServiceDetails.Price * 100), // Convert to cents
		Currency:        payload.ServiceDetails.Currency,
	}
	if payload.ServiceDetails.Description != nil {
		serviceDef.Description = *payload.ServiceDetails.Description
	}
	if payload.ServiceDetails.IsActive != nil {
		serviceDef.IsActive = *payload.ServiceDetails.IsActive
	} else {
		serviceDef.IsActive = true // Default to active if not provided
	}


	// Upsert logic: Create or Update on conflict on ID
	err := h.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"business_id", "name", "description", "duration_minutes", "price", "currency", "is_active", "updated_at"}),
	}).Create(&serviceDef).Error

	if err != nil {
		h.Logger.Error("Failed to upsert ServiceDefinition", "error", err, "serviceId", payload.ServiceID)
		return fmt.Errorf("upsert ServiceDefinition: %w", err)
	}

	h.Logger.Info("Successfully processed business.service.created event", "serviceId", payload.ServiceID)
	return nil
}

// HandleBusinessAvailabilityUpdated processes the 'business.availability.updated' event.
func (h *NatsEventHandlers) HandleBusinessAvailabilityUpdated(data []byte) error {
	var payload BusinessAvailabilityUpdatedPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		h.Logger.Error("Failed to unmarshal BusinessAvailabilityUpdatedPayload", "error", err, "rawData", string(data))
		return fmt.Errorf("unmarshal BusinessAvailabilityUpdatedPayload: %w", err)
	}

	h.Logger.Info("Processing business.availability.updated event", "businessId", payload.BusinessID)

	// Atomically update: delete all existing rules for the business and create new ones
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// Delete existing rules
		if err := tx.Where("business_id = ?", payload.BusinessID).Delete(&models.AvailabilityRule{}).Error; err != nil {
			return fmt.Errorf("delete old availability rules: %w", err)
		}

		// Create new rules if any
		if len(payload.Rules) > 0 {
			newRules := make([]models.AvailabilityRule, len(payload.Rules))
			for i, rulePayload := range payload.Rules {
				// Basic validation for DayOfWeek enum can be added here if necessary
				dayOfWeekModel := models.DayOfWeekString(rulePayload.DayOfWeek) // Cast string to models.DayOfWeekString
				
				// Add more validation if needed (e.g. time format, start < end)
				// Though Business Service should have validated this.

				newRules[i] = models.AvailabilityRule{
					BusinessID: payload.BusinessID,
					DayOfWeek:  dayOfWeekModel,
					StartTime:  rulePayload.StartTime,
					EndTime:    rulePayload.EndTime,
				}
			}
			if err := tx.Create(&newRules).Error; err != nil {
				return fmt.Errorf("create new availability rules: %w", err)
			}
		}
		return nil
	})

	if err != nil {
		h.Logger.Error("Failed to process BusinessAvailabilityUpdated event transaction", "error", err, "businessId", payload.BusinessID)
		return err
	}

	h.Logger.Info("Successfully processed business.availability.updated event", "businessId", payload.BusinessID)
	return nil
}
