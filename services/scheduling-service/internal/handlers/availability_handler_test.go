package handlers_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/slotwise/scheduling-service/internal/handlers"
	"github.com/slotwise/scheduling-service/internal/models"
	"github.com/slotwise/scheduling-service/internal/repository"
	"github.com/slotwise/scheduling-service/internal/service"
	"github.com/slotwise/scheduling-service/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type AvailabilityHandlerTestSuite struct {
	suite.Suite
	DB                  *gorm.DB
	Router              *gin.Engine
	AvailabilityService *service.AvailabilityService
	AvailabilityRepo    *repository.AvailabilityRepository
	TestLogger          *logger.Logger
}

func (suite *AvailabilityHandlerTestSuite) SetupSuite() {
	suite.TestLogger = logger.New("debug")
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		suite.T().Fatalf("Failed to connect to SQLite: %v", err)
	}
	suite.DB = db

	err = suite.DB.AutoMigrate(&models.ServiceDefinition{}, &models.AvailabilityRule{}, &models.Booking{}) // Added Booking for bookingRepo
	assert.NoError(suite.T(), err)

	suite.AvailabilityRepo = repository.NewAvailabilityRepository(suite.DB)
	bookingRepo := repository.NewBookingRepository(suite.DB) // Create BookingRepo
	// Pass bookingRepo, and nil for CacheRepository and EventPublisher
	suite.AvailabilityService = service.NewAvailabilityService(suite.AvailabilityRepo, bookingRepo, nil, nil, suite.TestLogger)

	// Setup router
	gin.SetMode(gin.TestMode)
	router := gin.New()
	availabilityHandler := handlers.NewAvailabilityHandler(suite.AvailabilityService, suite.TestLogger)

	v1 := router.Group("/api/v1")
	internal := v1.Group("/internal")
	{
		internalAvailability := internal.Group("/availability")
		{
			// This matches the route defined in main.go for internal use
			internalAvailability.GET("/:businessId/slots", availabilityHandler.GetSlotsForBusinessServiceDate)
		}
	}
	// Add the public slots route
	v1.GET("/services/:serviceId/slots", availabilityHandler.GetPublicSlotsForService)
	suite.Router = router
}

func (suite *AvailabilityHandlerTestSuite) TearDownSuite() {
	sqlDB, _ := suite.DB.DB()
	sqlDB.Close()
}

func (suite *AvailabilityHandlerTestSuite) SetupTest() {
	suite.DB.Exec("DELETE FROM service_definitions")
	suite.DB.Exec("DELETE FROM availability_rules")
}

func (suite *AvailabilityHandlerTestSuite) TestGetSlotsForBusinessServiceDate_APISuccess() {
	t := suite.T()

	// Seed data
	serviceDef := models.ServiceDefinition{
		ID: "svc_api_test", BusinessID: "biz_api_test", Name: "API Test Service",
		DurationMinutes: 45, Price: 2000, Currency: "USD", IsActive: true,
	}
	suite.DB.Create(&serviceDef)

	rules := []models.AvailabilityRule{
		{BusinessID: "biz_api_test", DayOfWeek: models.Monday, StartTime: "10:00", EndTime: "11:30"}, // Two 45-min slots
	}
	suite.DB.Create(&rules)

	// Test for a Monday
	dateStr := "2024-03-04" // This is a Monday

	url := fmt.Sprintf("/api/v1/internal/availability/biz_api_test/slots?serviceId=svc_api_test&date=%s", dateStr)
	req, _ := http.NewRequest(http.MethodGet, url, nil)
	rr := httptest.NewRecorder()
	suite.Router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var responseBody map[string]interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &responseBody)
	assert.NoError(t, err)

	assert.NotNil(t, responseBody["slots"])
	slotsData, ok := responseBody["slots"].([]interface{})
	assert.True(t, ok, "slots should be an array")
	assert.Len(t, slotsData, 2, "Should return two slots")

    // Further checks on slot times if necessary, by parsing slot strings back to time.Time
    // Example:
	if len(slotsData) == 2 {
        // Example check for specific times if needed, requires careful time zone handling
        // slot1 := slotsData[0].(map[string]interface{})
        // startTime1Str := slot1["startTime"].(string)
        // expectedStartTime := time.Date(2024, 3, 4, 10, 0, 0, 0, time.UTC) // Assuming test date and UTC for simplicity
        // parsedStartTime, _ := time.Parse(time.RFC3339Nano, startTime1Str)
        // assert.True(t, parsedStartTime.Equal(expectedStartTime), "First slot should start at 10:00")
    }
}

