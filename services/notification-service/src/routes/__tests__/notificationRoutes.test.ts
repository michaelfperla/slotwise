import Fastify, { FastifyInstance } from 'fastify';
import { notificationRoutes } from '../notification.js'; // Assuming .js due to "type": "module"
import * as emailService from '../../services/emailService.js'; // To mock sendEmail
import { logger } from '../../utils/logger.js';

// Mock the emailService.sendEmail function
jest.mock('../../services/emailService.js', () => ({
  ...jest.requireActual('../../services/emailService.js'), // Import and retain other exports
  sendEmail: jest.fn(),
}));

// Suppress logger output during tests if desired
// jest.spyOn(logger, 'info').mockImplementation(() => {});
// jest.spyOn(logger, 'error').mockImplementation(() => {});
// jest.spyOn(logger, 'warn').mockImplementation(() => {});


// Helper to build the Fastify app for testing
const buildApp = (): FastifyInstance => {
  const app = Fastify();
  // Register the routes you want to test
  // The prefix here should match how it's registered in the actual app for consistency if possible,
  // or adjust test URLs accordingly. For this unit test, we can register it at root.
  app.register(notificationRoutes, { prefix: '/api/v1/notifications' });
  return app;
};


describe('Notification Routes (/api/v1/notifications)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildApp();
    await app.ready(); // Ensure all plugins and routes are loaded
    // Reset mocks before each test
    (emailService.sendEmail as jest.Mock).mockClear();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /send', () => {
    it('should call emailService.sendEmail and return 200 on valid payload', async () => {
      const mockSendEmailResult = { success: true, messageId: 'test-message-id' };
      (emailService.sendEmail as jest.Mock).mockResolvedValue(mockSendEmailResult);

      const payload = {
        type: 'booking_confirmation',
        recipientEmail: 'test@example.com',
        templateData: { userName: 'Test User' },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/send',
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload).success).toBe(true);
      expect(JSON.parse(response.payload).messageId).toBe('test-message-id');
      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        payload.recipientEmail,
        expect.any(String), // Default subject is generated
        'bookingConfirmation', // Maps 'booking_confirmation' type to template name
        payload.templateData
      );
    });

    it('should use custom subject if provided', async () => {
        (emailService.sendEmail as jest.Mock).mockResolvedValue({ success: true });
        const payload = {
            type: 'booking_confirmation',
            recipientEmail: 'test@example.com',
            templateData: { userName: 'Test User' },
            subject: 'Custom Subject Here',
        };
        await app.inject({ method: 'POST', url: '/api/v1/notifications/send', payload });
        expect(emailService.sendEmail).toHaveBeenCalledWith(
            payload.recipientEmail,
            payload.subject, // Custom subject
            'bookingConfirmation',
            payload.templateData
        );
    });


    it('should return 400 if recipientEmail is missing', async () => {
      const payload = {
        type: 'booking_confirmation',
        // recipientEmail is missing
        templateData: { userName: 'Test User' },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/send',
        payload,
      });

      expect(response.statusCode).toBe(400); // Zod validation should catch this
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      const responseBody = JSON.parse(response.payload);
      expect(responseBody.message).toContain("recipientEmail"); // Zod error message
    });

    it('should return 400 if type is invalid', async () => {
      const payload = {
        type: 'invalid_type',
        recipientEmail: 'test@example.com',
        templateData: { userName: 'Test User' },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/send',
        payload,
      });
      expect(response.statusCode).toBe(400);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should return 500 if emailService.sendEmail fails', async () => {
        (emailService.sendEmail as jest.Mock).mockResolvedValue({ success: false, error: "Service failure" });
        const payload = {
            type: 'booking_confirmation',
            recipientEmail: 'test@example.com',
            templateData: { userName: 'Test User' },
        };
        const response = await app.inject({ method: 'POST', url: '/api/v1/notifications/send', payload });
        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.payload).success).toBe(false);
        expect(JSON.parse(response.payload).error).toBe("Service failure");
    });
  });

  describe('POST /schedule', () => {
    it('should schedule a notification and return 201 on valid payload', async () => {
      const payload = {
        type: 'booking_reminder',
        recipientEmail: 'test@example.com',
        templateData: { userName: 'Test User' },
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        bookingId: 'booking123',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/schedule',
        payload,
      });

      expect(response.statusCode).toBe(201);
      const responseBody = JSON.parse(response.payload);
      expect(responseBody.success).toBe(true);
      expect(responseBody.scheduledNotificationId).toMatch(/^sch-/);
      expect(responseBody.message).toContain('scheduled for');

      // Further check:
      // To truly verify it's in 'scheduledNotifications' array would require exporting it from the route module,
      // or adding another test endpoint to view scheduled tasks (which is not ideal for unit tests).
      // For now, the 201 response and message are good indicators.
      // The interval check for processing scheduled notifications is harder to unit test directly
      // without more complex time mocking (e.g. jest.useFakeTimers() and advancing time).
    });

    it('should return 400 if scheduledFor is in the past', async () => {
      const payload = {
        type: 'booking_reminder',
        recipientEmail: 'test@example.com',
        templateData: { userName: 'Test User' },
        scheduledFor: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
        bookingId: 'booking123',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/schedule',
        payload,
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).message).toBe('Scheduled time cannot be in the past.');
    });

    it('should return 400 for invalid schedule payload (e.g. missing bookingId)', async () => {
        const payload = {
            type: 'booking_reminder',
            recipientEmail: 'test@example.com',
            templateData: { userName: 'Test User' },
            scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            // bookingId is missing
        };
        const response = await app.inject({ method: 'POST', url: '/api/v1/notifications/schedule', payload });
        expect(response.statusCode).toBe(400); // Zod validation
    });
  });

  // Note: Testing the actual scheduler mechanism (setInterval) is more of an integration test.
  // We could use jest.useFakeTimers() and advance timers to test if the processing logic
  // inside setInterval gets called, but that would require exporting/exposing the
  // scheduledNotifications array and the processing function, or adding more test-specific hooks.
  // For this unit test, focusing on the endpoint's direct responsibilities (validation, adding to array).
});
