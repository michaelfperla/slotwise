package subscribers_test

import (
	"encoding/json"
	"testing"

	"github.com/slotwise/scheduling-service/internal/models"
	"github.com/slotwise/scheduling-service/internal/subscribers"
	"github.com/slotwise/scheduling-service/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type EventHandlersTestSuite struct {
	suite.Suite
	DB         *gorm.DB
	Handlers   *subscribers.NatsEventHandlers
	TestLogger *logger.Logger
}

func (suite *EventHandlersTestSuite) SetupSuite() {
	suite.TestLogger = logger.New("debug") // or "test" to suppress output
	// Use PostgreSQL test database
	dsn := "host=localhost user=postgres password=postgres dbname=slotwise_scheduling_test port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		suite.T().Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	suite.DB = db

	// AutoMigrate the schema
	err = suite.DB.AutoMigrate(&models.ServiceDefinition{}, &models.AvailabilityRule{})
	assert.NoError(suite.T(), err)

	suite.Handlers = subscribers.NewNatsEventHandlers(suite.DB, suite.TestLogger)
}

func (suite *EventHandlersTestSuite) TearDownSuite() {
	sqlDB, _ := suite.DB.DB()
	sqlDB.Close()
}

func (suite *EventHandlersTestSuite) SetupTest() {
	// Clean up tables before each test
	suite.DB.Exec("DELETE FROM service_definitions")
	suite.DB.Exec("DELETE FROM availability_rules")
}

func (suite *EventHandlersTestSuite) TestHandleBusinessServiceCreated_NewService() {
	t := suite.T()
	payload := subscribers.BusinessServiceCreatedPayload{
		BusinessID: "biz1",
		ServiceID:  "svc1",
		ServiceDetails: struct {
			Name            string  `json:"name"`
			Description     *string `json:"description"`
			DurationMinutes int     `json:"durationMinutes"`
			Price           float64 `json:"price"`
			Currency        string  `json:"currency"`
			IsActive        *bool   `json:"isActive"`
		}{
			Name:            "Test Service",
			DurationMinutes: 60,
			Price:           100.00,
			Currency:        "USD",
		},
	}
	isActive := true
	payload.ServiceDetails.IsActive = &isActive
	desc := "Test Description"
	payload.ServiceDetails.Description = &desc

	eventData, _ := json.Marshal(payload)
	err := suite.Handlers.HandleBusinessServiceCreated(eventData)
	assert.NoError(t, err)

	var serviceDef models.ServiceDefinition
	err = suite.DB.First(&serviceDef, "id = ?", "svc1").Error
	assert.NoError(t, err)
	assert.Equal(t, "Test Service", serviceDef.Name)
	assert.Equal(t, 60, serviceDef.DurationMinutes)
	assert.Equal(t, int64(10000), serviceDef.Price) // 100.00 * 100
	assert.Equal(t, "Test Description", serviceDef.Description)
	assert.True(t, serviceDef.IsActive)
}

func (suite *EventHandlersTestSuite) TestHandleBusinessServiceCreated_UpdateService() {
	t := suite.T()
	// Create initial service
	initialService := models.ServiceDefinition{
		ID: "svc-update", BusinessID: "biz-update", Name: "Old Name",
		DurationMinutes: 30, Price: 5000, Currency: "USD", IsActive: true,
	}
	suite.DB.Create(&initialService)

	updatedDesc := "Updated Description"
	updatedIsActive := false
	payload := subscribers.BusinessServiceCreatedPayload{
		BusinessID: "biz-update",
		ServiceID:  "svc-update",
		ServiceDetails: struct {
			Name            string  `json:"name"`
			Description     *string `json:"description"`
			DurationMinutes int     `json:"durationMinutes"`
			Price           float64 `json:"price"`
			Currency        string  `json:"currency"`
			IsActive        *bool   `json:"isActive"`
		}{
			Name:            "New Name",
			DurationMinutes: 45,
			Price:           75.50,
			Currency:        "USD",
			Description:     &updatedDesc,
			IsActive:        &updatedIsActive,
		},
	}
	eventData, _ := json.Marshal(payload)
	err := suite.Handlers.HandleBusinessServiceCreated(eventData)
	assert.NoError(t, err)

	var serviceDef models.ServiceDefinition
	err = suite.DB.First(&serviceDef, "id = ?", "svc-update").Error
	assert.NoError(t, err)
	assert.Equal(t, "New Name", serviceDef.Name)
	assert.Equal(t, 45, serviceDef.DurationMinutes)
	assert.Equal(t, int64(7550), serviceDef.Price)
	assert.Equal(t, "Updated Description", serviceDef.Description)
	assert.False(t, serviceDef.IsActive)
}

