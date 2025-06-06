import { Prisma, PrismaClient, Service } from '@prisma/client'; // Import Service type and Prisma
import { prisma } from '../database/prisma.js';
import { natsConnection } from '../events/nats.js'; // Import NATS connection
import { logger } from '../utils/logger.js'; // Optional: for logging event publishing

export interface CreateServiceData {
  name: string;
  description?: string;
  duration: number;
  price: number;
  currency?: string;
  isActive?: boolean;
  maxAdvanceBookingDays?: number;
  minAdvanceBookingHours?: number;
  category?: string;
  requiresApproval?: boolean;
}

export type UpdateServiceData = Partial<CreateServiceData>;

export interface ServiceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
  businessId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ServiceService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createService(userId: string, data: CreateServiceData): Promise<Service> {
    // Added return type
    // First, get the user's business
    const business = await this.prisma.business.findFirst({
      where: {
        ownerId: userId,
        status: 'ACTIVE',
      },
    });

    if (!business) {
      throw new Error('No active business found for user');
    }

    const service = await this.prisma.service.create({
      data: {
        ...data,
        businessId: business.id,
        currency: data.currency || 'USD',
        isActive: data.isActive ?? true,
        maxAdvanceBookingDays: data.maxAdvanceBookingDays || 30,
        minAdvanceBookingHours: data.minAdvanceBookingHours || 1,
        requiresApproval: data.requiresApproval ?? false,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
    });

    // Publish event to NATS
    try {
      const eventPayload = {
        businessId: service.businessId,
        serviceId: service.id,
        serviceDetails: {
          name: service.name,
          description: service.description,
          durationMinutes: service.duration,
          price: service.price, // Price is already a number in the schema
          currency: service.currency,
          category: service.category,
          isActive: service.isActive,
          // Add any other details from 'service' object that are relevant
        },
      };
      await natsConnection.publish('business.service.created', eventPayload);
      logger.info('Published business.service.created event to NATS', {
        serviceId: service.id,
        businessId: service.businessId,
      });
    } catch (error) {
      // Log error but don't let NATS failure block core operation
      logger.error('Failed to publish business.service.created event to NATS', {
        serviceId: service.id,
        error,
      });
    }

    return service;
  }

  async getServices(userId: string, params: ServiceQueryParams): Promise<PaginatedResult<Service>> {
    // Changed any to Service
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ServiceWhereInput = {}; // Changed from any

    // If businessId is provided, use it; otherwise get user's businesses
    if (params.businessId) {
      where.businessId = params.businessId;
    } else {
      const businesses = await this.prisma.business.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      where.businessId = { in: businesses.map((b: { id: string }) => b.id) };
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { category: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        // Prisma returns typed results
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              subdomain: true,
            },
          },
        },
      }),
      this.prisma.service.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: services as Service[], // Cast to Service[]
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getServiceById(serviceId: string, userId: string): Promise<Service | null> {
    // Added return type
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        business: {
          ownerId: userId,
        },
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
    });

    return service;
  }

  async updateService(
    serviceId: string,
    userId: string,
    data: UpdateServiceData
  ): Promise<Service | null> {
    // Added return type
    // First verify the service belongs to the user
    const existingService = await this.getServiceById(serviceId, userId);
    if (!existingService) {
      return null;
    }

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
    });

    return service;
  }

  async deleteService(serviceId: string, userId: string): Promise<boolean> {
    // First verify the service belongs to the user
    const existingService = await this.getServiceById(serviceId, userId);
    if (!existingService) {
      return false;
    }

    // Note: In a full implementation, you would check for active bookings
    // For now, we'll allow deletion since booking model isn't implemented yet

    await this.prisma.service.delete({
      where: { id: serviceId },
    });

    return true;
  }

  async getServicesByBusiness(businessId: string, isActive?: boolean) {
    const where: Prisma.ServiceWhereInput = { businessId }; // Changed from any
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.service.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }
}
