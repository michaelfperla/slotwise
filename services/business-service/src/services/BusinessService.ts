import { Business } from '@prisma/client'; // MODIFIED: PrismaClient removed
import { nanoid } from 'nanoid';
import { prisma } from '../database/prisma.js'; // MODIFIED: Added import for global Prisma client
import { natsConnection } from '../events/nats.js';
import { logger } from '../utils/logger.js';

interface CreateBusinessData {
  name: string;
  description?: string;
  subdomain: string;
  email: string;
  phone?: string;
  website?: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  timezone: string;
  currency: string;
  ownerId: string;
}

interface UpdateBusinessData {
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  currency?: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class BusinessService {
  constructor() {} // MODIFIED: Empty constructor

  async createBusiness(data: CreateBusinessData): Promise<Business> {
    try {
      // Check if subdomain is already taken
      const existingBusiness = await prisma.business.findUnique({ // MODIFIED: this.prisma -> prisma
        where: { subdomain: data.subdomain },
      });

      if (existingBusiness) {
        throw new Error('Subdomain already exists');
      }

      // Create business (let Prisma auto-generate the ID)
      const business = await prisma.business.create({ // MODIFIED: this.prisma -> prisma
        data: {
          name: data.name,
          description: data.description,
          subdomain: data.subdomain,
          email: data.email,
          phone: data.phone,
          website: data.website,
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
          timezone: data.timezone,
          currency: data.currency,
          ownerId: data.ownerId,
          status: 'PENDING_SETUP',
        },
      });

      // Publish business created event
      await this.publishEvent('business.created', { // Stays this.publishEvent
        businessId: business.id,
        name: business.name,
        subdomain: business.subdomain,
        ownerId: business.ownerId,
      });

      logger.info('Business created', { businessId: business.id, subdomain: business.subdomain });

      return business;
    } catch (error) {
      logger.error('Failed to create business', { error, data });
      throw error;
    }
  }

  async getBusinessById(id: string, userId: string): Promise<Business> {
    try {
      const business = await prisma.business.findFirst({ // MODIFIED: this.prisma -> prisma
        where: {
          id,
          ownerId: userId,
        },
        include: {
          services: true,
        },
      });

      if (!business) {
        throw new Error('Business not found');
      }

      return business;
    } catch (error) {
      logger.error('Failed to get business', { error, businessId: id, userId });
      throw error;
    }
  }

  async getBusinessBySubdomain(subdomain: string): Promise<Partial<Business>> {
    try {
      const business = await prisma.business.findUnique({ // MODIFIED: this.prisma -> prisma
        where: { subdomain },
        select: {
          id: true,
          name: true,
          description: true,
          subdomain: true,
          logo: true,
          website: true,
          phone: true,
          email: true,
          timezone: true,
          currency: true,
          street: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          status: true,
          services: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              description: true,
              duration: true,
              price: true,
              currency: true,
              category: true,
            },
          },
        },
      });

      if (!business || business.status !== 'ACTIVE') {
        throw new Error('Business not found or inactive');
      }

      return business;
    } catch (error) {
      logger.error('Failed to get business by subdomain', { error, subdomain });
      throw error;
    }
  }

  async updateBusiness(id: string, data: UpdateBusinessData, userId: string): Promise<Business> {
    try {
      // Verify ownership
      const existingBusiness = await prisma.business.findFirst({ // MODIFIED: this.prisma -> prisma
        where: {
          id,
          ownerId: userId,
        },
      });

      if (!existingBusiness) {
        throw new Error('Business not found');
      }

      const business = await prisma.business.update({ // MODIFIED: this.prisma -> prisma
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Publish business updated event
      await this.publishEvent('business.updated', { // Stays this.publishEvent
        businessId: business.id,
        changes: data,
      });

      logger.info('Business updated', { businessId: business.id, changes: data });

      return business;
    } catch (error) {
      logger.error('Failed to update business', { error, businessId: id, data });
      throw error;
    }
  }

  async getUserBusinesses(
    userId: string,
    options: PaginationOptions
  ): Promise<PaginatedResult<Business>> {
    try {
      const { page, limit } = options;
      const skip = (page - 1) * limit;

      const [businesses, total] = await Promise.all([
        prisma.business.findMany({ // MODIFIED: this.prisma -> prisma
          where: { ownerId: userId },
          include: {
            services: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.business.count({ // MODIFIED: this.prisma -> prisma
          where: { ownerId: userId },
        }),
      ]);

      return {
        data: businesses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get user businesses', { error, userId, options });
      throw error;
    }
  }

  async deleteBusiness(id: string, userId: string): Promise<void> {
    try {
      // Verify ownership
      const business = await prisma.business.findFirst({ // MODIFIED: this.prisma -> prisma
        where: {
          id,
          ownerId: userId,
        },
      });

      if (!business) {
        throw new Error('Business not found');
      }

      // Delete business (cascade will handle services)
      await prisma.business.delete({ // MODIFIED: this.prisma -> prisma
        where: { id },
      });

      // Publish business deleted event
      await this.publishEvent('business.deleted', { // Stays this.publishEvent
        businessId: id,
        ownerId: userId,
      });

      logger.info('Business deleted', { businessId: id });
    } catch (error) {
      logger.error('Failed to delete business', { error, businessId: id, userId });
      throw error;
    }
  }

  private async publishEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
    try {
      const event = {
        id: nanoid(),
        type: eventType,
        timestamp: new Date(),
        version: '1.0',
        source: 'business-service',
        data,
      };

      await natsConnection.publish(`slotwise.${eventType}`, event); // MODIFIED: this.eventPublisher -> natsConnection
    } catch (error) {
      logger.error('Failed to publish event', { error, eventType, data });
      // Don't throw here to avoid breaking the main operation
    }
  }
}
