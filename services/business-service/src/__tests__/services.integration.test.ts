import Fastify, { FastifyInstance } from 'fastify'; // Updated import
import { prisma } from '../database/prisma';
import { natsConnection } from '../events/nats'; // Will use the Jest mock due to setup.ts
import { businessRoutes } from '../routes/business'; // For potential business creation prerequisite
import { serviceRoutes } from '../routes/service';
import { errorHandler } from '../middleware/errorHandler';
import { User } from '@prisma/client'; // Assuming User type might be needed for request.user

// Mock the auth middleware to inject user
let mockUser: Partial<User> | null = null; // Define User based on your actual user model structure if available
jest.mock('../middleware/auth', () => ({
  authMiddleware: jest.fn(async (app: FastifyInstance) => {
    app.addHook('onRequest', async (request, _reply) => {
      // reply -> _reply
      if (mockUser) {
        (request as any).user = mockUser;
      } else {
        // If no mockUser is set, simulate unauthorized for protected routes
        // For public routes this won't matter.
        // For protected routes, if a test needs unauth, set mockUser = null
      }
    });
  }),
}));

// Helper to build the test application
async function buildTestApp(): Promise<FastifyInstance> {
  const fastify = Fastify(); // Changed from require

  // Minimal essential plugins for testing routes
  fastify.setErrorHandler(errorHandler);

  // Register the mocked auth middleware
  // The jest.mock above should handle this globally for all imports of authMiddleware
  // If not, explicit registration might be needed:
  // await fastify.register(require('../middleware/auth').authMiddleware);
  // For now, relying on global mock.

  // Register routes
  // Prefix must match how they are registered in the main app (src/index.ts)
  await fastify.register(businessRoutes, { prefix: '/api/v1/businesses' });
  await fastify.register(serviceRoutes, { prefix: '/api/v1/services' });

  // Ensure NATS (mock) connection is "established" if your app awaits it.
  // The actual mock in setup.ts makes connect resolve.
  // If natsConnection.connect() is called in your main app startup before routes,
  // ensure a similar call or state for tests if routes depend on it being connected.
  // Our natsConnection is a singleton, connect is called in src/index.ts.
  // For tests, we might need to ensure it's called or mock its connected state.
  // The jest mock for 'nats' ensures that `natsConnection.connection.publish` is a jest.fn().
  // We need to ensure `natsConnection.connect()` is called if the service methods check `isConnected()`.
  // For simplicity, let's assume the singleton `natsConnection` from `src/events/nats.ts`
  // will use the mocked `connect` from `nats` package due to `setup.ts`.
  // If `natsConnection.connect()` itself needs to be called:
  if (!natsConnection.isConnected()) {
    // This might try to connect to a real NATS if the mock isn't perfect for the class wrapper
    // Let's rely on the jest.mock('nats') to handle the publish calls correctly via the wrapped connection.
    // The NATSConnection class uses the library 'nats', so its `connect` method will use the mocked one.
    // Let's assume it gets connected via app bootstrap or test setup.
  }

  return fastify;
}

