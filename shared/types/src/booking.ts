import { BaseEntity } from './index';
import { PaymentStatus } from './payment';

export interface Booking extends BaseEntity {
  businessId: string;
  serviceId: string;
  clientId: string;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  notes?: string;
  clientNotes?: string;
  totalAmount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  reminderSentAt?: Date;
  confirmationSentAt?: Date;
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show'
}

// PaymentStatus moved to payment.ts to avoid conflicts

export interface BookingClient {
  id?: string; // Optional for new clients
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  timezone: string;
}

export interface CreateBookingRequest {
  serviceId: string;
  startTime: Date;
  client: BookingClient;
  notes?: string;
  clientNotes?: string;
  requirePayment?: boolean;
}

export interface UpdateBookingRequest {
  startTime?: Date;
  status?: BookingStatus;
  notes?: string;
  clientNotes?: string;
}

export interface CancelBookingRequest {
  reason?: string;
  refundAmount?: number;
}

export interface BookingConflict {
  conflictType: ConflictType;
  conflictingBookingId?: string;
  message: string;
}

export enum ConflictType {
  TIME_OVERLAP = 'time_overlap',
  OUTSIDE_AVAILABILITY = 'outside_availability',
  TOO_SHORT_NOTICE = 'too_short_notice',
  TOO_FAR_ADVANCE = 'too_far_advance',
  SERVICE_INACTIVE = 'service_inactive'
}

export interface BookingSearchParams {
  businessId?: string;
  serviceId?: string;
  clientId?: string;
  status?: BookingStatus[];
  startDate?: Date;
  endDate?: Date;
  paymentStatus?: PaymentStatus[];
}

export interface BookingStats {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  cancellationRate: number;
}

export interface BookingWithDetails extends Booking {
  service: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  business: {
    id: string;
    name: string;
    timezone: string;
  };
}
