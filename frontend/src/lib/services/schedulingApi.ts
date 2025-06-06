/**
 * Scheduling Service API
 * 
 * This module provides functions for interacting with the Scheduling Service API.
 * Handles bookings, availability, and scheduling operations.
 */

import {
  Booking,
  CreateBookingRequest,
  BookingStatus,
  AvailabilityResponse,
  AvailabilityRule,
  CreateAvailabilityRuleRequest,
  TimeSlot,
  GetSlotsParams,
  ListBookingsParams,
} from '@/types/api';
import { schedulingClient, get, post, put, patch, del } from '@/lib/apiClient';

/**
 * Booking management API functions
 */
export const bookingApi = {
  /**
   * Create a new booking
   */
  async createBooking(bookingData: CreateBookingRequest): Promise<Booking> {
    return post<Booking>(schedulingClient, '/bookings', bookingData);
  },

  /**
   * Get booking by ID
   */
  async getBooking(bookingId: string): Promise<Booking> {
    return get<Booking>(schedulingClient, `/bookings/${bookingId}`);
  },

  /**
   * List bookings with filters
   */
  async listBookings(params?: ListBookingsParams): Promise<{
    bookings: Booking[];
    pagination: any;
  }> {
    return get(schedulingClient, '/bookings', params);
  },

  /**
   * Get bookings for a specific business
   */
  async getBusinessBookings(
    businessId: string, 
    params?: Omit<ListBookingsParams, 'businessId'>
  ): Promise<Booking[]> {
    return get<Booking[]>(schedulingClient, '/bookings', { 
      ...params, 
      businessId 
    });
  },

  /**
   * Get bookings for a specific customer
   */
  async getCustomerBookings(
    customerId: string,
    params?: Omit<ListBookingsParams, 'customerId'>
  ): Promise<Booking[]> {
    return get<Booking[]>(schedulingClient, '/bookings', { 
      ...params, 
      customerId 
    });
  },

  /**
   * Update booking status
   */
  async updateBookingStatus(
    bookingId: string, 
    status: BookingStatus,
    notes?: string
  ): Promise<Booking> {
    return put<Booking>(schedulingClient, `/bookings/${bookingId}/status`, {
      status,
      notes,
    });
  },

  /**
   * Confirm booking
   */
  async confirmBooking(bookingId: string, notes?: string): Promise<Booking> {
    return this.updateBookingStatus(bookingId, 'confirmed', notes);
  },

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
    return this.updateBookingStatus(bookingId, 'cancelled', reason);
  },

  /**
   * Mark booking as completed
   */
  async completeBooking(bookingId: string, notes?: string): Promise<Booking> {
    return this.updateBookingStatus(bookingId, 'completed', notes);
  },

  /**
   * Mark booking as no-show
   */
  async markNoShow(bookingId: string, notes?: string): Promise<Booking> {
    return this.updateBookingStatus(bookingId, 'no_show', notes);
  },

  /**
   * Update booking details
   */
  async updateBooking(
    bookingId: string,
    updates: Partial<CreateBookingRequest>
  ): Promise<Booking> {
    return put<Booking>(schedulingClient, `/bookings/${bookingId}`, updates);
  },

  /**
   * Delete booking
   */
  async deleteBooking(bookingId: string): Promise<void> {
    return del<void>(schedulingClient, `/bookings/${bookingId}`);
  },
};

/**
 * Availability management API functions
 */
