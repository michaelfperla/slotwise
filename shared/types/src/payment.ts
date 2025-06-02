import { BaseEntity } from './index';

export interface Payment extends BaseEntity {
  bookingId: string;
  businessId: string;
  clientId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  failureReason?: string;
  refundedAmount: number;
  processingFee: number;
  netAmount: number;
  processedAt?: Date;
  refundedAt?: Date;
  metadata?: Record<string, any>;
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay'
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  clientSecret: string;
  bookingId: string;
  businessId: string;
  clientId: string;
  createdAt: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export enum PaymentIntentStatus {
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  CANCELLED = 'cancelled'
}

export interface CreatePaymentIntentRequest {
  bookingId: string;
  amount: number;
  currency: string;
  paymentMethods?: PaymentMethod[];
  metadata?: Record<string, any>;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethodId: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // If not provided, full refund
  reason?: string;
}

export interface RefundResponse {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason?: string;
  createdAt: Date;
}

export enum RefundStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
}

export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
  PAYPAL = 'paypal'
}

export interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  successRate: number;
  refundRate: number;
  processingFees: number;
  netRevenue: number;
  byMethod: Record<PaymentMethod, {
    count: number;
    amount: number;
    successRate: number;
  }>;
  byPeriod: {
    daily: PaymentPeriodStats[];
    weekly: PaymentPeriodStats[];
    monthly: PaymentPeriodStats[];
  };
}

export interface PaymentPeriodStats {
  period: string; // ISO date string
  revenue: number;
  transactions: number;
  refunds: number;
  netRevenue: number;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
  livemode: boolean;
}

export interface PaymentConfiguration {
  businessId: string;
  stripeAccountId?: string;
  stripePublishableKey?: string;
  paypalClientId?: string;
  acceptedMethods: PaymentMethod[];
  currency: string;
  processingFeePercentage: number;
  minimumAmount: number;
  maximumAmount: number;
  autoCapture: boolean;
  requireBillingAddress: boolean;
}
