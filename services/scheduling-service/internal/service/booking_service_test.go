package service_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/slotwise/scheduling-service/internal/client"
	"github.com/slotwise/scheduling-service/internal/models"
	"github.com/slotwise/scheduling-service/internal/repository"
	"github.com/slotwise/scheduling-service/internal/service"
	"github.com/slotwise/scheduling-service/pkg/events"
	"github.com/slotwise/scheduling-service/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// MockEventPublisher for BookingService tests
type MockEventPublisher struct {
	PublishedEvents []struct {
		Subject string
		Data    interface{}
	}
}

func NewMockEventPublisher() *MockEventPublisher {
	return &MockEventPublisher{}
}
func (m *MockEventPublisher) Publish(subject string, data interface{}) error {
	m.PublishedEvents = append(m.PublishedEvents, struct {
		Subject string
		Data    interface{}
	}{Subject: subject, Data: data})
	return nil
}
func (m *MockEventPublisher) Reset() {
	m.PublishedEvents = nil
}

// MockNotificationClient for BookingService tests
type MockNotificationClient struct {
	SentNotifications      []client.SendNotificationRequest
	ScheduledNotifications []client.ScheduleNotificationRequest
}

func (m *MockNotificationClient) SendNotification(req client.SendNotificationRequest) (*client.NotificationResponse, error) {
	m.SentNotifications = append(m.SentNotifications, req)
	return &client.NotificationResponse{Success: true}, nil
}

func (m *MockNotificationClient) ScheduleNotification(req client.ScheduleNotificationRequest) (*client.NotificationResponse, error) {
	m.ScheduledNotifications = append(m.ScheduledNotifications, req)
	return &client.NotificationResponse{Success: true}, nil
}

func (m *MockNotificationClient) Reset() {
	m.SentNotifications = nil
	m.ScheduledNotifications = nil
}

type BookingServiceTestSuite struct {
	suite.Suite
	DB                *gorm.DB
	BookingService    *service.BookingService
	BookingRepo       *repository.BookingRepository
	AvailabilityRepo  *repository.AvailabilityRepository // For service definitions
	TestLogger        *logger.Logger
	MockNatsPublisher *MockEventPublisher
}

