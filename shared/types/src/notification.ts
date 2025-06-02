import { BaseEntity } from './index';

export interface Notification extends BaseEntity {
  recipientId: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  content: string;
  templateId?: string;
  templateData?: Record<string, any>;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  priority: NotificationPriority;
  externalId?: string; // ID from external service (SendGrid, Twilio)
}

export enum NotificationType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  BOOKING_REMINDER = 'booking_reminder',
  BOOKING_CANCELLATION = 'booking_cancellation',
  BOOKING_RESCHEDULED = 'booking_rescheduled',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  PAYMENT_FAILED = 'payment_failed',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  WELCOME = 'welcome',
  MARKETING = 'marketing'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationTemplate extends BaseEntity {
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  content: string;
  variables: string[]; // List of template variables
  isActive: boolean;
  businessId?: string; // If null, it's a system template
}

export interface CreateNotificationRequest {
  recipientId: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  content?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  priority?: NotificationPriority;
  scheduledFor?: Date;
}

export interface BulkNotificationRequest {
  recipientIds: string[];
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  content?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  priority?: NotificationPriority;
  scheduledFor?: Date;
}

export interface UserNotificationPreferences {
  userId: string;
  email: {
    enabled: boolean;
    types: NotificationType[];
  };
  sms: {
    enabled: boolean;
    types: NotificationType[];
    phoneNumber?: string;
  };
  push: {
    enabled: boolean;
    types: NotificationType[];
  };
  inApp: {
    enabled: boolean;
    types: NotificationType[];
  };
}

export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  averageDeliveryTime: number; // in seconds
  byChannel: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  byType: Record<NotificationType, {
    sent: number;
    delivered: number;
    failed: number;
  }>;
}

export interface EmailNotificationData {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  type: string;
  disposition?: 'attachment' | 'inline';
}

export interface SMSNotificationData {
  to: string;
  from?: string;
  body: string;
}

export interface NotificationWebhook {
  id: string;
  type: 'delivery' | 'bounce' | 'complaint' | 'click' | 'open';
  notificationId: string;
  timestamp: Date;
  data: Record<string, any>;
}
