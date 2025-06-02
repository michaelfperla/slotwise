import { BaseEntity } from './index';
import { PaymentMethodEnum } from './payment';

export interface Business extends BaseEntity {
  name: string;
  description?: string;
  subdomain: string;
  logo?: string;
  website?: string;
  phone?: string;
  email: string;
  address: BusinessAddress;
  timezone: string;
  currency: string;
  ownerId: string;
  settings: BusinessSettings;
  status: BusinessStatus;
  subscription: BusinessSubscription;
}

export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BusinessSettings {
  bookingWindow: {
    minAdvanceHours: number;
    maxAdvanceDays: number;
  };
  cancellation: {
    allowCancellation: boolean;
    minCancellationHours: number;
  };
  payment: {
    requirePayment: boolean;
    acceptedMethods: PaymentMethodEnum[];
    currency: string;
  };
  notifications: {
    sendConfirmationEmails: boolean;
    sendReminderEmails: boolean;
    reminderHoursBefore: number;
  };
  availability: {
    defaultDuration: number; // minutes
    bufferTime: number; // minutes between bookings
  };
}

// PaymentMethod moved to payment.ts to avoid conflicts

export enum BusinessStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_SETUP = 'pending_setup'
}

export interface BusinessSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid'
}

export interface Service extends BaseEntity {
  businessId: string;
  name: string;
  description?: string;
  duration: number; // minutes
  price: number;
  currency: string;
  category?: string;
  isActive: boolean;
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
  allowOnlinePayment: boolean;
  requiresApproval: boolean;
}

export interface CreateBusinessRequest {
  name: string;
  description?: string;
  subdomain: string;
  email: string;
  phone?: string;
  address: BusinessAddress;
  timezone: string;
  currency: string;
}

export interface UpdateBusinessRequest {
  name?: string;
  description?: string;
  logo?: string;
  website?: string;
  phone?: string;
  address?: Partial<BusinessAddress>;
  settings?: Partial<BusinessSettings>;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  duration: number;
  price: number;
  currency: string;
  category?: string;
  maxAdvanceBookingDays?: number;
  minAdvanceBookingHours?: number;
  allowOnlinePayment?: boolean;
  requiresApproval?: boolean;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  category?: string;
  isActive?: boolean;
  maxAdvanceBookingDays?: number;
  minAdvanceBookingHours?: number;
  allowOnlinePayment?: boolean;
  requiresApproval?: boolean;
}
