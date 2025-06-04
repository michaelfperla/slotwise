package repository

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	// "time" // No longer needed here if Booking struct is removed
	"fmt" // For fmt.Errorf

	"github.com/slotwise/scheduling-service/internal/models" // For models.DayOfWeekString
)

// AvailabilityRepository handles availability data operations
type AvailabilityRepository struct {
	db *gorm.DB
}

// CacheRepository handles cache operations
type CacheRepository struct {
	client *redis.Client
}

// NewAvailabilityRepository creates a new availability repository
func NewAvailabilityRepository(db *gorm.DB) *AvailabilityRepository {
	return &AvailabilityRepository{db: db}
}

// GetServiceDefinition retrieves a single service definition by its ID.
func (r *AvailabilityRepository) GetServiceDefinition(ctx context.Context, serviceID string) (*models.ServiceDefinition, error) {
	var serviceDef models.ServiceDefinition
	if err := r.db.WithContext(ctx).First(&serviceDef, "id = ?", serviceID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // Return nil, nil if not found, service layer can handle "not found" error
		}
		return nil, fmt.Errorf("error fetching service definition %s: %w", serviceID, err)
	}
	return &serviceDef, nil
}

// GetAvailabilityRulesFiltered retrieves availability rules for a given business.
// If dayOfWeek is empty, it fetches all rules for the business, ordered by day_of_week then start_time.
// Otherwise, it filters by businessID AND dayOfWeek, ordered by start_time.
func (r *AvailabilityRepository) GetAvailabilityRulesFiltered(ctx context.Context, businessID string, dayOfWeek models.DayOfWeekString) ([]models.AvailabilityRule, error) {
	var rules []models.AvailabilityRule
	query := r.db.WithContext(ctx).Where("business_id = ?", businessID)

	if dayOfWeek == "" {
		// Fetch all rules for the business, order by day_of_week, then start_time
		query = query.Order("day_of_week asc").Order("start_time asc")
	} else {
		// Fetch rules for a specific day_of_week, order by start_time
		query = query.Where("day_of_week = ?", dayOfWeek).Order("start_time asc")
	}

	err := query.Find(&rules).Error
	if err != nil {
		if dayOfWeek == "" {
			return nil, fmt.Errorf("error fetching all availability rules for business %s: %w", businessID, err)
		}
		return nil, fmt.Errorf("error fetching availability rules for business %s on %s: %w", businessID, dayOfWeek, err)
	}
	return rules, nil
}

// CreateAvailabilityRule persists a new AvailabilityRule to the database.
func (r *AvailabilityRepository) CreateAvailabilityRule(ctx context.Context, rule *models.AvailabilityRule) error {
	if err := r.db.WithContext(ctx).Create(rule).Error; err != nil {
		// TODO: Consider checking for specific DB errors, like unique constraint violations if applicable
		return fmt.Errorf("error creating availability rule for business %s on %s: %w", rule.BusinessID, rule.DayOfWeek, err)
	}
	return nil
}

// NewCacheRepository creates a new cache repository
func NewCacheRepository(client *redis.Client) *CacheRepository {
	return &CacheRepository{client: client}
}

// Set sets a value in cache
func (r *CacheRepository) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	// Handle nil Redis client (development mode)
	if r.client == nil {
		return nil // No-op for development
	}
	// TODO: Implement actual cache operations with Redis
	return nil
}

// Get gets a value from cache
func (r *CacheRepository) Get(ctx context.Context, key string) (string, error) {
	// Handle nil Redis client (development mode)
	if r.client == nil {
		return "", nil // Return empty for development
	}
	// TODO: Implement actual cache operations with Redis
	return "", nil
}
