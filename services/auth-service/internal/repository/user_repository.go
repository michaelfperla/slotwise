package repository

import (
	"errors"
	"fmt"
	"time"

	"github.com/slotwise/auth-service/internal/models"
	"gorm.io/gorm"
)

// UserRepository defines the interface for user data operations
type UserRepository interface {
	Create(user *models.User) error
	GetByID(id string) (*models.User, error)
	GetByEmail(email string) (*models.User, error)
	GetByPasswordResetToken(token string) (*models.User, error)
	GetByEmailVerificationToken(token string) (*models.User, error)
	Update(user *models.User) error
	Delete(id string) error
	List(limit, offset int) ([]*models.User, int64, error)
	UpdateLastLogin(id string) error
	SetPasswordResetToken(id, token string, expiresAt time.Time) error
	ClearPasswordResetToken(id string) error
	SetEmailVerificationToken(id, token string, expiresAt time.Time) error
	VerifyEmail(id string) error
	UpdatePassword(id, passwordHash string) error
	GetActiveUsers() ([]*models.User, error)
	CountByRole(role models.UserRole) (int64, error)
}

// userRepository implements UserRepository interface
type userRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

// Create creates a new user
func (r *userRepository) Create(user *models.User) error {
	if err := r.db.Create(user).Error; err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

// GetByID retrieves a user by ID
func (r *userRepository) GetByID(id string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("id = ?", id).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}
	return &user, nil
}

// GetByEmail retrieves a user by email
func (r *userRepository) GetByEmail(email string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	return &user, nil
}

// GetByPasswordResetToken retrieves a user by password reset token
func (r *userRepository) GetByPasswordResetToken(token string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("password_reset_token = ? AND password_reset_expires_at > ?",
		token, time.Now()).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by password reset token: %w", err)
	}
	return &user, nil
}

// GetByEmailVerificationToken retrieves a user by email verification token
func (r *userRepository) GetByEmailVerificationToken(token string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("email_verification_token = ? AND email_verification_expires_at > ?",
		token, time.Now()).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user by email verification token: %w", err)
	}
	return &user, nil
}

// Update updates a user
func (r *userRepository) Update(user *models.User) error {
	if err := r.db.Save(user).Error; err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	return nil
}

// Delete soft deletes a user
func (r *userRepository) Delete(id string) error {
	if err := r.db.Where("id = ?", id).Delete(&models.User{}).Error; err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}

// List retrieves users with pagination
func (r *userRepository) List(limit, offset int) ([]*models.User, int64, error) {
	var users []*models.User
	var total int64

	// Get total count
	if err := r.db.Model(&models.User{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	// Get users with pagination
	if err := r.db.Limit(limit).Offset(offset).Find(&users).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list users: %w", err)
	}

	return users, total, nil
}

// UpdateLastLogin updates the last login timestamp
func (r *userRepository) UpdateLastLogin(id string) error {
	now := time.Now()
	if err := r.db.Model(&models.User{}).Where("id = ?", id).
		Update("last_login_at", now).Error; err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}
	return nil
}

// SetPasswordResetToken sets the password reset token and expiration
func (r *userRepository) SetPasswordResetToken(id, token string, expiresAt time.Time) error {
	if err := r.db.Model(&models.User{}).Where("id = ?", id).Updates(map[string]interface{}{
		"password_reset_token":      token,
		"password_reset_expires_at": expiresAt,
	}).Error; err != nil {
		return fmt.Errorf("failed to set password reset token: %w", err)
	}
	return nil
}

// ClearPasswordResetToken clears the password reset token
func (r *userRepository) ClearPasswordResetToken(id string) error {
	if err := r.db.Model(&models.User{}).Where("id = ?", id).Updates(map[string]interface{}{
		"password_reset_token":      nil,
		"password_reset_expires_at": nil,
	}).Error; err != nil {
		return fmt.Errorf("failed to clear password reset token: %w", err)
	}
	return nil
}

// SetEmailVerificationToken sets the email verification token and expiration
func (r *userRepository) SetEmailVerificationToken(id, token string, expiresAt time.Time) error {
	if err := r.db.Model(&models.User{}).Where("id = ?", id).Updates(map[string]interface{}{
		"email_verification_token":      token,
		"email_verification_expires_at": expiresAt,
	}).Error; err != nil {
		return fmt.Errorf("failed to set email verification token: %w", err)
	}
	return nil
}

// VerifyEmail marks the user's email as verified
func (r *userRepository) VerifyEmail(id string) error {
	now := time.Now()
	if err := r.db.Model(&models.User{}).Where("id = ?", id).Updates(map[string]interface{}{
		"is_email_verified":             true,
		"email_verified_at":             now,
		"status":                        models.StatusActive,
		"email_verification_token":      nil,
		"email_verification_expires_at": nil,
	}).Error; err != nil {
		return fmt.Errorf("failed to verify email: %w", err)
	}
	return nil
}

// UpdatePassword updates the user's password hash
func (r *userRepository) UpdatePassword(id, passwordHash string) error {
	if err := r.db.Model(&models.User{}).Where("id = ?", id).
		Update("password_hash", passwordHash).Error; err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}
	return nil
}

// GetActiveUsers retrieves all active users
func (r *userRepository) GetActiveUsers() ([]*models.User, error) {
	var users []*models.User
	if err := r.db.Where("status = ?", models.StatusActive).Find(&users).Error; err != nil {
		return nil, fmt.Errorf("failed to get active users: %w", err)
	}
	return users, nil
}

// CountByRole counts users by role
func (r *userRepository) CountByRole(role models.UserRole) (int64, error) {
	var count int64
	if err := r.db.Model(&models.User{}).Where("role = ?", role).Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to count users by role: %w", err)
	}
	return count, nil
}

// Repository errors
var (
	ErrUserNotFound = errors.New("user not found")
	ErrUserExists   = errors.New("user already exists")
)
