import { config } from '../config/config.js';

describe('Notification Service Configuration', () => {
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

    it('should have JWT configuration', () => {
      expect(config.jwt).toBeDefined();
      expect(config.jwt.secret).toBeDefined();
      expect(typeof config.jwt.secret).toBe('string');
    });

    it('should have email configuration', () => {
      expect(config.email).toBeDefined();
      expect(config.email.provider).toBeDefined();
      expect(typeof config.email.provider).toBe('string');
    });

    it('should have SMS configuration', () => {
      expect(config.sms).toBeDefined();
      expect(config.sms.provider).toBeDefined();
      expect(typeof config.sms.provider).toBe('string');
    });
  });
});
