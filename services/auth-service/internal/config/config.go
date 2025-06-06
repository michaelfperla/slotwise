package config

import (
	"fmt"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Environment string    `mapstructure:"environment"`
	Port        int       `mapstructure:"port"`
	LogLevel    string    `mapstructure:"log_level"`
	Database    Database  `mapstructure:"database"`
	Redis       Redis     `mapstructure:"redis"`
	NATS        NATS      `mapstructure:"nats"`
	JWT         JWT       `mapstructure:"jwt"`
	Email       Email     `mapstructure:"email"`
	RateLimit   RateLimit `mapstructure:"rate_limit"`
}

type Database struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	Name     string `mapstructure:"name"`
	SSLMode  string `mapstructure:"ssl_mode"`
}

type Redis struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

type NATS struct {
	URL     string `mapstructure:"url"`
	Subject string `mapstructure:"subject"`
}

type JWT struct {
	Secret          string        `mapstructure:"secret"`
	AccessTokenTTL  time.Duration `mapstructure:"access_token_ttl"`
	RefreshTokenTTL time.Duration `mapstructure:"refresh_token_ttl"`
	Issuer          string        `mapstructure:"issuer"`
}

type Email struct {
	Provider string `mapstructure:"provider"`
	APIKey   string `mapstructure:"api_key"`
	From     string `mapstructure:"from"`
}

type RateLimit struct {
	RequestsPerMinute     int           `mapstructure:"requests_per_minute"`
	BurstSize             int           `mapstructure:"burst_size"`
	CleanupInterval       time.Duration `mapstructure:"cleanup_interval"`
	AuthRequestsPerMinute int           `mapstructure:"auth_requests_per_minute"`
}

func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./configs")
	viper.AddConfigPath(".")

	// Set defaults
	setDefaults()

	// Enable environment variable support with prefix
	viper.SetEnvPrefix("") // No prefix to match Docker Compose env vars
	viper.AutomaticEnv()

	// Map environment variables to config keys
	viper.BindEnv("database.host", "DATABASE_HOST")
	viper.BindEnv("database.port", "DATABASE_PORT")
	viper.BindEnv("database.user", "DATABASE_USER")
	viper.BindEnv("database.password", "DATABASE_PASSWORD")
	viper.BindEnv("database.name", "DATABASE_NAME")
	viper.BindEnv("redis.host", "REDIS_HOST")
	viper.BindEnv("redis.port", "REDIS_PORT")
	viper.BindEnv("nats.url", "NATS_URL")
	viper.BindEnv("jwt.secret", "JWT_SECRET")
	viper.BindEnv("environment", "ENVIRONMENT")
	viper.BindEnv("log_level", "LOG_LEVEL")

	// Read config file (optional in Docker)
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
		// Config file not found is OK, we'll use env vars and defaults
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &config, nil
}

func setDefaults() {
	// Server defaults
	viper.SetDefault("environment", "development")
	viper.SetDefault("port", 8001)
	viper.SetDefault("log_level", "info")

	// Database defaults - Updated to match Docker Compose environment variables
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.user", "slotwise")
	viper.SetDefault("database.password", "slotwise_password")
	viper.SetDefault("database.name", "slotwise")
	viper.SetDefault("database.ssl_mode", "disable")

	// Redis defaults
	viper.SetDefault("redis.host", "localhost")
	viper.SetDefault("redis.port", 6379)
	viper.SetDefault("redis.password", "")
	viper.SetDefault("redis.db", 0)

	// NATS defaults
	viper.SetDefault("nats.url", "nats://localhost:4222")
	viper.SetDefault("nats.subject", "slotwise.auth")

	// JWT defaults
	viper.SetDefault("jwt.secret", "your-super-secret-jwt-key-change-in-production")
	viper.SetDefault("jwt.access_token_ttl", "15m")
	viper.SetDefault("jwt.refresh_token_ttl", "168h") // 7 days
	viper.SetDefault("jwt.issuer", "slotwise-auth-service")

	// Email defaults
	viper.SetDefault("email.provider", "sendgrid")
	viper.SetDefault("email.api_key", "")
	viper.SetDefault("email.from", "noreply@slotwise.com")

	// Rate limiting defaults
	viper.SetDefault("rate_limit.requests_per_minute", 1000)
	viper.SetDefault("rate_limit.burst_size", 100)
	viper.SetDefault("rate_limit.cleanup_interval", "1m")
	viper.SetDefault("rate_limit.auth_requests_per_minute", 100)
}
