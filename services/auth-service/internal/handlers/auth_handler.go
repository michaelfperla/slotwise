package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/slotwise/auth-service/internal/service"
	"github.com/slotwise/auth-service/pkg/logger"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	authService service.AuthService
	logger      logger.Logger
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService service.AuthService, logger logger.Logger) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		logger:      logger,
	}
}

// RegisterRequest represents the registration request payload
type RegisterRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	FirstName string `json:"firstName" binding:"required"`
	LastName  string `json:"lastName" binding:"required"`
	Timezone  string `json:"timezone" binding:"required"`
	Role      string `json:"role,omitempty"`
	BusinessName *string `json:"businessName,omitempty"` // Added for business registration
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RefreshTokenRequest represents the refresh token request payload
type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

// ForgotPasswordRequest represents the forgot password request payload
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest represents the reset password request payload
type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=8"`
}

// VerifyEmailRequest represents the verify email request payload
type VerifyEmailRequest struct {
	Token string `json:"token" binding:"required"`
}

// APIResponse represents a standard API response
type APIResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Error     *APIError   `json:"error,omitempty"`
	Timestamp string      `json:"timestamp"`
}

// APIError represents an API error
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request payload", err.Error())
		return
	}

	// Convert to service request
	serviceReq := &service.RegisterRequest{
		Email:     req.Email,
		Password:  req.Password,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Timezone:  req.Timezone,
		Role:      req.Role,
		BusinessName: req.BusinessName, // Pass through business name
	}

	response, err := h.authService.Register(serviceReq)
	if err != nil {
		h.handleServiceError(c, err, "registration")
		return
	}

	h.logger.Info("User registered successfully",
		"user_id", response.User.ID,
		"email", response.User.Email,
		"ip_address", c.ClientIP(),
	)

	h.respondWithSuccess(c, http.StatusCreated, response)
}

// Login handles user authentication
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request payload", err.Error())
		return
	}

	// Convert to service request
	serviceReq := &service.LoginRequest{
		Email:     req.Email,
		Password:  req.Password,
		IPAddress: c.ClientIP(),
		UserAgent: c.GetHeader("User-Agent"),
	}

	response, err := h.authService.Login(serviceReq)
	if err != nil {
		h.handleServiceError(c, err, "login")
		return
	}

	h.logger.Info("User logged in successfully",
		"user_id", response.User.ID,
		"email", response.User.Email,
		"ip_address", c.ClientIP(),
	)

	h.respondWithSuccess(c, http.StatusOK, response)
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request payload", err.Error())
		return
	}

	// Convert to service request
	serviceReq := &service.RefreshTokenRequest{
		RefreshToken: req.RefreshToken,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
	}

	response, err := h.authService.RefreshToken(serviceReq)
	if err != nil {
		h.handleServiceError(c, err, "token refresh")
		return
	}

	h.logger.Debug("Token refreshed successfully",
		"user_id", response.User.ID,
		"ip_address", c.ClientIP(),
	)

	h.respondWithSuccess(c, http.StatusOK, response)
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get user and session from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		h.respondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated", "")
		return
	}

	sessionID, exists := c.Get("session_id")
	if !exists {
		h.respondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Session not found", "")
		return
	}

	// Convert to service request
	serviceReq := &service.LogoutRequest{
		UserID:    userID.(string),
		SessionID: sessionID.(string),
	}

	if err := h.authService.Logout(serviceReq); err != nil {
		h.handleServiceError(c, err, "logout")
		return
	}

	h.logger.Info("User logged out successfully",
		"user_id", userID,
		"session_id", sessionID,
		"ip_address", c.ClientIP(),
	)

	h.respondWithSuccess(c, http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// VerifyEmail handles email verification
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request payload", err.Error())
		return
	}

	if err := h.authService.VerifyEmail(req.Token); err != nil {
		h.handleServiceError(c, err, "email verification")
		return
	}

	h.logger.Info("Email verified successfully",
		"token", req.Token[:8]+"...", // Log only first 8 chars for security
		"ip_address", c.ClientIP(),
	)

	h.respondWithSuccess(c, http.StatusOK, gin.H{"message": "Email verified successfully"})
}

