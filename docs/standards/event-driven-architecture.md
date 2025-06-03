# Event-Driven Architecture Standards

## 🎯 Overview

This document defines the event-driven architecture standards for SlotWise, ensuring consistent event design, messaging patterns, and integration strategies across all microservices.

## 🏗️ Core Principles

### 1. Event-First Design
- Events represent business facts that have occurred
- Events are immutable and append-only
- Services communicate primarily through events
- Loose coupling between services

### 2. NATS Messaging Patterns
- Publish-Subscribe for event broadcasting
- Request-Reply for synchronous communication
- Queue Groups for load balancing
- Streams for event persistence and replay

### 3. Event Sourcing (Selective)
- Critical business domains use event sourcing
- Events as the source of truth
- State derived from event history
- Temporal queries and audit trails

## 📨 Event Standards

### 1. Event Structure
All events must follow the CloudEvents specification:

```go
type BaseEvent struct {
    // CloudEvents standard fields
    ID              string            `json:"id"`              // Unique event identifier
    Source          string            `json:"source"`          // Event source (service name)
    SpecVersion     string            `json:"specversion"`     // CloudEvents version
    Type            string            `json:"type"`            // Event type
    Subject         string            `json:"subject"`         // Event subject (resource ID)
    Time            time.Time         `json:"time"`            // Event timestamp
    DataContentType string            `json:"datacontenttype"` // Content type of data
    Data            interface{}       `json:"data"`            // Event payload
    
    // SlotWise extensions
    CorrelationID   string            `json:"correlationid"`   // Request correlation
    CausationID     string            `json:"causationid"`     // Causing event ID
    Version         string            `json:"version"`         // Event schema version
    Metadata        map[string]string `json:"metadata"`        // Additional metadata
}
```

### 2. Event Naming Convention
```
{domain}.{entity}.{action}.{version}

Examples:
- auth.user.created.v1
- booking.appointment.confirmed.v1
- payment.transaction.completed.v1
- business.service.updated.v1
```

### 3. Event Types

#### **Domain Events** (Business Facts)
```go
type UserCreatedEvent struct {
    BaseEvent
    Data UserCreatedData `json:"data"`
}

type UserCreatedData struct {
    UserID      string    `json:"userId"`
    Email       string    `json:"email"`
    Role        string    `json:"role"`
    BusinessID  *string   `json:"businessId,omitempty"`
    CreatedAt   time.Time `json:"createdAt"`
}
```

#### **Integration Events** (Cross-Service Communication)
```go
type BookingConfirmedEvent struct {
    BaseEvent
    Data BookingConfirmedData `json:"data"`
}

type BookingConfirmedData struct {
    BookingID   string    `json:"bookingId"`
    CustomerID  string    `json:"customerId"`
    BusinessID  string    `json:"businessId"`
    ServiceID   string    `json:"serviceId"`
    StartTime   time.Time `json:"startTime"`
    EndTime     time.Time `json:"endTime"`
    Amount      int64     `json:"amount"`
    Currency    string    `json:"currency"`
}
```

#### **Command Events** (Action Requests)
```go
type SendEmailCommand struct {
    BaseEvent
    Data SendEmailData `json:"data"`
}

type SendEmailData struct {
    To       string            `json:"to"`
    Template string            `json:"template"`
    Data     map[string]string `json:"data"`
    Priority string            `json:"priority"`
}
```

## 🔄 NATS Patterns

### 1. Subject Naming Convention
```
{environment}.{domain}.{entity}.{action}.{version}

Examples:
- prod.auth.user.created.v1
- dev.booking.appointment.confirmed.v1
- staging.payment.transaction.failed.v1
```

