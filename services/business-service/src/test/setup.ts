import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set up test database URL for PostgreSQL
const TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/slotwise_business_test';
process.env.DATABASE_URL = TEST_DATABASE_URL;

let prisma: PrismaClient;

// Global test setup
beforeAll(async () => {
  // Initialize Prisma client for tests
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: TEST_DATABASE_URL,
      },
    },
  });

  try {
    // Try to connect and create database if it doesn't exist
    await prisma.$connect();
  } catch {
    // If connection fails, try to create the database
    try {
      const adminPrisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://postgres:postgres@localhost:5432/postgres',
          },
        },
      });

      await adminPrisma.$executeRawUnsafe('CREATE DATABASE slotwise_business_test');
      await adminPrisma.$disconnect();

      // Now connect to the test database
      await prisma.$connect();
    } catch {
      console.warn('Could not create test database, it may already exist');
    }
  }

  // Run Prisma migrations for test database
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    });
  } catch {
    // If migrations fail, try to push the schema
    try {
      execSync('npx prisma db push --force-reset', {
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      });
    } catch {
      console.warn('Could not set up test database schema, tests may fail');
    }
  }
});

afterAll(async () => {
  // Cleanup after all tests
  if (prisma) {
    // Clean up test data
    try {
      await prisma.$executeRawUnsafe(
        'TRUNCATE TABLE businesses, services, availabilities RESTART IDENTITY CASCADE'
      );
    } catch {
      console.warn('Could not clean up test data');
    }

    await prisma.$disconnect();
  }
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
