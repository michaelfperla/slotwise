/**
 * Business React Query Hooks
 * 
 * This module provides React Query hooks for business operations
 * following SlotWise patterns and conventions.
 */

import { cacheUtils, queryKeys } from '@/lib/queryClient';
import { analyticsApi, businessApi, serviceApi } from '@/lib/services/businessApi';
import { useAuthStore } from '@/stores/authStore';
import { useBusinessStore } from '@/stores/businessStore';
import { CreateBusinessRequest, CreateServiceRequest } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook for creating a new business
 */
export function useCreateBusiness() {
  const queryClient = useQueryClient();
  const createBusiness = useBusinessStore((state) => state.createBusiness);

  return useMutation({
    mutationFn: async (businessData: CreateBusinessRequest) => {
      return await createBusiness(businessData);
    },
    onSuccess: (business) => {
      // Invalidate businesses queries
      cacheUtils.invalidateBusinesses();
      
      // Prefetch business services
      queryClient.prefetchQuery({
        queryKey: queryKeys.services.business(business.id),
        queryFn: () => serviceApi.getBusinessServices(business.id),
      });
    },
  });
}

/**
 * Hook for updating a business
 */
export function useUpdateBusiness() {
  const updateBusiness = useBusinessStore((state) => state.updateBusiness);

  return useMutation({
    mutationFn: async ({ businessId, updates }: {
      businessId: string;
      updates: Partial<CreateBusinessRequest>;
    }) => {
      return await updateBusiness(businessId, updates);
    },
    onSuccess: (business) => {
      cacheUtils.invalidateBusiness(business.id);
    },
  });
}

/**
 * Hook for getting user's businesses
 */
export function useMyBusinesses() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadMyBusinesses = useBusinessStore((state) => state.loadMyBusinesses);

  return useQuery({
    queryKey: queryKeys.businesses.my(),
    queryFn: async () => {
      await loadMyBusinesses();
      return useBusinessStore.getState().businesses;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting a specific business
 */
export function useBusinessDetail(businessId: string) {
  return useQuery({
    queryKey: queryKeys.businesses.detail(businessId),
    queryFn: () => businessApi.getBusiness(businessId),
    enabled: !!businessId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for getting business by subdomain (public)
 */
export function useBusinessBySubdomain(subdomain: string) {
  return useQuery({
    queryKey: queryKeys.businesses.subdomain(subdomain),
    queryFn: () => businessApi.getBusinessBySubdomain(subdomain),
    enabled: !!subdomain,
    staleTime: 15 * 60 * 1000, // 15 minutes for public data
  });
}

/**
 * Hook for creating a service
 */
export function useCreateService() {
  const createService = useBusinessStore((state) => state.createService);

  return useMutation({
    mutationFn: async (serviceData: CreateServiceRequest) => {
      return await createService(serviceData);
    },
    onSuccess: (service) => {
      cacheUtils.invalidateBusinessServices(service.businessId);
    },
  });
}

/**
 * Hook for updating a service
 */
export function useUpdateService() {
  const updateService = useBusinessStore((state) => state.updateService);

  return useMutation({
    mutationFn: async ({ serviceId, updates }: {
      serviceId: string;
      updates: Partial<CreateServiceRequest>;
    }) => {
      return await updateService(serviceId, updates);
    },
    onSuccess: (service) => {
      cacheUtils.invalidateBusinessServices(service.businessId);
      cacheUtils.invalidateServices();
    },
  });
}

/**
 * Hook for deleting a service
 */
export function useDeleteService() {
  const deleteService = useBusinessStore((state) => state.deleteService);

  return useMutation({
    mutationFn: async (serviceId: string) => {
      await deleteService(serviceId);
      return serviceId;
    },
    onSuccess: () => {
      cacheUtils.invalidateServices();
    },
  });
}

/**
 * Hook for getting business services
 */
export function useBusinessServices(businessId: string) {
  const loadBusinessServices = useBusinessStore((state) => state.loadBusinessServices);

  return useQuery({
    queryKey: queryKeys.services.business(businessId),
    queryFn: async () => {
      await loadBusinessServices(businessId);
      return useBusinessStore.getState().services;
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting business revenue data
 */
export function useBusinessRevenue(businessId: string, params?: {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}) {
  return useQuery({
    queryKey: queryKeys.analytics.revenue(businessId, params || {}),
    queryFn: () => analyticsApi.getBusinessRevenue(businessId, params),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000, // 2 minutes for financial data
  });
}

/**
 * Hook for getting business analytics
 */
export function useBusinessAnalytics(businessId: string, params?: {
  startDate?: string;
  endDate?: string;
  metrics?: string[];
}) {
  return useQuery({
    queryKey: queryKeys.analytics.revenue(businessId, params || {}),
    queryFn: () => analyticsApi.getBusinessAnalytics(businessId, params),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting booking trends
 */
export function useBookingTrends(businessId: string, params?: {
  period?: 'week' | 'month' | 'quarter' | 'year';
  groupBy?: 'day' | 'week' | 'month';
}) {
  return useQuery({
    queryKey: queryKeys.analytics.bookingTrends(businessId, params || {}),
    queryFn: () => analyticsApi.getBookingTrends(businessId, params),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting service performance
 */
export function useServicePerformance(businessId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.servicePerformance(businessId),
    queryFn: () => analyticsApi.getServicePerformance(businessId),
    enabled: !!businessId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Combined hook for business management
 */
export function useBusiness(businessId?: string) {
  const businessStore = useBusinessStore();
  const myBusinessesQuery = useMyBusinesses();
  const businessQuery = useBusinessDetail(businessId || '');
  const servicesQuery = useBusinessServices(businessId || '');

  // Use current business from store if no specific businessId provided
  const currentBusiness = businessId 
    ? businessQuery.data 
    : businessStore.currentBusiness || myBusinessesQuery.data?.[0];

  return {
    // Business data
    business: currentBusiness,
    businesses: myBusinessesQuery.data || businessStore.businesses,
    services: servicesQuery.data || businessStore.services,
    
    // Loading states
    isLoading: myBusinessesQuery.isLoading || businessQuery.isLoading || servicesQuery.isLoading,
    isBusinessLoading: businessQuery.isLoading,
    isServicesLoading: servicesQuery.isLoading,
    
    // Error states
    error: myBusinessesQuery.error || businessQuery.error || servicesQuery.error,
    
    // Mutations
    createBusiness: useCreateBusiness(),
    updateBusiness: useUpdateBusiness(),
    createService: useCreateService(),
    updateService: useUpdateService(),
    deleteService: useDeleteService(),
    
    // Store actions
    setCurrentBusiness: businessStore.setCurrentBusiness,
    clearError: businessStore.clearError,
    
    // Utility methods
    getBusinessById: businessStore.getBusinessById,
    getServiceById: businessStore.getServiceById,
    isBusinessOwner: businessStore.isBusinessOwner,
  };
}

export default useBusiness;
