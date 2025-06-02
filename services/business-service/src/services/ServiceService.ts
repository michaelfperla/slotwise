import { PrismaClient } from '@prisma/client';
import { prisma } from '../database/prisma';

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

export interface UpdateServiceData extends Partial<CreateServiceData> {}

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

  async createService(userId: string, data: CreateServiceData) {
    // First, get the user's business
    const business = await this.prisma.business.findFirst({
      where: {
        ownerId: userId,
        status: 'ACTIVE'
      }
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
            slug: true
          }
        }
      }
    });

    return service;
  }

  async getServices(userId: string, params: ServiceQueryParams): Promise<PaginatedResult<any>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // If businessId is provided, use it; otherwise get user's businesses
    if (params.businessId) {
      where.businessId = params.businessId;
    } else {
      const businesses = await this.prisma.business.findMany({
        where: { ownerId: userId },
        select: { id: true }
      });
      where.businessId = { in: businesses.map((b: { id: string }) => b.id) };
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { category: { contains: params.search, mode: 'insensitive' } }
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
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              subdomain: true
            }
          }
        }
      }),
      this.prisma.service.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: services,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async getServiceById(serviceId: string, userId: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        business: {
          ownerId: userId
        }
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            subdomain: true
          }
        }
      }
    });

    return service;
  }

  async updateService(serviceId: string, userId: string, data: UpdateServiceData) {
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
            subdomain: true
          }
        }
      }
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
      where: { id: serviceId }
    });

    return true;
  }

  async getServicesByBusiness(businessId: string, isActive?: boolean) {
    const where: any = { businessId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.service.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }
}
