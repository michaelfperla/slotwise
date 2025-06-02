# SlotWise Event-Driven Architecture

## Overview

SlotWise implements an event-driven architecture using NATS.io as the message broker. This approach enables loose coupling between services, improved scalability, and better fault tolerance.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │ Business Service│    │Scheduling Service│
│     (Go)        │    │   (Node.js)     │    │     (Go)        │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      NATS.io            │
                    │   Message Broker        │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Notification Service    │
                    │     (Node.js)           │
                    └─────────────────────────┘
```

## Event Flow Patterns

### 1. Command-Event Pattern

Services publish events after successfully completing operations:

```
User Action → Service → Database Update → Event Published → Other Services React
```

### 2. Event Sourcing Pattern

Critical business events are stored as an immutable log:

```
Event → Event Store → Projections → Read Models
```

### 3. Saga Pattern

Complex business processes span multiple services:

```
Process Start → Service A → Event → Service B → Event → Service C → Process Complete
```

## Event Types and Schemas

### User Events

#### user.created
```json
{
  "id": "evt_123",
  "type": "user.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0",
  "source": "auth-service",
  "correlationId": "corr_456",
  "data": {
    "userId": "user_789",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "business_owner"
  }
}
```

#### user.updated
```json
{
  "id": "evt_124",
  "type": "user.updated",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0",
  "source": "auth-service",
  "data": {
    "userId": "user_789",
    "changes": {
      "firstName": "Jane",
      "lastName": "Smith"
    }
  }
}
```

### Business Events

#### business.created
```json
{
  "id": "evt_125",
  "type": "business.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0",
  "source": "business-service",
  "data": {
    "businessId": "biz_101",
    "name": "Acme Consulting",
    "subdomain": "acme-consulting",
    "ownerId": "user_789"
  }
}
```

#### service.created
```json
{
  "id": "evt_126",
  "type": "service.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0",
  "source": "business-service",
  "data": {
    "serviceId": "svc_202",
    "businessId": "biz_101",
    "name": "Strategy Session",
    "duration": 60,
    "price": 150.00
  }
}
```

### Booking Events

#### booking.created
```json
{
  "id": "evt_127",
  "type": "booking.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0",
  "source": "scheduling-service",
  "data": {
    "bookingId": "booking_303",
    "businessId": "biz_101",
    "serviceId": "svc_202",
    "clientId": "client_404",
    "startTime": "2024-01-15T14:00:00Z",
    "endTime": "2024-01-15T15:00:00Z",
    "totalAmount": 150.00,
    "requiresPayment": true
  }
}
```

#### booking.confirmed
```json
{
  "id": "evt_128",
  "type": "booking.confirmed",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0",
  "source": "scheduling-service",
  "data": {
    "bookingId": "booking_303",
    "businessId": "biz_101",
    "serviceId": "svc_202",
    "clientId": "client_404",
    "startTime": "2024-01-15T14:00:00Z",
    "endTime": "2024-01-15T15:00:00Z"
  }
}
```

### Payment Events

#### payment.succeeded
```json
{
  "id": "evt_129",
  "type": "payment.succeeded",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0",
  "source": "payment-service",
  "data": {
    "paymentId": "pay_505",
    "paymentIntentId": "pi_stripe_123",
    "bookingId": "booking_303",
    "businessId": "biz_101",
    "clientId": "client_404",
    "amount": 150.00,
    "currency": "USD",
    "method": "card"
  }
}
```

### Notification Events

#### notification.sent
```json
{
  "id": "evt_130",
  "type": "notification.sent",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0",
  "source": "notification-service",
  "data": {
    "notificationId": "notif_606",
    "recipientId": "client_404",
    "type": "booking_confirmation",
    "channel": "email",
    "status": "sent"
  }
}
```

## Event Handlers and Subscriptions

### Booking Service Event Handlers

```go
// Go example - Scheduling Service
func (s *BookingService) HandlePaymentSucceeded(event PaymentSucceededEvent) error {
    booking, err := s.repo.GetBooking(event.Data.BookingId)
    if err != nil {
        return err
    }
    
    booking.PaymentStatus = "paid"
    booking.Status = "confirmed"
    
    err = s.repo.UpdateBooking(booking)
    if err != nil {
        return err
    }
    
    // Publish booking confirmed event
    confirmEvent := BookingConfirmedEvent{
        BookingId: booking.ID,
        BusinessId: booking.BusinessId,
        ClientId: booking.ClientId,
    }
    
    return s.eventPublisher.Publish("booking.confirmed", confirmEvent)
}
```

### Notification Service Event Handlers

```typescript
// TypeScript example - Notification Service
class NotificationEventHandler {
  async handleBookingCreated(event: BookingCreatedEvent): Promise<void> {
    const notification = {
      recipientId: event.data.clientId,
      type: 'booking_confirmation',
      channel: 'email',
      templateId: 'booking_confirmation_template',
      templateData: {
        bookingId: event.data.bookingId,
        startTime: event.data.startTime,
        serviceName: await this.getServiceName(event.data.serviceId)
      }
    };
    
    await this.notificationService.sendNotification(notification);
  }
  
