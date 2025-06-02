import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { BusinessService } from '../services/BusinessService';
import { prisma } from '../database/prisma';
import { natsConnection } from '../events/nats';

const businessService = new BusinessService(prisma, natsConnection);

// Validation schemas
const createBusinessSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  subdomain: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/),
  email: z.string().email(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  timezone: z.string().min(1),
  currency: z.string().length(3).default('USD'),
});

const updateBusinessSchema = createBusinessSchema.partial();

const businessParamsSchema = z.object({
  id: z.string().cuid(),
});

export async function businessRoutes(fastify: FastifyInstance) {
  // Create business
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Business'],
        summary: 'Create a new business',
        body: createBusinessSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createBusinessSchema> }>,
      reply: FastifyReply
    ) => {
      const business = await businessService.createBusiness({
        ...request.body,
        ownerId: request.user!.id,
      });

      return reply.status(201).send({
        success: true,
        data: business,
        timestamp: new Date().toISOString(),
      });
    }
  );

  // Get business by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Business'],
        summary: 'Get business by ID',
        params: businessParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof businessParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const business = await businessService.getBusinessById(request.params.id, request.user!.id);

      return reply.send({
        success: true,
        data: business,
        timestamp: new Date().toISOString(),
      });
    }
  );

  // Update business
  fastify.put(
    '/:id',
    {
      schema: {
        tags: ['Business'],
        summary: 'Update business',
        params: businessParamsSchema,
        body: updateBusinessSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof businessParamsSchema>;
        Body: z.infer<typeof updateBusinessSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const business = await businessService.updateBusiness(
        request.params.id,
        request.body,
        request.user!.id
      );

      return reply.send({
        success: true,
        data: business,
        timestamp: new Date().toISOString(),
      });
    }
  );

  // Get user's businesses
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Business'],
        summary: 'Get user businesses',
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
              pagination: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { page?: number; limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      const { page = 1, limit = 20 } = request.query;
      const result = await businessService.getUserBusinesses(request.user!.id, { page, limit });

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      });
    }
  );

  // Delete business
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Business'],
        summary: 'Delete business',
        params: businessParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof businessParamsSchema> }>,
      reply: FastifyReply
    ) => {
      await businessService.deleteBusiness(request.params.id, request.user!.id);

      return reply.send({
        success: true,
        message: 'Business deleted successfully',
        timestamp: new Date().toISOString(),
      });
    }
  );

  // Get business by subdomain (public endpoint)
  fastify.get(
    '/subdomain/:subdomain',
    {
      preHandler: [], // Skip auth for this endpoint
      schema: {
        tags: ['Business'],
        summary: 'Get business by subdomain (public)',
        params: {
          type: 'object',
          properties: {
            subdomain: { type: 'string' },
          },
          required: ['subdomain'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { subdomain: string } }>, reply: FastifyReply) => {
      const business = await businessService.getBusinessBySubdomain(request.params.subdomain);

      return reply.send({
        success: true,
        data: business,
        timestamp: new Date().toISOString(),
      });
    }
  );
}
