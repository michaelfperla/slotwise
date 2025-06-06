/**
 * Booking React Query Hooks
 * 
 * This module provides React Query hooks for booking operations
 * following SlotWise patterns and conventions.
 */

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Booking, 
  CreateBookingRequest, 
  BookingStatus,
  ListBookingsParams,
  AvailabilityResponse,
  GetSlotsParams 
} from '@/types/api';
import { bookingApi, availabilityApi } from '@/lib/services/schedulingApi';
import { queryKeys, cacheUtils } from '@/lib/queryClient';
import { notificationUtils } from '@/stores/uiStore';

/**
 * Hook for creating a new booking
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingData: CreateBookingRequest) => {
      return await bookingApi.createBooking(bookingData);
    },
    onSuccess: (booking) => {
      // Invalidate bookings queries
      cacheUtils.invalidateBookings();
      cacheUtils.invalidateBusinessBookings(booking.businessId);
      
      // Invalidate availability for the service
      cacheUtils.invalidateServiceSlots(booking.serviceId);
      
      notificationUtils.success(
        'Booking created!',
        'The booking has been created successfully.'
      );
    },
    onError: (error: any) => {
      notificationUtils.error(
        'Failed to create booking',
        error.message || 'Please try again later.'
      );
    },
  });
}

/**
 * Hook for updating booking status
 */
export function useUpdateBookingStatus() {
  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      status, 
      notes 
    }: { 
      bookingId: string; 
      status: BookingStatus; 
      notes?: string; 
    }) => {
      return await bookingApi.updateBookingStatus(bookingId, status, notes);
    },
    onSuccess: (booking) => {
      cacheUtils.invalidateBookings();
      cacheUtils.invalidateBusinessBookings(booking.businessId);
      
      notificationUtils.success(
        'Booking updated!',
        `Booking status changed to ${booking.status}.`
      );
    },
    onError: (error: any) => {
      notificationUtils.error(
        'Failed to update booking',
        error.message || 'Please try again later.'
      );
    },
  });
}

/**
 * Hook for confirming a booking
 */
export function useConfirmBooking() {
  const updateStatus = useUpdateBookingStatus();
  
  return useMutation({
    mutationFn: async ({ bookingId, notes }: { bookingId: string; notes?: string }) => {
      return updateStatus.mutateAsync({ bookingId, status: 'confirmed', notes });
    },
  });
}

/**
 * Hook for cancelling a booking
 */
export function useCancelBooking() {
  const updateStatus = useUpdateBookingStatus();
  
  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason?: string }) => {
      return updateStatus.mutateAsync({ bookingId, status: 'cancelled', notes: reason });
    },
  });
}

/**
 * Hook for completing a booking
 */
export function useCompleteBooking() {
  const updateStatus = useUpdateBookingStatus();
  
  return useMutation({
    mutationFn: async ({ bookingId, notes }: { bookingId: string; notes?: string }) => {
      return updateStatus.mutateAsync({ bookingId, status: 'completed', notes });
    },
  });
}

/**
 * Hook for getting a specific booking
 */
export function useBooking(bookingId: string) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(bookingId),
    queryFn: () => bookingApi.getBooking(bookingId),
    enabled: !!bookingId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for getting business bookings
 */
export function useBusinessBookings(
  businessId: string, 
  params?: Omit<ListBookingsParams, 'businessId'>
) {
  return useQuery({
    queryKey: queryKeys.bookings.business(businessId),
    queryFn: () => bookingApi.getBusinessBookings(businessId, params),
    enabled: !!businessId,
    staleTime: 1 * 60 * 1000, // 1 minute for booking data
  });
}

/**
 * Hook for getting customer bookings
 */
