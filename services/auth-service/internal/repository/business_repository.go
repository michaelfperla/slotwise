package repository

import (
	"errors"

	"github.com/slotwise/auth-service/internal/models"
	"github.com/slotwise/auth-service/pkg/logger"
	"gorm.io/gorm"
)

var (
	ErrBusinessNotFound      = errors.New("business not found")
	ErrBusinessAlreadyExists = errors.New("business with this name or owner already exists") // Example, adjust as needed
)

// BusinessRepository defines the interface for business data operations
type BusinessRepository interface {
	Create(business *models.Business) error
	GetByID(id string) (*models.Business, error)
	GetByOwnerID(ownerID string) (*models.Business, error)
	Update(business *models.Business) error
	// Add other methods like Delete, ListByOwner, etc. as needed
}

type businessRepository struct {
	db     *gorm.DB
	logger logger.Logger
}

// NewBusinessRepository creates a new business repository
func NewBusinessRepository(db *gorm.DB, logger logger.Logger) BusinessRepository {
	return &businessRepository{
		db:     db,
		logger: logger,
	}
}

// Create creates a new business record in the database
func (r *businessRepository) Create(business *models.Business) error {
	if err := r.db.Create(business).Error; err != nil {
		// Consider checking for unique constraint errors if applicable, e.g., duplicate name for an owner
		r.logger.Error("Error creating business", "error", err.Error(), "ownerId", business.OwnerID, "businessName", business.Name)
		return err
	}
	r.logger.Info("Business created successfully", "businessId", business.ID, "ownerId", business.OwnerID)
	return nil
}

// GetByID retrieves a business by its ID
func (r *businessRepository) GetByID(id string) (*models.Business, error) {
	var business models.Business
	if err := r.db.Preload("Owner").First(&business, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessNotFound
		}
		r.logger.Error("Error retrieving business by ID", "error", err.Error(), "businessId", id)
		return nil, err
	}
	return &business, nil
}

// GetByOwnerID retrieves a business by its owner's ID
func (r *businessRepository) GetByOwnerID(ownerID string) (*models.Business, error) {
	var business models.Business
	// Assuming one owner has one business for now, or the first one found.
	// If an owner can have multiple, this should return a slice []*models.Business
	if err := r.db.Preload("Owner").First(&business, "owner_id = ?", ownerID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBusinessNotFound // Or nil, nil if it's acceptable for an owner not to have a business
		}
		r.logger.Error("Error retrieving business by Owner ID", "error", err.Error(), "ownerId", ownerID)
		return nil, err
	}
	return &business, nil
}

// Update updates an existing business record
func (r *businessRepository) Update(business *models.Business) error {
	if err := r.db.Save(business).Error; err != nil {
		r.logger.Error("Error updating business", "error", err.Error(), "businessId", business.ID)
		return err
	}
	r.logger.Info("Business updated successfully", "businessId", business.ID)
	return nil
}
