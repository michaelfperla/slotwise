import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { sendEmail } from '../services/emailService.js'; // Adjusted import
import { logger } from '../utils/logger.js'; // Assuming logger is used or will be

// Define specific email types
const emailNotificationTypeSchema = z.enum([
  'booking_confirmation',
  'booking_reminder',
  'booking_cancellation',
  // Add other email types here as needed
]);

// Validation schema for sending email notifications
const sendEmailNotificationSchema = z.object({
  type: emailNotificationTypeSchema,
  recipientEmail: z.string().email(),
  templateData: z.record(z.unknown()), // More specific type for template data if possible
  subject: z.string().optional(), // Subject can be optional if generated based on type
});

// Placeholder for other notification aspects if this route file handles more than just 'send'
// For now, focusing on the send email part.
// const notificationService = {
//   async getNotifications(_userId: string, _query: z.infer<typeof notificationQuerySchema>) {
//     return {
//       data: [],
//       pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
//     };
//   },
//   async getNotificationById(_id: string, _userId: string) {
//     return null;
//   },
// };

const notificationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  // type: z.enum(['email', 'sms', 'push']).optional(), // Keep if other notification types are listed here
  status: z.enum(['pending', 'sent', 'failed', 'delivered']).optional(), // Status for querying logs
  recipient: z.string().optional(),
});


// Mapping from notification type to template name and default subject
const emailTypeDetails: Record<z.infer<typeof emailNotificationTypeSchema>, { templateName: string, defaultSubject: string }> = {
  booking_confirmation: { templateName: 'bookingConfirmation', defaultSubject: 'Your Booking is Confirmed!' },
  booking_reminder: { templateName: 'bookingReminder', defaultSubject: 'Friendly Reminder for Your Upcoming Booking' },
  booking_cancellation: { templateName: 'bookingCancellation', defaultSubject: 'Your Booking Has Been Cancelled' },
};

// In-memory store for scheduled notifications (for demonstration)
interface ScheduledNotification {
  id: string;
  type: z.infer<typeof emailNotificationTypeSchema>;
  recipientEmail: string; // Added for clarity, though bookingId might imply it
  templateData: Record<string, unknown>; // Added for storing data needed at send time
  subject?: string; // Optional subject
  scheduledFor: Date;
  bookingId: string; // Or a more generic entityId
  status: 'pending' | 'processing' | 'sent' | 'failed';
  createdAt: Date;
}
const scheduledNotifications: ScheduledNotification[] = [];


// Validation schema for scheduling email notifications
const scheduleEmailNotificationSchema = z.object({
  type: emailNotificationTypeSchema,
  recipientEmail: z.string().email(), // Explicitly ask for email for now
  templateData: z.record(z.unknown()), // Data for the template
  subject: z.string().optional(),      // Optional custom subject
  scheduledFor: z.string().datetime(), // ISO 8601 date-time string
  bookingId: z.string().min(1),      // To link the notification to a booking
});


