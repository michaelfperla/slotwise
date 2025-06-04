import Fastify, { FastifyInstance } from 'fastify';
import { businessNotificationSettingsRoutes } from '../businessNotificationSettingsRoutes';
// import { logger } from '../../utils/logger.js'; // Commented out as it's not used in tests

// Suppress logger output during tests if desired
// jest.spyOn(logger, 'info').mockImplementation(() => {});
// jest.spyOn(logger, 'error').mockImplementation(() => {});


// Helper to build the Fastify app for testing
const buildApp = (): FastifyInstance => {
  const app = Fastify();
  // Register the routes you want to test.
  // The prefix here should match how it's registered in the actual app.
  // In index.ts, it's registered with prefix '/api/v1'.
  // The route itself is '/businesses/:businessId/notifications/settings'.
  // So, the full path tested will be '/api/v1/businesses/:businessId/notifications/settings'.
  app.register(businessNotificationSettingsRoutes, { prefix: '/api/v1' });
  return app;
};

describe('Business Notification Settings Routes (/api/v1/businesses/:businessId/notifications/settings)', () => {
  let app: FastifyInstance;

  beforeAll(async () => { // Use beforeAll if app can be reused across tests in this file
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return notification settings for a known businessId', async () => {
    const businessId = 'business123'; // This ID exists in the mock store in the route file
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/businesses/${businessId}/notifications/settings`,
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload.businessId).toBe(businessId);
    expect(payload.receiveBookingConfirmations).toBe(true); // Based on mock data
    expect(payload.reminderLeadTimeHours).toBe(48);      // Based on mock data
    expect(payload.preferredChannels).toEqual(['email', 'sms']); // Based on mock data
  });

  it('should return default settings for an unknown businessId', async () => {
    const businessId = 'unknownBusiness999'; // This ID does not exist in the mock store
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/businesses/${businessId}/notifications/settings`,
    });

    expect(response.statusCode).toBe(200); // Route returns default for unknown IDs
    const payload = JSON.parse(response.payload);
    expect(payload.businessId).toBe(businessId);
    // Check against default values defined in businessNotificationSettingsRoutes.ts
    expect(payload.receiveBookingConfirmations).toBe(false);
    expect(payload.reminderLeadTimeHours).toBe(24);
    expect(payload.preferredChannels).toEqual(['email']);
  });

  // Example of how to test for a 404 if the route was designed to return 404 for unknown instead of defaults.
  // it('should return 404 for an unknown businessId if defaults were not returned', async () => {
  //   // This test would apply if the route handler for unknown businessId was:
  //   // return reply.code(404).send({ success: false, message: `Settings for business ${businessId} not found.` });
  //   const businessId = 'unknownBusiness999';
  //   const response = await app.inject({
  //     method: 'GET',
  //     url: `/api/v1/businesses/${businessId}/notifications/settings`,
  //   });
  //   expect(response.statusCode).toBe(404);
  //   const payload = JSON.parse(response.payload);
  //   expect(payload.success).toBe(false);
  //   expect(payload.message).toContain('not found');
  // });

  // Test for invalid businessId format if schema enforced it (e.g. UUID)
  // Current schema in route is z.string().min(1), so any non-empty string is fine for the param itself.
  // Fastify handles cases where param doesn't match schema with a 400 automatically.
});
