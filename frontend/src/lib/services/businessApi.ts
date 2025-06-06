/**
 * Business Service API
 * 
 * This module provides functions for interacting with the Business Service API.
 * Handles business management, services, and related operations.
 */

import {
  Business,
  CreateBusinessRequest,
  Service,
  CreateServiceRequest,
  ListBusinessesParams,
  ListServicesParams,
  ApiResponse,
} from '@/types/api';
import { businessClient, get, post, put, patch, del } from '@/lib/apiClient';

/**
 * Business management API functions
 */
export const businessApi = {
  /**
   * Create a new business
   */
  async createBusiness(businessData: CreateBusinessRequest): Promise<Business> {
    return post<Business>(businessClient, '/businesses', businessData);
  },

  /**
   * Get business by ID
   */
  async getBusiness(businessId: string): Promise<Business> {
    return get<Business>(businessClient, `/businesses/${businessId}`);
  },

  /**
   * Get business by subdomain (public endpoint)
   */
  async getBusinessBySubdomain(subdomain: string): Promise<Business> {
    return get<Business>(businessClient, `/businesses/subdomain/${subdomain}`);
  },

  /**
   * Get current user's businesses
   */
  async getMyBusinesses(params?: ListBusinessesParams): Promise<Business[]> {
    return get<Business[]>(businessClient, '/businesses/me', params);
  },

  /**
   * List all businesses (admin only)
   */
  async listBusinesses(params?: ListBusinessesParams): Promise<{
    businesses: Business[];
    pagination: any;
  }> {
    return get(businessClient, '/businesses', params);
  },

  /**
   * Update business
   */
  async updateBusiness(
    businessId: string, 
    updates: Partial<CreateBusinessRequest>
  ): Promise<Business> {
    return put<Business>(businessClient, `/businesses/${businessId}`, updates);
  },

  /**
   * Delete business
   */
  async deleteBusiness(businessId: string): Promise<void> {
    return del<void>(businessClient, `/businesses/${businessId}`);
  },

  /**
   * Activate business
   */
  async activateBusiness(businessId: string): Promise<Business> {
    return post<Business>(businessClient, `/businesses/${businessId}/activate`);
  },

  /**
   * Suspend business
   */
  async suspendBusiness(businessId: string): Promise<Business> {
    return post<Business>(businessClient, `/businesses/${businessId}/suspend`);
  },
};

/**
 * Service management API functions
 */
export const serviceApi = {
  /**
   * Create a new service
   */
  async createService(serviceData: CreateServiceRequest): Promise<Service> {
    return post<Service>(businessClient, '/services', serviceData);
  },

  /**
   * Get service by ID
   */
  async getService(serviceId: string): Promise<Service> {
    return get<Service>(businessClient, `/services/${serviceId}`);
  },

  /**
   * List services
   */
  async listServices(params?: ListServicesParams): Promise<{
    services: Service[];
    pagination: any;
  }> {
    return get(businessClient, '/services', params);
  },

  /**
   * Get services for a specific business
   */
  async getBusinessServices(businessId: string): Promise<Service[]> {
    return get<Service[]>(businessClient, `/businesses/${businessId}/services`);
  },

  /**
   * Update service
   */
  async updateService(
    serviceId: string, 
    updates: Partial<CreateServiceRequest>
  ): Promise<Service> {
    return put<Service>(businessClient, `/services/${serviceId}`, updates);
  },

  /**
   * Delete service
   */
  async deleteService(serviceId: string): Promise<void> {
    return del<void>(businessClient, `/services/${serviceId}`);
  },

  /**
   * Activate service
   */
  async activateService(serviceId: string): Promise<Service> {
    return post<Service>(businessClient, `/services/${serviceId}/activate`);
  },

  /**
   * Deactivate service
   */
  async deactivateService(serviceId: string): Promise<Service> {
    return post<Service>(businessClient, `/services/${serviceId}/deactivate`);
  },

  /**
   * Publish service (make it publicly bookable)
   */
  async publishService(serviceId: string): Promise<Service> {
    return post<Service>(businessClient, `/services/${serviceId}/publish`);
  },

  /**
   * Unpublish service
   */
  async unpublishService(serviceId: string): Promise<Service> {
    return post<Service>(businessClient, `/services/${serviceId}/unpublish`);
  },
};

/**
 * Business analytics API functions
 */
export const analyticsApi = {
  /**
   * Get business revenue data
   */
  async getBusinessRevenue(businessId: string, params?: {
    startDate?: string;
    endDate?: string;
    period?: 'day' | 'week' | 'month' | 'year';
  }): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    recentPayments: any[];
  }> {
    return get(businessClient, `/businesses/${businessId}/revenue`, params);
  },

  /**
   * Get business analytics
   */
  async getBusinessAnalytics(businessId: string, params?: {
    startDate?: string;
    endDate?: string;
    metrics?: string[];
  }): Promise<{
    bookings: any;
    revenue: any;
    customers: any;
    services: any;
  }> {
    return get(businessClient, `/businesses/${businessId}/analytics`, params);
  },

  /**
   * Get booking trends
   */
  async getBookingTrends(businessId: string, params?: {
    period?: 'week' | 'month' | 'quarter' | 'year';
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    trends: Array<{
      date: string;
      bookings: number;
      revenue: number;
    }>;
  }> {
    return get(businessClient, `/businesses/${businessId}/analytics/bookings`, params);
  },

  /**
   * Get service performance
   */
  async getServicePerformance(businessId: string): Promise<{
    services: Array<{
      serviceId: string;
      serviceName: string;
      bookings: number;
      revenue: number;
      averageRating?: number;
    }>;
  }> {
    return get(businessClient, `/businesses/${businessId}/analytics/services`);
  },
};

/**
 * Business utility functions
 */
export const businessUtils = {
  /**
   * Format business subdomain
   */
  formatSubdomain(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },

  /**
   * Validate subdomain format
   */
  isValidSubdomain(subdomain: string): boolean {
    const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    return pattern.test(subdomain) && subdomain.length >= 3 && subdomain.length <= 50;
  },

  /**
   * Format business URL
   */
  getBusinessUrl(subdomain: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/${subdomain}`;
  },

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100); // Convert from cents
  },

  /**
   * Get business status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending_setup':
        return 'text-yellow-600 bg-yellow-100';
      case 'suspended':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  },

  /**
   * Calculate service duration in human readable format
   */
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }
    
    return `${hours} hr ${remainingMinutes} min`;
  },
};

export default businessApi;