describe('Service Management API (/api/v1/services)', () => {
  let app: FastifyInstance;
  let testBusiness: any; // Store created business for tests

  beforeAll(async () => {
    // Initialize the app once for all tests in this suite
    app = await buildTestApp();
    await app.ready(); // Ensure all plugins and routes are loaded

    // It's often good practice to ensure NATS connection (the mock) is ready
    // The NATSConnection class has an async connect method.
    // If it's not called by app build, call it here.
    // However, the actual publish happens on `natsConnection.connection.publish`
    // which *is* the jest mock. So direct call to `natsConnection.connect()` might not be needed
    // if the underlying `this.connection` inside `NATSConnection` gets set to the mocked client.
    // This depends on the timing and execution flow.
    // The mock in `setup.ts` is `connect: jest.fn().mockResolvedValue({ publish: jest.fn() ... })`
    // So `natsConnection.connect()` will resolve and set `this.connection` to the object with mock publish.
    if (process.env.NODE_ENV !== 'test_SKIP_NATS_CONNECT') {
      // Allow skipping if problematic
      try {
        await natsConnection.connect(); // Ensure our wrapper's connect is called
      } catch (e) {
        console.warn(
          'Error during test NATS connect, this might be fine if publish is mocked directly:',
          e
        );
      }
    }

    // Create a prerequisite Business for service tests
    // This requires /api/v1/businesses to be working or direct DB seeding.
    // For integration tests, using the API is better.
    mockUser = { id: 'test-owner-id', email: 'owner@example.com' }; // Simulate logged-in user

    const businessPayload = {
      name: 'Test Business for Services',
      description: 'A business for testing services',
      subdomain: `test-biz-${Date.now()}`, // Unique subdomain
      email: 'bizservices@example.com',
      phone: '1234567890',
      street: '123 Test St',
      city: 'Testville',
      state: 'TS',
      postalCode: '12345',
      country: 'TC',
      timezone: 'UTC',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/businesses', // Create business
      payload: businessPayload,
      headers: { Authorization: 'Bearer testtoken' }, // Token content doesn't matter due to mock
    });

    expect(response.statusCode).toBe(201); // Ensure business created
    testBusiness = JSON.parse(response.payload).data;
    expect(testBusiness.id).toBeDefined();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    // Clean up database (e.g., delete the test business and its services)
    if (testBusiness) {
      await prisma.service.deleteMany({ where: { businessId: testBusiness.id } });
      await prisma.business.delete({ where: { id: testBusiness.id } });
    }
    mockUser = null;
    if (natsConnection.isConnected()) {
      await natsConnection.close(); // Close the mock connection if it was opened
    }
  });

  beforeEach(async () => {
    // Clear NATS mock calls before each test
    if (natsConnection.isConnected() && natsConnection.connection?.publish) {
      (natsConnection.connection.publish as jest.Mock).mockClear();
    }
    // Clear any other per-test mocks if necessary
  });

  describe('POST /api/v1/services (Create Service)', () => {
    it("should create a new service for the authenticated user's business and publish NATS event", async () => {
      // mockUser is already set to an owner of testBusiness by beforeAll setup implicitly
      // (ownerId in BusinessService create is taken from request.user.id)
      // The ServiceService createService uses request.user.id to find the business.

      const servicePayload = {
        name: 'Test Service 1',
        description: 'A great service',
        duration: 60, // minutes
        price: 100.5,
        currency: 'USD',
        isActive: true,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/services',
        payload: servicePayload,
        headers: { Authorization: 'Bearer testtoken' }, // User context is set by mockUser
      });

      expect(response.statusCode).toBe(201);
      const responseBody = JSON.parse(response.payload);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.id).toBeDefined();
      expect(responseBody.data.name).toBe(servicePayload.name);
      expect(responseBody.data.businessId).toBe(testBusiness.id); // ServiceService links it to user's business

      // Verify database record
      const dbService = await prisma.service.findUnique({ where: { id: responseBody.data.id } });
      expect(dbService).not.toBeNull();
      expect(dbService?.name).toBe(servicePayload.name);
      expect(dbService?.businessId).toBe(testBusiness.id);

      // Verify NATS event
      // Ensure natsConnection.connection is defined and is the mock
      expect(natsConnection.connection?.publish).toHaveBeenCalledTimes(1);
      const publishCall = (natsConnection.connection?.publish as jest.Mock).mock.calls[0];
      expect(publishCall[0]).toBe('business.service.created'); // Subject
      const natsPayload = JSON.parse(new TextDecoder().decode(publishCall[1])); // Decode Uint8Array

      expect(natsPayload.serviceId).toBe(dbService?.id);
      expect(natsPayload.businessId).toBe(testBusiness.id);
      expect(natsPayload.serviceDetails.name).toBe(servicePayload.name);
      expect(natsPayload.serviceDetails.durationMinutes).toBe(servicePayload.duration);
      // Price is Decimal in DB, float in event. Prisma returns Decimal object.
      // The service code converts price.toNumber() for the event.
      expect(natsPayload.serviceDetails.price).toBe(servicePayload.price);
    });

    it('should return 401 if user is not authenticated', async () => {
      const originalUser = mockUser;
      mockUser = null; // Simulate no user
      const servicePayload = { name: 'Unauth Service', duration: 30, price: 10 };
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/services',
        payload: servicePayload,
        // No Authorization header or mockUser results in no request.user
      });
      // The authMiddleware mock doesn't explicitly return 401, it just doesn't set request.user.
      // The route handler in service.ts then checks request.user and returns 401.
      expect(response.statusCode).toBe(401);
      mockUser = originalUser; // Restore user for other tests
    });
  });

  // TODO: Add tests for Availability Management endpoints
});

