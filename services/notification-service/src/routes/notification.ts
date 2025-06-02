import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// Simple notification service placeholder
const notificationService = {
  async sendNotification(_userId: string, data: any) {
    return { id: 'temp-id', status: 'queued', ...data };
  },
  async getNotifications(_userId: string, _query: any) {
    return {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
    };
  },
  async getNotificationById(_id: string, _userId: string) {
    return null;
  },
};

// Validation schemas
const sendNotificationSchema = z.object({
  type: z.enum(['email', 'sms', 'push']),
  recipient: z.string().min(1),
  subject: z.string().optional(),
  content: z.string().min(1),
  templateId: z.string().optional(),
  templateData: z.record(z.any()).optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  scheduledAt: z.string().datetime().optional(),
});

const notificationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(['email', 'sms', 'push']).optional(),
  status: z.enum(['pending', 'sent', 'failed', 'delivered']).optional(),
  recipient: z.string().optional(),
});

export async function notificationRoutes(fastify: FastifyInstance) {
  // Send notification
  fastify.post(
    '/',
    {
      schema: {
        body: sendNotificationSchema,
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
      request: FastifyRequest<{ Body: z.infer<typeof sendNotificationSchema> }>,
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

        const notification = await notificationService.sendNotification(userId, request.body);

        return reply.code(201).send({
          success: true,
          data: notification,
          message: 'Notification queued successfully',
        });
      } catch (error) {
        fastify.log.error('Error sending notification:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to send notification',
        });
      }
    }
  );

  // Get notifications
  fastify.get(
    '/',
    {
      schema: {
        querystring: notificationQuerySchema,
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
      request: FastifyRequest<{ Querystring: z.infer<typeof notificationQuerySchema> }>,
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

        const result = await notificationService.getNotifications(userId, request.query);

        return reply.send({
          success: true,
          data: result.data,
          pagination: result.pagination,
          message: 'Notifications retrieved successfully',
        });
      } catch (error) {
        fastify.log.error('Error retrieving notifications:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to retrieve notifications',
        });
      }
    }
  );

  // Get notification by ID
  fastify.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'User ID not found in request',
          });
        }

        const notification = await notificationService.getNotificationById(
          request.params.id,
          userId
        );

        if (!notification) {
          return reply.code(404).send({
            success: false,
            error: 'Not Found',
            message: 'Notification not found',
          });
        }

        return reply.send({
          success: true,
          data: notification,
          message: 'Notification retrieved successfully',
        });
      } catch (error) {
        fastify.log.error('Error retrieving notification:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to retrieve notification',
        });
      }
    }
  );
}