### 2. Publisher Implementation
```go
type EventPublisher interface {
    Publish(ctx context.Context, subject string, event interface{}) error
    PublishAsync(ctx context.Context, subject string, event interface{}) error
}

type natsEventPublisher struct {
    conn   *nats.Conn
    js     nats.JetStreamContext
    logger logger.Logger
}

func (p *natsEventPublisher) Publish(ctx context.Context, subject string, event interface{}) error {
    // Add correlation ID from context
    if baseEvent, ok := event.(*BaseEvent); ok {
        if correlationID := ctx.Value("correlationID"); correlationID != nil {
            baseEvent.CorrelationID = correlationID.(string)
        }
    }
    
    data, err := json.Marshal(event)
    if err != nil {
        return fmt.Errorf("failed to marshal event: %w", err)
    }
    
    // Publish to JetStream for persistence
    _, err = p.js.Publish(subject, data)
    if err != nil {
        p.logger.Error("Failed to publish event", err,
            logger.Field("subject", subject),
            logger.Field("event", event),
        )
        return fmt.Errorf("failed to publish event: %w", err)
    }
    
    p.logger.Info("Event published",
        logger.Field("subject", subject),
        logger.Field("eventId", getEventID(event)),
    )
    
    return nil
}
```

### 3. Subscriber Implementation
```go
type EventSubscriber interface {
    Subscribe(subject string, handler EventHandler) error
    SubscribeQueue(subject, queue string, handler EventHandler) error
}

type EventHandler func(ctx context.Context, event *BaseEvent) error

func (s *natsEventSubscriber) Subscribe(subject string, handler EventHandler) error {
    _, err := s.js.Subscribe(subject, func(msg *nats.Msg) {
        ctx := context.Background()
        
        var event BaseEvent
        if err := json.Unmarshal(msg.Data, &event); err != nil {
            s.logger.Error("Failed to unmarshal event", err)
            msg.Nak()
            return
        }
        
        // Add correlation ID to context
        if event.CorrelationID != "" {
            ctx = context.WithValue(ctx, "correlationID", event.CorrelationID)
        }
        
        if err := handler(ctx, &event); err != nil {
            s.logger.Error("Event handler failed", err,
                logger.Field("subject", subject),
                logger.Field("eventId", event.ID),
            )
            msg.Nak()
            return
        }
        
        msg.Ack()
    }, nats.Durable("service-name"))
    
    return err
}
```

## 🔄 Event Sourcing Patterns

### 1. Aggregate Root
```go
type BookingAggregate struct {
    ID       string
    Version  int
    Events   []DomainEvent
    State    BookingState
}

func (a *BookingAggregate) CreateBooking(cmd CreateBookingCommand) error {
    // Business logic validation
    if err := a.validateCreateBooking(cmd); err != nil {
        return err
    }
    
    // Create domain event
    event := BookingCreatedEvent{
        BaseEvent: BaseEvent{
            ID:      uuid.New().String(),
            Type:    "booking.created.v1",
            Source:  "booking-service",
            Subject: cmd.BookingID,
            Time:    time.Now(),
        },
        Data: BookingCreatedData{
            BookingID:  cmd.BookingID,
            CustomerID: cmd.CustomerID,
            ServiceID:  cmd.ServiceID,
            StartTime:  cmd.StartTime,
            EndTime:    cmd.EndTime,
        },
    }
    
    // Apply event to aggregate
    a.Apply(event)
    return nil
}

func (a *BookingAggregate) Apply(event DomainEvent) {
    switch e := event.(type) {
    case BookingCreatedEvent:
        a.State.ID = e.Data.BookingID
        a.State.Status = BookingStatusPending
        a.State.CreatedAt = e.Time
    case BookingConfirmedEvent:
        a.State.Status = BookingStatusConfirmed
        a.State.ConfirmedAt = &e.Time
    }
    
    a.Events = append(a.Events, event)
    a.Version++
}
```

