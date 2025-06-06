/**
 * React Query Configuration
 * 
 * This module configures React Query (TanStack Query) for data fetching,
 * caching, and synchronization following SlotWise patterns.
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { notificationUtils } from '@/stores/uiStore';

// Default query options
const defaultQueryOptions: DefaultOptions = {
  queries: {
    // Stale time: how long data is considered fresh
    staleTime: 5 * 60 * 1000, // 5 minutes
    
    // Cache time: how long data stays in cache after component unmounts
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    
    // Retry configuration
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Refetch on window focus (useful for real-time data)
    refetchOnWindowFocus: true,
    
    // Refetch on reconnect
    refetchOnReconnect: true,
    
    // Don't refetch on mount if data is fresh
    refetchOnMount: true,
  },
  mutations: {
    // Retry mutations once on network errors
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 1;
    },
    
    // Global error handler for mutations
    onError: (error: any) => {
      console.error('Mutation error:', error);
      
      // Show error notification
      notificationUtils.error(
        'Operation Failed',
        error?.message || 'An unexpected error occurred'
      );
    },
  },
};

// Create query client instance
export const queryClient = new QueryClient({
  defaultOptions: defaultQueryOptions,
});

// Query key factories for consistent cache keys
export const queryKeys = {
  // Auth queries
  auth: {
    all: ['auth'] as const,
    profile: () => [...queryKeys.auth.all, 'profile'] as const,
    validate: () => [...queryKeys.auth.all, 'validate'] as const,
  },
  
  // Business queries
  businesses: {
    all: ['businesses'] as const,
    lists: () => [...queryKeys.businesses.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.businesses.lists(), filters] as const,
    details: () => [...queryKeys.businesses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.businesses.details(), id] as const,
    my: () => [...queryKeys.businesses.all, 'my'] as const,
    subdomain: (subdomain: string) => [...queryKeys.businesses.all, 'subdomain', subdomain] as const,
  },
  
  // Service queries
  services: {
    all: ['services'] as const,
    lists: () => [...queryKeys.services.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.services.lists(), filters] as const,
    details: () => [...queryKeys.services.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.services.details(), id] as const,
    business: (businessId: string) => [...queryKeys.services.all, 'business', businessId] as const,
  },
  
  // Booking queries
  bookings: {
    all: ['bookings'] as const,
    lists: () => [...queryKeys.bookings.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.bookings.lists(), filters] as const,
    details: () => [...queryKeys.bookings.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.bookings.details(), id] as const,
    business: (businessId: string) => [...queryKeys.bookings.all, 'business', businessId] as const,
    customer: (customerId: string) => [...queryKeys.bookings.all, 'customer', customerId] as const,
  },
  
  // Availability queries
  availability: {
    all: ['availability'] as const,
    slots: () => [...queryKeys.availability.all, 'slots'] as const,
    serviceSlots: (serviceId: string, params: any) => 
      [...queryKeys.availability.slots(), 'service', serviceId, params] as const,
    calendar: (businessId: string, params: any) => 
      [...queryKeys.availability.all, 'calendar', businessId, params] as const,
    rules: () => [...queryKeys.availability.all, 'rules'] as const,
    businessRules: (businessId: string) => 
      [...queryKeys.availability.rules(), 'business', businessId] as const,
  },
  
  // Analytics queries
  analytics: {
    all: ['analytics'] as const,
    revenue: (businessId: string, params: any) => 
      [...queryKeys.analytics.all, 'revenue', businessId, params] as const,
    bookingTrends: (businessId: string, params: any) => 
      [...queryKeys.analytics.all, 'booking-trends', businessId, params] as const,
    servicePerformance: (businessId: string) => 
      [...queryKeys.analytics.all, 'service-performance', businessId] as const,
  },
};

// Cache invalidation utilities
export const cacheUtils = {
  // Invalidate all auth-related queries
  invalidateAuth: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
  },
  
  // Invalidate business queries
  invalidateBusinesses: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.businesses.all });
  },
  
  invalidateBusiness: (businessId: string) => {
    return queryClient.invalidateQueries({ 
      queryKey: queryKeys.businesses.detail(businessId) 
    });
  },
  
  // Invalidate service queries
  invalidateServices: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
  },
  
  invalidateBusinessServices: (businessId: string) => {
    return queryClient.invalidateQueries({ 
      queryKey: queryKeys.services.business(businessId) 
    });
  },
  
  // Invalidate booking queries
  invalidateBookings: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
  },
  
  invalidateBusinessBookings: (businessId: string) => {
    return queryClient.invalidateQueries({ 
      queryKey: queryKeys.bookings.business(businessId) 
    });
  },
  
  // Invalidate availability queries
  invalidateAvailability: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.availability.all });
  },
  
  invalidateServiceSlots: (serviceId: string) => {
    return queryClient.invalidateQueries({ 
      queryKey: [...queryKeys.availability.slots(), 'service', serviceId] 
    });
  },
  
  // Invalidate analytics queries
  invalidateAnalytics: (businessId: string) => {
    return queryClient.invalidateQueries({ 
      queryKey: [...queryKeys.analytics.all, businessId] 
    });
  },
  
  // Clear all cache
  clearCache: () => {
    return queryClient.clear();
  },
  
  // Remove specific query from cache
  removeQuery: (queryKey: any[]) => {
    return queryClient.removeQueries({ queryKey });
  },
};

// Prefetch utilities for performance optimization
export const prefetchUtils = {
  // Prefetch user businesses
  prefetchMyBusinesses: () => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.businesses.my(),
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  },
  
  // Prefetch business services
  prefetchBusinessServices: (businessId: string) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.services.business(businessId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  },
  
  // Prefetch business bookings
  prefetchBusinessBookings: (businessId: string) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.bookings.business(businessId),
      staleTime: 2 * 60 * 1000, // 2 minutes (more frequent for bookings)
    });
  },
};

// Error handling utilities
export const errorUtils = {
  // Check if error is a network error
  isNetworkError: (error: any) => {
    return !error?.status || error?.code === 'NETWORK_ERROR';
  },
  
  // Check if error is an authentication error
  isAuthError: (error: any) => {
    return error?.status === 401 || error?.code === 'UNAUTHORIZED';
  },
  
  // Check if error is a validation error
  isValidationError: (error: any) => {
    return error?.status === 422 || error?.code === 'VALIDATION_ERROR';
  },
  
  // Get user-friendly error message
  getErrorMessage: (error: any) => {
    if (errorUtils.isNetworkError(error)) {
      return 'Network error. Please check your connection and try again.';
    }
    
    if (errorUtils.isAuthError(error)) {
      return 'Authentication required. Please log in and try again.';
    }
    
    if (errorUtils.isValidationError(error)) {
      return error?.message || 'Please check your input and try again.';
    }
    
    return error?.message || 'An unexpected error occurred. Please try again.';
  },
};

export default queryClient;
