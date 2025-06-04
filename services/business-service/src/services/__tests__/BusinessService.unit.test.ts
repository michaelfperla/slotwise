import { BusinessService } from '../BusinessService';
import { prisma } from '../../database/prisma';
import { natsConnection } from '../../events/nats';
import { Business, PrismaClient } from '@prisma/client'; // Keep PrismaClient for type if needed by mocks

// Mock Prisma and NATS
jest.mock('../../database/prisma', () => ({
  prisma: {
    business: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../events/nats', () => ({
  natsConnection: {
    publish: jest.fn(),
  },
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mocked-nanoid'),
}));


describe('BusinessService', () => {
  let businessService: BusinessService;

  beforeEach(() => {
    jest.clearAllMocks();
    businessService = new BusinessService(); // Constructor is now empty
  });

  describe('createBusiness', () => {
    const ownerId = 'user-owner-id';
    const createData = {
      name: 'My Test Biz',
      subdomain: 'testbiz',
      email: 'test@biz.com',
      street: '123 Test St',
      city: 'Testville',
      state: 'TS',
      postalCode: '12345',
      country: 'TC',
      timezone: 'America/New_York', // Explicitly provide, db default is UTC
      currency: 'USD',
      ownerId,
    };

    const mockCreatedBusiness: Business = {
      id: 'generated-biz-id',
      ...createData,
      status: 'PENDING_SETUP', // default from service logic
      createdAt: new Date(),
      updatedAt: new Date(),
      description: null,
      logo: null,
      website: null,
      phone: null,
      // other fields with defaults or null
      bookingSettings: '{}',
      paymentSettings: '{}',
      notificationSettings: '{}',
      availabilitySettings: '{}',
      subscriptionPlan: 'FREE',
      subscriptionStatus: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
    };

    it('should create a business and publish an event', async () => {
      (prisma.business.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.business.create as jest.Mock).mockResolvedValue(mockCreatedBusiness);

      const result = await businessService.createBusiness(createData);

      expect(prisma.business.findUnique).toHaveBeenCalledWith({
        where: { subdomain: createData.subdomain },
      });
      expect(prisma.business.create).toHaveBeenCalledWith({
        data: {
          name: createData.name,
          description: undefined, // from interface
          subdomain: createData.subdomain,
          email: createData.email,
          phone: undefined, // from interface
          website: undefined, // from interface
          street: createData.street,
          city: createData.city,
          state: createData.state,
          postalCode: createData.postalCode,
          country: createData.country,
          timezone: createData.timezone,
          currency: createData.currency,
          ownerId: createData.ownerId,
          status: 'PENDING_SETUP',
        },
      });
      expect(natsConnection.publish).toHaveBeenCalledWith(
        'slotwise.business.created', // Ensure prefix is correct as per publishEvent
        expect.objectContaining({
          id: 'mocked-nanoid', // from mocked nanoid
          type: 'business.created',
          source: 'business-service',
          data: {
            businessId: mockCreatedBusiness.id,
            name: mockCreatedBusiness.name,
            subdomain: mockCreatedBusiness.subdomain,
            ownerId: mockCreatedBusiness.ownerId,
          },
        })
      );
      expect(result).toEqual(mockCreatedBusiness);
    });

    it('should throw error if subdomain already exists', async () => {
      (prisma.business.findUnique as jest.Mock).mockResolvedValue(mockCreatedBusiness); // Simulate existing
      await expect(businessService.createBusiness(createData)).rejects.toThrow(
        'Subdomain already exists'
      );
    });
  });
});
