import { config } from 'dotenv';

// Load E2E test environment variables
config({ path: '.env.e2e' });

// E2E test utilities
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
export const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8001';
export const BUSINESS_SERVICE_URL = process.env.BUSINESS_SERVICE_URL || 'http://localhost:8003';
export const SCHEDULING_SERVICE_URL = process.env.SCHEDULING_SERVICE_URL || 'http://localhost:8002';
export const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8004';

// Test data helpers
export const createTestBusiness = () => ({
  name: 'Test Business',
  subdomain: 'test-business',
  email: 'test@business.com',
  timezone: 'America/New_York'
});

export const createTestService = () => ({
  name: 'Test Service',
  duration: 60,
  price: 100,
  description: 'A test service for E2E testing'
});

export const createTestBooking = () => ({
  serviceId: 'test-service-id',
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  customerName: 'Test Customer',
  customerEmail: 'customer@test.com',
  customerPhone: '+1234567890'
});

// API helpers
export const makeApiRequest = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

export const waitForServices = async (timeout = 30000) => {
  const services = [
    AUTH_SERVICE_URL,
    BUSINESS_SERVICE_URL,
    SCHEDULING_SERVICE_URL,
    NOTIFICATION_SERVICE_URL
  ];
  
  const start = Date.now();
  
  for (const serviceUrl of services) {
    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(`${serviceUrl}/health`);
        if (response.ok) break;
      } catch (error) {
        // Service not ready
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};
