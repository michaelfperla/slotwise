package config

import (
	"os"
	"strconv"
)

// Config holds all configuration for the scheduling service
type Config struct {
	Environment string
	Port        int
	LogLevel    string
	Database    DatabaseConfig
	Redis       RedisConfig
	NATS        NATSConfig
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	URL string
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	URL string
}

// NATSConfig holds NATS configuration
type NATSConfig struct {
	URL string
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	port, err := strconv.Atoi(getEnv("PORT", "8080"))
	if err != nil {
		port = 8080
	}

	return &Config{
		Environment: getEnv("ENVIRONMENT", "development"),
		Port:        port,
		LogLevel:    getEnv("LOG_LEVEL", "info"),
		Database: DatabaseConfig{
			URL: getEnv("DATABASE_URL", "postgres://localhost:5432/slotwise_scheduling?sslmode=disable"),
		},
		Redis: RedisConfig{
			URL: getEnv("REDIS_URL", "redis://localhost:6379"),
		},
		NATS: NATSConfig{
			URL: getEnv("NATS_URL", "nats://localhost:4222"),
		},
	}, nil
}

// getEnv gets an environment variable with a fallback value
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