  async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const notification = {
      recipientId: event.data.clientId,
      type: 'payment_failed',
      channel: 'email',
      templateId: 'payment_failed_template',
      templateData: {
        bookingId: event.data.bookingId,
        amount: event.data.amount,
        failureReason: event.data.failureReason
      }
    };
    
    await this.notificationService.sendNotification(notification);
  }
}
```

## NATS Configuration

### Development Configuration

```conf
# nats.conf
server_name: "slotwise-nats-dev"
port: 4222
http_port: 8222

jetstream {
    store_dir: "/data/jetstream"
    max_memory_store: 1GB
    max_file_store: 10GB
}

log_file: "/dev/stdout"
logtime: true
```

### Production Configuration

```conf
# nats-prod.conf
server_name: "slotwise-nats-prod"
port: 4222
http_port: 8222

# Clustering for high availability
cluster {
  name: "slotwise-cluster"
  listen: 0.0.0.0:6222
  routes = [
    nats-route://nats-1:6222
    nats-route://nats-2:6222
    nats-route://nats-3:6222
  ]
}

# JetStream for persistence
jetstream {
    store_dir: "/data/jetstream"
    max_memory_store: 4GB
    max_file_store: 100GB
    
    # Domain for multi-tenancy
    domain: "slotwise-prod"
}

# TLS configuration
tls {
  cert_file: "/etc/nats/certs/server.crt"
  key_file: "/etc/nats/certs/server.key"
  ca_file: "/etc/nats/certs/ca.crt"
  verify: true
}
```

## Event Publishing Patterns

### Transactional Outbox Pattern

Ensure events are published reliably with database transactions:

```typescript
// TypeScript example
async function createBusinessWithEvent(businessData: CreateBusinessData): Promise<Business> {
  return await this.prisma.$transaction(async (tx) => {
    // 1. Create business
    const business = await tx.business.create({
      data: businessData
    });
    
    // 2. Store event in outbox
    await tx.outboxEvent.create({
      data: {
        eventType: 'business.created',
        aggregateId: business.id,
        eventData: {
          businessId: business.id,
          name: business.name,
          ownerId: business.ownerId
        },
        status: 'pending'
      }
    });
    
    return business;
  });
}

