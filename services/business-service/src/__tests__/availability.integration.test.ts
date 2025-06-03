import Fastify, { FastifyInstance } from 'fastify'; // Updated import
import { prisma } from '../database/prisma';
import { natsConnection } from '../events/nats'; // Will use the Jest mock
import { businessRoutes } from '../routes/business';
// import { serviceRoutes } from '../routes/service'; // Unused import removed
import { DayOfWeek } from '@prisma/client'; // Import DayOfWeek enum
import { errorHandler } from '../middleware/errorHandler';

// Define a simple User interface for testing
interface User {
  id: string;
  email: string;
}

// Mock the auth middleware to inject user
let mockUser: Partial<User> | null = null;
jest.mock('../middleware/auth', () => ({
  authMiddleware: jest.fn(async (app: FastifyInstance) => {
    app.addHook('onRequest', async (request, _reply) => {
      // reply -> _reply
      if (mockUser) {
        (request as any).user = mockUser;
      }
    });
  }),
}));

// Helper to build the test application (similar to services.integration.test.ts)
async function buildTestApp(): Promise<FastifyInstance> {
  const fastify = Fastify(); // Changed from require
  fastify.setErrorHandler(errorHandler);

  // Register the mocked auth middleware
  const { authMiddleware } = await import('../middleware/auth');
  await authMiddleware(fastify);

  // Registering businessRoutes is essential as availability routes are part of it.
  await fastify.register(businessRoutes, { prefix: '/api/v1/businesses' });
  // Service routes might not be strictly necessary if only testing availability under /businesses
  // await fastify.register(serviceRoutes, { prefix: '/api/v1/services' });

  // Ensure NATS mock is connected if necessary (same logic as in service tests)
  if (process.env.NODE_ENV !== 'test_SKIP_NATS_CONNECT') {
    try {
      if (!natsConnection.isConnected()) await natsConnection.connect();
    } catch (e) {
      console.warn('Error during test NATS connect for availability tests:', e);
    }
  }
  return fastify;
}