export function useCustomerBookings(
  customerId: string,
  params?: Omit<ListBookingsParams, 'customerId'>
) {
  return useQuery({
    queryKey: queryKeys.bookings.customer(customerId),
    queryFn: () => bookingApi.getCustomerBookings(customerId, params),
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for getting service availability slots
 */
export function useServiceSlots(serviceId: string, params: GetSlotsParams) {
  return useQuery({
    queryKey: queryKeys.availability.serviceSlots(serviceId, params),
    queryFn: () => availabilityApi.getServiceSlots(serviceId, params),
    enabled: !!serviceId && !!params.date,
    staleTime: 30 * 1000, // 30 seconds for availability data
    refetchInterval: params.realtime ? 30 * 1000 : false, // Auto-refresh if realtime
  });
}

/**
 * Hook for getting business calendar
 */
export function useBusinessCalendar(
  businessId: string,
  params?: {
    start?: string;
    end?: string;
  }
) {
  return useQuery({
    queryKey: queryKeys.availability.calendar(businessId, params || {}),
    queryFn: () => availabilityApi.getBusinessCalendar(businessId, params),
    enabled: !!businessId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for getting general availability
 */
export function useAvailability(params?: {
  businessId?: string;
  serviceId?: string;
  date?: string;
}) {
  return useQuery({
    queryKey: queryKeys.availability.slots(),
    queryFn: () => availabilityApi.getAvailability(params),
    enabled: !!(params?.businessId || params?.serviceId),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for creating availability rule
 */
export function useCreateAvailabilityRule() {
  return useMutation({
    mutationFn: availabilityApi.createAvailabilityRule,
    onSuccess: () => {
      cacheUtils.invalidateAvailability();
      notificationUtils.success(
        'Availability rule created!',
        'Your availability has been updated.'
      );
    },
    onError: (error: any) => {
      notificationUtils.error(
        'Failed to create availability rule',
        error.message || 'Please try again later.'
      );
    },
  });
}

/**
 * Hook for updating availability rule
 */
export function useUpdateAvailabilityRule() {
  return useMutation({
    mutationFn: async ({ 
      ruleId, 
      updates 
    }: { 
      ruleId: string; 
      updates: any; 
    }) => {
      return await availabilityApi.updateAvailabilityRule(ruleId, updates);
    },
    onSuccess: () => {
      cacheUtils.invalidateAvailability();
      notificationUtils.success(
        'Availability rule updated!',
        'Your availability has been updated.'
      );
    },
    onError: (error: any) => {
      notificationUtils.error(
        'Failed to update availability rule',
        error.message || 'Please try again later.'
      );
    },
  });
}

/**
 * Hook for deleting availability rule
 */
export function useDeleteAvailabilityRule() {
  return useMutation({
    mutationFn: availabilityApi.deleteAvailabilityRule,
    onSuccess: () => {
      cacheUtils.invalidateAvailability();
      notificationUtils.success(
        'Availability rule deleted!',
        'The availability rule has been removed.'
      );
    },
    onError: (error: any) => {
      notificationUtils.error(
        'Failed to delete availability rule',
        error.message || 'Please try again later.'
      );
    },
  });
}

/**
 * Hook for getting business availability rules
 */
export function useBusinessAvailabilityRules(businessId: string) {
  return useQuery({
    queryKey: queryKeys.availability.businessRules(businessId),
    queryFn: () => availabilityApi.getAvailabilityRules(businessId),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Combined hook for booking management
 */
export function useBookingManagement(businessId?: string) {
  const bookingsQuery = useBusinessBookings(businessId || '');
  const calendarQuery = useBusinessCalendar(businessId || '');

  return {
    // Data
    bookings: bookingsQuery.data?.bookings || [],
    calendar: calendarQuery.data,
    
    // Loading states
    isLoading: bookingsQuery.isLoading || calendarQuery.isLoading,
    isBookingsLoading: bookingsQuery.isLoading,
    isCalendarLoading: calendarQuery.isLoading,
    
    // Error states
    error: bookingsQuery.error || calendarQuery.error,
    
    // Mutations
    createBooking: useCreateBooking(),
    updateBookingStatus: useUpdateBookingStatus(),
    confirmBooking: useConfirmBooking(),
    cancelBooking: useCancelBooking(),
    completeBooking: useCompleteBooking(),
    
    // Availability
    createAvailabilityRule: useCreateAvailabilityRule(),
    updateAvailabilityRule: useUpdateAvailabilityRule(),
    deleteAvailabilityRule: useDeleteAvailabilityRule(),
  };
}

export default useBookingManagement;
