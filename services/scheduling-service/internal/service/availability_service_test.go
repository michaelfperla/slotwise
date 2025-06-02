package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/slotwise/scheduling-service/internal/models"
	"github.com/slotwise/scheduling-service/internal/repository"
	"github.com/slotwise/scheduling-service/internal/service"
	"github.com/slotwise/scheduling-service/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type AvailabilityServiceTestSuite struct {
	suite.Suite
	DB                  *gorm.DB
	AvailabilityService *service.AvailabilityService
	AvailabilityRepo    *repository.AvailabilityRepository // To help with seeding
	TestLogger          *logger.Logger
}

func (suite *AvailabilityServiceTestSuite) SetupSuite() {
	suite.TestLogger = logger.New("debug")
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		suite.T().Fatalf("Failed to connect to SQLite: %v", err)
	}
	suite.DB = db

	err = suite.DB.AutoMigrate(&models.ServiceDefinition{}, &models.AvailabilityRule{})
	assert.NoError(suite.T(), err)

	suite.AvailabilityRepo = repository.NewAvailabilityRepository(suite.DB)
	// For AvailabilityService, eventPublisher and cacheRepo are currently nil.
	// GetAvailableSlots now uses BookingRepo.
	bookingRepo := repository.NewBookingRepository(suite.DB) // Create BookingRepo for AvailabilityService
	suite.AvailabilityService = service.NewAvailabilityService(suite.AvailabilityRepo, bookingRepo, nil, suite.TestLogger)
}

func (suite *AvailabilityServiceTestSuite) TearDownSuite() {
	sqlDB, _ := suite.DB.DB()
	sqlDB.Close()
}

