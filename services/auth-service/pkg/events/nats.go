package events

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"github.com/slotwise/auth-service/internal/config"
	"github.com/slotwise/auth-service/pkg/logger"
)

// Event represents a domain event
type Event struct {
	ID            string                 `json:"id"`
	Type          string                 `json:"type"`
	Source        string                 `json:"source"`
	Timestamp     time.Time              `json:"timestamp"`
	Version       string                 `json:"version"`
	Data          map[string]interface{} `json:"data"`
	CorrelationID string                 `json:"correlationId,omitempty"`
	CausationID   string                 `json:"causationId,omitempty"`
}

// Publisher defines the interface for publishing events
type Publisher interface {
	Publish(eventType string, data map[string]interface{}) error
	PublishWithCorrelation(eventType string, data map[string]interface{}, correlationID, causationID string) error
	Close() error
}

// Subscriber defines the interface for subscribing to events
type Subscriber interface {
	Subscribe(subject string, handler func(event *Event) error) error
	Unsubscribe(subject string) error
	Close() error
}

// Connection wraps NATS connection
type Connection struct {
	conn   *nats.Conn
	logger logger.Logger
}

// Connect establishes a connection to NATS
func Connect(cfg config.NATS) (*Connection, error) {
	conn, err := nats.Connect(cfg.URL,
		nats.ReconnectWait(2*time.Second),
		nats.MaxReconnects(-1),
		nats.PingInterval(30*time.Second),
		nats.MaxPingsOutstanding(3),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}

	return &Connection{
		conn:   conn,
		logger: logger.Default(),
	}, nil
}

// Close closes the NATS connection
func (c *Connection) Close() error {
	if c.conn != nil {
		c.conn.Close()
	}
	return nil
}

// IsConnected checks if the connection is active
func (c *Connection) IsConnected() bool {
	return c.conn != nil && c.conn.IsConnected()
}

// Publisher implementation
type publisher struct {
	conn   *nats.Conn
	source string
	logger logger.Logger
}

// NewPublisher creates a new event publisher
func NewPublisher(conn *Connection, logger logger.Logger) Publisher {
	return &publisher{
		conn:   conn.conn,
		source: "auth-service",
		logger: logger,
	}
}

// Publish publishes an event
func (p *publisher) Publish(eventType string, data map[string]interface{}) error {
	return p.PublishWithCorrelation(eventType, data, "", "")
}

// PublishWithCorrelation publishes an event with correlation and causation IDs
func (p *publisher) PublishWithCorrelation(eventType string, data map[string]interface{}, correlationID, causationID string) error {
	event := &Event{
		ID:            uuid.New().String(),
		Type:          eventType,
		Source:        p.source,
		Timestamp:     time.Now().UTC(),
		Version:       "1.0",
		Data:          data,
		CorrelationID: correlationID,
		CausationID:   causationID,
	}

	eventData, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	subject := fmt.Sprintf("slotwise.%s", eventType)
	if err := p.conn.Publish(subject, eventData); err != nil {
		return fmt.Errorf("failed to publish event: %w", err)
	}

	p.logger.Debug("Event published",
		"event_id", event.ID,
		"event_type", eventType,
		"subject", subject,
	)

	return nil
}

// Close closes the publisher
func (p *publisher) Close() error {
	return nil
}

// Subscriber implementation
type subscriber struct {
	conn          *nats.Conn
	logger        logger.Logger
	subscriptions map[string]*nats.Subscription
}

// NewSubscriber creates a new event subscriber
func NewSubscriber(conn *Connection, logger logger.Logger) Subscriber {
	return &subscriber{
		conn:          conn.conn,
		logger:        logger,
		subscriptions: make(map[string]*nats.Subscription),
	}
}