describe('Availability Management API (/api/v1/businesses/:businessId/availability)', () => {
  let app: FastifyInstance;
  let testBusiness: any;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();

    mockUser = { id: `owner-avail-${Date.now()}`, email: 'avail-owner@example.com' };

    // Create a test business using the real database
    const businessPayload = {
      name: 'Test Business for Availability',
      subdomain: `avail-biz-${Date.now()}`,
      email: 'avail@example.com',
      phone: '1234567890',
      street: '123 Avail St',
      city: 'Availville',
      state: 'AV',
      postalCode: '54321',
      country: 'AC',
      timezone: 'America/New_York',
    };
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/businesses',
      payload: businessPayload,
      headers: { Authorization: 'Bearer testtoken' },
    });
    expect(response.statusCode).toBe(201);
    const responseData = JSON.parse(response.payload);
    expect(responseData.success).toBe(true);
    testBusiness = responseData.data;
    expect(testBusiness.id).toBeDefined();

    // Activate the business for testing (services require ACTIVE status)
    if (testBusiness && testBusiness.id) {
      await prisma.business.update({
        where: { id: testBusiness.id },
        data: { status: 'ACTIVE' }
      });
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (testBusiness && testBusiness.id) {
      try {
        await prisma.availability.deleteMany({ where: { businessId: testBusiness.id } });
        await prisma.business.delete({ where: { id: testBusiness.id } });
      } catch (error) {
        // Ignore cleanup errors - test database will be cleaned up anyway
        console.warn('Cleanup error (ignored):', error);
      }
    }
    mockUser = null;
    if (natsConnection.isConnected()) {
      await natsConnection.close();
    }
  });

  beforeEach(async () => {
    // Mock the publish method directly on the natsConnection instance
    if (natsConnection.publish) {
      (natsConnection.publish as jest.Mock).mockClear();
    }
    // Clear existing availability rules for the test business before each test
    if (testBusiness && testBusiness.id) {
      await prisma.availability.deleteMany({ where: { businessId: testBusiness.id } });
    }
  });

  describe('POST /api/v1/businesses/:businessId/availability (Set/Update Availability)', () => {
    it('should set new availability rules and publish NATS event', async () => {
      const availabilityPayload = {
        rules: [
          { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '10:00', endTime: '16:00' },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/businesses/${testBusiness.id}/availability`,
        payload: availabilityPayload,
        headers: { Authorization: 'Bearer testtoken' },
      });

      expect(response.statusCode).toBe(200); // AvailabilityService returns 200 on set
      const responseBody = JSON.parse(response.payload);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toBeInstanceOf(Array);
      expect(responseBody.data.length).toBe(2);
      expect(responseBody.data[0].dayOfWeek).toBe(DayOfWeek.MONDAY);

      // Verify database records
      const dbRules = await prisma.availability.findMany({
        where: { businessId: testBusiness.id },
      });
      expect(dbRules.length).toBe(2);
      expect(dbRules.some(r => r.dayOfWeek === DayOfWeek.MONDAY && r.startTime === '09:00')).toBe(
        true
      );

      // Verify NATS event
      expect(natsConnection.publish).toHaveBeenCalledTimes(1);
      const publishCall = (natsConnection.publish as jest.Mock).mock.calls[0];
      expect(publishCall[0]).toBe('business.availability.updated');
      const natsPayload = publishCall[1];
      expect(natsPayload.businessId).toBe(testBusiness.id);
      expect(natsPayload.rules.length).toBe(2);
      expect(natsPayload.rules[0].dayOfWeek).toBe(DayOfWeek.MONDAY);
    });

    it('should replace existing rules when new rules are set', async () => {
      // First set initial rules
      await app.inject({
        method: 'POST',
        url: `/api/v1/businesses/${testBusiness.id}/availability`,
        payload: {
          rules: [{ dayOfWeek: DayOfWeek.TUESDAY, startTime: '08:00', endTime: '12:00' }],
        },
        headers: { Authorization: 'Bearer testtoken' },
      });
      // Clear mock from previous call
      (natsConnection.publish as jest.Mock).mockClear();

      const newAvailabilityPayload = {
        rules: [{ dayOfWeek: DayOfWeek.FRIDAY, startTime: '13:00', endTime: '18:00' }],
      };
      await app.inject({
        method: 'POST',
        url: `/api/v1/businesses/${testBusiness.id}/availability`,
        payload: newAvailabilityPayload,
        headers: { Authorization: 'Bearer testtoken' },
      });

      const dbRules = await prisma.availability.findMany({
        where: { businessId: testBusiness.id },
      });
      expect(dbRules.length).toBe(1);
      expect(dbRules[0].dayOfWeek).toBe(DayOfWeek.FRIDAY);
      expect(natsConnection.publish).toHaveBeenCalledTimes(1); // NATS event for the second update
    });

    it('should return 400 for invalid rule (e.g., startTime after endTime)', async () => {
      const invalidPayload = {
        rules: [{ dayOfWeek: DayOfWeek.MONDAY, startTime: '18:00', endTime: '10:00' }],
      };
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/businesses/${testBusiness.id}/availability`,
        payload: invalidPayload,
        headers: { Authorization: 'Bearer testtoken' },
      });
      expect(response.statusCode).toBe(400); // Based on AvailabilityService error handling
    });

    it('should return 404 if business not found or user not owner', async () => {
      const originalUser = mockUser;
      mockUser = { id: 'other-user', email: 'other@example.com' };
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/businesses/${testBusiness.id}/availability`,
        payload: { rules: [] },
        headers: { Authorization: 'Bearer testtoken' },
      });
      expect(response.statusCode).toBe(404);
      mockUser = originalUser;
    });
  });

  describe('GET /api/v1/businesses/:businessId/availability (Get Availability)', () => {
    beforeEach(async () => {
      // Ensure some rules exist
      await prisma.availability.createMany({
        data: [
          {
            businessId: testBusiness.id,
            dayOfWeek: DayOfWeek.THURSDAY,
            startTime: '10:00',
            endTime: '14:00',
          },
          {
            businessId: testBusiness.id,
            dayOfWeek: DayOfWeek.THURSDAY,
            startTime: '15:00',
            endTime: '19:00',
          },
        ],
      });
    });

    it('should retrieve availability rules for a given business', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/businesses/${testBusiness.id}/availability`,
        headers: { Authorization: 'Bearer testtoken' }, // Assuming GET might also be owner-scoped by default in service
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);
      expect(
        body.data.some((r: any) => r.dayOfWeek === DayOfWeek.THURSDAY && r.startTime === '10:00')
      ).toBe(true);
    });

    it('should return 404 if business not found for GET', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/businesses/non-existent-id/availability`,
        headers: { Authorization: 'Bearer testtoken' },
      });
      expect(response.statusCode).toBe(404); // Service method getAvailability throws error
    });
  });
});
