package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/slotwise/auth-service/internal/models"
)

// VerificationRepository defines the interface for verification code operations
type VerificationRepository interface {
	StoreCode(ctx context.Context, code *models.VerificationCode) error
	GetCode(ctx context.Context, identifier string) (*models.VerificationCode, error)
	DeleteCode(ctx context.Context, identifier string) error
	IncrementAttempts(ctx context.Context, identifier string) error
}

// verificationRepository implements VerificationRepository interface
type verificationRepository struct {
	redis *redis.Client
}

// NewVerificationRepository creates a new verification repository
func NewVerificationRepository(redis *redis.Client) VerificationRepository {
	return &verificationRepository{redis: redis}
}

// StoreCode stores a verification code in Redis
func (r *verificationRepository) StoreCode(ctx context.Context, code *models.VerificationCode) error {
	key := fmt.Sprintf("verification_code:%s", code.Identifier)
	
	data, err := json.Marshal(code)
	if err != nil {
		return fmt.Errorf("failed to marshal verification code: %w", err)
	}

	// Store with TTL based on expiration time
	ttl := time.Until(code.ExpiresAt)
	if ttl <= 0 {
		return fmt.Errorf("verification code is already expired")
	}

	if err := r.redis.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to store verification code: %w", err)
	}

	return nil
}

// GetCode retrieves a verification code from Redis
func (r *verificationRepository) GetCode(ctx context.Context, identifier string) (*models.VerificationCode, error) {
	key := fmt.Sprintf("verification_code:%s", identifier)
	
	data, err := r.redis.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, ErrVerificationCodeNotFound
		}
		return nil, fmt.Errorf("failed to get verification code: %w", err)
	}

	var code models.VerificationCode
	if err := json.Unmarshal([]byte(data), &code); err != nil {
		return nil, fmt.Errorf("failed to unmarshal verification code: %w", err)
	}

	return &code, nil
}

// DeleteCode removes a verification code from Redis
func (r *verificationRepository) DeleteCode(ctx context.Context, identifier string) error {
	key := fmt.Sprintf("verification_code:%s", identifier)
	
	if err := r.redis.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("failed to delete verification code: %w", err)
	}

	return nil
}

// IncrementAttempts increments the attempt counter for a verification code
func (r *verificationRepository) IncrementAttempts(ctx context.Context, identifier string) error {
	code, err := r.GetCode(ctx, identifier)
	if err != nil {
		return err
	}

	code.IncrementAttempts()

	return r.StoreCode(ctx, code)
}

// Repository errors
var (
	ErrVerificationCodeNotFound = fmt.Errorf("verification code not found")
)
