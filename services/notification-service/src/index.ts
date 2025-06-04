import Fastify from 'fastify';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { healthRoutes } from './routes/health.js';
import { notificationRoutes } from './routes/notification.js';
import { businessNotificationSettingsRoutes } from './routes/businessNotificationSettingsRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { natsClient } from './events/natsClient.js';

const fastify = Fastify({
  logger: false, // We'll use our custom logger
});

async function start() {
  try {
    // Register error handler
    fastify.setErrorHandler(errorHandler);

    // Register middleware
    await fastify.register(authMiddleware);

    // Register routes
    await fastify.register(healthRoutes, { prefix: '/health' });
    // Prefixing all notification related routes with /api/v1
    await fastify.register(notificationRoutes, { prefix: '/api/v1/notifications' });
    await fastify.register(businessNotificationSettingsRoutes, { prefix: '/api/v1' }); // The routes themselves contain /businesses/...


    // Connect to NATS
    await natsClient.connect();
    logger.info('Connected to NATS');

    // Initialize NATS event subscribers
    const { initializeBookingEventSubscribers } = await import(
      './subscribers/bookingEventHandlers.js'
    );
    initializeBookingEventSubscribers();
    // Add other subscriber initializers if any (e.g. for user events, etc.)

    // Start server
    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(`Notification service started on ${config.host}:${config.port}`);
  } catch (error) {
    logger.error('Error starting notification service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await natsClient.disconnect();
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await natsClient.disconnect();
  await fastify.close();
  process.exit(0);
});

start();
