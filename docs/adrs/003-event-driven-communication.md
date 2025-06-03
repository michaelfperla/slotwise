# ADR-003: Event-Driven Communication with NATS

## Status

**Accepted** - June 7, 2025

## Context

SlotWise requires communication between microservices for various business
processes like booking confirmations, payment processing, notifications, and
data synchronization. We need to choose a messaging system that supports our
event-driven architecture requirements.

### Current Situation

- Multiple microservices need to communicate asynchronously
- Business processes span multiple services (booking → payment → notification)
- Need to maintain loose coupling between services
- Require reliable message delivery and processing
- Want to support event sourcing patterns for critical domains

### Requirements

1. **Reliability**: Messages must be delivered reliably
2. **Performance**: Low latency and high throughput
3. **Scalability**: Handle growing message volume
4. **Durability**: Persist messages for replay and recovery
5. **Ordering**: Maintain message order when needed
6. **Clustering**: Support high availability deployments
7. **Ecosystem**: Good Go and TypeScript client libraries
8. **Operational**: Simple to deploy and monitor

## Decision

We will use **NATS JetStream** as our primary messaging system for event-driven
communication between SlotWise microservices.

### Implementation Details

#### NATS Configuration

```yaml
# nats-server.conf
jetstream: {
  store_dir: "/data/jetstream"
  max_memory_store: 1GB
  max_file_store: 10GB
}

cluster: {
  name: "slotwise"
  listen: "0.0.0.0:6222"
  routes: [
    "nats://nats-1:6222"
    "nats://nats-2:6222"
    "nats://nats-3:6222"
  ]
}
```

#### Event Schema Standards

```go
// Base event structure following CloudEvents spec
type BaseEvent struct {
    ID              string            `json:"id"`
    Source          string            `json:"source"`
    SpecVersion     string            `json:"specversion"`
    Type            string            `json:"type"`
    Subject         string            `json:"subject"`
    Time            time.Time         `json:"time"`
    DataContentType string            `json:"datacontenttype"`
    Data            interface{}       `json:"data"`
    CorrelationID   string            `json:"correlationid"`
    CausationID     string            `json:"causationid"`
}

// Domain-specific event
type BookingConfirmedEvent struct {
    BaseEvent
    Data BookingConfirmedData `json:"data"`
}

type BookingConfirmedData struct {
    BookingID  string    `json:"bookingId"`
    CustomerID string    `json:"customerId"`
    BusinessID string    `json:"businessId"`
    StartTime  time.Time `json:"startTime"`
    Amount     int64     `json:"amount"`
}
```

#### Subject Naming Convention

```
{environment}.{domain}.{entity}.{action}.{version}

Examples:
- prod.booking.appointment.confirmed.v1
- dev.payment.transaction.completed.v1
- staging.auth.user.created.v1
```

#### Publisher Implementation

```go
type EventPublisher interface {
    Publish(ctx context.Context, subject string, event interface{}) error
    PublishAsync(ctx context.Context, subject string, event interface{}) error
}

type natsEventPublisher struct {
    js     nats.JetStreamContext
    logger logger.Logger
}

func (p *natsEventPublisher) Publish(ctx context.Context, subject string, event interface{}) error {
    data, err := json.Marshal(event)
    if err != nil {
        return fmt.Errorf("failed to marshal event: %w", err)
    }

    _, err = p.js.Publish(subject, data)
    if err != nil {
        p.logger.Error("Failed to publish event", err,
            logger.Field("subject", subject),
        )
        return fmt.Errorf("failed to publish event: %w", err)
    }

    return nil
}
```

#### Subscriber Implementation

```go
type EventSubscriber interface {
    Subscribe(subject string, handler EventHandler) error
    SubscribeQueue(subject, queue string, handler EventHandler) error
}

type EventHandler func(ctx context.Context, event *BaseEvent) error

func (s *natsEventSubscriber) Subscribe(subject string, handler EventHandler) error {
    _, err := s.js.Subscribe(subject, func(msg *nats.Msg) {
        var event BaseEvent
        if err := json.Unmarshal(msg.Data, &event); err != nil {
            s.logger.Error("Failed to unmarshal event", err)
            msg.Nak()
            return
        }

        ctx := context.Background()
        if err := handler(ctx, &event); err != nil {
            s.logger.Error("Event handler failed", err)
            msg.Nak()
            return
        }

        msg.Ack()
    }, nats.Durable("service-name"))

    return err
}
```

### Stream Configuration

```go
// Configure streams for different domains
streams := []nats.StreamConfig{
    {
        Name:     "BOOKING_EVENTS",
        Subjects: []string{"*.booking.*.*.*"},
        Storage:  nats.FileStorage,
        MaxAge:   30 * 24 * time.Hour, // 30 days
    },
    {
        Name:     "PAYMENT_EVENTS",
        Subjects: []string{"*.payment.*.*.*"},
        Storage:  nats.FileStorage,
        MaxAge:   90 * 24 * time.Hour, // 90 days for compliance
    },
    {
        Name:     "NOTIFICATION_EVENTS",
        Subjects: []string{"*.notification.*.*.*"},
        Storage:  nats.MemoryStorage,
        MaxAge:   24 * time.Hour, // 1 day
    },
}
```

## Consequences

### Positive

- ✅ **High Performance**: NATS is extremely fast with low latency
- ✅ **Reliability**: JetStream provides message persistence and delivery
  guarantees