func (suite *EventHandlersTestSuite) TestHandleBusinessAvailabilityUpdated_NewRules() {
	t := suite.T()
	payload := subscribers.BusinessAvailabilityUpdatedPayload{
		BusinessID: "biz-avail-1",
		Rules: []subscribers.AvailabilityRulePayload{
			{DayOfWeek: "MONDAY", StartTime: "09:00", EndTime: "12:00"},
			{DayOfWeek: "MONDAY", StartTime: "13:00", EndTime: "17:00"},
			{DayOfWeek: "TUESDAY", StartTime: "10:00", EndTime: "14:00"},
		},
	}
	eventData, _ := json.Marshal(payload)
	err := suite.Handlers.HandleBusinessAvailabilityUpdated(eventData)
	assert.NoError(t, err)

	var rules []models.AvailabilityRule
	suite.DB.Where("business_id = ?", "biz-avail-1").Find(&rules)
	assert.Len(t, rules, 3)

	var countMonday int
	for _, r := range rules {
		if r.DayOfWeek == models.Monday {
			countMonday++
		}
	}
	assert.Equal(t, 2, countMonday, "Should be two rules for Monday")
}

func (suite *EventHandlersTestSuite) TestHandleBusinessAvailabilityUpdated_ReplaceRules() {
	t := suite.T()
	businessID := "biz-avail-2"
	// Initial rules
	initialRules := []models.AvailabilityRule{
		{BusinessID: businessID, DayOfWeek: models.Wednesday, StartTime: "08:00", EndTime: "12:00"},
	}
	suite.DB.Create(&initialRules)

	// New rules payload
	payload := subscribers.BusinessAvailabilityUpdatedPayload{
		BusinessID: businessID,
		Rules: []subscribers.AvailabilityRulePayload{
			{DayOfWeek: "FRIDAY", StartTime: "14:00", EndTime: "18:00"}, // Note: Payload uses strings, DB uses models.DayOfWeekString
		},
	}
	eventData, _ := json.Marshal(payload)
	err := suite.Handlers.HandleBusinessAvailabilityUpdated(eventData)
	assert.NoError(t, err)

	var rules []models.AvailabilityRule
	suite.DB.Where("business_id = ?", businessID).Find(&rules)
	assert.Len(t, rules, 1)
	assert.Equal(t, models.Friday, rules[0].DayOfWeek) // Corrected from FRIDAY
	assert.Equal(t, "14:00", rules[0].StartTime)
}

func (suite *EventHandlersTestSuite) TestHandleBusinessAvailabilityUpdated_ClearRules() {
	t := suite.T()
	businessID := "biz-avail-3"
	// Initial rules
	initialRules := []models.AvailabilityRule{
		{BusinessID: businessID, DayOfWeek: models.Thursday, StartTime: "09:00", EndTime: "17:00"},
	}
	suite.DB.Create(&initialRules)

	// New rules payload (empty)
	payload := subscribers.BusinessAvailabilityUpdatedPayload{
		BusinessID: businessID,
		Rules:      []subscribers.AvailabilityRulePayload{},
	}
	eventData, _ := json.Marshal(payload)
	err := suite.Handlers.HandleBusinessAvailabilityUpdated(eventData)
	assert.NoError(t, err)

	var rules []models.AvailabilityRule
	suite.DB.Where("business_id = ?", businessID).Find(&rules)
	assert.Len(t, rules, 0)
}

func TestEventHandlersTestSuite(t *testing.T) {
	suite.Run(t, new(EventHandlersTestSuite))
}
