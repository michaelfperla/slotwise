import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Setup test database, mocks, etc.
});

afterAll(async () => {
  // Cleanup after all tests
});

// Mock external dependencies
jest.mock('nats', () => ({
  connect: jest.fn().mockResolvedValue({
    publish: jest.fn(),
    subscribe: jest.fn(),
    close: jest.fn(),
  }),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    disconnect: jest.fn(),
  }));
});
