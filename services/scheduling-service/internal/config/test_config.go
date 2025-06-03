package config

import (
	"os"
)

// TestConfig provides configuration for test environments
type TestConfig struct {
	DatabaseURL string
}

// NewTestConfig creates a new test configuration
func NewTestConfig() *TestConfig {
	// Default to local test database
	dbURL := "host=localhost user=postgres password=postgres dbname=slotwise_scheduling_test port=5432 sslmode=disable"

	// Allow override via environment variable (for CI)
	if envURL := os.Getenv("TEST_DATABASE_URL"); envURL != "" {
		dbURL = envURL
	}

	return &TestConfig{
		DatabaseURL: dbURL,
	}
}

// GetDatabaseURL returns the test database URL
func (c *TestConfig) GetDatabaseURL() string {
	return c.DatabaseURL
}

// IsCI returns true if running in CI environment
func IsCI() bool {
	return os.Getenv("CI") == "true" || os.Getenv("GITHUB_ACTIONS") == "true"
}