func (suite *BookingServiceTestSuite) SetupSuite() {
	suite.TestLogger = logger.New("debug")
	// Use PostgreSQL test database with environment-aware configuration
	dsn := "host=localhost user=postgres password=postgres dbname=slotwise_scheduling_test port=5432 sslmode=disable"

	// Allow override via environment variable (for CI)
	if envURL := os.Getenv("TEST_DATABASE_URL"); envURL != "" {
		dsn = envURL
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		suite.T().Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	suite.DB = db

	err = suite.DB.AutoMigrate(&models.ServiceDefinition{}, &models.AvailabilityRule{}, &models.Booking{})
	assert.NoError(suite.T(), err)

	suite.BookingRepo = repository.NewBookingRepository(suite.DB)
	suite.AvailabilityRepo = repository.NewAvailabilityRepository(suite.DB)
	suite.MockNatsPublisher = NewMockEventPublisher()

	// Initialize AvailabilityService (mocked or minimal if not directly used by BookingService's core logic being tested)
	// For CreateBooking, BookingService needs to fetch ServiceDefinition, so AvailabilityRepo is used as serviceDefRepo.
	// An actual AvailabilityService instance isn't strictly needed if we directly use AvailabilityRepo for setup.
	// Create a mock notification client
	mockNotificationClient := &MockNotificationClient{}

	suite.BookingService = service.NewBookingService(
		suite.BookingRepo,
		nil,                    // No direct call to AvailabilityService methods in BookingService yet
		suite.AvailabilityRepo, // Passed as the serviceDefRepo
		suite.MockNatsPublisher,
		mockNotificationClient, // Add the missing notification client parameter
		suite.TestLogger,
	)
}

func (suite *BookingServiceTestSuite) TearDownSuite() {
	sqlDB, _ := suite.DB.DB()
	sqlDB.Close()
}

func (suite *BookingServiceTestSuite) SetupTest() {
	suite.MockNatsPublisher.Reset()
	suite.DB.Exec("DELETE FROM bookings")
	suite.DB.Exec("DELETE FROM service_definitions")
	// No need to delete availability_rules for these specific tests yet
}

// --- CreateBooking Tests ---
func (suite *BookingServiceTestSuite) TestCreateBooking_Success_NoConflict() {
	t := suite.T()
	ctx := context.Background()

	// Seed Service Definition
	svcDef := models.ServiceDefinition{ID: "svc1", BusinessID: "biz1", Name: "Service 1", DurationMinutes: 60, IsActive: true}
	suite.DB.Create(&svcDef)

	startTime, _ := time.Parse(time.RFC3339, "2024-04-01T10:00:00Z")
	req := service.CreateBookingRequest{
		BusinessID: "biz1", ServiceID: "svc1", CustomerID: "cust1", StartTime: startTime,
	}

	booking, err := suite.BookingService.CreateBooking(ctx, req)
	assert.NoError(t, err)
	assert.NotNil(t, booking)
	assert.Equal(t, models.BookingStatusPendingPayment, booking.Status)
	assert.Equal(t, startTime.Add(time.Duration(svcDef.DurationMinutes)*time.Minute), booking.EndTime)

	// Verify DB
	var dbBooking models.Booking
	err = suite.DB.First(&dbBooking, "id = ?", booking.ID).Error
	assert.NoError(t, err)
	assert.Equal(t, "biz1", dbBooking.BusinessID)

	// Verify NATS event
	assert.Len(t, suite.MockNatsPublisher.PublishedEvents, 1)
	event := suite.MockNatsPublisher.PublishedEvents[0]
	assert.Equal(t, events.BookingRequestedEvent, event.Subject)
	eventData, ok := event.Data.(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, booking.ID, eventData["bookingId"])
}

func (suite *BookingServiceTestSuite) TestCreateBooking_Conflict() {
	t := suite.T()
	ctx := context.Background()

	svcDef := models.ServiceDefinition{ID: "svc2", BusinessID: "biz2", Name: "Service 2", DurationMinutes: 60, IsActive: true}
	suite.DB.Create(&svcDef)

	// Seed an existing confirmed booking
	existingStartTime, _ := time.Parse(time.RFC3339, "2024-04-01T11:00:00Z")
	existingBooking := models.Booking{
		ID: "550e8400-e29b-41d4-a716-446655440001", BusinessID: "biz2", ServiceID: "svc2", CustomerID: "cust_exist",
		StartTime: existingStartTime, EndTime: existingStartTime.Add(60 * time.Minute), Status: models.BookingStatusConfirmed,
	}
	suite.DB.Create(&existingBooking)

	// Attempt to create an overlapping booking
	conflictStartTime := existingStartTime.Add(30 * time.Minute) // Starts 30 mins into existing
	req := service.CreateBookingRequest{
		BusinessID: "biz2", ServiceID: "svc2", CustomerID: "cust_new", StartTime: conflictStartTime,
	}

	booking, err := suite.BookingService.CreateBooking(ctx, req)
	assert.Error(t, err)
	assert.Nil(t, booking)
	assert.Contains(t, err.Error(), "slot is not available due to a conflict")
	assert.Len(t, suite.MockNatsPublisher.PublishedEvents, 0) // No event on failure
}

func (suite *BookingServiceTestSuite) TestCreateBooking_BackToBack_NoConflict() {
	t := suite.T()
	ctx := context.Background()
	svcDef := models.ServiceDefinition{ID: "svc3", BusinessID: "biz3", Name: "Service 3", DurationMinutes: 30, IsActive: true}
	suite.DB.Create(&svcDef)

	existingStartTime, _ := time.Parse(time.RFC3339, "2024-04-01T14:00:00Z")
	existingBooking := models.Booking{
		ID: "550e8400-e29b-41d4-a716-446655440003", BusinessID: "biz3", ServiceID: "svc3", CustomerID: "cust_b2b_1",
		StartTime: existingStartTime, EndTime: existingStartTime.Add(30 * time.Minute), Status: models.BookingStatusConfirmed,
	}
	suite.DB.Create(&existingBooking)

	// New booking starts exactly when the previous one ends
	newStartTime := existingBooking.EndTime
	req := service.CreateBookingRequest{
		BusinessID: "biz3", ServiceID: "svc3", CustomerID: "cust_b2b_2", StartTime: newStartTime,
	}
	booking, err := suite.BookingService.CreateBooking(ctx, req)
	assert.NoError(t, err)
	assert.NotNil(t, booking)
	assert.Equal(t, models.BookingStatusPendingPayment, booking.Status)
	assert.Len(t, suite.MockNatsPublisher.PublishedEvents, 1)
}

// --- UpdateBookingStatus Tests ---
func (suite *BookingServiceTestSuite) TestUpdateBookingStatus_Confirm() {
	t := suite.T()
	ctx := context.Background()
	startTime := time.Now().Add(time.Hour)
	bookingToConfirm := models.Booking{
		ID: "550e8400-e29b-41d4-a716-446655440004", BusinessID: "biz_confirm", ServiceID: "svc_confirm", CustomerID: "cust_confirm",
		StartTime: startTime, EndTime: startTime.Add(60 * time.Minute), Status: models.BookingStatusPendingPayment,
	}
	suite.DB.Create(&bookingToConfirm)

	updatedBooking, err := suite.BookingService.UpdateBookingStatus(ctx, bookingToConfirm.ID, models.BookingStatusConfirmed)
	assert.NoError(t, err)
	assert.NotNil(t, updatedBooking)
	assert.Equal(t, models.BookingStatusConfirmed, updatedBooking.Status)

	// Verify DB
	var dbBooking models.Booking
	suite.DB.First(&dbBooking, "id = ?", bookingToConfirm.ID)
	assert.Equal(t, models.BookingStatusConfirmed, dbBooking.Status)

	// Verify NATS events (BookingConfirmed and SlotReserved)
	assert.Len(t, suite.MockNatsPublisher.PublishedEvents, 2)
	foundConfirmed, foundReserved := false, false
	for _, event := range suite.MockNatsPublisher.PublishedEvents {
		if event.Subject == events.BookingConfirmedEvent {
			foundConfirmed = true
		}
		if event.Subject == events.SlotReservedEvent {
			foundReserved = true
		}
	}
	assert.True(t, foundConfirmed, "BookingConfirmedEvent not published")
	assert.True(t, foundReserved, "SlotReservedEvent not published")
}

func (suite *BookingServiceTestSuite) TestUpdateBookingStatus_Cancel() {
	t := suite.T()
	ctx := context.Background()
	startTime := time.Now().Add(2 * time.Hour)
	bookingToCancel := models.Booking{
		ID: "550e8400-e29b-41d4-a716-446655440002", BusinessID: "biz_cancel", ServiceID: "svc_cancel", CustomerID: "cust_cancel",
		StartTime: startTime, EndTime: startTime.Add(60 * time.Minute), Status: models.BookingStatusConfirmed,
	}
	suite.DB.Create(&bookingToCancel)

	updatedBooking, err := suite.BookingService.UpdateBookingStatus(ctx, bookingToCancel.ID, models.BookingStatusCancelled)
	assert.NoError(t, err)
	assert.NotNil(t, updatedBooking)
	assert.Equal(t, models.BookingStatusCancelled, updatedBooking.Status)

	// Verify NATS event
	assert.Len(t, suite.MockNatsPublisher.PublishedEvents, 1)
	assert.Equal(t, events.BookingCancelledEvent, suite.MockNatsPublisher.PublishedEvents[0].Subject)
}

// --- ListBookings Tests ---
func (suite *BookingServiceTestSuite) TestListBookingsForCustomer() {
	t := suite.T()
	ctx := context.Background()
	// Seed bookings for different customers
	suite.DB.Create(&models.Booking{ID: "550e8400-e29b-41d4-a716-446655440005", CustomerID: "cust1_list", BusinessID: "biz_c_list", ServiceID: "svc_c_list", StartTime: time.Now(), EndTime: time.Now().Add(time.Hour), Status: models.BookingStatusConfirmed})
	suite.DB.Create(&models.Booking{ID: "550e8400-e29b-41d4-a716-446655440006", CustomerID: "cust1_list", BusinessID: "biz_c_list", ServiceID: "svc_c_list", StartTime: time.Now().Add(2 * time.Hour), EndTime: time.Now().Add(3 * time.Hour), Status: models.BookingStatusConfirmed})
	suite.DB.Create(&models.Booking{ID: "550e8400-e29b-41d4-a716-446655440007", CustomerID: "cust2_list", BusinessID: "biz_c_list", ServiceID: "svc_c_list", StartTime: time.Now(), EndTime: time.Now().Add(time.Hour), Status: models.BookingStatusConfirmed})

	bookings, total, err := suite.BookingService.ListBookingsForCustomer(ctx, "cust1_list", 10, 0)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), total)
	assert.Len(t, bookings, 2)

	bookingsPage2, total2, err := suite.BookingService.ListBookingsForCustomer(ctx, "cust1_list", 1, 1)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), total2)
	assert.Len(t, bookingsPage2, 1)

}

