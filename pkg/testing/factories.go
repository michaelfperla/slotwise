// Package testing provides test data factories for SlotWise services
package testing

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// NewUUID generates a new UUID string for testing
func NewUUID() string {
	return uuid.New().String()
}

// NewTestEmail generates a unique test email address
func NewTestEmail() string {
	return fmt.Sprintf("test-%s@example.com", uuid.New().String()[:8])
}

// UserFactory creates test User instances with sensible defaults
type UserFactory struct {
	id              string
	email           string
	passwordHash    string
	firstName       string
	lastName        string
	avatar          *string
	timezone        string
	isEmailVerified bool
	emailVerifiedAt *time.Time
	lastLoginAt     *time.Time
	role            string
	status          string
	businessID      *string
	language        string
	dateFormat      string
	timeFormat      string
	createdAt       time.Time
	updatedAt       time.Time
}

// NewUserFactory creates a new UserFactory with default values
func NewUserFactory() *UserFactory {
	now := time.Now()
	return &UserFactory{
		email:           NewTestEmail(),
		passwordHash:    "$2a$10$test.hash.for.testing.purposes.only",
		firstName:       "Test",
		lastName:        "User",
		timezone:        "UTC",
		isEmailVerified: true,
		emailVerifiedAt: &now,
		role:            "client",
		status:          "active",
		language:        "en",
		dateFormat:      "MM/DD/YYYY",
		timeFormat:      "12h",
		createdAt:       now,
		updatedAt:       now,
	}
}

// WithID sets a specific ID for the user
func (f *UserFactory) WithID(id string) *UserFactory {
	f.id = id
	return f
}

// WithEmail sets a specific email for the user
func (f *UserFactory) WithEmail(email string) *UserFactory {
	f.email = email
	return f
}

// WithName sets the first and last name for the user
func (f *UserFactory) WithName(firstName, lastName string) *UserFactory {
	f.firstName = firstName
	f.lastName = lastName
	return f
}

// WithRole sets the role for the user
func (f *UserFactory) WithRole(role string) *UserFactory {
	f.role = role
	return f
}

// WithStatus sets the status for the user
func (f *UserFactory) WithStatus(status string) *UserFactory {
	f.status = status
	return f
}

// WithBusinessID sets the business ID for the user
func (f *UserFactory) WithBusinessID(businessID string) *UserFactory {
	f.businessID = &businessID
	return f
}

// AsBusinessOwner configures the user as a business owner
func (f *UserFactory) AsBusinessOwner() *UserFactory {
	f.role = "business_owner"
	return f
}

// AsUnverified configures the user as unverified
func (f *UserFactory) AsUnverified() *UserFactory {
	f.isEmailVerified = false
	f.emailVerifiedAt = nil
	f.status = "pending_verification"
	return f
}

// Build creates the User instance
func (f *UserFactory) Build() map[string]interface{} {
	user := map[string]interface{}{
		"email":             f.email,
		"password_hash":     f.passwordHash,
		"first_name":        f.firstName,
		"last_name":         f.lastName,
		"timezone":          f.timezone,
		"is_email_verified": f.isEmailVerified,
		"role":              f.role,
		"status":            f.status,
		"language":          f.language,
		"date_format":       f.dateFormat,
		"time_format":       f.timeFormat,
		"created_at":        f.createdAt,
		"updated_at":        f.updatedAt,
	}

	// Only set ID if explicitly provided
	if f.id != "" {
		user["id"] = f.id
	}

	// Set optional fields only if they have values
	if f.avatar != nil {
		user["avatar"] = *f.avatar
	}
	if f.emailVerifiedAt != nil {
		user["email_verified_at"] = *f.emailVerifiedAt
	}
	if f.lastLoginAt != nil {
		user["last_login_at"] = *f.lastLoginAt
	}
	if f.businessID != nil {
		user["business_id"] = *f.businessID
	}

	return user
}

// BusinessFactory creates test Business instances
type BusinessFactory struct {
	id        string
	ownerID   string
	name      string
	createdAt time.Time
	updatedAt time.Time
}

// NewBusinessFactory creates a new BusinessFactory with default values
func NewBusinessFactory() *BusinessFactory {
	now := time.Now()
	return &BusinessFactory{
		ownerID:   NewUUID(),
		name:      "Test Business",
		createdAt: now,
		updatedAt: now,
	}
}

// WithID sets a specific ID for the business
func (f *BusinessFactory) WithID(id string) *BusinessFactory {
	f.id = id
	return f
}

// WithOwnerID sets the owner ID for the business
func (f *BusinessFactory) WithOwnerID(ownerID string) *BusinessFactory {
	f.ownerID = ownerID
	return f
}

// WithName sets the name for the business
func (f *BusinessFactory) WithName(name string) *BusinessFactory {
	f.name = name
	return f
}

// Build creates the Business instance
func (f *BusinessFactory) Build() map[string]interface{} {
	business := map[string]interface{}{
		"owner_id":   f.ownerID,
		"name":       f.name,
		"created_at": f.createdAt,
		"updated_at": f.updatedAt,
	}

	// Only set ID if explicitly provided
	if f.id != "" {
		business["id"] = f.id
	}

	return business
}

// BookingFactory creates test Booking instances
type BookingFactory struct {
	id         string
	businessID string
	serviceID  string
	customerID string
	startTime  time.Time
	endTime    time.Time
	status     string
	createdAt  time.Time
	updatedAt  time.Time
}

