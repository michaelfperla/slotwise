import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { logger } from '../utils/logger.js'; // Assuming logger might be used

// Mock in-memory store for business notification settings
interface BusinessNotificationSettings {
  businessId: string;
  receiveBookingConfirmations: boolean; // e.g., business wants a copy of booking confirmations
  reminderLeadTimeHours: number; // e.g., how many hours before booking to send reminders
  preferredChannels: Array<'email' | 'sms'>; // Communication preferences
  // Add more settings as needed, e.g., contact email for notifications if different from main
}

// Example: Default settings for new businesses or fallback
const defaultBusinessSettings: Omit<BusinessNotificationSettings, 'businessId'> = {
  receiveBookingConfirmations: false,
  reminderLeadTimeHours: 24,
  preferredChannels: ['email'],
};

const businessSettingsStore: Record<string, BusinessNotificationSettings> = {
  // Example pre-configured settings for a business
  'business123': {
    businessId: 'business123',
    receiveBookingConfirmations: true,
    reminderLeadTimeHours: 48,
    preferredChannels: ['email', 'sms'],
  },
  'business456': {
    businessId: 'business456',
    receiveBookingConfirmations: false,
    reminderLeadTimeHours: 24,
    preferredChannels: ['email'],
  },
};

// Zod schema for business notification settings response
export const businessNotificationSettingsSchema = z.object({
  businessId: z.string(),
  receiveBookingConfirmations: z.boolean(),
  reminderLeadTimeHours: z.number().int().positive(),
  preferredChannels: z.array(z.enum(['email', 'sms'])),
  // Ensure this schema matches the structure of BusinessNotificationSettings
});

// Zod schema for request parameters
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const paramsSchema = z.object({
  businessId: z.string().min(1, "Business ID is required"),
});

export async function businessNotificationSettingsRoutes(fastify: FastifyInstance) {
  fastify.get(
    // Route path will be prefixed by '/api/v1' in index.ts
    // So this becomes /api/v1/businesses/{businessId}/notifications/settings
    '/businesses/:businessId/notifications/settings',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            businessId: { type: 'string', minLength: 1 }
          },
          required: ['businessId']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              businessId: { type: 'string' },
              receiveBookingConfirmations: { type: 'boolean' },
              reminderLeadTimeHours: { type: 'number', minimum: 1 },
              preferredChannels: {
                type: 'array',
                items: { type: 'string', enum: ['email', 'sms'] }
              }
            },
            required: ['businessId', 'receiveBookingConfirmations', 'reminderLeadTimeHours', 'preferredChannels']
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            },
            required: ['success', 'message']
          }
        }
      },
    },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof paramsSchema> }>,
      reply: FastifyReply
    ) => {
      const { businessId } = request.params;
      try {
        const settings = businessSettingsStore[businessId];

        if (!settings) {
          // Option 1: Return 404 if no specific settings exist
          // return reply.code(404).send({
          //   success: false,
          //   message: `Notification settings for business ${businessId} not found.`,
          // });

          // Option 2: Return default settings if no specific settings exist
          logger.info(`No specific settings for business ${businessId}, returning default settings.`);
          return reply.send({
            businessId, // Include the requested businessId
            ...defaultBusinessSettings,
          });
        }

        return reply.send(settings);
      } catch (error: any) {
        logger.error({ err: error, businessId }, `Error retrieving notification settings for business ${businessId}`);
        return reply.code(500).send({
            success: false,
            message: "An unexpected error occurred while retrieving notification settings.",
            // error: error.message // Optionally include error details in dev
        });
      }
    }
  );

  // Placeholder for PUT endpoint to update settings if needed in the future
  // fastify.put(
  //   '/businesses/:businessId/notifications/settings',
  //   { schema: { body: businessNotificationSettingsSchema, params: paramsSchema, response: { 200: businessNotificationSettingsSchema }}},
  //   async (request: FastifyRequest<{ Body: BusinessNotificationSettings, Params: { businessId: string }}>, reply: FastifyReply) => {
  //     const { businessId } = request.params;
  //     // Basic validation: ensure businessId in path matches body, or remove from body
  //     if (businessId !== request.body.businessId) {
  //        return reply.code(400).send({ message: "Business ID mismatch" });
  //     }
  //     businessSettingsStore[businessId] = request.body;
  //     logger.info({ settings: request.body, businessId }, `Notification settings updated for business ${businessId}`);
  //     return reply.send(businessSettingsStore[businessId]);
  //   }
  // );
}
