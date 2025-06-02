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
	// TODO: Add actual migrations when models are defined
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
