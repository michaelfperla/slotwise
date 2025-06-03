import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ServiceService } from '../services/ServiceService';
import { zodToJsonSchema } from '../utils/schema';

const serviceService = new ServiceService();

// Validation schemas
const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  duration: z.number().min(1).max(480), // 1 minute to 8 hours
  price: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  isActive: z.boolean().default(true),
  maxAdvanceBookingDays: z.number().min(1).default(30), // days
  minAdvanceBookingHours: z.number().min(0).default(1), // hours
  category: z.string().optional(),
  requiresApproval: z.boolean().default(false),
});

const updateServiceSchema = createServiceSchema.partial();

const serviceParamsSchema = z.object({
  id: z.string().uuid(),
});

const serviceQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  businessId: z.string().uuid().optional(),
});

export async function serviceRoutes(fastify: FastifyInstance) {
  // Create service
  fastify.post(
    '/',
    {
      schema: {
        body: zodToJsonSchema(createServiceSchema),
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createServiceSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'User ID not found in request',
          });
        }

        const service = await serviceService.createService(userId, request.body);

        // Convert dates to strings to ensure proper JSON serialization
        const serializedService = {
          ...service,
          createdAt: service.createdAt.toISOString(),
          updatedAt: service.updatedAt.toISOString(),
        };

        const responseData = {
          success: true,
          data: serializedService,
          message: 'Service created successfully',
        };

        // Bypass Fastify serialization by manually stringifying
        return reply
          .code(201)
          .header('content-type', 'application/json')
          .send(JSON.stringify(responseData));
      } catch (error) {
        fastify.log.error('Error creating service:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to create service',
        });
      }
    }
  );

  // Get services
  fastify.get(
    '/',
    {
      schema: {
        querystring: zodToJsonSchema(serviceQuerySchema),
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
              pagination: { type: 'object' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof serviceQuerySchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'User ID not found in request',
          });
        }

        const result = await serviceService.getServices(userId, request.query);

        // Convert dates to strings for all services
        const serializedServices = result.data.map(service => ({
          ...service,
          createdAt: service.createdAt.toISOString(),
          updatedAt: service.updatedAt.toISOString(),
        }));

        const responseData = {
          success: true,
          data: serializedServices,
          pagination: result.pagination,
          message: 'Services retrieved successfully',
        };

        // Bypass Fastify serialization by manually stringifying
        return reply.header('content-type', 'application/json').send(JSON.stringify(responseData));
      } catch (error) {
        fastify.log.error('Error retrieving services:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to retrieve services',
        });
      }
    }
  );

  // Get service by ID
  fastify.get(
    '/:id',
    {
      schema: {
        params: zodToJsonSchema(serviceParamsSchema),
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof serviceParamsSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'User ID not found in request',
          });
        }

        const service = await serviceService.getServiceById(request.params.id, userId);

        if (!service) {
          return reply.code(404).send({
            success: false,
            error: 'Not Found',
            message: 'Service not found',
          });
        }

        // Convert dates to strings to ensure proper JSON serialization
        const serializedService = {
          ...service,
          createdAt: service.createdAt.toISOString(),
          updatedAt: service.updatedAt.toISOString(),
        };

        const responseData = {
          success: true,
          data: serializedService,
          message: 'Service retrieved successfully',
        };

        // Bypass Fastify serialization by manually stringifying
        return reply.header('content-type', 'application/json').send(JSON.stringify(responseData));
      } catch (error) {
        fastify.log.error('Error retrieving service:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to retrieve service',
        });
      }
    }
  );

  // Update service
  fastify.put(
    '/:id',
    {
      schema: {
        params: zodToJsonSchema(serviceParamsSchema),
        body: zodToJsonSchema(updateServiceSchema),
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof serviceParamsSchema>;
        Body: z.infer<typeof updateServiceSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'User ID not found in request',
          });
        }

        const service = await serviceService.updateService(request.params.id, userId, request.body);

        if (!service) {
          return reply.code(404).send({
            success: false,
            error: 'Not Found',
            message: 'Service not found',
          });
        }

        // Convert dates to strings to ensure proper JSON serialization
        const serializedService = {
          ...service,
          createdAt: service.createdAt.toISOString(),
          updatedAt: service.updatedAt.toISOString(),
        };

        const responseData = {
          success: true,
          data: serializedService,
          message: 'Service updated successfully',
        };

        // Bypass Fastify serialization by manually stringifying
        return reply.header('content-type', 'application/json').send(JSON.stringify(responseData));
      } catch (error) {
        fastify.log.error('Error updating service:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to update service',
        });
      }
    }
  );

  // Delete service
  fastify.delete(
    '/:id',
    {
      schema: {
        params: zodToJsonSchema(serviceParamsSchema),
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof serviceParamsSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'User ID not found in request',
          });
        }

        const deleted = await serviceService.deleteService(request.params.id, userId);

        if (!deleted) {
          return reply.code(404).send({
            success: false,
            error: 'Not Found',
            message: 'Service not found',
          });
        }

        return reply.send({
          success: true,
          message: 'Service deleted successfully',
        });
      } catch (error) {
        fastify.log.error('Error deleting service:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to delete service',
        });
      }
    }
  );
}
