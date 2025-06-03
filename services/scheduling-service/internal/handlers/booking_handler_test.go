package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/slotwise/scheduling-service/internal/handlers"
	"github.com/slotwise/scheduling-service/internal/models"
	"github.com/slotwise/scheduling-service/internal/repository"
	"github.com/slotwise/scheduling-service/internal/service"
	"github.com/slotwise/scheduling-service/pkg/events" // For NATS event consts
	"github.com/slotwise/scheduling-service/pkg/logger"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// MockEventPublisher for handler tests (if checking events published by service through handler)
type MockNatsPublisherForHandler struct {
	PublishedEvents []struct {
		Subject string
		Data    interface{}
	}
}

func (m *MockNatsPublisherForHandler) Publish(subject string, data interface{}) error {
	m.PublishedEvents = append(m.PublishedEvents, struct {
		Subject string
		Data    interface{}
	}{Subject: subject, Data: data})
	return nil
}
func (m *MockNatsPublisherForHandler) Reset() { m.PublishedEvents = nil }

type BookingHandlerTestSuite struct {
	suite.Suite
	DB                  *gorm.DB
	Router              *gin.Engine
	BookingService      *service.BookingService      // Real service
	AvailabilityService *service.AvailabilityService // Real service
	BookingRepo         *repository.BookingRepository
	AvailabilityRepo    *repository.AvailabilityRepository
	TestLogger          *logger.Logger
	MockNatsPub         *MockNatsPublisherForHandler // Mock NATS specifically for handler tests
}

func (suite *BookingHandlerTestSuite) SetupSuite() {
	suite.TestLogger = logger.New("debug")
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	assert.NoError(suite.T(), err)
	suite.DB = db

	err = suite.DB.AutoMigrate(&models.ServiceDefinition{}, &models.AvailabilityRule{}, &models.Booking{})
	assert.NoError(suite.T(), err)

	suite.BookingRepo = repository.NewBookingRepository(suite.DB)
	suite.AvailabilityRepo = repository.NewAvailabilityRepository(suite.DB)
	suite.MockNatsPub = &MockNatsPublisherForHandler{}

	// Services
	// AvailabilityService needs BookingRepo for conflict check in GetAvailableSlots
	suite.AvailabilityService = service.NewAvailabilityService(suite.AvailabilityRepo, suite.BookingRepo, nil, suite.MockNatsPub, suite.TestLogger)
	// BookingService needs AvailabilityRepo (as serviceDefRepo)
	suite.BookingService = service.NewBookingService(suite.BookingRepo, suite.AvailabilityService, suite.AvailabilityRepo, suite.MockNatsPub, suite.TestLogger)

	// Router and Handlers
	gin.SetMode(gin.TestMode)
	router := gin.New()
	bookingHandler := handlers.NewBookingHandler(suite.BookingService, suite.TestLogger)
	// availabilityHandler := handlers.NewAvailabilityHandler(suite.AvailabilityService, suite.TestLogger) // if testing public slots here too

	v1 := router.Group("/api/v1")
	{
		b := v1.Group("/bookings")
		{
			b.POST("", bookingHandler.CreateBooking)
			b.GET("/:bookingId", bookingHandler.GetBookingByID)
			b.GET("", bookingHandler.ListBookings)
			b.PUT("/:bookingId/status", bookingHandler.UpdateBookingStatus)
		}
		// Example for public slots if also tested here:
		// v1.GET("/services/:serviceId/slots", availabilityHandler.GetPublicSlotsForService)
	}
	suite.Router = router
}

func (suite *BookingHandlerTestSuite) TearDownSuite() {
	sqlDB, _ := suite.DB.DB()
	sqlDB.Close()
}

func (suite *BookingHandlerTestSuite) SetupTest() {
	suite.MockNatsPub.Reset()
	suite.DB.Exec("DELETE FROM bookings")
	suite.DB.Exec("DELETE FROM service_definitions")
	suite.DB.Exec("DELETE FROM availability_rules")
}