// Background process publishes events from outbox
async function processOutboxEvents(): Promise<void> {
  const pendingEvents = await this.prisma.outboxEvent.findMany({
    where: { status: 'pending' },
    take: 100
  });
  
  for (const event of pendingEvents) {
    try {
      await this.eventPublisher.publish(event.eventType, event.eventData);
      
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'published', publishedAt: new Date() }
      });
    } catch (error) {
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { 
          status: 'failed', 
          failureReason: error.message,
          retryCount: { increment: 1 }
        }
      });
    }
  }
}
```

## Error Handling and Retry Logic

### Dead Letter Queue Pattern

```typescript
class EventProcessor {
  async processEvent(event: DomainEvent): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await this.handleEvent(event);
        return; // Success
      } catch (error) {
        retryCount++;
        
        if (retryCount >= maxRetries) {
          // Send to dead letter queue
          await this.sendToDeadLetterQueue(event, error);
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await this.sleep(delay);
      }
    }
  }
  
  private async sendToDeadLetterQueue(event: DomainEvent, error: Error): Promise<void> {
    await this.eventPublisher.publish('dlq.failed_event', {
      originalEvent: event,
      error: error.message,
      timestamp: new Date(),
      retryCount: 3
    });
  }
}
```

## Monitoring and Observability

### Event Metrics

Track important event metrics:

- Event publishing rate
- Event processing latency
- Failed event count
- Dead letter queue size
- Consumer lag

### Event Tracing

Use correlation IDs to trace events across services:

```typescript
class EventPublisher {
  async publish(eventType: string, data: any, correlationId?: string): Promise<void> {
    const event = {
      id: nanoid(),
      type: eventType,
      timestamp: new Date(),
      version: '1.0',
      source: this.serviceName,
      correlationId: correlationId || nanoid(),
      data
    };
    
    // Add tracing headers
    const headers = {
      'correlation-id': event.correlationId,
      'event-id': event.id,
      'source-service': this.serviceName
    };
    
    await this.natsConnection.publish(
      `slotwise.${eventType}`,
      JSON.stringify(event),
      { headers }
    );
    
    this.logger.info('Event published', {
      eventType,
      eventId: event.id,
      correlationId: event.correlationId
    });
  }
}
```

## Best Practices

### Event Design

1. **Immutable Events**: Events should never be modified after creation
2. **Backward Compatibility**: Use versioning for event schema changes
3. **Idempotency**: Event handlers should be idempotent
4. **Small Events**: Keep event payloads small and focused
5. **Clear Naming**: Use descriptive, past-tense event names

### Performance Optimization

1. **Batch Processing**: Process events in batches when possible
2. **Parallel Processing**: Use multiple consumers for high-throughput topics
3. **Caching**: Cache frequently accessed data to reduce database load
4. **Connection Pooling**: Reuse NATS connections across requests

### Security Considerations

1. **Event Encryption**: Encrypt sensitive data in events
2. **Access Control**: Implement proper authorization for event topics
3. **Audit Logging**: Log all event publishing and consumption
4. **Data Privacy**: Avoid including PII in events when possible

## Testing Event-Driven Systems

### Unit Testing Event Handlers

```typescript
describe('BookingEventHandler', () => {
  it('should send confirmation email when booking is created', async () => {
    // Arrange
    const event = createBookingCreatedEvent();
    const mockNotificationService = jest.fn();
    
    // Act
    await handler.handleBookingCreated(event);
    
    // Assert
    expect(mockNotificationService).toHaveBeenCalledWith({
      recipientId: event.data.clientId,
      type: 'booking_confirmation',
      channel: 'email'
    });
  });
});
```

### Integration Testing

```typescript
describe('Booking Flow Integration', () => {
  it('should complete full booking flow with events', async () => {
    // Create booking
    const booking = await bookingService.createBooking(bookingData);
    
    // Wait for events to be processed
    await waitForEvent('booking.created');
    
    // Simulate payment success
    await publishEvent('payment.succeeded', { bookingId: booking.id });
    
    // Verify booking is confirmed
    await waitForEvent('booking.confirmed');
    const updatedBooking = await bookingService.getBooking(booking.id);
    expect(updatedBooking.status).toBe('confirmed');
  });
});
```

This event-driven architecture provides SlotWise with the flexibility to scale individual services, maintain loose coupling, and ensure reliable message delivery across the entire platform.
