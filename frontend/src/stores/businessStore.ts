/**
 * Business Store - Zustand State Management
 * 
 * This store manages business-related state including current business,
 * services, and business management operations.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Business, Service, CreateBusinessRequest, CreateServiceRequest } from '@/types/api';
import { businessApi, serviceApi } from '@/lib/services/businessApi';
import { notificationUtils } from '@/stores/uiStore';

interface BusinessState {
  // State
  currentBusiness: Business | null;
  businesses: Business[];
  services: Service[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentBusiness: (business: Business | null) => void;
  createBusiness: (businessData: CreateBusinessRequest) => Promise<Business>;
  updateBusiness: (businessId: string, updates: Partial<CreateBusinessRequest>) => Promise<Business>;
  loadMyBusinesses: () => Promise<void>;
  loadBusinessServices: (businessId: string) => Promise<void>;
  createService: (serviceData: CreateServiceRequest) => Promise<Service>;
  updateService: (serviceId: string, updates: Partial<CreateServiceRequest>) => Promise<Service>;
  deleteService: (serviceId: string) => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;

  // Utility actions
  getBusinessById: (businessId: string) => Business | undefined;
  getServiceById: (serviceId: string) => Service | undefined;
  isBusinessOwner: (businessId: string) => boolean;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentBusiness: null,
      businesses: [],
      services: [],
      isLoading: false,
      error: null,

      // Set current business
      setCurrentBusiness: (business: Business | null) => {
        set({ currentBusiness: business });
      },

      // Create business
      createBusiness: async (businessData: CreateBusinessRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const business = await businessApi.createBusiness(businessData);
          
          set((state) => ({
            businesses: [...state.businesses, business],
            currentBusiness: business,
            isLoading: false,
            error: null,
          }));

          notificationUtils.success(
            'Business created!',
            `${business.name} has been created successfully.`
          );

          return business;
        } catch (error: any) {
          console.error('Failed to create business:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to create business',
          });
          
          notificationUtils.error(
            'Failed to create business',
            error.message || 'Please try again later.'
          );
          
          throw error;
        }
      },

      // Update business
      updateBusiness: async (businessId: string, updates: Partial<CreateBusinessRequest>) => {
        set({ isLoading: true, error: null });
        
        try {
          const business = await businessApi.updateBusiness(businessId, updates);
          
          set((state) => ({
            businesses: state.businesses.map(b => 
              b.id === businessId ? business : b
            ),
            currentBusiness: state.currentBusiness?.id === businessId ? business : state.currentBusiness,
            isLoading: false,
            error: null,
          }));

          notificationUtils.success(
            'Business updated!',
            `${business.name} has been updated successfully.`
          );

          return business;
        } catch (error: any) {
          console.error('Failed to update business:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to update business',
          });
          
          notificationUtils.error(
            'Failed to update business',
            error.message || 'Please try again later.'
          );
          
          throw error;
        }
      },

      // Load user's businesses
      loadMyBusinesses: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const businesses = await businessApi.getMyBusinesses();
          
          set({
            businesses,
            currentBusiness: businesses.length > 0 ? businesses[0] : null,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Failed to load businesses:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to load businesses',
          });
          
          notificationUtils.error(
            'Failed to load businesses',
            error.message || 'Please try again later.'
          );
        }
      },

      // Load business services
      loadBusinessServices: async (businessId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const services = await serviceApi.getBusinessServices(businessId);
          
          set({
            services,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Failed to load services:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to load services',
          });
          
          notificationUtils.error(
            'Failed to load services',
            error.message || 'Please try again later.'
          );
        }
      },

      // Create service
      createService: async (serviceData: CreateServiceRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const service = await serviceApi.createService(serviceData);
          
          set((state) => ({
            services: [...state.services, service],
            isLoading: false,
            error: null,
          }));

          notificationUtils.success(
            'Service created!',
            `${service.name} has been created successfully.`
          );

          return service;
        } catch (error: any) {
          console.error('Failed to create service:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to create service',
          });
          
          notificationUtils.error(
            'Failed to create service',
            error.message || 'Please try again later.'
          );
          
          throw error;
        }
      },

      // Update service
      updateService: async (serviceId: string, updates: Partial<CreateServiceRequest>) => {
        set({ isLoading: true, error: null });
        
        try {
          const service = await serviceApi.updateService(serviceId, updates);
          
          set((state) => ({
            services: state.services.map(s => 
              s.id === serviceId ? service : s
            ),
            isLoading: false,
            error: null,
          }));

          notificationUtils.success(
            'Service updated!',
            `${service.name} has been updated successfully.`
          );

          return service;
        } catch (error: any) {
          console.error('Failed to update service:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to update service',
          });
          
          notificationUtils.error(
            'Failed to update service',
            error.message || 'Please try again later.'
          );
          
          throw error;
        }
      },

      // Delete service
      deleteService: async (serviceId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await serviceApi.deleteService(serviceId);
          
          set((state) => ({
            services: state.services.filter(s => s.id !== serviceId),
            isLoading: false,
            error: null,
          }));

          notificationUtils.success(
            'Service deleted!',
            'The service has been deleted successfully.'
          );
        } catch (error: any) {
          console.error('Failed to delete service:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to delete service',
          });
          
          notificationUtils.error(
            'Failed to delete service',
            error.message || 'Please try again later.'
          );
          
          throw error;
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Utility methods
      getBusinessById: (businessId: string) => {
        return get().businesses.find(b => b.id === businessId);
      },

      getServiceById: (serviceId: string) => {
        return get().services.find(s => s.id === serviceId);
      },

      isBusinessOwner: (businessId: string) => {
        return get().businesses.some(b => b.id === businessId);
      },
    }),
    {
      name: 'slotwise-business-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentBusiness: state.currentBusiness,
        businesses: state.businesses,
        services: state.services,
      }),
    }
  )
);

export default useBusinessStore;