export async function notificationRoutes(fastify: FastifyInstance) {
  // Send email notification
  fastify.post(
    '/send',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['booking_confirmation', 'booking_reminder', 'booking_cancellation'] },
            recipientEmail: { type: 'string', format: 'email' },
            templateData: { type: 'object' },
            subject: { type: 'string' }
          },
          required: ['type', 'recipientEmail', 'templateData']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              messageId: { type: 'string' },
              message: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof sendEmailNotificationSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { type, recipientEmail, templateData, subject: customSubject } = request.body;
        const details = emailTypeDetails[type];
        if (!details) {
          logger.warn(`Unknown email type received during send: ${type}`);
          return reply.code(400).send({
            success: false,
            message: 'Invalid notification type provided.',
          });
        }
        const subject = customSubject || details.defaultSubject;
        const result = await sendEmail(recipientEmail, subject, details.templateName, templateData);
        if (result.success) {
          return reply.code(200).send({
            success: true,
            message: `Email of type "${type}" sent successfully to ${recipientEmail}.`,
            messageId: result.messageId,
          });
        } else {
          return reply.code(500).send({
            success: false,
            message: `Failed to send email of type "${type}" to ${recipientEmail}.`,
            error: result.error,
          });
        }
      } catch (error: any) {
        logger.error({ err: error, body: request.body }, 'Error processing /send notification request');
        return reply.code(500).send({
          success: false,
          message: 'An unexpected error occurred while sending the notification.',
          error: error.message || 'Internal Server Error',
        });
      }
    }
  );

  // Schedule email notification
  fastify.post(
    '/schedule',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['booking_confirmation', 'booking_reminder', 'booking_cancellation'] },
            recipientEmail: { type: 'string', format: 'email' },
            templateData: { type: 'object' },
            subject: { type: 'string' },
            scheduledFor: { type: 'string', format: 'date-time' },
            bookingId: { type: 'string', minLength: 1 }
          },
          required: ['type', 'recipientEmail', 'templateData', 'scheduledFor', 'bookingId']
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              scheduledNotificationId: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof scheduleEmailNotificationSchema> }>,
      reply: FastifyReply
    ) => {
      try {
        const { type, recipientEmail, templateData, subject, scheduledFor, bookingId } = request.body;

        // Basic validation for scheduledFor date (e.g., not in the past)
        if (new Date(scheduledFor) < new Date()) {
          return reply.code(400).send({
            success: false,
            message: 'Scheduled time cannot be in the past.',
          });
        }

        const newScheduledNotification: ScheduledNotification = {
          id: `sch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type,
          recipientEmail,
          templateData,
          subject,
          scheduledFor: new Date(scheduledFor),
          bookingId,
          status: 'pending',
          createdAt: new Date(),
        };

        scheduledNotifications.push(newScheduledNotification);
        logger.info({ notification: newScheduledNotification }, `Notification scheduled: ${newScheduledNotification.id}`);

        // In a real system, this would be persisted to a DB and a job queue
        // For now, we just log it and add to in-memory array.
        // A simple interval check could be implemented here for demo purposes if needed.

        return reply.code(201).send({
          success: true,
          scheduledNotificationId: newScheduledNotification.id,
          message: `Notification type "${type}" for booking "${bookingId}" scheduled for ${scheduledFor}.`,
        });
      } catch (error: any) {
        logger.error({ err: error, body: request.body }, 'Error processing /schedule notification request');
        return reply.code(500).send({
          success: false,
          message: 'An unexpected error occurred while scheduling the notification.',
          error: error.message || 'Internal Server Error',
        });
      }
    }
  );


  // Get notifications (keeping existing GET routes for now, may need adjustment)
  fastify.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', minimum: 1, default: 1 },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            status: { type: 'string', enum: ['pending', 'sent', 'failed', 'delivered'] },
            recipient: { type: 'string' }
          }
        },
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
        // const userId = request.user?.id; // Assuming auth is handled
        // For now, this could return a mix of sent (from emailService log) and scheduled
        // This part needs more definition based on what '/notifications' should list

        // Example: returning scheduled notifications for now
        const { page = 1, limit = 10 } = request.query;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedScheduledNotifications = scheduledNotifications.slice(startIndex, endIndex);

        return reply.send({
          success: true,
          data: paginatedScheduledNotifications, // Or merge with emailNotificationLog from emailService
          pagination: {
            page,
            limit,
            total: scheduledNotifications.length, // Total scheduled
            totalPages: Math.ceil(scheduledNotifications.length / limit),
            // hasNext, hasPrev could be calculated
          },
          message: 'Notifications (scheduled) retrieved successfully',
        });
      } catch (error) {
        logger.error({ err: error },'Error retrieving notifications');
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to retrieve notifications',
        });
      }
    }
  );

  // Get notification by ID (could be a scheduled one or a sent one)
  fastify.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        // const userId = request.user?.id; // Auth
        const { id } = request.params;

        // Check in scheduled first
        let notification: any = scheduledNotifications.find(n => n.id === id);
        if (notification) {
          return reply.send({
            success: true,
            data: notification,
            message: 'Scheduled notification retrieved successfully',
          });
        }

        // Then check in email log (from emailService)
        // This requires emailService.emailNotificationLog to be accessible or a getter function
        // For now, assuming it's not directly integrated here for GET /:id
        // const sentNotification = getEmailNotificationLog().find(n => n.id === id);
        // if (sentNotification) {
        //   return reply.send({
        //     success: true,
        //     data: sentNotification,
        //     message: 'Sent notification log retrieved successfully',
        //   });
        // }

        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'Notification not found',
        });
      } catch (error) {
        logger.error({ err: error, params: request.params }, 'Error retrieving notification by ID');
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to retrieve notification',
        });
      }
    }
  );
}

// Basic scheduler (interval check) - for demonstration purposes only
// In a real app, use a proper cron job library (node-cron, etc.) or a message queue with delayed messages.
const SCHEDULE_CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

setInterval(async () => {
  const now = new Date();
  logger.info(`Running scheduled notification check at ${now.toISOString()}...`);

  for (const job of scheduledNotifications) {
    if (job.status === 'pending' && job.scheduledFor <= now) {
      logger.info(`Processing scheduled notification ID: ${job.id} for booking ${job.bookingId}`);
      job.status = 'processing';

      try {
        const details = emailTypeDetails[job.type];
        if (!details) {
          throw new Error(`Invalid email type "${job.type}" for scheduled job ID: ${job.id}`);
        }

        const subject = job.subject || details.defaultSubject;
        const result = await sendEmail(job.recipientEmail, subject, details.templateName, job.templateData);

        if (result.success) {
          logger.info(`Successfully sent scheduled email ID: ${job.id}. Message ID: ${result.messageId}`);
          job.status = 'sent';
          // Optionally, remove from `scheduledNotifications` or move to a 'completed' log
        } else {
          logger.error(`Failed to send scheduled email ID: ${job.id}. Error: ${result.error}`);
          job.status = 'failed';
        }
      } catch (error: any) {
        logger.error(`Error processing scheduled job ID: ${job.id}. Error: ${error.message}`);
        job.status = 'failed';
      }
    }
  }
  // Clean up old 'sent' or 'failed' jobs from the in-memory array if desired
  // e.g., scheduledNotifications = scheduledNotifications.filter(job => job.status === 'pending' || job.status === 'processing');
}, SCHEDULE_CHECK_INTERVAL_MS);