// NewBookingFactory creates a new BookingFactory with default values
func NewBookingFactory() *BookingFactory {
	now := time.Now()
	startTime := now.Add(24 * time.Hour) // Tomorrow
	endTime := startTime.Add(time.Hour)  // 1 hour duration

	return &BookingFactory{
		businessID: NewUUID(),
		serviceID:  NewUUID(),
		customerID: NewUUID(),
		startTime:  startTime,
		endTime:    endTime,
		status:     "pending",
		createdAt:  now,
		updatedAt:  now,
	}
}

// WithID sets a specific ID for the booking
func (f *BookingFactory) WithID(id string) *BookingFactory {
	f.id = id
	return f
}

// WithBusinessID sets the business ID for the booking
func (f *BookingFactory) WithBusinessID(businessID string) *BookingFactory {
	f.businessID = businessID
	return f
}

// WithServiceID sets the service ID for the booking
func (f *BookingFactory) WithServiceID(serviceID string) *BookingFactory {
	f.serviceID = serviceID
	return f
}

// WithCustomerID sets the customer ID for the booking
func (f *BookingFactory) WithCustomerID(customerID string) *BookingFactory {
	f.customerID = customerID
	return f
}

// WithTimeSlot sets the start and end time for the booking
func (f *BookingFactory) WithTimeSlot(startTime, endTime time.Time) *BookingFactory {
	f.startTime = startTime
	f.endTime = endTime
	return f
}

// WithStatus sets the status for the booking
func (f *BookingFactory) WithStatus(status string) *BookingFactory {
	f.status = status
	return f
}

// AsConfirmed configures the booking as confirmed
func (f *BookingFactory) AsConfirmed() *BookingFactory {
	f.status = "confirmed"
	return f
}

// AsCancelled configures the booking as cancelled
func (f *BookingFactory) AsCancelled() *BookingFactory {
	f.status = "cancelled"
	return f
}

// Build creates the Booking instance
func (f *BookingFactory) Build() map[string]interface{} {
	booking := map[string]interface{}{
		"business_id": f.businessID,
		"service_id":  f.serviceID,
		"customer_id": f.customerID,
		"start_time":  f.startTime,
		"end_time":    f.endTime,
		"status":      f.status,
		"created_at":  f.createdAt,
		"updated_at":  f.updatedAt,
	}

	// Only set ID if explicitly provided
	if f.id != "" {
		booking["id"] = f.id
	}

	return booking
}

// ServiceFactory creates test Service instances
type ServiceFactory struct {
	id          string
	businessID  string
	name        string
	description string
	duration    int // in minutes
	price       int64 // in cents
	currency    string
	isActive    bool
	createdAt   time.Time
	updatedAt   time.Time
}

// NewServiceFactory creates a new ServiceFactory with default values
func NewServiceFactory() *ServiceFactory {
	now := time.Now()
	return &ServiceFactory{
		businessID:  NewUUID(),
		name:        "Test Service",
		description: "A test service for testing purposes",
		duration:    60,    // 1 hour
		price:       10000, // $100.00
		currency:    "USD",
		isActive:    true,
		createdAt:   now,
		updatedAt:   now,
	}
}

// WithID sets a specific ID for the service
func (f *ServiceFactory) WithID(id string) *ServiceFactory {
	f.id = id
	return f
}

// WithBusinessID sets the business ID for the service
func (f *ServiceFactory) WithBusinessID(businessID string) *ServiceFactory {
	f.businessID = businessID
	return f
}

// WithName sets the name for the service
func (f *ServiceFactory) WithName(name string) *ServiceFactory {
	f.name = name
	return f
}

// WithDuration sets the duration for the service (in minutes)
func (f *ServiceFactory) WithDuration(minutes int) *ServiceFactory {
	f.duration = minutes
	return f
}

// WithPrice sets the price for the service (in cents)
func (f *ServiceFactory) WithPrice(cents int64) *ServiceFactory {
	f.price = cents
	return f
}

// AsInactive configures the service as inactive
func (f *ServiceFactory) AsInactive() *ServiceFactory {
	f.isActive = false
	return f
}

// Build creates the Service instance
func (f *ServiceFactory) Build() map[string]interface{} {
	service := map[string]interface{}{
		"business_id": f.businessID,
		"name":        f.name,
		"description": f.description,
		"duration":    f.duration,
		"price":       f.price,
		"currency":    f.currency,
		"is_active":   f.isActive,
		"created_at":  f.createdAt,
		"updated_at":  f.updatedAt,
	}

	// Only set ID if explicitly provided
	if f.id != "" {
		service["id"] = f.id
	}

	return service
}

// CreateUserRequest factory for API request testing
func NewCreateUserRequest() map[string]interface{} {
	return map[string]interface{}{
		"email":     NewTestEmail(),
		"password":  "Password123!",
		"firstName": "Test",
		"lastName":  "User",
	}
}

// CreateBusinessRequest factory for API request testing
func NewCreateBusinessRequest() map[string]interface{} {
	return map[string]interface{}{
		"name": "Test Business",
	}
}

// CreateBookingRequest factory for API request testing
func NewCreateBookingRequest() map[string]interface{} {
	startTime := time.Now().Add(24 * time.Hour)
	return map[string]interface{}{
		"serviceId":  NewUUID(),
		"customerId": NewUUID(),
		"startTime":  startTime.Format(time.RFC3339),
		"endTime":    startTime.Add(time.Hour).Format(time.RFC3339),
	}
}