### 2. Event Store
```go
type EventStore interface {
    SaveEvents(ctx context.Context, aggregateID string, events []DomainEvent, expectedVersion int) error
    GetEvents(ctx context.Context, aggregateID string) ([]DomainEvent, error)
    GetEventsFromVersion(ctx context.Context, aggregateID string, version int) ([]DomainEvent, error)
}

type postgresEventStore struct {
    db *gorm.DB
}

func (s *postgresEventStore) SaveEvents(ctx context.Context, aggregateID string, events []DomainEvent, expectedVersion int) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // Check current version
        var currentVersion int
        err := tx.Raw("SELECT COALESCE(MAX(version), 0) FROM events WHERE aggregate_id = ?", aggregateID).Scan(&currentVersion).Error
        if err != nil {
            return err
        }
        
        if currentVersion != expectedVersion {
            return ErrConcurrencyConflict
        }
        
        // Save events
        for i, event := range events {
            eventData, _ := json.Marshal(event)
            eventRecord := EventRecord{
                ID:          uuid.New().String(),
                AggregateID: aggregateID,
                EventType:   getEventType(event),
                EventData:   eventData,
                Version:     expectedVersion + i + 1,
                CreatedAt:   time.Now(),
            }
            
            if err := tx.Create(&eventRecord).Error; err != nil {
                return err
            }
        }
        
        return nil
    })
}
```

## 📊 Event Processing Patterns

### 1. Saga Pattern (Distributed Transactions)
```go
type BookingCreationSaga struct {
    steps []SagaStep
}

type SagaStep interface {
    Execute(ctx context.Context, data interface{}) error
    Compensate(ctx context.Context, data interface{}) error
}

func (s *BookingCreationSaga) Handle(ctx context.Context, event BookingCreatedEvent) error {
    sagaData := &BookingSagaData{
        BookingID:  event.Data.BookingID,
        CustomerID: event.Data.CustomerID,
        ServiceID:  event.Data.ServiceID,
    }
    
    for i, step := range s.steps {
        if err := step.Execute(ctx, sagaData); err != nil {
            // Compensate previous steps
            for j := i - 1; j >= 0; j-- {
                s.steps[j].Compensate(ctx, sagaData)
            }
            return err
        }
    }
    
    return nil
}
```

### 2. Event Projection (Read Models)
```go
type BookingProjection struct {
    repo BookingReadModelRepository
}

func (p *BookingProjection) Handle(ctx context.Context, event *BaseEvent) error {
    switch event.Type {
    case "booking.created.v1":
        return p.handleBookingCreated(ctx, event)
    case "booking.confirmed.v1":
        return p.handleBookingConfirmed(ctx, event)
    case "booking.cancelled.v1":
        return p.handleBookingCancelled(ctx, event)
    default:
        return nil // Ignore unknown events
    }
}

func (p *BookingProjection) handleBookingCreated(ctx context.Context, event *BaseEvent) error {
    var data BookingCreatedData
    if err := json.Unmarshal(event.Data.([]byte), &data); err != nil {
        return err
    }
    
    readModel := &BookingReadModel{
        ID:         data.BookingID,
        CustomerID: data.CustomerID,
        ServiceID:  data.ServiceID,
        Status:     "pending",
        CreatedAt:  event.Time,
    }
    
    return p.repo.Create(ctx, readModel)
}
```

## 🔒 Event Security

### 1. Event Encryption (Sensitive Data)
```go
type EncryptedEvent struct {
    BaseEvent
    EncryptedData string `json:"encryptedData"`
    KeyID         string `json:"keyId"`
}

func (p *eventPublisher) PublishEncrypted(ctx context.Context, subject string, event interface{}) error {
    // Encrypt sensitive data
    data, _ := json.Marshal(event)
    encryptedData, keyID, err := p.encryption.Encrypt(data)
    if err != nil {
        return err
    }
    
    encryptedEvent := EncryptedEvent{
        BaseEvent: BaseEvent{
            ID:     uuid.New().String(),
            Type:   "encrypted.event.v1",
            Source: p.serviceName,
            Time:   time.Now(),
        },
        EncryptedData: encryptedData,
        KeyID:         keyID,
    }
    
    return p.Publish(ctx, subject, encryptedEvent)
}
```

### 2. Event Authorization
```go
func (s *eventSubscriber) authorizeEvent(event *BaseEvent) error {
    // Check if service is authorized to receive this event type
    if !s.authz.CanReceive(s.serviceName, event.Type) {
        return ErrUnauthorized
    }
    
    // Check resource-level permissions
    if event.Subject != "" {
        if !s.authz.CanAccessResource(s.serviceName, event.Subject) {
            return ErrForbidden
        }
    }
    
    return nil
}
```

## 📊 Event Monitoring

