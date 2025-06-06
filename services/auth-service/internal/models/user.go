package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserRole represents the role of a user in the system
type UserRole string

const (
	RoleAdmin         UserRole = "admin"
	RoleBusinessOwner UserRole = "business_owner"
	RoleClient        UserRole = "client"
)

// UserStatus represents the status of a user account
type UserStatus string

const (
	StatusActive              UserStatus = "active"
	StatusInactive            UserStatus = "inactive"
	StatusSuspended           UserStatus = "suspended"
	StatusPendingVerification UserStatus = "pending_verification"
)

// User represents a user in the system
type User struct {
	ID              string     `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Email           string     `gorm:"uniqueIndex;not null" json:"email"`
	Phone           *string    `gorm:"uniqueIndex" json:"phone,omitempty"` // Phone number for magic login
	PasswordHash    string     `gorm:"not null" json:"-"`
	FirstName       string     `gorm:"not null" json:"firstName"`
	LastName        string     `gorm:"not null" json:"lastName"`
	Avatar          *string    `json:"avatar"`
	Timezone        string     `gorm:"not null;default:'UTC'" json:"timezone"`
	IsEmailVerified bool       `gorm:"default:false" json:"isEmailVerified"`
	IsPhoneVerified bool       `gorm:"default:false" json:"isPhoneVerified"` // Phone verification status
	EmailVerifiedAt *time.Time `json:"emailVerifiedAt"`
	PhoneVerifiedAt *time.Time `json:"phoneVerifiedAt"` // Phone verification timestamp
	LastLoginAt     *time.Time `json:"lastLoginAt"`
	Role            UserRole   `gorm:"type:varchar(20);not null;default:'client'" json:"role"`
	Status          UserStatus `gorm:"type:varchar(30);not null;default:'pending_verification'" json:"status"`

	// Business association
	BusinessID *string   `gorm:"type:uuid;index" json:"businessId,omitempty"`     // Foreign key to Business table
	Business   *Business `gorm:"foreignKey:BusinessID" json:"business,omitempty"` // Belongs to Business

	// Preferences stored as JSONB
	Language   string `gorm:"default:'en'" json:"language"`
	DateFormat string `gorm:"default:'MM/DD/YYYY'" json:"dateFormat"`
	TimeFormat string `gorm:"default:'12h'" json:"timeFormat"`

	// Notification preferences
	EmailNotifications bool `gorm:"default:true" json:"emailNotifications"`
	SMSNotifications   bool `gorm:"default:false" json:"smsNotifications"`

	// Password reset
	PasswordResetToken     *string    `json:"-"`
	PasswordResetExpiresAt *time.Time `json:"-"`

	// Email verification
	EmailVerificationToken     *string    `json:"-"`
	EmailVerificationExpiresAt *time.Time `json:"-"`

	// Timestamps
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate hook to generate UUID
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

// TableName returns the table name for the User model
func (User) TableName() string {
	return "users"
}

// IsValidRole checks if the role is valid
func (r UserRole) IsValid() bool {
	switch r {
	case RoleAdmin, RoleBusinessOwner, RoleClient:
		return true
	default:
		return false
	}
}

// IsValidStatus checks if the status is valid
func (s UserStatus) IsValid() bool {
	switch s {
	case StatusActive, StatusInactive, StatusSuspended, StatusPendingVerification:
		return true
	default:
		return false
	}
}

// CanLogin checks if the user can login
func (u *User) CanLogin() bool {
	return u.Status == StatusActive && u.IsEmailVerified
}

// IsAdmin checks if the user is an admin
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}

// IsBusinessOwner checks if the user is a business owner
func (u *User) IsBusinessOwner() bool {
	return u.Role == RoleBusinessOwner
}

// IsClient checks if the user is a client
func (u *User) IsClient() bool {
	return u.Role == RoleClient
}

// ToAuthUser converts User to AuthUser for JWT claims
func (u *User) ToAuthUser() *AuthUser {
	authUser := &AuthUser{
		ID:        u.ID,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Role:      string(u.Role),
	}
	if u.Phone != nil {
		authUser.Phone = *u.Phone
	}
	if u.BusinessID != nil {
		authUser.BusinessID = *u.BusinessID
	}
	return authUser
}

// AuthUser represents the user data stored in JWT tokens
// Note: BusinessID is already here, which is good.
type AuthUser struct {
	ID         string `json:"id"`
	Email      string `json:"email"`
	Phone      string `json:"phone,omitempty"`
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
	Role       string `json:"role"`
	BusinessID string `json:"businessId,omitempty"`
}

// Session represents a user session stored in Redis
type Session struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	RefreshToken string    `json:"refreshToken"`
	ExpiresAt    time.Time `json:"expiresAt"`
	CreatedAt    time.Time `json:"createdAt"`
	LastUsedAt   time.Time `json:"lastUsedAt"`
	IPAddress    string    `json:"ipAddress"`
	UserAgent    string    `json:"userAgent"`
}

// IsExpired checks if the session is expired
func (s *Session) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

// UpdateLastUsed updates the last used timestamp
func (s *Session) UpdateLastUsed() {
	s.LastUsedAt = time.Now()
}

// VerificationCode represents a verification code stored in Redis
type VerificationCode struct {
	Identifier string    `json:"identifier"` // Email or phone number
	Code       string    `json:"code"`       // 4-digit verification code
	Type       string    `json:"type"`       // "email" or "phone"
	ExpiresAt  time.Time `json:"expiresAt"`  // Expiration time
	CreatedAt  time.Time `json:"createdAt"`  // Creation time
	Attempts   int       `json:"attempts"`   // Number of verification attempts
}

// IsExpired checks if the verification code is expired
func (vc *VerificationCode) IsExpired() bool {
	return time.Now().After(vc.ExpiresAt)
}

// CanAttempt checks if more verification attempts are allowed
func (vc *VerificationCode) CanAttempt() bool {
	return vc.Attempts < 3 // Allow max 3 attempts
}

// IncrementAttempts increments the attempt counter
func (vc *VerificationCode) IncrementAttempts() {
	vc.Attempts++
}
