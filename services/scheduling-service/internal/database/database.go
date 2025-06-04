package database

import (
	"fmt"

	"github.com/redis/go-redis/v9"
	"github.com/slotwise/scheduling-service/internal/config"
	"github.com/slotwise/scheduling-service/internal/models" // Added import for models
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Connect connects to the PostgreSQL database
func Connect(cfg config.DatabaseConfig) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.URL), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	return db, nil
}

// Migrate runs database migrations
func Migrate(db *gorm.DB) error {
	// Enable UUID extension (required for gen_random_uuid())
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"").Error; err != nil {
		return fmt.Errorf("failed to create uuid extension: %w", err)
	}

	// Auto-migrate models in proper order
	err := db.AutoMigrate(
		&models.ServiceDefinition{},
		&models.AvailabilityRule{},
		&models.Booking{},
	)
	if err != nil {
		return fmt.Errorf("failed to run auto-migrations: %w", err)
	}

	// Create indexes for performance
	if err := createIndexes(db); err != nil {
		return fmt.Errorf("failed to create indexes: %w", err)
	}

	return nil
}

// createIndexes creates additional indexes for performance
func createIndexes(db *gorm.DB) error {
	// Booking indexes for common query patterns
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_bookings_business_status ON bookings(business_id, status)",
		"CREATE INDEX IF NOT EXISTS idx_bookings_customer_status ON bookings(customer_id, status)",
		"CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time)",
		"CREATE INDEX IF NOT EXISTS idx_bookings_status_start_time ON bookings(status, start_time)",

		// ServiceDefinition indexes
		"CREATE INDEX IF NOT EXISTS idx_service_definitions_business_active ON service_definitions(business_id, is_active)",

		// AvailabilityRule indexes
		"CREATE INDEX IF NOT EXISTS idx_availability_rules_business_day ON availability_rules(business_id, day_of_week)",
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}
	}

	return nil
}

// ConnectRedis connects to Redis
func ConnectRedis(cfg config.RedisConfig) (*redis.Client, error) {
	opt, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	client := redis.NewClient(opt)
	return client, nil
}