describe('GET /api/v1/services (List Services)', () => {
  let app: FastifyInstance;
  let testBusiness: any;
  let service1: any, service2: any;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
    mockUser = { id: `owner-${Date.now()}`, email: 'list-owner@example.com' };

    const bizResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/businesses',
      payload: {
        name: 'List Test Biz',
        subdomain: `list-biz-${Date.now()}`,
        email: 'list@biz.com',
        phone: '111',
        street: 's',
        city: 'c',
        state: 's',
        postalCode: 'pc',
        country: 'c',
        timezone: 'UTC',
      },
      headers: { Authorization: 'Bearer testtoken' },
    });
    testBusiness = JSON.parse(bizResponse.payload).data;

    const servicePayload1 = {
      name: 'Service A',
      duration: 30,
      price: 300,
      businessId: testBusiness.id,
    };
    const servicePayload2 = {
      name: 'Service B',
      duration: 60,
      price: 600,
      businessId: testBusiness.id,
    };

    // Create services using the actual POST endpoint to ensure they are linked to testBusiness via user
    const resp1 = await app.inject({
      method: 'POST',
      url: '/api/v1/services',
      payload: servicePayload1,
      headers: { Authorization: 'Bearer testtoken' },
    });
    service1 = JSON.parse(resp1.payload).data;
    const resp2 = await app.inject({
      method: 'POST',
      url: '/api/v1/services',
      payload: servicePayload2,
      headers: { Authorization: 'Bearer testtoken' },
    });
    service2 = JSON.parse(resp2.payload).data;
  });

  afterAll(async () => {
    await prisma.service.deleteMany({ where: { businessId: testBusiness.id } });
    await prisma.business.delete({ where: { id: testBusiness.id } });
    if (app) await app.close();
    mockUser = null;
  });

  it("should list services for the authenticated user's business", async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/services', // This endpoint in ServiceService uses user.id to find business
      headers: { Authorization: 'Bearer testtoken' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(2); // service1 and service2
    expect(body.data.some((s: any) => s.id === service1.id)).toBe(true);
    expect(body.data.some((s: any) => s.id === service2.id)).toBe(true);
  });
});

describe('GET /api/v1/services/:serviceId (Get Service by ID)', () => {
  let app: FastifyInstance;
  let testBusiness: any;
  let testService: any;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
    mockUser = { id: `owner-get-${Date.now()}`, email: 'get-owner@example.com' };

    const bizResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/businesses',
      payload: {
        name: 'Get Test Biz',
        subdomain: `get-biz-${Date.now()}`,
        email: 'get@biz.com',
        phone: '1',
        street: 's',
        city: 'c',
        state: 's',
        postalCode: 'pc',
        country: 'c',
        timezone: 'UTC',
      },
      headers: { Authorization: 'Bearer testtoken' },
    });
    testBusiness = JSON.parse(bizResponse.payload).data;

    const servicePayload = { name: 'Specific Service', duration: 45, price: 450 };
    const servResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/services',
      payload: servicePayload,
      headers: { Authorization: 'Bearer testtoken' },
    });
    testService = JSON.parse(servResponse.payload).data;
  });

  afterAll(async () => {
    if (testService) await prisma.service.delete({ where: { id: testService.id } });
    if (testBusiness) await prisma.business.delete({ where: { id: testBusiness.id } });
    if (app) await app.close();
    mockUser = null;
  });

  it("should get a specific service by ID if it belongs to the user's business", async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/services/${testService.id}`,
      headers: { Authorization: 'Bearer testtoken' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(testService.id);
    expect(body.data.name).toBe('Specific Service');
  });

  it('should return 404 if service not found or does not belong to user', async () => {
    const otherUser = mockUser; // Store current mock user
    mockUser = { id: 'other-user-id', email: 'other@example.com' }; // Simulate different user

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/services/${testService.id}`, // testService belongs to original mockUser
      headers: { Authorization: 'Bearer testtoken' },
    });
    expect(response.statusCode).toBe(404); // ServiceService.getServiceById checks ownership

    mockUser = otherUser; // Restore original mock user
  });
});

