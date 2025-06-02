import Fastify from 'fastify';
import { config } from './config/config';
import { logger } from './utils/logger';
import { healthRoutes } from './routes/health';
import { notificationRoutes } from './routes/notification';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { natsClient } from './events/natsClient';

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
    await fastify.register(notificationRoutes, { prefix: '/api/notifications' });

    // Connect to NATS
    await natsClient.connect();
    logger.info('Connected to NATS');

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
