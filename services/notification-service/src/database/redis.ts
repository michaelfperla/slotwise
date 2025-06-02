import Redis from 'ioredis';
import { config } from '../config/config';

export const redisClient = new Redis(config.redis.url, {
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true
});

redisClient.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('ready', () => {
  console.log('Redis is ready');
});