describe('PUT /api/v1/services/:serviceId (Update Service)', () => {
  let app: FastifyInstance;
  let testBusiness: any;
  let testService: any;
  const updatedName = 'Updated Test Service Name';

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
    mockUser = { id: `owner-put-${Date.now()}`, email: 'put-owner@example.com' };

    const bizResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/businesses',
      payload: {
        name: 'Put Test Biz',
        subdomain: `put-biz-${Date.now()}`,
        email: 'put@biz.com',
        phone: '1',
        street: 's',
        city: 'c',
        state: 's',
        postalCode: 'pc',
        country: 'c',
        timezone: 'UTC',
      },
      headers: { Authorization: 'Bearer testtoken' },
    });
    testBusiness = JSON.parse(bizResponse.payload).data;

    const servicePayload = { name: 'Service to Update', duration: 50, price: 500 };
    const servResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/services',
      payload: servicePayload,
      headers: { Authorization: 'Bearer testtoken' },
    });
    testService = JSON.parse(servResponse.payload).data;
  });

  afterAll(async () => {
    if (testService) await prisma.service.deleteMany({ where: { businessId: testBusiness.id } }); // Clean all from this business
    if (testBusiness) await prisma.business.delete({ where: { id: testBusiness.id } });
    if (app) await app.close();
    mockUser = null;
  });

  it('should update a service and verify DB change', async () => {
    const updatePayload = { name: updatedName, duration: 55 };
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/services/${testService.id}`,
      payload: updatePayload,
      headers: { Authorization: 'Bearer testtoken' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe(updatedName);
    expect(body.data.duration).toBe(55);

    const dbService = await prisma.service.findUnique({ where: { id: testService.id } });
    expect(dbService?.name).toBe(updatedName);
    expect(dbService?.duration).toBe(55);
  });
});

describe('DELETE /api/v1/services/:serviceId (Delete Service)', () => {
  let app: FastifyInstance;
  let testBusiness: any;
  let serviceToDelete: any;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
    mockUser = { id: `owner-del-${Date.now()}`, email: 'del-owner@example.com' };

    const bizResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/businesses',
      payload: {
        name: 'Del Test Biz',
        subdomain: `del-biz-${Date.now()}`,
        email: 'del@biz.com',
        phone: '1',
        street: 's',
        city: 'c',
        state: 's',
        postalCode: 'pc',
        country: 'c',
        timezone: 'UTC',
      },
      headers: { Authorization: 'Bearer testtoken' },
    });
    testBusiness = JSON.parse(bizResponse.payload).data;

    const servicePayload = { name: 'Service to Delete', duration: 10, price: 100 };
    const servResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/services',
      payload: servicePayload,
      headers: { Authorization: 'Bearer testtoken' },
    });
    serviceToDelete = JSON.parse(servResponse.payload).data;
  });

  afterAll(async () => {
    // serviceToDelete might be null if it was deleted, so check DB by businessId or ensure cleanup in test
    await prisma.service.deleteMany({ where: { businessId: testBusiness.id } });
    await prisma.business.delete({ where: { id: testBusiness.id } });
    if (app) await app.close();
    mockUser = null;
  });

  it('should delete a service and verify DB deletion', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/services/${serviceToDelete.id}`,
      headers: { Authorization: 'Bearer testtoken' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Service deleted successfully');

    const dbService = await prisma.service.findUnique({ where: { id: serviceToDelete.id } });
    expect(dbService).toBeNull();
  });
});
