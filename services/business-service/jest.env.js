// Jest environment setup
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/slotwise_business_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.NATS_URL = 'nats://localhost:4222';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'error';
process.env.DISABLE_LOGGING = 'true';