- ✅ **Simplicity**: Simple to deploy and operate compared to Kafka
- ✅ **Lightweight**: Minimal resource footprint
- ✅ **Cloud Native**: Designed for cloud-native and Kubernetes environments
- ✅ **Clustering**: Built-in clustering for high availability
- ✅ **Ecosystem**: Excellent Go client library, good TypeScript support
- ✅ **Flexibility**: Supports pub/sub, request/reply, and queue patterns
- ✅ **Observability**: Good monitoring and metrics capabilities

### Negative

- ❌ **Ecosystem Maturity**: Smaller ecosystem compared to Kafka
- ❌ **Complex Queries**: Limited query capabilities compared to event stores
- ❌ **Learning Curve**: Team needs to learn NATS-specific concepts
- ❌ **Persistence Limits**: JetStream storage limits vs unlimited Kafka
  retention
- ❌ **Tooling**: Fewer third-party tools compared to Kafka ecosystem

### Mitigation Strategies

- Provide comprehensive NATS training for the team
- Implement proper monitoring and alerting for NATS clusters
- Create standardized event publishing/subscribing libraries
- Document event schemas and communication patterns
- Plan for data retention and archival strategies

## Alternatives Considered

### 1. Apache Kafka

```yaml
# Kafka would require more complex setup
kafka:
  brokers: ['kafka-1:9092', 'kafka-2:9092', 'kafka-3:9092']
  topics:
    booking-events:
      partitions: 3
      replication: 3
```

**Rejected because:**

- Higher operational complexity
- Larger resource footprint
- Overkill for our current scale
- More complex client libraries
- Requires ZooKeeper (additional complexity)

### 2. Redis Streams

```go
// Redis Streams for event streaming
client.XAdd(ctx, &redis.XAddArgs{
    Stream: "booking-events",
    Values: map[string]interface{}{
        "event": eventJSON,
    },
})
```

**Rejected because:**

- Limited clustering capabilities
- Memory-based storage concerns
- Less mature streaming features
- Not designed primarily for messaging

### 3. RabbitMQ

```go
// RabbitMQ with AMQP
ch.Publish("booking-exchange", "booking.confirmed", false, false, amqp.Publishing{
    ContentType: "application/json",
    Body:        eventJSON,
})
```

**Rejected because:**

- More complex routing and exchange concepts
- Higher memory usage
- Less cloud-native design
- More operational overhead

### 4. AWS EventBridge / Google Pub/Sub

```go
// Cloud-managed event services
pubsubClient.Topic("booking-events").Publish(ctx, &pubsub.Message{
    Data: eventJSON,
})
```

**Rejected because:**

- Vendor lock-in concerns
- Higher costs at scale
- Less control over infrastructure
- Latency concerns for cross-region

## Implementation Plan

### Phase 1: Infrastructure Setup (Week 1)

- Deploy NATS cluster in development environment
- Configure JetStream with initial streams
- Set up monitoring and alerting

### Phase 2: Core Libraries (Week 2)

- Implement event publisher/subscriber libraries
- Create event schema validation
- Build testing utilities for events

### Phase 3: Service Integration (Weeks 3-4)

- Integrate auth service with NATS
- Implement booking confirmation flow
- Add payment event processing

### Phase 4: Advanced Patterns (Weeks 5-6)

- Implement saga patterns for complex workflows
- Add event sourcing for critical domains
- Create event replay capabilities

## Monitoring and Operations

### Key Metrics

- Message throughput (messages/second)
- Message latency (publish to consume)
- Consumer lag (pending messages)
- Error rates (failed message processing)
- Stream storage usage

### Alerting Rules

```yaml
alerts:
  - name: HighMessageLag
    condition: consumer_lag > 1000
    severity: warning

  - name: MessageProcessingErrors
    condition: error_rate > 5%
    severity: critical

  - name: NATSClusterDown
    condition: nats_servers_available < 2
    severity: critical
```

### Operational Procedures

- Stream backup and recovery procedures
- Consumer group rebalancing
- Message replay procedures
- Performance tuning guidelines

## Security Considerations

### Authentication and Authorization

```go
// NATS authentication with JWT
natsOptions := []nats.Option{
    nats.UserJWT("path/to/user.jwt", "path/to/user.nkey"),
    nats.RootCAs("path/to/ca.pem"),
}
```

### Message Encryption

- Use TLS for transport encryption
- Consider message-level encryption for sensitive data
- Implement proper key management

## Testing Strategy

### Unit Testing

```go
func TestEventPublisher_Publish_Success(t *testing.T) {
    mockJS := &MockJetStream{}
    publisher := NewEventPublisher(mockJS, logger.New("test"))

    event := BookingConfirmedEvent{...}
    err := publisher.Publish(context.Background(), "test.booking.confirmed.v1", event)

    assert.NoError(t, err)
    mockJS.AssertExpectations(t)
}
```

### Integration Testing

- Test with real NATS server in CI
- Verify message delivery and ordering
- Test error scenarios and recovery

## References

- [NATS Documentation](https://docs.nats.io/)
- [JetStream Documentation](https://docs.nats.io/jetstream)
- [CloudEvents Specification](https://cloudevents.io/)
- [Event-Driven Architecture Patterns](https://microservices.io/patterns/data/event-driven-architecture.html)

---

**Decision Made By**: Architecture Team **Date**: June 7, 2025 **Next Review**:
September 7, 2025