func (suite *AvailabilityHandlerTestSuite) TestGetSlotsForBusinessServiceDate_APIWithConflicts() {
	t := suite.T()
	bizID := "biz_api_conflict"
	svcID := "svc_api_conflict"

	// Seed Service Definition
	svcDef := models.ServiceDefinition{
		ID: svcID, BusinessID: bizID, Name: "Conflict Test API Service",
		DurationMinutes: 30, IsActive: true,
	}
	suite.DB.Create(&svcDef)

	// Seed Availability Rule: Monday 09:00 - 10:30 (09:00, 09:30, 10:00)
	rules := []models.AvailabilityRule{
		{BusinessID: bizID, DayOfWeek: models.Monday, StartTime: "09:00", EndTime: "10:30"},
	}
	suite.DB.Create(&rules)

	// Seed a Booking that conflicts with the 09:30 slot
	dateForBooking, _ := time.Parse("2006-01-02", "2024-03-04") // Same Monday as slot generation test
	bookingStartTime := time.Date(dateForBooking.Year(), dateForBooking.Month(), dateForBooking.Day(), 9, 30, 0, 0, dateForBooking.Location())
	conflictingBooking := models.Booking{
		ID: "conflict_book_1", BusinessID: bizID, ServiceID: svcID, CustomerID: "cust_conflict_api",
		StartTime: bookingStartTime, EndTime: bookingStartTime.Add(30 * time.Minute), Status: models.BookingStatusConfirmed,
	}
	suite.DB.Create(&conflictingBooking)
	
	dateStr := "2024-03-04"
	url := fmt.Sprintf("/api/v1/internal/availability/%s/slots?serviceId=%s&date=%s", bizID, svcID, dateStr)
	// This test is for the *internal* endpoint. The public one is /api/v1/services/:serviceId/slots
	// Let's adjust the URL to match the public endpoint.
	// The public endpoint handler is GetPublicSlotsForService in AvailabilityHandler.
	// We need to make sure that handler is registered on a route like /api/v1/services/:serviceId/slots
	// and that it calls the conflict-aware GetAvailableSlots from the service.
	// The main.go registers: v1.GET("/services/:serviceId/slots", availabilityHandler.GetPublicSlotsForService)
	// And GetPublicSlotsForService in handler calls AvailabilityService.GetAvailableSlots.

	publicSlotUrl := fmt.Sprintf("/api/v1/services/%s/slots?date=%s&businessId=%s", svcID, dateStr, bizID)
	req, _ := http.NewRequest(http.MethodGet, publicSlotUrl, nil)
	rr := httptest.NewRecorder()
	suite.Router.ServeHTTP(rr, req) // Assuming suite.Router has this public route registered.

	assert.Equal(t, http.StatusOK, rr.Code)
	var responseBody map[string]interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &responseBody)
	assert.NoError(t, err)

	assert.NotNil(t, responseBody["slots"])
	slotsData, ok := responseBody["slots"].([]interface{})
	assert.True(t, ok, "slots should be an array")
	// Expected: 09:00, 10:00 (09:30 is booked)
	assert.Len(t, slotsData, 2, "Should return 2 slots, excluding the booked one")

	found0900 := false
	found1000 := false
	for _, slotInf := range slotsData {
		slot := slotInf.(map[string]interface{})
		startTimeStr := slot["startTime"].(string)
		parsedST, _ := time.Parse(time.RFC3339Nano, startTimeStr)
		if parsedST.Hour() == 9 && parsedST.Minute() == 0 { found0900 = true }
		if parsedST.Hour() == 10 && parsedST.Minute() == 0 { found1000 = true }
	}
	assert.True(t, found0900, "Slot 09:00 should be available")
	assert.True(t, found1000, "Slot 10:00 should be available")

}


func (suite *AvailabilityHandlerTestSuite) TestGetSlotsForBusinessServiceDate_APIServiceNotFound() {
	t := suite.T()
	dateStr := "2024-03-04" // Monday
	// No service "svc_api_nosvc" seeded for "biz_api_nosvc"

	// Seed a business and rule, but not the service requested.
	rules := []models.AvailabilityRule{
		{BusinessID: "biz_api_nosvc", DayOfWeek: models.Monday, StartTime: "10:00", EndTime: "11:30"},
	}
	suite.DB.Create(&rules)


	url := fmt.Sprintf("/api/v1/internal/availability/biz_api_nosvc/slots?serviceId=svc_api_nosvc&date=%s", dateStr)
	req, _ := http.NewRequest(http.MethodGet, url, nil)
	rr := httptest.NewRecorder()
	suite.Router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code, "Should return 404 if service not found")
	
	var responseBody map[string]interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &responseBody)
	assert.NoError(t, err)
	assert.Contains(t, responseBody["error"], "not found", "Error message should indicate 'not found'")
}


func (suite *AvailabilityHandlerTestSuite) TestGetSlotsForBusinessServiceDate_APIBadRequest() {
	t := suite.T()
	// Missing date parameter
	url := "/api/v1/internal/availability/biz_api_badreq/slots?serviceId=svc_api_badreq"
	req, _ := http.NewRequest(http.MethodGet, url, nil)
	rr := httptest.NewRecorder()
	suite.Router.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)

	// Invalid date format
    url = "/api/v1/internal/availability/biz_api_badreq/slots?serviceId=svc_api_badreq&date=invalid-date"
	req, _ = http.NewRequest(http.MethodGet, url, nil)
	rr = httptest.NewRecorder()
	suite.Router.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}


func TestAvailabilityHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(AvailabilityHandlerTestSuite))
}
