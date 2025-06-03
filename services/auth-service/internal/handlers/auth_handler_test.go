package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/slotwise/auth-service/internal/config"
	"github.com/slotwise/auth-service/internal/database"
	"github.com/slotwise/auth-service/internal/handlers"
	"github.com/slotwise/auth-service/internal/models"
	"github.com/slotwise/auth-service/internal/repository"
	"github.com/slotwise/auth-service/internal/service"
	"github.com/slotwise/auth-service/pkg/events"
	"github.com/slotwise/auth-service/pkg/jwt"
	"github.com/slotwise/auth-service/pkg/logger"
	pkgPassword "github.com/slotwise/auth-service/pkg/password" // Added for password hashing
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"
)

// MockEventPublisher is a mock implementation of the events.Publisher interface
type MockEventPublisher struct {
	PublishedEvents []struct {
		EventType string
		Data      map[string]interface{}
	}
}

func (m *MockEventPublisher) Publish(eventType string, data map[string]interface{}) error {
	m.PublishedEvents = append(m.PublishedEvents, struct {
		EventType string
		Data      map[string]interface{}
	}{EventType: eventType, Data: data})
	return nil
}

func (m *MockEventPublisher) PublishWithCorrelation(eventType string, data map[string]interface{}, correlationID, causationID string) error {
	// For simplicity, correlation is not stored in this basic mock
	return m.Publish(eventType, data)
}

func (m *MockEventPublisher) Close() error {
	return nil // No-op
}

func (m *MockEventPublisher) Reset() {
	m.PublishedEvents = nil
}

// AuthHandlerTestSuite defines the test suite
type AuthHandlerTestSuite struct {
	suite.Suite
	DB            *gorm.DB
	Router        *gin.Engine
	authService   service.AuthService
	userRepo      repository.UserRepository
	businessRepo  repository.BusinessRepository
	sessionRepo   repository.SessionRepository
	mockPublisher *MockEventPublisher
	jwtManager    *jwt.Manager
	testLogger    logger.Logger
	cfg           *config.Config
	authHandler   *handlers.AuthHandler
}