func (suite *BookingHandlerTestSuite) TestCreateBookingAPI_Success() {
	t := suite.T()
	// Seed Service Definition
	svcDef := models.ServiceDefinition{ID: "s1", BusinessID: "b1", Name: "Svc 1", DurationMinutes: 30, IsActive: true}
	suite.DB.Create(&svcDef)

	startTime, _ := time.Parse(time.RFC3339, "2024-05-01T10:00:00Z")
	payload := handlers.CreateBookingRequestDTO{
		BusinessID: "b1", ServiceID: "s1", CustomerID: "c1", StartTime: startTime,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/bookings", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	// TODO: Add mock auth header/context if CreateBooking handler expects CustomerID from auth

	rr := httptest.NewRecorder()
	suite.Router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	var bookingResp models.Booking
	err := json.Unmarshal(rr.Body.Bytes(), &bookingResp)
	assert.NoError(t, err)
	assert.NotEmpty(t, bookingResp.ID)
	assert.Equal(t, models.BookingStatusPendingPayment, bookingResp.Status)

	// Check NATS
	assert.Len(t, suite.MockNatsPub.PublishedEvents, 1)
	assert.Equal(t, events.BookingRequestedEvent, suite.MockNatsPub.PublishedEvents[0].Subject)
}

func (suite *BookingHandlerTestSuite) TestCreateBookingAPI_Conflict() {
	t := suite.T()
	svcDef := models.ServiceDefinition{ID: "s2", BusinessID: "b2", Name: "Svc 2", DurationMinutes: 60, IsActive: true}
	suite.DB.Create(&svcDef)

	existingStartTime, _ := time.Parse(time.RFC3339, "2024-05-01T11:00:00Z")
	existingBooking := models.Booking{
		ID: "existing_b_api", BusinessID: "b2", ServiceID: "s2", CustomerID: "c_exist",
		StartTime: existingStartTime, EndTime: existingStartTime.Add(60 * time.Minute), Status: models.BookingStatusConfirmed,
	}
	suite.DB.Create(&existingBooking)

	conflictStartTime := existingStartTime.Add(30 * time.Minute)
	payload := handlers.CreateBookingRequestDTO{
		BusinessID: "b2", ServiceID: "s2", CustomerID: "c_new", StartTime: conflictStartTime,
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/bookings", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	suite.Router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusConflict, rr.Code)
	assert.Len(t, suite.MockNatsPub.PublishedEvents, 0)
}

func (suite *BookingHandlerTestSuite) TestGetBookingByIDAPI() {
	t := suite.T()
	bookingID := "get_book_api_1"
	startTime, _ := time.Parse(time.RFC3339, "2024-05-01T15:00:00Z")
	newBooking := models.Booking{
		ID: bookingID, BusinessID: "b_get", ServiceID: "s_get", CustomerID: "c_get",
		StartTime: startTime, EndTime: startTime.Add(60 * time.Minute), Status: models.BookingStatusConfirmed,
	}
	suite.DB.Create(&newBooking)

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/bookings/"+bookingID, nil)
	rr := httptest.NewRecorder()
	suite.Router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var bookingResp models.Booking
	json.Unmarshal(rr.Body.Bytes(), &bookingResp)
	assert.Equal(t, bookingID, bookingResp.ID)
}

func (suite *BookingHandlerTestSuite) TestListBookingsAPI_ByCustomer() {
	t := suite.T()
	// Seed bookings
	suite.DB.Create(&models.Booking{ID: "lc1", CustomerID: "cust_list_api", BusinessID: "b_l_c", ServiceID: "s_l_c", StartTime: time.Now(), Status: models.BookingStatusConfirmed})
	suite.DB.Create(&models.Booking{ID: "lc2", CustomerID: "cust_list_api", BusinessID: "b_l_c", ServiceID: "s_l_c", StartTime: time.Now().Add(time.Hour), Status: models.BookingStatusPendingPayment})
	suite.DB.Create(&models.Booking{ID: "lc3", CustomerID: "cust_other", BusinessID: "b_l_c", ServiceID: "s_l_c", StartTime: time.Now(), Status: models.BookingStatusConfirmed})

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/bookings?customerId=cust_list_api", nil)
	rr := httptest.NewRecorder()
	suite.Router.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	var respData struct{ Data []models.Booking }
	json.Unmarshal(rr.Body.Bytes(), &respData)
	assert.Len(t, respData.Data, 2)
}

func (suite *BookingHandlerTestSuite) TestUpdateBookingStatusAPI() {
	t := suite.T()
	bookingID := "update_stat_api_1"
	startTime, _ := time.Parse(time.RFC3339, "2024-05-01T18:00:00Z")
	newBooking := models.Booking{
		ID: bookingID, BusinessID: "b_upd", ServiceID: "s_upd", CustomerID: "c_upd",
		StartTime: startTime, EndTime: startTime.Add(60 * time.Minute), Status: models.BookingStatusPendingPayment,
	}
	suite.DB.Create(&newBooking)

	payload := handlers.UpdateBookingStatusRequestDTO{Status: models.BookingStatusConfirmed}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPut, "/api/v1/bookings/"+bookingID+"/status", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	suite.Router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var bookingResp models.Booking
	json.Unmarshal(rr.Body.Bytes(), &bookingResp)
	assert.Equal(t, models.BookingStatusConfirmed, bookingResp.Status)

	// Check NATS events (BookingConfirmed and SlotReserved)
	assert.Len(t, suite.MockNatsPub.PublishedEvents, 2)
}

func TestBookingHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(BookingHandlerTestSuite))
}
