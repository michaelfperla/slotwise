import { AvailabilityService, SetAvailabilityData } from '../AvailabilityService';
import { prisma } from '../../database/prisma';
import { natsConnection } from '../../events/nats';
import { Business, Availability, DayOfWeek, PrismaClient } from '@prisma/client';

// Mock Prisma and NATS
jest.mock('../../database/prisma', () => ({
  prisma: {
    business: {
      findFirst: jest.fn(),
    },
    availability: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      // Simulate the transaction callback with a mock tx object
      const mockTx = {
        availability: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
      };
      await callback(mockTx);
      // Make sure the mocked methods within the transaction are returned for assertions if needed
      return {
        deleteManyMock: mockTx.availability.deleteMany,
        createManyMock: mockTx.availability.createMany,
      };
    }),
  },
}));

jest.mock('../../events/nats', () => ({
  natsConnection: {
    publish: jest.fn(),
  },
}));

describe('AvailabilityService', () => {
  let availabilityService: AvailabilityService;
  let mockPrismaTransaction: any; // To access mocks within $transaction

  beforeEach(() => {
    jest.clearAllMocks();
    availabilityService = new AvailabilityService();

    // Setup mock for $transaction to capture specific tx client mocks
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockTxClient = {
        availability: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        // Add other models if they were part of a real transaction
      };
      await callback(mockTxClient);
      mockPrismaTransaction = mockTxClient; // Store the mock client for assertions
    });
  });

  describe('setAvailability', () => {
    const businessId = 'test-business-id';
    const userId = 'test-user-id';
    const availabilityData: SetAvailabilityData = {
      rules: [
        { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: DayOfWeek.TUESDAY, startTime: '10:00', endTime: '16:00' },
      ],
    };
    const mockBusiness: Business = {
      id: businessId,
      ownerId: userId,
      name: 'Test Business',
      subdomain: 'test-sub',
      status: 'ACTIVE',
      timezone: 'UTC',
      createdAt: new Date(),
      updatedAt: new Date(),
      description: null,
      logo: null,
      website: null,
      phone: null,
      email: 'business@example.com',
      currency: 'USD',
      street: '123 Main St',
      city: 'Testville',
      state: 'TS',
      postalCode: '12345',
      country: 'TC',
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

    const mockCreatedAvailabilities: Availability[] = availabilityData.rules.map(rule => ({
      id: expect.any(String),
      businessId,
      ...rule,
      is_available: true, // This is what we expect
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    it('should set availability rules and publish event, ensuring is_available is true', async () => {
      (prisma.business.findFirst as jest.Mock).mockResolvedValue(mockBusiness);
      (prisma.availability.findMany as jest.Mock).mockResolvedValue(mockCreatedAvailabilities);
      // The actual createMany inside transaction will be asserted via mockPrismaTransaction

      await availabilityService.setAvailability(businessId, userId, availabilityData);

      expect(prisma.business.findFirst).toHaveBeenCalledWith({
        where: { id: businessId, ownerId: userId },
      });
      expect(prisma.$transaction).toHaveBeenCalled();

      // Assertions on the mocked transaction client
      expect(mockPrismaTransaction.availability.deleteMany).toHaveBeenCalledWith({
        where: { businessId: businessId },
      });
      expect(mockPrismaTransaction.availability.createMany).toHaveBeenCalledWith({
        data: availabilityData.rules.map(rule => ({
          businessId,
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
          is_available: true, // Key assertion
        })),
      });

      expect(prisma.availability.findMany).toHaveBeenCalledWith({
        where: { businessId: businessId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      expect(natsConnection.publish).toHaveBeenCalledWith(
        'business.availability.updated',
        expect.objectContaining({
          businessId,
          rules: mockCreatedAvailabilities.map(r => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime})),
        })
      );
    });

    it('should throw error if business not found or user is not owner', async () => {
      (prisma.business.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        availabilityService.setAvailability(businessId, userId, availabilityData)
      ).rejects.toThrow('Business not found or user is not the owner.');
    });

    it('should throw error for invalid rule format (e.g., startTime >= endTime)', async () => {
      (prisma.business.findFirst as jest.Mock).mockResolvedValue(mockBusiness);
      const invalidData: SetAvailabilityData = {
        rules: [{ dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '18:00', endTime: '17:00' }],
      };
      await expect(
        availabilityService.setAvailability(businessId, userId, invalidData)
      ).rejects.toThrow('Invalid availability rule: WEDNESDAY 18:00-17:00');
    });
  });
});
