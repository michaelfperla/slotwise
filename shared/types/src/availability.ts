import { BaseEntity } from './index';

export interface AvailabilityRule extends BaseEntity {
  businessId: string;
  serviceId?: string; // If null, applies to all services
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isActive: boolean;
  priority: number; // Higher priority rules override lower priority
}

export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6
}

export interface AvailabilityException extends BaseEntity {
  businessId: string;
  serviceId?: string;
  date: Date;
  type: ExceptionType;
  startTime?: string; // For partial day exceptions
  endTime?: string; // For partial day exceptions
  reason?: string;
}

export enum ExceptionType {
  UNAVAILABLE = 'unavailable', // Block time
  AVAILABLE = 'available', // Override normal unavailability
  CUSTOM_HOURS = 'custom_hours' // Different hours than usual
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  reason?: string; // Why it's not available
}

export interface AvailabilityQuery {
  businessId: string;
  serviceId: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
}

export interface AvailabilityResponse {
  businessId: string;
  serviceId: string;
  timezone: string;
  slots: TimeSlot[];
  generatedAt: Date;
}

export interface CreateAvailabilityRuleRequest {
  serviceId?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  priority?: number;
}

export interface UpdateAvailabilityRuleRequest {
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
  priority?: number;
}

export interface CreateAvailabilityExceptionRequest {
  serviceId?: string;
  date: Date;
  type: ExceptionType;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface UpdateAvailabilityExceptionRequest {
  type?: ExceptionType;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface BulkAvailabilityUpdate {
  rules?: CreateAvailabilityRuleRequest[];
  exceptions?: CreateAvailabilityExceptionRequest[];
  deleteRuleIds?: string[];
  deleteExceptionIds?: string[];
}

export interface AvailabilityConflict {
  type: 'rule_overlap' | 'exception_conflict' | 'booking_conflict';
  message: string;
  conflictingId?: string;
  suggestedResolution?: string;
}

export interface AvailabilityStats {
  totalAvailableHours: number;
  totalBookedHours: number;
  utilizationRate: number;
  peakHours: { hour: number; bookingCount: number }[];
  peakDays: { dayOfWeek: DayOfWeek; bookingCount: number }[];
}
