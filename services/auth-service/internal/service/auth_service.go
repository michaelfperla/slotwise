package service

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/slotwise/auth-service/internal/config"
	"github.com/slotwise/auth-service/internal/models"
	"github.com/slotwise/auth-service/internal/repository"
	"github.com/slotwise/auth-service/pkg/events"
	"github.com/slotwise/auth-service/pkg/jwt"
	"github.com/slotwise/auth-service/pkg/logger"
	"github.com/slotwise/auth-service/pkg/password"
)

// AuthService defines the interface for authentication operations
type AuthService interface {
	Register(req *RegisterRequest) (*AuthResponse, error)
	Login(req *LoginRequest) (*AuthResponse, error)
	RefreshToken(req *RefreshTokenRequest) (*AuthResponse, error)
	Logout(req *LogoutRequest) error
	VerifyEmail(token string) error
	ForgotPassword(email string) error
	ResetPassword(req *ResetPasswordRequest) error
	ValidateToken(token string) (*models.AuthUser, error)
	RevokeAllSessions(userID string) error
}

// Request/Response types
type RegisterRequest struct {
	Email        string  `json:"email" validate:"required,email"`
	Password     string  `json:"password" validate:"required,min=8"`
	FirstName    string  `json:"firstName" validate:"required"`
	LastName     string  `json:"lastName" validate:"required"`
	Timezone     string  `json:"timezone" validate:"required"`
	Role         string  `json:"role,omitempty"`
	BusinessName *string `json:"businessName,omitempty"` // Added for business registration
}

type LoginRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required"`
	IPAddress string `json:"-"`
	UserAgent string `json:"-"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
	IPAddress    string `json:"-"`
	UserAgent    string `json:"-"`
}

type LogoutRequest struct {
	SessionID string `json:"-"`
	UserID    string `json:"-"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"newPassword" validate:"required,min=8"`
}

type AuthResponse struct {
	User         *models.AuthUser `json:"user"`
	AccessToken  string           `json:"accessToken"`
	RefreshToken string           `json:"refreshToken"`
	ExpiresIn    int64            `json:"expiresIn"`
	ExpiresAt    time.Time        `json:"expiresAt"`
}

// authService implements AuthService interface
type authService struct {
	userRepo       repository.UserRepository
	businessRepo   repository.BusinessRepository // Added
	sessionRepo    repository.SessionRepository
	passwordMgr    *password.Manager
	jwtMgr         *jwt.Manager
	eventPublisher events.Publisher
	config         config.JWT
	logger         logger.Logger
}

// NewAuthService creates a new authentication service
func NewAuthService(
	userRepo repository.UserRepository,
	businessRepo repository.BusinessRepository, // Added
	sessionRepo repository.SessionRepository,
	eventPublisher events.Publisher,
	config config.JWT,
	logger logger.Logger,
) AuthService {
	return &authService{
		userRepo:       userRepo,
		businessRepo:   businessRepo, // Added
		sessionRepo:    sessionRepo,
		passwordMgr:    password.NewManager(nil),
		jwtMgr:         jwt.NewManager(config),
		eventPublisher: eventPublisher,
		config:         config,
		logger:         logger,
	}
}

// Register creates a new user account
func (s *authService) Register(req *RegisterRequest) (*AuthResponse, error) {
	// Check if user already exists
	existingUser, err := s.userRepo.GetByEmail(req.Email)
	if err != nil && !errors.Is(err, repository.ErrUserNotFound) {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}
	if existingUser != nil {
		return nil, ErrUserAlreadyExists
	}

	// Hash password
	passwordHash, err := s.passwordMgr.Hash(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Determine role
	role := models.RoleClient
	if req.Role != "" {
		if models.UserRole(req.Role).IsValid() {
			role = models.UserRole(req.Role)
		}
	}

	// Create user object (without BusinessID initially)
	user := &models.User{
		ID:           uuid.New().String(), // GORM BeforeCreate hook will also set this if empty
		Email:        req.Email,
		PasswordHash: passwordHash,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Timezone:     req.Timezone,
		Role:         role,
		Status:       models.StatusPendingVerification,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		// BusinessID will be set below if applicable
	}

	// Handle Business Creation if user role is BusinessOwner
	if role == models.RoleBusinessOwner {
		if req.BusinessName == nil || *req.BusinessName == "" {
			return nil, errors.New("business name is required for business owner registration")
		}
		// Check if a business with this name already exists (optional, depends on product requirements)
		// existingBusiness, _ := s.businessRepo.GetByName(*req.BusinessName)
		// if existingBusiness != nil {
		// 	return nil, errors.New("a business with this name already exists")
		// }

		business := &models.Business{
			// ID will be set by BeforeCreate hook
			OwnerID: user.ID, // Link to the user being created
			Name:    *req.BusinessName,
		}
		if err := s.businessRepo.Create(business); err != nil {
			return nil, fmt.Errorf("failed to create business: %w", err)
		}
		user.BusinessID = &business.ID // Assign the new business's ID to the user
		s.logger.Info("Business created and linked to user", "businessId", business.ID, "userId", user.ID)

		// Note: User is not created yet, so user.BusinessID will be part of the initial user creation.
	}

	if err := s.userRepo.Create(user); err != nil {
		// If business was created but user creation failed, we might want to roll back business creation.
		// For now, we'll log and return. A transaction manager would be better here.
		if user.BusinessID != nil {
			s.logger.Error("User creation failed after business was created. Manual cleanup might be needed for business ID:", *user.BusinessID)
		}
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Publish business registered event if applicable
	if user.BusinessID != nil && role == models.RoleBusinessOwner && req.BusinessName != nil {
		businessEventData := events.CreateBusinessRegisteredEventData(*user.BusinessID, user.ID, *req.BusinessName)
		if err := s.eventPublisher.Publish(events.BusinessRegisteredEvent, businessEventData); err != nil {
			s.logger.Error("Failed to publish business registered event", "error", err, "businessId", *user.BusinessID, "userId", user.ID)
			// Continue even if event fails for now
		} else {
			s.logger.Info("Business registered event published", "businessId", *user.BusinessID, "userId", user.ID)
		}
	}

	// Generate email verification token
	verificationToken, err := s.generateToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate verification token: %w", err)
	}

	expiresAt := time.Now().Add(24 * time.Hour) // 24 hours
	if err := s.userRepo.SetEmailVerificationToken(user.ID, verificationToken, expiresAt); err != nil {
		return nil, fmt.Errorf("failed to set verification token: %w", err)
	}

	// Publish user created event
	eventData := events.CreateUserCreatedEventData(
		user.ID, user.Email, user.FirstName, user.LastName, string(user.Role),
	)
	if err := s.eventPublisher.Publish(events.UserCreatedEvent, eventData); err != nil {
		s.logger.Error("Failed to publish user created event", "error", err, "user_id", user.ID)
	}

	// For pending verification users, don't create session yet
	// They need to verify email first
	return &AuthResponse{
		User: user.ToAuthUser(),
	}, nil
}

// Login authenticates a user and creates a session
func (s *authService) Login(req *LoginRequest) (*AuthResponse, error) {
	// Get user by email
	user, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Verify password
	valid, err := s.passwordMgr.Verify(req.Password, user.PasswordHash)
	if err != nil {
		return nil, fmt.Errorf("failed to verify password: %w", err)
	}
	if !valid {
		return nil, ErrInvalidCredentials
	}

	// Check if user can login
	if !user.CanLogin() {
		if user.Status == models.StatusPendingVerification {
			return nil, ErrEmailNotVerified
		}
		return nil, ErrAccountDisabled
	}

	// Create session
	session := &models.Session{
		ID:         uuid.New().String(),
		UserID:     user.ID,
		ExpiresAt:  time.Now().Add(s.config.RefreshTokenTTL),
		CreatedAt:  time.Now(),
		LastUsedAt: time.Now(),
		IPAddress:  req.IPAddress,
		UserAgent:  req.UserAgent,
	}

	// Generate tokens
	tokenPair, err := s.jwtMgr.GenerateTokenPair(user.ToAuthUser(), session.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	session.RefreshToken = tokenPair.RefreshToken

	// Save session (optional in development without Redis)
	if err := s.sessionRepo.Create(session); err != nil {
		s.logger.Warn("Failed to create session (continuing without session storage)", "error", err, "user_id", user.ID)
		// Don't fail the login if Redis is not available in development
	}

	// Update last login
	if err := s.userRepo.UpdateLastLogin(user.ID); err != nil {
		s.logger.Error("Failed to update last login", "error", err, "user_id", user.ID)
	}

	// Publish login event
	eventData := events.CreateUserLoginEventData(user.ID, user.Email, req.IPAddress, req.UserAgent)
	if err := s.eventPublisher.Publish(events.UserLoginEvent, eventData); err != nil {
		s.logger.Error("Failed to publish login event", "error", err, "user_id", user.ID)
	}

	// Publish session created event
	sessionEventData := events.CreateUserSessionCreatedEventData(user.ID, session.ID, req.IPAddress, req.UserAgent)
	if err := s.eventPublisher.Publish(events.UserSessionCreatedEvent, sessionEventData); err != nil {
		s.logger.Error("Failed to publish session created event", "error", err, "user_id", user.ID)
	}

	return &AuthResponse{
		User:         user.ToAuthUser(),
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresIn:    tokenPair.ExpiresIn,
		ExpiresAt:    tokenPair.ExpiresAt,
	}, nil
}

// RefreshToken generates new tokens using a refresh token
func (s *authService) RefreshToken(req *RefreshTokenRequest) (*AuthResponse, error) {
	// Validate refresh token
	claims, err := s.jwtMgr.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		return nil, ErrInvalidRefreshToken
	}

	// Get session
	session, err := s.sessionRepo.GetByRefreshToken(req.RefreshToken)
	if err != nil {
		if errors.Is(err, repository.ErrSessionNotFound) {
			return nil, ErrInvalidRefreshToken
		}
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	// Get user
	user, err := s.userRepo.GetByID(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Check if user can still login
	if !user.CanLogin() {
		return nil, ErrAccountDisabled
	}

	// Update session last used
	session.UpdateLastUsed()
	if err := s.sessionRepo.Update(session); err != nil {
		s.logger.Error("Failed to update session", "error", err, "session_id", session.ID)
	}

	// Generate new tokens
	tokenPair, err := s.jwtMgr.GenerateTokenPair(user.ToAuthUser(), session.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	return &AuthResponse{
		User:         user.ToAuthUser(),
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresIn:    tokenPair.ExpiresIn,
		ExpiresAt:    tokenPair.ExpiresAt,
	}, nil
}

// Logout invalidates a user session
func (s *authService) Logout(req *LogoutRequest) error {
	if err := s.sessionRepo.Delete(req.SessionID); err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}

	// Publish logout event
	eventData := events.CreateUserLogoutEventData(req.UserID, req.SessionID)
	if err := s.eventPublisher.Publish(events.UserLogoutEvent, eventData); err != nil {
		s.logger.Error("Failed to publish logout event", "error", err, "user_id", req.UserID)
	}

	return nil
}

// VerifyEmail verifies a user's email address
func (s *authService) VerifyEmail(token string) error {
	user, err := s.userRepo.GetByEmailVerificationToken(token)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return ErrInvalidVerificationToken
		}
		return fmt.Errorf("failed to get user by verification token: %w", err)
	}

	// Verify email
	if err := s.userRepo.VerifyEmail(user.ID); err != nil {
		return fmt.Errorf("failed to verify email: %w", err)
	}

	// Publish email verified event
	eventData := events.CreateUserEmailVerifiedEventData(user.ID, user.Email)
	if err := s.eventPublisher.Publish(events.UserEmailVerifiedEvent, eventData); err != nil {
		s.logger.Error("Failed to publish email verified event", "error", err, "user_id", user.ID)
	}

	return nil
}

// ForgotPassword initiates password reset process
func (s *authService) ForgotPassword(email string) error {
	user, err := s.userRepo.GetByEmail(email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			// Don't reveal if email exists
			return nil
		}
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Generate reset token
	resetToken, err := s.generateToken()
	if err != nil {
		return fmt.Errorf("failed to generate reset token: %w", err)
	}

	expiresAt := time.Now().Add(1 * time.Hour) // 1 hour
	if err := s.userRepo.SetPasswordResetToken(user.ID, resetToken, expiresAt); err != nil {
		return fmt.Errorf("failed to set reset token: %w", err)
	}

	// TODO: Send password reset email
	s.logger.Info("Password reset requested", "user_id", user.ID, "email", email)

	return nil
}

// ResetPassword resets a user's password
func (s *authService) ResetPassword(req *ResetPasswordRequest) error {
	user, err := s.userRepo.GetByPasswordResetToken(req.Token)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return ErrInvalidResetToken
		}
		return fmt.Errorf("failed to get user by reset token: %w", err)
	}

	// Hash new password
	passwordHash, err := s.passwordMgr.Hash(req.NewPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	if err := s.userRepo.UpdatePassword(user.ID, passwordHash); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Clear reset token
	if err := s.userRepo.ClearPasswordResetToken(user.ID); err != nil {
		s.logger.Error("Failed to clear reset token", "error", err, "user_id", user.ID)
	}

	// Revoke all sessions for security
	if err := s.sessionRepo.DeleteByUserID(user.ID); err != nil {
		s.logger.Error("Failed to revoke sessions", "error", err, "user_id", user.ID)
	}

	// Publish password changed event
	eventData := map[string]interface{}{"userId": user.ID}
	if err := s.eventPublisher.Publish(events.UserPasswordChangedEvent, eventData); err != nil {
		s.logger.Error("Failed to publish password changed event", "error", err, "user_id", user.ID)
	}

	return nil
}

// ValidateToken validates an access token and returns user info
func (s *authService) ValidateToken(token string) (*models.AuthUser, error) {
	claims, err := s.jwtMgr.ValidateAccessToken(token)
	if err != nil {
		return nil, err
	}

	// Check if session exists
	if claims.SessionID != "" {
		exists, err := s.sessionRepo.Exists(claims.SessionID)
		if err != nil {
			return nil, fmt.Errorf("failed to check session: %w", err)
		}
		if !exists {
			return nil, jwt.ErrTokenExpired
		}
	}

	// Get user to ensure they still exist and are active
	user, err := s.userRepo.GetByID(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if !user.CanLogin() {
		return nil, ErrAccountDisabled
	}

	return user.ToAuthUser(), nil
}

// RevokeAllSessions revokes all sessions for a user
func (s *authService) RevokeAllSessions(userID string) error {
	if err := s.sessionRepo.DeleteByUserID(userID); err != nil {
		return fmt.Errorf("failed to revoke sessions: %w", err)
	}

	s.logger.Info("All sessions revoked", "user_id", userID)
	return nil
}

// generateToken generates a random token
func (s *authService) generateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// Service errors
var (
	ErrUserAlreadyExists        = errors.New("user already exists")
	ErrInvalidCredentials       = errors.New("invalid credentials")
	ErrEmailNotVerified         = errors.New("email not verified")
	ErrAccountDisabled          = errors.New("account disabled")
	ErrInvalidRefreshToken      = errors.New("invalid refresh token")
	ErrInvalidResetToken        = errors.New("invalid reset token")
	ErrInvalidVerificationToken = errors.New("invalid verification token")
)