export const availabilityApi = {
  /**
   * Get available time slots for a service
   */
  async getServiceSlots(
    serviceId: string, 
    params: GetSlotsParams
  ): Promise<AvailabilityResponse> {
    return get<AvailabilityResponse>(
      schedulingClient, 
      `/services/${serviceId}/slots`, 
      params
    );
  },

  /**
   * Get business calendar view
   */
  async getBusinessCalendar(
    businessId: string,
    params?: {
      start?: string; // YYYY-MM-DD
      end?: string;   // YYYY-MM-DD
    }
  ): Promise<{
    appointments: Array<{
      id: string;
      startTime: string;
      endTime: string;
      customerName: string;
      serviceName: string;
      status: BookingStatus;
    }>;
    availability: Array<{
      date: string;
      totalSlots: number;
      bookedSlots: number;
      availableSlots: number;
    }>;
  }> {
    return get(schedulingClient, `/businesses/${businessId}/calendar`, params);
  },

  /**
   * Get general availability
   */
  async getAvailability(params?: {
    businessId?: string;
    serviceId?: string;
    date?: string;
  }): Promise<AvailabilityResponse> {
    return get<AvailabilityResponse>(schedulingClient, '/availability', params);
  },

  /**
   * Create availability rule
   */
  async createAvailabilityRule(
    ruleData: CreateAvailabilityRuleRequest
  ): Promise<AvailabilityRule> {
    return post<AvailabilityRule>(schedulingClient, '/availability/rules', ruleData);
  },

  /**
   * Get availability rules for a business
   */
  async getAvailabilityRules(businessId: string): Promise<AvailabilityRule[]> {
    return get<AvailabilityRule[]>(
      schedulingClient, 
      '/availability/rules', 
      { businessId }
    );
  },

  /**
   * Update availability rule
   */
  async updateAvailabilityRule(
    ruleId: string,
    updates: Partial<CreateAvailabilityRuleRequest>
  ): Promise<AvailabilityRule> {
    return put<AvailabilityRule>(
      schedulingClient, 
      `/availability/rules/${ruleId}`, 
      updates
    );
  },

  /**
   * Delete availability rule
   */
  async deleteAvailabilityRule(ruleId: string): Promise<void> {
    return del<void>(schedulingClient, `/availability/rules/${ruleId}`);
  },

  /**
   * Get slots for business service on specific date (internal API)
   */
  async getBusinessServiceSlots(
    businessId: string,
    serviceId: string,
    date: string
  ): Promise<TimeSlot[]> {
    return get<TimeSlot[]>(
      schedulingClient,
      `/internal/availability/${businessId}/slots`,
      { serviceId, date }
    );
  },
};

/**
 * Scheduling utility functions
 */
export const schedulingUtils = {
  /**
   * Format time slot for display
   */
  formatTimeSlot(slot: TimeSlot): string {
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    
    return `${this.formatTime(start)} - ${this.formatTime(end)}`;
  },

  /**
   * Format time for display
   */
  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  },

  /**
   * Format date for display
   */
  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },

  /**
   * Get booking status color
   */
  getBookingStatusColor(status: BookingStatus): string {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'no_show':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  },

  /**
   * Get booking status label
   */
  getBookingStatusLabel(status: BookingStatus): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'cancelled':
        return 'Cancelled';
      case 'completed':
        return 'Completed';
      case 'no_show':
        return 'No Show';
      default:
        return 'Unknown';
    }
  },

  /**
   * Check if booking can be cancelled
   */
  canCancelBooking(booking: Booking): boolean {
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const hoursDifference = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return booking.status === 'pending' || 
           booking.status === 'confirmed' && hoursDifference > 24;
  },

  /**
   * Check if booking can be modified
   */
  canModifyBooking(booking: Booking): boolean {
    const now = new Date();
    const startTime = new Date(booking.startTime);
    
    return (booking.status === 'pending' || booking.status === 'confirmed') &&
           startTime > now;
  },

  /**
   * Generate time slots for a day
   */
  generateTimeSlots(
    startTime: string, // HH:mm
    endTime: string,   // HH:mm
    duration: number,  // minutes
    date: string       // YYYY-MM-DD
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startDate = new Date(`${date}T${startTime}:00`);
    const endDate = new Date(`${date}T${endTime}:00`);
    
    let currentTime = new Date(startDate);
    
    while (currentTime < endDate) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      
      if (slotEnd <= endDate) {
        slots.push({
          startTime: currentTime.toISOString(),
          endTime: slotEnd.toISOString(),
          available: true,
        });
      }
      
      currentTime = new Date(slotEnd);
    }
    
    return slots;
  },

  /**
   * Check if time slot conflicts with existing bookings
   */
  hasConflict(
    newSlot: TimeSlot,
    existingBookings: Booking[]
  ): boolean {
    const newStart = new Date(newSlot.startTime);
    const newEnd = new Date(newSlot.endTime);
    
    return existingBookings.some(booking => {
      if (booking.status === 'cancelled') return false;
      
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      
      return (newStart < bookingEnd && newEnd > bookingStart);
    });
  },
};

export default bookingApi;