// ForgotPassword handles password reset request
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request payload", err.Error())
		return
	}

	if err := h.authService.ForgotPassword(req.Email); err != nil {
		h.handleServiceError(c, err, "forgot password")
		return
	}

	h.logger.Info("Password reset requested",
		"email", req.Email,
		"ip_address", c.ClientIP(),
	)

	// Always return success to prevent email enumeration
	h.respondWithSuccess(c, http.StatusOK, gin.H{
		"message": "If the email exists, a password reset link has been sent",
	})
}

// ResetPassword handles password reset
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request payload", err.Error())
		return
	}

	// Convert to service request
	serviceReq := &service.ResetPasswordRequest{
		Token:       req.Token,
		NewPassword: req.NewPassword,
	}

	if err := h.authService.ResetPassword(serviceReq); err != nil {
		h.handleServiceError(c, err, "password reset")
		return
	}

	h.logger.Info("Password reset successfully",
		"token", req.Token[:8]+"...", // Log only first 8 chars for security
		"ip_address", c.ClientIP(),
	)

	h.respondWithSuccess(c, http.StatusOK, gin.H{"message": "Password reset successfully"})
}

// Me returns the current user's information
func (h *AuthHandler) Me(c *gin.Context) {
	// Get user from context (set by auth middleware)
	user, exists := c.Get("user")
	if !exists {
		h.respondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated", "")
		return
	}

	h.respondWithSuccess(c, http.StatusOK, gin.H{"user": user})
}

// respondWithSuccess sends a successful response
func (h *AuthHandler) respondWithSuccess(c *gin.Context, statusCode int, data interface{}) {
	response := APIResponse{
		Success:   true,
		Data:      data,
		Timestamp: getCurrentTimestamp(),
	}
	c.JSON(statusCode, response)
}

// respondWithError sends an error response
func (h *AuthHandler) respondWithError(c *gin.Context, statusCode int, code, message, details string) {
	response := APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
		Timestamp: getCurrentTimestamp(),
	}

	h.logger.Error("API error",
		"status_code", statusCode,
		"error_code", code,
		"message", message,
		"details", details,
		"path", c.Request.URL.Path,
		"method", c.Request.Method,
		"ip_address", c.ClientIP(),
	)

	c.JSON(statusCode, response)
}

// handleServiceError maps service errors to HTTP responses
func (h *AuthHandler) handleServiceError(c *gin.Context, err error, operation string) {
	switch err {
	case service.ErrUserAlreadyExists:
		h.respondWithError(c, http.StatusConflict, "USER_ALREADY_EXISTS", "User already exists", "")
	case service.ErrInvalidCredentials:
		h.respondWithError(c, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password", "")
	case service.ErrEmailNotVerified:
		h.respondWithError(c, http.StatusForbidden, "EMAIL_NOT_VERIFIED", "Email not verified", "")
	case service.ErrAccountDisabled:
		h.respondWithError(c, http.StatusForbidden, "ACCOUNT_DISABLED", "Account is disabled", "")
	case service.ErrInvalidRefreshToken:
		h.respondWithError(c, http.StatusUnauthorized, "INVALID_REFRESH_TOKEN", "Invalid refresh token", "")
	case service.ErrInvalidResetToken:
		h.respondWithError(c, http.StatusBadRequest, "INVALID_RESET_TOKEN", "Invalid or expired reset token", "")
	case service.ErrInvalidVerificationToken:
		h.respondWithError(c, http.StatusBadRequest, "INVALID_VERIFICATION_TOKEN", "Invalid or expired verification token", "")
	default:
		h.logger.Error("Unexpected service error",
			"error", err.Error(),
			"operation", operation,
			"path", c.Request.URL.Path,
			"method", c.Request.Method,
			"ip_address", c.ClientIP(),
		)
		h.respondWithError(c, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", "")
	}
}

// getCurrentTimestamp returns the current timestamp in ISO 8601 format
func getCurrentTimestamp() string {
	return time.Now().UTC().Format(time.RFC3339)
}
