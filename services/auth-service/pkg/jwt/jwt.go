package jwt

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/slotwise/auth-service/internal/config"
	"github.com/slotwise/auth-service/internal/models"
)

// TokenType represents the type of JWT token
type TokenType string

const (
	AccessToken  TokenType = "access"
	RefreshToken TokenType = "refresh"
)

// Claims represents the JWT claims
type Claims struct {
	UserID     string `json:"sub"`
	Email      string `json:"email"`
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
	Role       string `json:"role"`
	BusinessID string `json:"businessId,omitempty"`
	TokenType  string `json:"tokenType"`
	SessionID  string `json:"sessionId,omitempty"`
	jwt.RegisteredClaims
}

// TokenPair represents an access and refresh token pair
type TokenPair struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	ExpiresIn    int64     `json:"expiresIn"`
	ExpiresAt    time.Time `json:"expiresAt"`
}

// Manager handles JWT token operations
type Manager struct {
	config config.JWT
}

// NewManager creates a new JWT manager
func NewManager(cfg config.JWT) *Manager {
	return &Manager{config: cfg}
}

// GenerateTokenPair generates an access and refresh token pair for a user
func (m *Manager) GenerateTokenPair(user *models.AuthUser, sessionID string) (*TokenPair, error) {
	now := time.Now()

	// Generate access token
	accessClaims := &Claims{
		UserID:     user.ID,
		Email:      user.Email,
		FirstName:  user.FirstName,
		LastName:   user.LastName,
		Role:       user.Role,
		BusinessID: user.BusinessID,
		TokenType:  string(AccessToken),
		SessionID:  sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			Subject:   user.ID,
			Issuer:    m.config.Issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.config.AccessTokenTTL)),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(m.config.Secret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign access token: %w", err)
	}

	// Generate refresh token
	refreshClaims := &Claims{
		UserID:    user.ID,
		TokenType: string(RefreshToken),
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			Subject:   user.ID,
			Issuer:    m.config.Issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.config.RefreshTokenTTL)),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(m.config.Secret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresIn:    int64(m.config.AccessTokenTTL.Seconds()),
		ExpiresAt:    now.Add(m.config.AccessTokenTTL),
	}, nil
}

// ValidateToken validates a JWT token and returns the claims
func (m *Manager) ValidateToken(tokenString string, expectedType TokenType) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(m.config.Secret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		if errors.Is(err, jwt.ErrTokenNotValidYet) {
			return nil, ErrTokenNotValidYet
		}
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	// Validate token type
	if claims.TokenType != string(expectedType) {
		return nil, ErrInvalidTokenType
	}

	// Validate issuer
	if claims.Issuer != m.config.Issuer {
		return nil, ErrInvalidIssuer
	}

	return claims, nil
}

// ValidateAccessToken validates an access token
func (m *Manager) ValidateAccessToken(tokenString string) (*Claims, error) {
	return m.ValidateToken(tokenString, AccessToken)
}

// ValidateRefreshToken validates a refresh token
func (m *Manager) ValidateRefreshToken(tokenString string) (*Claims, error) {
	return m.ValidateToken(tokenString, RefreshToken)
}

// ExtractTokenFromHeader extracts the token from an Authorization header
func (m *Manager) ExtractTokenFromHeader(authHeader string) (string, error) {
	if authHeader == "" {
		return "", ErrMissingToken
	}

	const bearerPrefix = "Bearer "
	if len(authHeader) < len(bearerPrefix) || authHeader[:len(bearerPrefix)] != bearerPrefix {
		return "", ErrInvalidTokenFormat
	}

	return authHeader[len(bearerPrefix):], nil
}

// GetTokenExpiration returns the expiration time of a token
func (m *Manager) GetTokenExpiration(tokenString string) (time.Time, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(m.config.Secret), nil
	})

	if err != nil {
		return time.Time{}, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return time.Time{}, ErrInvalidToken
	}

	exp, ok := claims["exp"].(float64)
	if !ok {
		return time.Time{}, ErrInvalidToken
	}

	return time.Unix(int64(exp), 0), nil
}

// IsTokenExpired checks if a token is expired
func (m *Manager) IsTokenExpired(tokenString string) bool {
	exp, err := m.GetTokenExpiration(tokenString)
	if err != nil {
		return true
	}
	return time.Now().After(exp)
}

// RevokeToken adds a token to the revocation list (if implemented)
func (m *Manager) RevokeToken(tokenString string) error {
	// This would typically involve adding the token JTI to a blacklist
	// For now, we'll rely on session management for token revocation
	return nil
}

// JWT errors
var (
	ErrInvalidToken       = errors.New("invalid token")
	ErrTokenExpired       = errors.New("token expired")
	ErrTokenNotValidYet   = errors.New("token not valid yet")
	ErrInvalidTokenType   = errors.New("invalid token type")
	ErrInvalidIssuer      = errors.New("invalid token issuer")
	ErrMissingToken       = errors.New("missing token")
	ErrInvalidTokenFormat = errors.New("invalid token format")
)
