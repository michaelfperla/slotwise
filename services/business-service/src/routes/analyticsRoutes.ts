import { PrismaClient } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { logger } from '../utils/logger.js'; // Assuming a logger utility exists
import { zodToJsonSchema } from '../utils/schema.js';
// import { getBusinessOverview, getBusinessTrends, OverviewData, TrendsData } from '../services/analyticsService.js'; // .js for ES modules

// Temporary placeholder types and functions
interface OverviewData {
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  mostPopularService?: { id: string; name: string; bookings: number };
}

interface TrendsData {
  period: string;
  data: Array<{ date: string; bookings: number; revenue: number }>;
}

const getBusinessOverview = async (businessId: string, prisma: any): Promise<OverviewData> => {
  return {
    totalBookings: 0,
    totalRevenue: 0,
    averageBookingValue: 0,
  };
};

const getBusinessTrends = async (businessId: string, period: string, prisma: any): Promise<TrendsData> => {
  return {
    period,
    data: [],
  };
};

// Zod schemas for request validation
const businessIdParamsSchema = z.object({
  businessId: z.string().cuid(), // Using cuid like other business routes
});

const trendsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d']).default('30d'),
});

// Helper to get PrismaClient from Fastify instance (assuming it's decorated)
const getPrismaClient = (request: FastifyRequest): PrismaClient => {
  // This depends on how Prisma is integrated with Fastify.
  // Option 1: Decorated instance (e.g., fastify.decorate('prisma', prismaClient))
  if ('prisma' in request.server) {
    return (request.server as any).prisma as PrismaClient;
  }
  // Option 2: Imported directly (less ideal for request-based handling if needed, but common)
  // import prisma from '../path/to/prisma/client'; return prisma;
  // Option 3: Passed via context or dependency injection framework.
  throw new Error('PrismaClient not found on Fastify instance or context.');
};


export async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/businesses/:businessId/analytics/overview
  fastify.get(
    '/overview', // Base path is already /businesses/:businessId/analytics by prefix in index.ts
    {
      schema: {
        params: zodToJsonSchema(businessIdParamsSchema),
        response: {
          200: {
            type: 'object',
            properties: {
              totalBookings: { type: 'number' },
              totalRevenue: { type: 'number' },
              averageBookingValue: { type: 'number' },
              mostPopularService: {
                anyOf: [
                  {
                    type: 'object',
                    properties: { id: {type: 'string'}, name: {type: 'string'}, bookings: {type: 'number'}}
                  },
                  { type: 'null' }
                ]
              },
            }
          },
        },
        tags: ['analytics'],
        summary: 'Get business analytics overview',
      },
    },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof businessIdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const { businessId } = request.params;
      try {
        const prisma = getPrismaClient(request);
        // Basic check if business exists (optional, service can handle it or expect valid ID)
        const business = await prisma.business.findUnique({ where: { id: businessId } });
        if (!business) {
          return reply.code(404).send({ message: 'Business not found' });
        }

        const overviewData: OverviewData = await getBusinessOverview(businessId, prisma);
        return reply.send(overviewData);
      } catch (error: any) {
        logger.error(
          { err: error, businessId },
          'Error fetching business overview:'
        );
        if (error.message.includes('PrismaClient not found')) {
             return reply.code(500).send({ message: 'Server configuration error for database access.' });
        }
        return reply.code(500).send({ message: 'Failed to fetch business overview.', error: error.message });
      }
    }
  );

  // GET /api/v1/businesses/:businessId/analytics/trends
  fastify.get(
    '/trends',
    {
      schema: {
        params: zodToJsonSchema(businessIdParamsSchema),
        querystring: zodToJsonSchema(trendsQuerySchema),
        response: {
            200: {
                type: 'object',
                properties: {
                    period: { type: 'string' },
                    data: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                date: { type: 'string' },
                                bookings: { type: 'number' },
                                revenue: { type: 'number' },
                            }
                        }
                    }
                }
            }
        },
        tags: ['analytics'],
        summary: 'Get business performance trends',
      },
    },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof businessIdParamsSchema>; Querystring: z.infer<typeof trendsQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const { businessId } = request.params;
      const { period } = request.query;
      try {
        const prisma = getPrismaClient(request);
        // Basic check if business exists
        const business = await prisma.business.findUnique({ where: { id: businessId } });
        if (!business) {
          return reply.code(404).send({ message: 'Business not found' });
        }

        const trendsData: TrendsData = await getBusinessTrends(businessId, period, prisma);
        return reply.send(trendsData);
      } catch (error: any) {
        logger.error(
          { err: error, businessId, period },
          'Error fetching business trends:'
        );
        if (error.message.includes('PrismaClient not found')) {
             return reply.code(500).send({ message: 'Server configuration error for database access.' });
        }
        return reply.code(500).send({ message: 'Failed to fetch business trends.', error: error.message });
      }
    }
  );
}
