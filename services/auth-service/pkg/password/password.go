package password

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Config holds the configuration for password hashing
type Config struct {
	Memory      uint32
	Iterations  uint32
	Parallelism uint8
	SaltLength  uint32
	KeyLength   uint32
}

// DefaultConfig returns the default configuration for password hashing
func DefaultConfig() *Config {
	return &Config{
		Memory:      64 * 1024, // 64 MB
		Iterations:  3,
		Parallelism: 2,
		SaltLength:  16,
		KeyLength:   32,
	}
}

// Manager handles password operations
type Manager struct {
	config *Config
}

// NewManager creates a new password manager
func NewManager(config *Config) *Manager {
	if config == nil {
		config = DefaultConfig()
	}
	return &Manager{config: config}
}

// Hash generates a hash for the given password
func (m *Manager) Hash(password string) (string, error) {
	if err := m.ValidatePassword(password); err != nil {
		return "", err
	}

	// Generate a random salt
	salt, err := m.generateSalt()
	if err != nil {
		return "", fmt.Errorf("failed to generate salt: %w", err)
	}

	// Generate the hash
	hash := argon2.IDKey(
		[]byte(password),
		salt,
		m.config.Iterations,
		m.config.Memory,
		m.config.Parallelism,
		m.config.KeyLength,
	)

	// Encode the hash in the format: $argon2id$v=19$m=memory,t=iterations,p=parallelism$salt$hash
	encodedSalt := base64.RawStdEncoding.EncodeToString(salt)
	encodedHash := base64.RawStdEncoding.EncodeToString(hash)

	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		m.config.Memory,
		m.config.Iterations,
		m.config.Parallelism,
		encodedSalt,
		encodedHash,
	), nil
}

// Verify verifies a password against its hash
func (m *Manager) Verify(password, hash string) (bool, error) {
	// Parse the hash
	config, salt, hashBytes, err := m.parseHash(hash)
	if err != nil {
		return false, fmt.Errorf("failed to parse hash: %w", err)
	}

	// Generate hash for the provided password using the same parameters
	otherHash := argon2.IDKey(
		[]byte(password),
		salt,
		config.Iterations,
		config.Memory,
		config.Parallelism,
		config.KeyLength,
	)

	// Use constant-time comparison to prevent timing attacks
	return subtle.ConstantTimeCompare(hashBytes, otherHash) == 1, nil
}

// ValidatePassword validates password strength
func (m *Manager) ValidatePassword(password string) error {
	if len(password) < 8 {
		return ErrPasswordTooShort
	}

	if len(password) > 128 {
		return ErrPasswordTooLong
	}

	// Check for at least one lowercase letter
	if matched, _ := regexp.MatchString(`[a-z]`, password); !matched {
		return ErrPasswordMissingLowercase
	}

	// Check for at least one uppercase letter
	if matched, _ := regexp.MatchString(`[A-Z]`, password); !matched {
		return ErrPasswordMissingUppercase
	}

	// Check for at least one digit
	if matched, _ := regexp.MatchString(`\d`, password); !matched {
		return ErrPasswordMissingDigit
	}

	// Check for at least one special character
	if matched, _ := regexp.MatchString(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`, password); !matched {
		return ErrPasswordMissingSpecial
	}

	// Check for common weak passwords
	if m.isCommonPassword(password) {
		return ErrPasswordTooCommon
	}

	return nil
}

// GenerateRandomPassword generates a random password
func (m *Manager) GenerateRandomPassword(length int) (string, error) {
	if length < 8 {
		length = 12
	}

	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	password := make([]byte, length)

	for i := range password {
		randomIndex, err := m.generateRandomInt(len(charset))
		if err != nil {
			return "", fmt.Errorf("failed to generate random password: %w", err)
		}
		password[i] = charset[randomIndex]
	}

	return string(password), nil
}

// generateSalt generates a random salt
func (m *Manager) generateSalt() ([]byte, error) {
	salt := make([]byte, m.config.SaltLength)
	_, err := rand.Read(salt)
	if err != nil {
		return nil, err
	}
	return salt, nil
}

// generateRandomInt generates a random integer between 0 and max-1
func (m *Manager) generateRandomInt(max int) (int, error) {
	if max <= 0 {
		return 0, errors.New("max must be positive")
	}

	// Calculate the number of bytes needed
	bytes := make([]byte, 4)
	_, err := rand.Read(bytes)
	if err != nil {
		return 0, err
	}

	// Convert bytes to int and apply modulo
	num := int(bytes[0])<<24 | int(bytes[1])<<16 | int(bytes[2])<<8 | int(bytes[3])
	if num < 0 {
		num = -num
	}

	return num % max, nil
}

// parseHash parses an Argon2 hash string
func (m *Manager) parseHash(hash string) (*Config, []byte, []byte, error) {
	parts := strings.Split(hash, "$")
	if len(parts) != 6 {
		return nil, nil, nil, ErrInvalidHashFormat
	}

	if parts[1] != "argon2id" {
		return nil, nil, nil, ErrUnsupportedHashType
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return nil, nil, nil, ErrInvalidHashFormat
	}

	if version != argon2.Version {
		return nil, nil, nil, ErrIncompatibleVersion
	}

	config := &Config{}
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &config.Memory, &config.Iterations, &config.Parallelism); err != nil {
		return nil, nil, nil, ErrInvalidHashFormat
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return nil, nil, nil, ErrInvalidHashFormat
	}

	hashBytes, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return nil, nil, nil, ErrInvalidHashFormat
	}

	config.SaltLength = uint32(len(salt))
	config.KeyLength = uint32(len(hashBytes))

	return config, salt, hashBytes, nil
}

// isCommonPassword checks if the password is in a list of common passwords
func (m *Manager) isCommonPassword(password string) bool {
	// List of common weak passwords
	commonPasswords := []string{
		"password", "123456", "123456789", "12345678", "12345",
		"1234567", "password123", "admin", "qwerty", "abc123",
		"letmein", "monkey", "1234567890", "dragon", "111111",
		"baseball", "iloveyou", "trustno1", "1234", "sunshine",
		"master", "123123", "welcome", "shadow", "ashley",
		"football", "jesus", "michael", "ninja", "mustang",
	}

	lowerPassword := strings.ToLower(password)
	for _, common := range commonPasswords {
		if lowerPassword == common {
			return true
		}
	}

	return false
}

// Password validation errors
var (
	ErrPasswordTooShort         = errors.New("password must be at least 8 characters long")
	ErrPasswordTooLong          = errors.New("password must be no more than 128 characters long")
	ErrPasswordMissingLowercase = errors.New("password must contain at least one lowercase letter")
	ErrPasswordMissingUppercase = errors.New("password must contain at least one uppercase letter")
	ErrPasswordMissingDigit     = errors.New("password must contain at least one digit")
	ErrPasswordMissingSpecial   = errors.New("password must contain at least one special character")
	ErrPasswordTooCommon        = errors.New("password is too common")
	ErrInvalidHashFormat        = errors.New("invalid hash format")
	ErrUnsupportedHashType      = errors.New("unsupported hash type")
	ErrIncompatibleVersion      = errors.New("incompatible hash version")
)
