// Event-driven architecture types for NATS messaging

export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  version: string;
  source: string;
  correlationId?: string;
  causationId?: string;
}

// User Events
export interface UserCreatedEvent extends BaseEvent {
  type: 'user.created';
  data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface UserUpdatedEvent extends BaseEvent {
  type: 'user.updated';
  data: {
    userId: string;
    changes: Record<string, any>;
  };
}

export interface UserDeletedEvent extends BaseEvent {
  type: 'user.deleted';
  data: {
    userId: string;
  };
}

// Business Events
export interface BusinessCreatedEvent extends BaseEvent {
  type: 'business.created';
  data: {
    businessId: string;
    name: string;
    subdomain: string;
    ownerId: string;
  };
}

export interface BusinessUpdatedEvent extends BaseEvent {
  type: 'business.updated';
  data: {
    businessId: string;
    changes: Record<string, any>;
  };
}

export interface ServiceCreatedEvent extends BaseEvent {
  type: 'service.created';
  data: {
    serviceId: string;
    businessId: string;
    name: string;
    duration: number;
    price: number;
  };
}

export interface ServiceUpdatedEvent extends BaseEvent {
  type: 'service.updated';
  data: {
    serviceId: string;
    businessId: string;
    changes: Record<string, any>;
  };
}

// Booking Events
export interface BookingCreatedEvent extends BaseEvent {
  type: 'booking.created';
  data: {
    bookingId: string;
    businessId: string;
    serviceId: string;
    clientId: string;
    startTime: Date;
    endTime: Date;
    totalAmount: number;
    requiresPayment: boolean;
  };
}

export interface BookingConfirmedEvent extends BaseEvent {
  type: 'booking.confirmed';
  data: {
    bookingId: string;
    businessId: string;
    serviceId: string;
    clientId: string;
    startTime: Date;
    endTime: Date;
  };
}

export interface BookingCancelledEvent extends BaseEvent {
  type: 'booking.cancelled';
  data: {
    bookingId: string;
    businessId: string;
    clientId: string;
    reason?: string;
    cancelledBy: string;
    refundAmount?: number;
  };
}

export interface BookingRescheduledEvent extends BaseEvent {
  type: 'booking.rescheduled';
  data: {
    bookingId: string;
    businessId: string;
    clientId: string;
    oldStartTime: Date;
    oldEndTime: Date;
    newStartTime: Date;
    newEndTime: Date;
  };
}

export interface BookingCompletedEvent extends BaseEvent {
  type: 'booking.completed';
  data: {
    bookingId: string;
    businessId: string;
    clientId: string;
    completedAt: Date;
  };
}

// Payment Events
export interface PaymentIntentCreatedEvent extends BaseEvent {
  type: 'payment.intent.created';
  data: {
    paymentIntentId: string;
    bookingId: string;
    businessId: string;
    clientId: string;
    amount: number;
    currency: string;
  };
}

export interface PaymentSucceededEvent extends BaseEvent {
  type: 'payment.succeeded';
  data: {
    paymentId: string;
    paymentIntentId: string;
    bookingId: string;
    businessId: string;
    clientId: string;
    amount: number;
    currency: string;
    method: string;
  };
}

export interface PaymentFailedEvent extends BaseEvent {
  type: 'payment.failed';
  data: {
    paymentIntentId: string;
    bookingId: string;
    businessId: string;
    clientId: string;
    amount: number;
    currency: string;
    failureReason: string;
  };
}

export interface PaymentRefundedEvent extends BaseEvent {
  type: 'payment.refunded';
  data: {
    paymentId: string;
    refundId: string;
    bookingId: string;
    businessId: string;
    amount: number;
    currency: string;
    reason?: string;
  };
}

// Notification Events
export interface NotificationSentEvent extends BaseEvent {
  type: 'notification.sent';
  data: {
    notificationId: string;
    recipientId: string;
    type: string;
    channel: string;
    status: string;
  };
}

export interface NotificationDeliveredEvent extends BaseEvent {
  type: 'notification.delivered';
  data: {
    notificationId: string;
    recipientId: string;
    deliveredAt: Date;
  };
}

export interface NotificationFailedEvent extends BaseEvent {
  type: 'notification.failed';
  data: {
    notificationId: string;
    recipientId: string;
    failureReason: string;
  };
}

// Availability Events
export interface AvailabilityUpdatedEvent extends BaseEvent {
  type: 'availability.updated';
  data: {
    businessId: string;
    serviceId?: string;
    changes: {
      rules?: any[];
      exceptions?: any[];
    };
  };
}

// Union type for all events
export type DomainEvent = 
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | BusinessCreatedEvent
  | BusinessUpdatedEvent
  | ServiceCreatedEvent
  | ServiceUpdatedEvent
  | BookingCreatedEvent
  | BookingConfirmedEvent
  | BookingCancelledEvent
  | BookingRescheduledEvent
  | BookingCompletedEvent
  | PaymentIntentCreatedEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | PaymentRefundedEvent
  | NotificationSentEvent
  | NotificationDeliveredEvent
  | NotificationFailedEvent
  | AvailabilityUpdatedEvent;

// Event handler interface
export interface EventHandler<T extends BaseEvent = BaseEvent> {
  handle(event: T): Promise<void>;
}

// Event publisher interface
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
}

// Event subscriber interface
export interface EventSubscriber {
  subscribe<T extends BaseEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): Promise<void>;
  unsubscribe(eventType: string): Promise<void>;
}
