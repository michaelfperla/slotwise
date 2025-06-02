import { config } from '../config';

describe('Business Service Configuration', () => {
  describe('when loading configuration', () => {
    it('should have default port configuration', () => {
      expect(config.port).toBeDefined();
      expect(typeof config.port).toBe('number');
    });

    it('should have database configuration', () => {
      expect(config.database).toBeDefined();
      expect(config.database.url).toBeDefined();
      expect(typeof config.database.url).toBe('string');
    });

    it('should have NATS configuration', () => {
      expect(config.nats).toBeDefined();
      expect(config.nats.url).toBeDefined();
      expect(typeof config.nats.url).toBe('string');
    });

    it('should have Redis configuration', () => {
      expect(config.redis).toBeDefined();
      expect(config.redis.url).toBeDefined();
      expect(typeof config.redis.url).toBe('string');
    });

    it('should have CORS configuration', () => {
      expect(config.cors).toBeDefined();
      expect(config.cors.origins).toBeDefined();
      expect(Array.isArray(config.cors.origins)).toBe(true);
    });

    it('should have rate limiting configuration', () => {
      expect(config.rateLimit).toBeDefined();
      expect(config.rateLimit.max).toBeDefined();
      expect(typeof config.rateLimit.max).toBe('number');
      expect(config.rateLimit.timeWindow).toBeDefined();
      expect(typeof config.rateLimit.timeWindow).toBe('number');
    });

    it('should have JWT configuration', () => {
      expect(config.jwt).toBeDefined();
      expect(config.jwt.secret).toBeDefined();
      expect(typeof config.jwt.secret).toBe('string');
    });
  });
});
