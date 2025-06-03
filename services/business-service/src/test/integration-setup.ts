import { config } from 'dotenv';
import { existsSync } from 'fs';

// Load integration test environment variables if file exists
const integrationEnvPath = '.env.integration';
if (existsSync(integrationEnvPath)) {
  config({ path: integrationEnvPath });
} else {
  // Use default environment variables for CI
  config();
}

// Global integration test setup
beforeAll(async () => {
  // Setup test database connections
  // Initialize NATS connection
  // Setup Redis connection
  console.log('Setting up integration test environment...');
});

afterAll(async () => {
  // Cleanup database
  // Close NATS connection
  // Close Redis connection
  console.log('Cleaning up integration test environment...');
});

// Integration test utilities
export const waitForService = async (url: string, timeout = 10000): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Service at ${url} not ready within ${timeout}ms`);
};

export const createTestUser = async () => {
  // Helper to create test user for integration tests
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  };
};

export const cleanupTestData = async () => {
  // Helper to cleanup test data after integration tests
  console.log('Cleaning up test data...');
};