// Subscribe subscribes to events of a specific type
func (s *subscriber) Subscribe(subject string, handler func(event *Event) error) error {
	natsSubject := fmt.Sprintf("slotwise.%s", subject)

	sub, err := s.conn.Subscribe(natsSubject, func(msg *nats.Msg) {
		var event Event
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			s.logger.Error("Failed to unmarshal event", "error", err, "subject", natsSubject)
			return
		}

		s.logger.Debug("Event received",
			"event_id", event.ID,
			"event_type", event.Type,
			"subject", natsSubject,
		)

		if err := handler(&event); err != nil {
			s.logger.Error("Failed to handle event",
				"error", err,
				"event_id", event.ID,
				"event_type", event.Type,
			)
		}
	})

	if err != nil {
		return fmt.Errorf("failed to subscribe to subject %s: %w", natsSubject, err)
	}

	s.subscriptions[subject] = sub
	s.logger.Info("Subscribed to events", "subject", natsSubject)

	return nil
}

// Unsubscribe unsubscribes from events
func (s *subscriber) Unsubscribe(subject string) error {
	if sub, exists := s.subscriptions[subject]; exists {
		if err := sub.Unsubscribe(); err != nil {
			return fmt.Errorf("failed to unsubscribe from subject %s: %w", subject, err)
		}
		delete(s.subscriptions, subject)
		s.logger.Info("Unsubscribed from events", "subject", subject)
	}
	return nil
}

// Close closes all subscriptions
func (s *subscriber) Close() error {
	for subject := range s.subscriptions {
		s.Unsubscribe(subject)
	}
	return nil
}

// Event types for auth service
const (
	UserCreatedEvent         = "user.created"
	UserUpdatedEvent         = "user.updated"
	UserDeletedEvent         = "user.deleted"
	UserEmailVerifiedEvent   = "user.email.verified"
	UserPasswordChangedEvent = "user.password.changed"
	UserLoginEvent           = "user.login"
	UserLogoutEvent          = "user.logout"
	UserSessionCreatedEvent  = "user.session.created"
	UserSessionExpiredEvent  = "user.session.expired"

	// Business events
	BusinessRegisteredEvent = "business.registered"
	// Add other business events like BusinessUpdatedEvent, BusinessDeletedEvent etc. as needed
)

// Helper functions for creating event data

// CreateUserCreatedEventData creates event data for user creation
func CreateUserCreatedEventData(userID, email, firstName, lastName, role string) map[string]interface{} {
	return map[string]interface{}{
		"userId":    userID,
		"email":     email,
		"firstName": firstName,
		"lastName":  lastName,
		"role":      role,
	}
}

// CreateUserUpdatedEventData creates event data for user updates
func CreateUserUpdatedEventData(userID string, changes map[string]interface{}) map[string]interface{} {
	return map[string]interface{}{
		"userId":  userID,
		"changes": changes,
	}
}

// CreateUserDeletedEventData creates event data for user deletion
func CreateUserDeletedEventData(userID string) map[string]interface{} {
	return map[string]interface{}{
		"userId": userID,
	}
}

// CreateUserEmailVerifiedEventData creates event data for email verification
func CreateUserEmailVerifiedEventData(userID, email string) map[string]interface{} {
	return map[string]interface{}{
		"userId": userID,
		"email":  email,
	}
}

// CreateUserLoginEventData creates event data for user login
func CreateUserLoginEventData(userID, email, ipAddress, userAgent string) map[string]interface{} {
	return map[string]interface{}{
		"userId":    userID,
		"email":     email,
		"ipAddress": ipAddress,
		"userAgent": userAgent,
	}
}

// CreateBusinessRegisteredEventData creates event data for business registration
func CreateBusinessRegisteredEventData(businessID, ownerID, businessName string) map[string]interface{} {
	return map[string]interface{}{
		"businessId": businessID,
		"ownerId":    ownerID,
		"businessInfo": map[string]string{
			"name": businessName,
		},
	}
}

// CreateUserLogoutEventData creates event data for user logout
func CreateUserLogoutEventData(userID, sessionID string) map[string]interface{} {
	return map[string]interface{}{
		"userId":    userID,
		"sessionId": sessionID,
	}
}

// CreateUserSessionCreatedEventData creates event data for session creation
func CreateUserSessionCreatedEventData(userID, sessionID, ipAddress, userAgent string) map[string]interface{} {
	return map[string]interface{}{
		"userId":    userID,
		"sessionId": sessionID,
		"ipAddress": ipAddress,
		"userAgent": userAgent,
	}
}
