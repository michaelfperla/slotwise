// Jest environment setup
process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/slotwise_notification_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.NATS_URL = 'nats://localhost:4222';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.PORT = '3002';
process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
process.env.FROM_EMAIL = 'test@slotwise.com';
process.env.FROM_NAME = 'SlotWise Test';
process.env.LOG_LEVEL = 'error';
process.env.DISABLE_LOGGING = 'true';