// SetupSuite runs once before all tests in the suite
func (suite *AuthHandlerTestSuite) SetupSuite() {
	// Load config (consider using a test-specific config file or env vars)
	// For now, try to load default and override DB settings for testing
	cfg, err := config.Load()
	if err != nil {
		suite.T().Fatalf("Failed to load config: %v", err)
	}

	// Override database configuration for testing with standard postgres user
	cfg.Database.Host = "localhost"
	cfg.Database.Port = 5432
	cfg.Database.User = "postgres"
	cfg.Database.Password = "postgres"
	cfg.Database.Name = "slotwise_auth_test"
	cfg.Database.SSLMode = "disable"

	// Check for TEST_DB_URL environment variable override
	testDBURL := os.Getenv("TEST_DB_URL")
	if testDBURL != "" {
		suite.T().Logf("TEST_DB_URL provided but using standard test config. TEST_DB_URL was: '%s'", testDBURL)
	}
	suite.cfg = cfg

	suite.testLogger = logger.New("debug") // Or use cfg.LogLevel

	// Connect to database
	db, err := database.Connect(suite.cfg.Database)
	if err != nil {
		suite.T().Fatalf("Failed to connect to database: %v", err)
	}
	suite.DB = db

	// Run migrations - handle circular dependency by creating tables manually
	// Create users table first without business_id constraint
	err = suite.DB.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
			email text NOT NULL UNIQUE,
			password_hash text NOT NULL,
			first_name text NOT NULL,
			last_name text NOT NULL,
			avatar text,
			timezone text NOT NULL DEFAULT 'UTC',
			is_email_verified boolean DEFAULT false,
			email_verified_at timestamptz,
			last_login_at timestamptz,
			role varchar(20) NOT NULL DEFAULT 'client',
			status varchar(30) NOT NULL DEFAULT 'pending_verification',
			business_id uuid,
			language text DEFAULT 'en',
			date_format text DEFAULT 'MM/DD/YYYY',
			time_format text DEFAULT '12h',
			email_notifications boolean DEFAULT true,
			sms_notifications boolean DEFAULT false,
			password_reset_token text,
			password_reset_expires_at timestamptz,
			email_verification_token text,
			email_verification_expires_at timestamptz,
			created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
			updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
			deleted_at timestamptz
		);
	`).Error
	assert.NoError(suite.T(), err, "Users table creation should not fail")

	// Create businesses table
	err = suite.DB.Exec(`
		CREATE TABLE IF NOT EXISTS businesses (
			id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
			owner_id uuid NOT NULL,
			name varchar(255) NOT NULL,
			created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
			updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
			deleted_at timestamptz
		);
	`).Error
	assert.NoError(suite.T(), err, "Businesses table creation should not fail")

	// Initialize repositories
	suite.userRepo = repository.NewUserRepository(suite.DB)
	suite.businessRepo = repository.NewBusinessRepository(suite.DB, suite.testLogger)
	// For testing, use nil Redis client to avoid connection issues
	// The session repository should handle nil gracefully for tests
	suite.sessionRepo = repository.NewSessionRepository(nil)

	// Initialize mock event publisher
	suite.mockPublisher = &MockEventPublisher{}

	// Initialize JWT manager
	suite.jwtManager = jwt.NewManager(suite.cfg.JWT)

	// Initialize services
	suite.authService = service.NewAuthService(
		suite.userRepo,
		suite.businessRepo,
		suite.sessionRepo,
		suite.mockPublisher,
		suite.cfg.JWT,
		suite.testLogger,
	)

	// Initialize handlers
	suite.authHandler = handlers.NewAuthHandler(suite.authService, suite.testLogger)

	// Setup router
	gin.SetMode(gin.TestMode)
	router := gin.New() // Use gin.New() for a clean router without default middleware for tests

	// API v1 routes (matching main router structure)
	v1 := router.Group("/api/v1")
	{
		authRoutes := v1.Group("/auth")
		{
			authRoutes.POST("/register", suite.authHandler.Register)
			authRoutes.POST("/login", suite.authHandler.Login)
			// Add other routes as needed for testing
		}
	}
	suite.Router = router
}

// TearDownSuite runs once after all tests in the suite
func (suite *AuthHandlerTestSuite) TearDownSuite() {
	// Close database connection
	sqlDB, _ := suite.DB.DB()
	sqlDB.Close()
	// Close Redis connection if applicable
}

// SetupTest runs before each test
func (suite *AuthHandlerTestSuite) SetupTest() {
	// Reset mock publisher before each test
	suite.mockPublisher.Reset()
	// Clean up database tables before each test to ensure isolation
	// Order matters due to foreign key constraints.
	suite.DB.Exec("DELETE FROM businesses") // Or use gorm.Delete for soft deletes if applicable
	suite.DB.Exec("DELETE FROM users")
}

// TestRegisterUserClient tests client user registration
func (suite *AuthHandlerTestSuite) TestRegisterUserClient() {
	suite.T().Run("Successful Client Registration", func(t *testing.T) {
		suite.mockPublisher.Reset() // Ensure mocks are clean

		regDetails := handlers.RegisterRequest{
			Email:     "client@example.com",
			Password:  "Password123!",
			FirstName: "Test",
			LastName:  "Client",
			Timezone:  "UTC",
			Role:      string(models.RoleClient), // Explicitly "client"
		}
		body, _ := json.Marshal(regDetails)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		suite.Router.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusCreated, rr.Code, "HTTP status code should be 201 Created")

		// Verify database
		var user models.User
		err := suite.DB.Where("email = ?", regDetails.Email).First(&user).Error
		assert.NoError(t, err, "User should be found in DB")
		assert.Equal(t, regDetails.FirstName, user.FirstName)
		assert.Equal(t, models.RoleClient, user.Role)
		assert.Nil(t, user.BusinessID, "Client user should not have a BusinessID")

		// Verify password hash (basic check, not actual verification)
		assert.NotEmpty(t, user.PasswordHash)

		// Verify NATS event
		assert.Len(t, suite.mockPublisher.PublishedEvents, 1, "Should publish 1 event")
		if len(suite.mockPublisher.PublishedEvents) == 1 {
			event := suite.mockPublisher.PublishedEvents[0]
			assert.Equal(t, events.UserCreatedEvent, event.EventType)
			assert.Equal(t, user.ID, event.Data["userId"])
			assert.Equal(t, regDetails.Email, event.Data["email"])
			assert.Equal(t, string(models.RoleClient), event.Data["role"])
		}
	})
}

// TestRegisterUserBusinessOwner tests business owner registration
func (suite *AuthHandlerTestSuite) TestRegisterUserBusinessOwner() {
	suite.T().Run("Successful Business Owner and Business Registration", func(t *testing.T) {
		suite.mockPublisher.Reset()

		businessName := "My Test Biz"
		regDetails := handlers.RegisterRequest{
			Email:        "owner@example.com",
			Password:     "Password123!",
			FirstName:    "Test",
			LastName:     "Owner",
			Timezone:     "UTC",
			Role:         string(models.RoleBusinessOwner),
			BusinessName: &businessName,
		}
		body, _ := json.Marshal(regDetails)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		suite.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Logf("Response body: %s", rr.Body.String())
		}
		assert.Equal(t, http.StatusCreated, rr.Code, "HTTP status code should be 201 Created")

		// Verify user in database
		var user models.User
		err := suite.DB.Where("email = ?", regDetails.Email).First(&user).Error
		assert.NoError(t, err, "User should be found in DB")
		assert.Equal(t, regDetails.FirstName, user.FirstName)
		assert.Equal(t, models.RoleBusinessOwner, user.Role)
		assert.NotNil(t, user.BusinessID, "Business owner should have a BusinessID")

		// Verify business in database
		var business models.Business
		err = suite.DB.Where("id = ?", *user.BusinessID).First(&business).Error
		assert.NoError(t, err, "Business should be found in DB")
		assert.Equal(t, businessName, business.Name)
		assert.Equal(t, user.ID, business.OwnerID)

		// Verify NATS events (UserCreated and BusinessRegistered)
		assert.Len(t, suite.mockPublisher.PublishedEvents, 2, "Should publish 2 events")

		foundUserCreated := false
		foundBusinessRegistered := false

		for _, event := range suite.mockPublisher.PublishedEvents {
			if event.EventType == events.UserCreatedEvent {
				foundUserCreated = true
				assert.Equal(t, user.ID, event.Data["userId"])
				assert.Equal(t, regDetails.Email, event.Data["email"])
				assert.Equal(t, string(models.RoleBusinessOwner), event.Data["role"])
			}
			if event.EventType == events.BusinessRegisteredEvent {
				foundBusinessRegistered = true
				assert.Equal(t, *user.BusinessID, event.Data["businessId"])
				assert.Equal(t, user.ID, event.Data["ownerId"])
				if bizInfo, ok := event.Data["businessInfo"].(map[string]string); ok {
					assert.Equal(t, businessName, bizInfo["name"])
				} else {
					t.Errorf("businessInfo is not of expected type map[string]string: %v", event.Data["businessInfo"])
				}
			}
		}
		assert.True(t, foundUserCreated, "UserCreatedEvent should have been published")
		assert.True(t, foundBusinessRegistered, "BusinessRegisteredEvent should have been published")
	})
}

// TestLoginUser tests user login
func (suite *AuthHandlerTestSuite) TestLoginUser() {
	// Pre-requisite: Create a user to login with
	// Corrected password hashing for test user setup:
	passMgr := pkgPassword.NewManager(pkgPassword.DefaultConfig())
	hashedPassword, _ := passMgr.Hash("Password123!")

	testUser := models.User{
		// Let BeforeCreate hook generate the UUID
		Email:           "login@example.com",
		PasswordHash:    hashedPassword,
		FirstName:       "Login",
		LastName:        "User",
		Role:            models.RoleClient,
		IsEmailVerified: true, // Assume email is verified for login test
		Status:          models.StatusActive,
		Timezone:        "UTC",
	}
	suite.DB.Create(&testUser)

	suite.T().Run("Successful Login", func(t *testing.T) {
		suite.mockPublisher.Reset()

		loginDetails := handlers.LoginRequest{
			Email:    "login@example.com",
			Password: "Password123!",
		}
		body, _ := json.Marshal(loginDetails)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		suite.Router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Logf("Response body: %s", rr.Body.String())
		}
		assert.Equal(t, http.StatusOK, rr.Code, "HTTP status code should be 200 OK")

		var respBody map[string]interface{}
		err := json.Unmarshal(rr.Body.Bytes(), &respBody)
		assert.NoError(t, err, "Should unmarshal response body")

		// Check for data and token
		data, dataOk := respBody["data"].(map[string]interface{})
		assert.True(t, dataOk, "'data' field should be present")
		_, tokenOk := data["accessToken"].(string)
		assert.True(t, tokenOk, "Access token should be present in response")

		// Verify NATS events. Expecting 2 events: UserLoginEvent and UserSessionCreatedEvent.
		// UserSessionCreatedEvent is the one that matches `user.authenticated: { userId, sessionId }`.
		assert.Len(t, suite.mockPublisher.PublishedEvents, 2, "Should publish 2 events on successful login")

		foundSessionCreated := false
		for _, e := range suite.mockPublisher.PublishedEvents {
			if e.EventType == events.UserSessionCreatedEvent {
				foundSessionCreated = true
				assert.Equal(t, testUser.ID, e.Data["userId"])
				assert.NotEmpty(t, e.Data["sessionId"])
				break
			}
		}
		assert.True(t, foundSessionCreated, "UserSessionCreatedEvent should be published")

	})

	suite.T().Run("Login Failed - Wrong Password", func(t *testing.T) {
		suite.mockPublisher.Reset()
		loginDetails := handlers.LoginRequest{
			Email:    "login@example.com",
			Password: "WrongPassword123!",
		}
		body, _ := json.Marshal(loginDetails)
		req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		suite.Router.ServeHTTP(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code, "HTTP status code should be 401 Unauthorized")
		assert.Len(t, suite.mockPublisher.PublishedEvents, 0, "Should not publish events on failed login")
	})

	suite.T().Run("Login Failed - User Not Found", func(t *testing.T) {
		suite.mockPublisher.Reset()
		loginDetails := handlers.LoginRequest{
			Email:    "nonexistent@example.com",
			Password: "Password123!",
		}
		body, _ := json.Marshal(loginDetails)
		req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		suite.Router.ServeHTTP(rr, req)
		// Service returns ErrInvalidCredentials for both user not found and wrong password to prevent email enumeration
		assert.Equal(t, http.StatusUnauthorized, rr.Code, "HTTP status code should be 401 Unauthorized for user not found")
		assert.Len(t, suite.mockPublisher.PublishedEvents, 0, "Should not publish events on failed login")
	})
}

// TestAuthHandlerTestSuite runs the entire test suite
func TestAuthHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(AuthHandlerTestSuite))
}

// All comments related to the removed helper function are now also removed.