func (suite *BookingServiceTestSuite) TestListBookingsForBusiness() {
	t := suite.T()
	ctx := context.Background()
	// Seed bookings for different businesses
	suite.DB.Create(&models.Booking{ID: "550e8400-e29b-41d4-a716-446655440008", BusinessID: "biz1_list", CustomerID: "cust_b_list", ServiceID: "svc_b_list", StartTime: time.Now(), EndTime: time.Now().Add(time.Hour), Status: models.BookingStatusConfirmed})
	suite.DB.Create(&models.Booking{ID: "550e8400-e29b-41d4-a716-446655440009", BusinessID: "biz1_list", CustomerID: "cust_b_list", ServiceID: "svc_b_list", StartTime: time.Now().Add(2 * time.Hour), EndTime: time.Now().Add(3 * time.Hour), Status: models.BookingStatusPendingPayment})
	suite.DB.Create(&models.Booking{ID: "550e8400-e29b-41d4-a716-44665544000a", BusinessID: "biz2_list", CustomerID: "cust_b_list", ServiceID: "svc_b_list", StartTime: time.Now(), EndTime: time.Now().Add(time.Hour), Status: models.BookingStatusConfirmed})

	bookings, total, err := suite.BookingService.ListBookingsForBusiness(ctx, "biz1_list", 10, 0)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), total)
	assert.Len(t, bookings, 2)
}

func TestBookingServiceTestSuite(t *testing.T) {
	suite.Run(t, new(BookingServiceTestSuite))
}
