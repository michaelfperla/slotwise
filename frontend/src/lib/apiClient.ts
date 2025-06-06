/**
 * Central API Client for SlotWise Frontend
 * 
 * This module provides a centralized HTTP client with interceptors for
 * authentication, error handling, and request/response transformation.
 * 
 * Following SlotWise coding standards and architecture patterns.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, ApiResponse } from '@/types/api';

// Environment configuration
const API_CONFIG = {
  AUTH_SERVICE_URL: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:8001',
  BUSINESS_SERVICE_URL: process.env.NEXT_PUBLIC_BUSINESS_SERVICE_URL || 'http://localhost:8003',
  SCHEDULING_SERVICE_URL: process.env.NEXT_PUBLIC_SCHEDULING_SERVICE_URL || 'http://localhost:8002',
  NOTIFICATION_SERVICE_URL: process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL || 'http://localhost:8004',
  TIMEOUT: 30000, // 30 seconds
};

/**
 * Create an axios instance for a specific service
 */
function createServiceClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL: `${baseURL}/api/v1`,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for authentication
  client.interceptors.request.use(
    (config) => {
      // Get token from localStorage (will be replaced with Zustand store)
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      
      // Add correlation ID for request tracking
      config.headers['X-Correlation-ID'] = generateCorrelationId();
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling and token refresh
  client.interceptors.response.use(
    (response: AxiosResponse<ApiResponse<any>>) => {
      // Transform successful responses
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 Unauthorized - attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          await refreshAccessToken();
          
          // Retry original request with new token
          const token = localStorage.getItem('accessToken');
          if (token) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }

      // Transform error response
      const apiError: ApiError = new Error(
        error.response?.data?.message || error.message || 'An unexpected error occurred'
      ) as ApiError;
      
      apiError.status = error.response?.status || 500;
      apiError.code = error.response?.data?.error || 'UNKNOWN_ERROR';
      apiError.details = error.response?.data?.details;

      // Log error for debugging
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: apiError.status,
        code: apiError.code,
        message: apiError.message,
      });

      return Promise.reject(apiError);
    }
  );

  return client;
}

/**
 * Service-specific API clients
 */
export const authClient = createServiceClient(API_CONFIG.AUTH_SERVICE_URL);
export const businessClient = createServiceClient(API_CONFIG.BUSINESS_SERVICE_URL);
export const schedulingClient = createServiceClient(API_CONFIG.SCHEDULING_SERVICE_URL);
export const notificationClient = createServiceClient(API_CONFIG.NOTIFICATION_SERVICE_URL);

/**
 * Generic API client (defaults to auth service for backwards compatibility)
 */
export const apiClient = authClient;

/**
 * Utility functions
 */

/**
 * Generate a unique correlation ID for request tracking
 */
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post(
      `${API_CONFIG.AUTH_SERVICE_URL}/api/v1/auth/refresh`,
      { refreshToken },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: API_CONFIG.TIMEOUT,
      }
    );

    if (response.data.success) {
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
    } else {
      throw new Error('Token refresh failed');
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
}

/**
 * Helper function to handle API responses
 */
export function handleApiResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
  if (response.data.success) {
    return response.data.data;
  } else {
    throw new Error(response.data.message || 'API request failed');
  }
}

/**
 * Helper function to create query string from parameters
 */
export function createQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
}

/**
 * Type-safe wrapper for GET requests
 */
export async function get<T>(
  client: AxiosInstance,
  url: string,
  params?: Record<string, any>,
  config?: AxiosRequestConfig
): Promise<T> {
  const queryString = params ? createQueryString(params) : '';
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  
  const response = await client.get<ApiResponse<T>>(fullUrl, config);
  return handleApiResponse(response);
}

/**
 * Type-safe wrapper for POST requests
 */
export async function post<T>(
  client: AxiosInstance,
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await client.post<ApiResponse<T>>(url, data, config);
  return handleApiResponse(response);
}

/**
 * Type-safe wrapper for PUT requests
 */
export async function put<T>(
  client: AxiosInstance,
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await client.put<ApiResponse<T>>(url, data, config);
  return handleApiResponse(response);
}

/**
 * Type-safe wrapper for PATCH requests
 */
export async function patch<T>(
  client: AxiosInstance,
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await client.patch<ApiResponse<T>>(url, data, config);
  return handleApiResponse(response);
}

/**
 * Type-safe wrapper for DELETE requests
 */
export async function del<T>(
  client: AxiosInstance,
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await client.delete<ApiResponse<T>>(url, config);
  return handleApiResponse(response);
}

export default apiClient;
