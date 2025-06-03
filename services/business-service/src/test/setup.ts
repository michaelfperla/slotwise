import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Setup test environment
});

afterAll(async () => {
  // Cleanup after all tests
});

// Mock external dependencies
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-id-' + Date.now()),
}));

jest.mock('nats', () => ({
  connect: jest.fn().mockResolvedValue({
    publish: jest.fn(),
    subscribe: jest.fn(),
    close: jest.fn(),
    closed: jest.fn().mockResolvedValue(null),
    isClosed: jest.fn().mockReturnValue(false),
  }),
  JSONCodec: jest.fn().mockReturnValue({
    encode: jest.fn(data => JSON.stringify(data)),
    decode: jest.fn(data => JSON.parse(data)),
  }),
}));

// Mock the NATS connection class methods
jest.mock('../events/nats', () => ({
  natsConnection: {
    connect: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
  },
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    disconnect: jest.fn(),
  }));
});
