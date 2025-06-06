/**
 * API Types for SlotWise Frontend
 * 
 * This file contains TypeScript type definitions for API requests and responses
 * following the SlotWise API design standards.
 */

// Base API Response Types
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string; // Error code: BUSINESS_NOT_FOUND
  message: string; // Human-readable message
  details?: unknown; // Additional error details
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'client' | 'business_owner';
  timezone?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'business_owner' | 'admin';
  status: 'active' | 'pending_verification' | 'suspended';
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

// Business Types
export interface Business {
  id: string;
  name: string;
  description?: string;
  subdomain: string;
  ownerId: string;
  email?: string;
  phone?: string;
  website?: string;
  timezone: string;
  currency: string;
  status: 'active' | 'pending_setup' | 'suspended';
  settings: BusinessSettings;
  address?: BusinessAddress;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSettings {
  allowOnlineBooking: boolean;
  requireApproval: boolean;
  bufferTime: number; // minutes
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
  cancellationPolicy?: string;
  paymentRequired: boolean;
}

export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CreateBusinessRequest {
  name: string;
  description?: string;
  subdomain: string;
  email?: string;
  phone?: string;
  website?: string;
  timezone: string;
  currency?: string;
  address?: BusinessAddress;
  settings?: Partial<BusinessSettings>;
}

// Service Types
export interface Service {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  duration: number; // minutes
  price: number; // in cents
  currency: string;
  category?: string;
  isActive: boolean;
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
  requiresApproval: boolean;
  allowOnlinePayment: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  businessId: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  currency?: string;
  category?: string;
  isActive?: boolean;
  maxAdvanceBookingDays?: number;
  minAdvanceBookingHours?: number;
  requiresApproval?: boolean;
  allowOnlinePayment?: boolean;
}

// Booking Types
export interface Booking {
  id: string;
  businessId: string;
  serviceId: string;
  customerId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  totalAmount: number;
  currency: string;
  customerInfo: CustomerInfo;
  notes?: string;
  paymentStatus?: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'cancelled' 
  | 'completed' 
  | 'no_show';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

export interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface CreateBookingRequest {
  businessId: string;
  serviceId: string;
  customerId?: string;
  startTime: string;
  customerInfo: CustomerInfo;
  notes?: string;
}

// Availability Types
export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  conflictReason?: string;
}

export interface AvailabilityResponse {
  slots: TimeSlot[];
  lastUpdated: string;
}

export interface AvailabilityRule {
  id: string;
  businessId: string;
  dayOfWeek: number; // 0-6, Sunday = 0
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAvailabilityRuleRequest {
  businessId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  bufferMinutes?: number;
}

// Error Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError extends Error {
  status: number;
  code: string;
  details?: ValidationError[];
}

// Query Parameters
export interface ListBusinessesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface ListServicesParams {
  businessId?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
  category?: string;
}

export interface ListBookingsParams {
  businessId?: string;
  customerId?: string;
  serviceId?: string;
  status?: BookingStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface GetSlotsParams {
  date: string; // YYYY-MM-DD
  businessId?: string;
  realtime?: boolean;
}
