import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { BusinessService } from '../services/BusinessService';
import { AvailabilityService } from '../services/AvailabilityService'; // Import AvailabilityService
import { DayOfWeek } from '@prisma/client'; // Import DayOfWeek enum
import { prisma } from '../database/prisma';
import { natsConnection } from '../events/nats';

const businessService = new BusinessService(prisma, natsConnection);
const availabilityService = new AvailabilityService(); // Instantiate AvailabilityService

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
  id: z.string().cuid(), // General business ID
});

// Specific param schema for routes that use businessId in path
const businessIdParamsSchema = z.object({
  businessId: z.string().cuid(),
});


// Availability Schemas
const availabilityRuleSchema = z.object({
  dayOfWeek: z.nativeEnum(DayOfWeek),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time format, use HH:MM"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time format, use HH:MM"),
});

const setAvailabilitySchema = z.object({
  rules: z.array(availabilityRuleSchema),
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

  // --- Availability Routes ---

  // Set/Update Availability for a Business
  fastify.post(
    '/:businessId/availability',
    {
      schema: {
        tags: ['Business', 'Availability'],
        summary: 'Set or update availability for a business',
        params: businessIdParamsSchema,
        body: setAvailabilitySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object' } }, // Array of availability rules
              message: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ 
        Params: z.infer<typeof businessIdParamsSchema>; 
        Body: z.infer<typeof setAvailabilitySchema> 
      }>,
      reply: FastifyReply
    ) => {
      try {
        const newAvailability = await availabilityService.setAvailability(
          request.params.businessId,
          request.user!.id, // Authorize by owner
          request.body
        );
        return reply.send({
          success: true,
          data: newAvailability,
          message: 'Availability updated successfully.',
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        fastify.log.error('Error setting availability:', error);
        // More specific error handling can be added here (e.g., validation errors, not found)
        if (error.message.includes('Business not found') || error.message.includes('not the owner')) {
          return reply.status(404).send({ success: false, message: error.message, timestamp: new Date().toISOString() });
        }
        if (error.message.includes('Invalid availability rule')) {
            return reply.status(400).send({ success: false, message: error.message, timestamp: new Date().toISOString() });
        }
        return reply.status(500).send({ success: false, message: 'Failed to update availability.', error: error.message, timestamp: new Date().toISOString() });
      }
    }
  );

  // Get Availability for a Business
  fastify.get(
    '/:businessId/availability',
    {
      schema: {
        tags: ['Business', 'Availability'],
        summary: 'Get availability for a business',
        params: businessIdParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object' } },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof businessIdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        // For this GET route, we might allow broader access or differentiate based on user role later.
        // For now, let's use ownerId for consistency, but it could be made public or role-based.
        // The service method getAvailability has an optional userId for ownership check.
        // If request.user is available, pass it. Otherwise, it's a more public query.
        const userId = request.user?.id; 
        const availability = await availabilityService.getAvailability(request.params.businessId, userId);
        
        return reply.send({
          success: true,
          data: availability,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        fastify.log.error('Error getting availability:', error);
         if (error.message.includes('Business not found')) {
          return reply.status(404).send({ success: false, message: error.message, timestamp: new Date().toISOString() });
        }
        return reply.status(500).send({ success: false, message: 'Failed to retrieve availability.', error: error.message, timestamp: new Date().toISOString() });
      }
    }
  );
}