### 1. Event Metrics
```go
var (
    eventsPublished = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "events_published_total",
            Help: "Total number of events published",
        },
        []string{"subject", "event_type", "status"},
    )
    
    eventProcessingDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "event_processing_duration_seconds",
            Help: "Event processing duration in seconds",
        },
        []string{"subject", "event_type", "handler"},
    )
)

func (h *eventHandler) Handle(ctx context.Context, event *BaseEvent) error {
    start := time.Now()
    defer func() {
        duration := time.Since(start).Seconds()
        eventProcessingDuration.WithLabelValues(
            event.Subject,
            event.Type,
            h.name,
        ).Observe(duration)
    }()
    
    // Process event
    return h.process(ctx, event)
}
```

### 2. Event Tracing
```go
func (p *eventPublisher) Publish(ctx context.Context, subject string, event interface{}) error {
    span, ctx := opentracing.StartSpanFromContext(ctx, "event.publish")
    defer span.Finish()
    
    span.SetTag("event.subject", subject)
    span.SetTag("event.type", getEventType(event))
    span.SetTag("event.id", getEventID(event))
    
    // Inject trace context into event
    if baseEvent, ok := event.(*BaseEvent); ok {
        carrier := opentracing.TextMapCarrier{}
        opentracing.GlobalTracer().Inject(span.Context(), opentracing.TextMap, carrier)
        
        if baseEvent.Metadata == nil {
            baseEvent.Metadata = make(map[string]string)
        }
        for key, value := range carrier {
            baseEvent.Metadata[key] = value
        }
    }
    
    return p.publish(ctx, subject, event)
}
```

## 🧪 Event Testing

### 1. Event Testing Patterns
```go
func TestUserService_CreateUser_PublishesUserCreatedEvent(t *testing.T) {
    // Arrange
    mockPublisher := &MockEventPublisher{}
    service := NewUserService(mockRepo, mockPublisher)
    
    // Act
    user, err := service.CreateUser(ctx, CreateUserRequest{
        Email: "test@example.com",
    })
    
    // Assert
    assert.NoError(t, err)
    assert.Len(t, mockPublisher.PublishedEvents, 1)
    
    event := mockPublisher.PublishedEvents[0]
    assert.Equal(t, "auth.user.created.v1", event.Type)
    assert.Equal(t, user.ID, event.Subject)
}
```

### 2. Integration Testing with Events
```go
func TestBookingFlow_EndToEnd(t *testing.T) {
    // Setup test environment with real NATS
    env := setupTestEnvironment(t)
    defer env.Cleanup()
    
    // Subscribe to events
    events := make(chan *BaseEvent, 10)
    env.SubscribeToAll(events)
    
    // Create booking
    booking := env.CreateBooking(userID, serviceID, startTime)
    
    // Wait for events
    select {
    case event := <-events:
        assert.Equal(t, "booking.created.v1", event.Type)
    case <-time.After(5 * time.Second):
        t.Fatal("Expected booking.created event not received")
    }
    
    // Confirm booking
    env.ConfirmBooking(booking.ID)
    
    // Wait for confirmation event
    select {
    case event := <-events:
        assert.Equal(t, "booking.confirmed.v1", event.Type)
    case <-time.After(5 * time.Second):
        t.Fatal("Expected booking.confirmed event not received")
    }
}
```

## 📋 Event Standards Checklist

### Event Design
- [ ] Follows CloudEvents specification
- [ ] Uses consistent naming convention
- [ ] Includes all required fields
- [ ] Properly versioned
- [ ] Immutable event data

### Implementation
- [ ] Proper error handling
- [ ] Correlation ID tracking
- [ ] Idempotent event processing
- [ ] Dead letter queue handling
- [ ] Retry mechanisms

### Monitoring
- [ ] Event metrics collected
- [ ] Distributed tracing enabled
- [ ] Error alerting configured
- [ ] Performance monitoring
- [ ] Event flow visualization

## 📚 Examples

See `examples/event-driven/` for:
- Complete event implementation examples
- Saga pattern implementations
- Event sourcing examples
- NATS configuration and setup
- Event testing patterns