func (suite *AvailabilityServiceTestSuite) SetupTest() {
	suite.DB.Exec("DELETE FROM service_definitions")
	suite.DB.Exec("DELETE FROM availability_rules")
	suite.DB.Exec("DELETE FROM bookings") // Clean bookings as well
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_SimpleCase() {
	t := suite.T()
	ctx := context.Background()

	// Seed data
	serviceDef := models.ServiceDefinition{
		ID: "svc_simple", BusinessID: "biz_simple", Name: "Simple Service",
		DurationMinutes: 30, Price: 1000, Currency: "USD", IsActive: true,
	}
	suite.DB.Create(&serviceDef)

	rules := []models.AvailabilityRule{
		{BusinessID: "biz_simple", DayOfWeek: models.Monday, StartTime: "09:00", EndTime: "10:00"},
	}
	suite.DB.Create(&rules)

	// Test for a Monday
	// Find a Monday (e.g. 2024-03-04 was a Monday)
	testDate, _ := time.Parse("2006-01-02", "2024-03-04") // This is a Monday

	slots, err := suite.AvailabilityService.GetAvailableSlots(ctx, "biz_simple", "svc_simple", testDate)
	assert.NoError(t, err)
	assert.Len(t, slots, 2, "Should find two 30-min slots in a 1-hour window")

	if len(slots) == 2 {
		// Check first slot
		expectedStart1 := time.Date(2024, 3, 4, 9, 0, 0, 0, testDate.Location())
		expectedEnd1 := expectedStart1.Add(30 * time.Minute)
		assert.Equal(t, expectedStart1, slots[0].StartTime)
		assert.Equal(t, expectedEnd1, slots[0].EndTime)

		// Check second slot
		expectedStart2 := expectedEnd1
		expectedEnd2 := expectedStart2.Add(30 * time.Minute)
		assert.Equal(t, expectedStart2, slots[1].StartTime)
		assert.Equal(t, expectedEnd2, slots[1].EndTime)
	}
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_NoRulesForDay() {
	t := suite.T()
	ctx := context.Background()
	serviceDef := models.ServiceDefinition{
		ID: "svc_norules", BusinessID: "biz_norules", Name: "No Rules Service",
		DurationMinutes: 60, IsActive: true,
	}
	suite.DB.Create(&serviceDef)
	// No rules seeded for Tuesday for biz_norules

	testDate, _ := time.Parse("2006-01-02", "2024-03-05") // This is a Tuesday
	slots, err := suite.AvailabilityService.GetAvailableSlots(ctx, "biz_norules", "svc_norules", testDate)
	assert.NoError(t, err)
	assert.Len(t, slots, 0, "Should find no slots if no rules for the day")
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_ServiceNotFitting() {
	t := suite.T()
	ctx := context.Background()
	serviceDef := models.ServiceDefinition{
		ID: "svc_notfit", BusinessID: "biz_notfit", Name: "Not Fitting Service",
		DurationMinutes: 61, IsActive: true, // 61 minutes
	}
	suite.DB.Create(&serviceDef)
	rule := models.AvailabilityRule{
		BusinessID: "biz_notfit", DayOfWeek: models.Wednesday, StartTime: "10:00", EndTime: "11:00", // 1 hour window
	}
	suite.DB.Create(&rule)

	testDate, _ := time.Parse("2006-01-02", "2024-03-06") // This is a Wednesday
	slots, err := suite.AvailabilityService.GetAvailableSlots(ctx, "biz_notfit", "svc_notfit", testDate)
	assert.NoError(t, err)
	assert.Len(t, slots, 0, "Service duration (61m) should not fit in 1-hour window")
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_MultipleRulesOnSameDay() {
	t := suite.T()
	ctx := context.Background()
	serviceDef := models.ServiceDefinition{
		ID: "svc_multi_rules", BusinessID: "biz_multi_rules", Name: "Multi Rule Service",
		DurationMinutes: 30, IsActive: true,
	}
	suite.DB.Create(&serviceDef)
	rules := []models.AvailabilityRule{
		{BusinessID: "biz_multi_rules", DayOfWeek: models.Thursday, StartTime: "09:00", EndTime: "09:30"}, // 1 slot
		{BusinessID: "biz_multi_rules", DayOfWeek: models.Thursday, StartTime: "14:00", EndTime: "15:00"}, // 2 slots
	}
	suite.DB.Create(&rules)

	testDate, _ := time.Parse("2006-01-02", "2024-03-07") // This is a Thursday
	slots, err := suite.AvailabilityService.GetAvailableSlots(ctx, "biz_multi_rules", "svc_multi_rules", testDate)
	assert.NoError(t, err)
	assert.Len(t, slots, 3, "Should find 3 slots across two rules for Thursday")
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_ServiceInactive() {
	t := suite.T()
	ctx := context.Background()
	serviceDef := models.ServiceDefinition{
		ID: "svc_inactive", BusinessID: "biz_inactive", Name: "Inactive Service",
		DurationMinutes: 30, IsActive: false, // INACTIVE
	}
	suite.DB.Create(&serviceDef)
	rule := models.AvailabilityRule{
		BusinessID: "biz_inactive", DayOfWeek: models.Friday, StartTime: "09:00", EndTime: "17:00",
	}
	suite.DB.Create(&rule)
	
	testDate, _ := time.Parse("2006-01-02", "2024-03-08") // This is a Friday
	slots, err := suite.AvailabilityService.GetAvailableSlots(ctx, "biz_inactive", "svc_inactive", testDate)
	assert.Error(t, err, "Should return error for inactive service")
	assert.Contains(t, err.Error(), "not found or is not active")
	assert.Len(t, slots, 0)
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_ServiceNotFound() {
	t := suite.T()
	ctx := context.Background()
	// No service seeded with ID "svc_nonexistent"
	rule := models.AvailabilityRule{ // Rule exists for the business
		BusinessID: "biz_no_svc", DayOfWeek: models.Friday, StartTime: "09:00", EndTime: "17:00",
	}
	suite.DB.Create(&rule)

	testDate, _ := time.Parse("2006-01-02", "2024-03-08") // Friday
	slots, err := suite.AvailabilityService.GetAvailableSlots(ctx, "biz_no_svc", "svc_nonexistent", testDate)
	assert.Error(t, err, "Should return error if service definition not found")
	assert.Contains(t, err.Error(), "not found")
	assert.Len(t, slots, 0)
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_ServiceWrongBusiness() {
	t := suite.T()
	ctx := context.Background()
	serviceDef := models.ServiceDefinition{
		ID: "svc_wrong_biz", BusinessID: "biz_A", Name: "Service of Biz A",
		DurationMinutes: 30, IsActive: true,
	}
	suite.DB.Create(&serviceDef)
	rule := models.AvailabilityRule{
		BusinessID: "biz_B", DayOfWeek: models.Monday, StartTime: "09:00", EndTime: "17:00",
	} // Rule for Biz B
	suite.DB.Create(&rule)

	testDate, _ := time.Parse("2006-01-02", "2024-03-04") // Monday
	// Try to get slots for Biz B, but using service from Biz A
	slots, err := suite.AvailabilityService.GetAvailableSlots(ctx, "biz_B", "svc_wrong_biz", testDate)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "does not belong to business")
	assert.Len(t, slots, 0)
}


func TestAvailabilityServiceTestSuite(t *testing.T) {
	suite.Run(t, new(AvailabilityServiceTestSuite))
}

func (suite *AvailabilityServiceTestSuite) TestGetAvailableSlots_WithExistingBookings() {
	t := suite.T()
	ctx := context.Background()

	svcDef := models.ServiceDefinition{
		ID: "svc_conflict", BusinessID: "biz_conflict", Name: "Conflict Test Service",
		DurationMinutes: 30, IsActive: true,
	}
	suite.DB.Create(&svcDef)

	rules := []models.AvailabilityRule{
		{BusinessID: "biz_conflict", DayOfWeek: models.Monday, StartTime: "09:00", EndTime: "12:00"}, // Potential: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
	}
	suite.DB.Create(&rules)

	// Seed an existing booking that should make some slots unavailable
	// Booking from 10:00 to 10:30
	bookingTime, _ := time.Parse(time.RFC3339, "2024-03-04T10:00:00Z") // Use the same Monday as other tests
	existingBooking := models.Booking{
		ID: "booked_slot_1", BusinessID: "biz_conflict", ServiceID: "svc_conflict", CustomerID: "cust_booked",
		StartTime: bookingTime, EndTime: bookingTime.Add(30 * time.Minute), Status: models.BookingStatusConfirmed,
	}
	suite.DB.Create(&existingBooking)
	
	// Booking from 11:00 to 11:30
	bookingTime2, _ := time.Parse(time.RFC3339, "2024-03-04T11:00:00Z")
	existingBooking2 := models.Booking{
		ID: "booked_slot_2", BusinessID: "biz_conflict", ServiceID: "svc_conflict", CustomerID: "cust_booked2",
		StartTime: bookingTime2, EndTime: bookingTime2.Add(30 * time.Minute), Status: models.BookingStatusPendingPayment, // Also a conflicting status
	}
	suite.DB.Create(&existingBooking2)


	testDate, _ := time.Parse("2006-01-02", "2024-03-04") // Monday

	slots, err := suite.AvailabilityService.GetAvailableSlots(ctx, "biz_conflict", "svc_conflict", testDate)
	assert.NoError(t, err)
	
	// Expected slots: 09:00, 09:30, (10:00 is booked), 10:30, (11:00 is booked), 11:30
	assert.Len(t, slots, 4, "Should find 4 available slots after filtering booked ones")

	if len(slots) == 4 {
		// Check that 10:00 and 11:00 are NOT in the slots
		found1000 := false
		found1100 := false
		for _, slot := range slots {
			if slot.StartTime.Hour() == 10 && slot.StartTime.Minute() == 0 {
				found1000 = true
			}
			if slot.StartTime.Hour() == 11 && slot.StartTime.Minute() == 0 {
				found1100 = true
			}
		}
		assert.False(t, found1000, "10:00 slot should be booked")
		assert.False(t, found1100, "11:00 slot should be booked")

		// Check one of the expected slots
		expectedStart := time.Date(2024, 3, 4, 9, 30, 0, 0, testDate.Location())
		found0930 := false
		for _, slot := range slots {
			if slot.StartTime.Equal(expectedStart) {
				found0930 = true
				break
			}
		}
		assert.True(t, found0930, "09:30 slot should be available")
	}
}
