package events

import (
	"encoding/json"
	"fmt"

	"github.com/nats-io/nats.go"
	"github.com/slotwise/scheduling-service/internal/config"
	"github.com/slotwise/scheduling-service/pkg/logger"
)

// Publisher handles event publishing
type Publisher struct {
	conn   *nats.Conn
	logger *logger.Logger
}

// NullPublisher is a no-op publisher for development when NATS is not available
type NullPublisher struct {
	logger *logger.Logger
}

// Subscriber handles event subscriptions
type Subscriber struct {
	conn   *nats.Conn
	logger *logger.Logger
}

// Connect connects to NATS
func Connect(cfg config.NATSConfig) (*nats.Conn, error) {
	conn, err := nats.Connect(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}
	return conn, nil
}

// NewPublisher creates a new event publisher
func NewPublisher(conn *nats.Conn, logger *logger.Logger) *Publisher {
	return &Publisher{
		conn:   conn,
		logger: logger,
	}
}

// NewNullPublisher creates a new null publisher for development
func NewNullPublisher(logger *logger.Logger) *Publisher {
	return &Publisher{
		conn:   nil,
		logger: logger,
	}
}

// Publish publishes an event
func (p *Publisher) Publish(subject string, data interface{}) error {
	// Handle null publisher (development mode without NATS)
	if p.conn == nil {
		p.logger.Debug("Event publishing skipped (no NATS connection)", "subject", subject)
		return nil
	}

	payload, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal event data: %w", err)
	}

	if err := p.conn.Publish(subject, payload); err != nil {
		return fmt.Errorf("failed to publish event: %w", err)
	}

	p.logger.Debug("Published event", "subject", subject)
	return nil
}

// NewSubscriber creates a new event subscriber
func NewSubscriber(conn *nats.Conn, logger *logger.Logger) *Subscriber {
	return &Subscriber{
		conn:   conn,
		logger: logger,
	}
}

// Subscribe subscribes to events on a subject
func (s *Subscriber) Subscribe(subject string, handler func([]byte) error) error {
	_, err := s.conn.Subscribe(subject, func(msg *nats.Msg) {
		if err := handler(msg.Data); err != nil {
			s.logger.Error("Failed to handle event", "subject", subject, "error", err)
		}
	})

	if err != nil {
		return fmt.Errorf("failed to subscribe to subject %s: %w", subject, err)
	}

	s.logger.Debug("Subscribed to subject", "subject", subject)
	return nil
}

// Event Subjects
const (
	BookingRequestedEvent = "booking.requested"
	BookingConfirmedEvent = "booking.confirmed"
	BookingCancelledEvent = "booking.cancelled"
	SlotReservedEvent     = "slot.reserved"
	// AvailabilityRuleUpdatedEvent is published when availability rules change
	AvailabilityRuleUpdatedEvent = "availability.rule.updated"
	// Add other event subjects as needed
)
