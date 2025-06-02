package database

import (
	"fmt"

	"github.com/redis/go-redis/v9"
	"github.com/slotwise/scheduling-service/internal/config"
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
	// Auto-migrate models
	// Import models package: _ "github.com/slotwise/scheduling-service/internal/models"
	// or ensure models are accessible. Assuming they are in current scope as 'models.ServiceDefinition' etc.
	// For this tool, explicit import in the file being modified is not needed, but it is for Go compiler.
	// The tool operates on file content directly.
	err := db.AutoMigrate(
		&models.ServiceDefinition{},
		&models.AvailabilityRule{},
		&models.Booking{}, // Add Booking model to migrations
	)
	if err != nil {
		return fmt.Errorf("failed to run auto-migrations: %w", err)
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
