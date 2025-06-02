import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8003'),
  host: process.env.HOST || '0.0.0.0',
  environment: process.env.NODE_ENV || 'development',

  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://slotwise_business_user:slotwise_business_password@localhost:5432/slotwise_business',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
  },

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_TIME_WINDOW || '60000'),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
