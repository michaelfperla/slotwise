import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './database/prisma';
import { natsConnection } from './events/nats';
import { redisClient } from './database/redis';
import { businessRoutes } from './routes/business';
import { serviceRoutes } from './routes/service';
import { healthRoutes } from './routes/health';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

const server = fastify({
  logger: logger,
  requestIdLogLabel: 'requestId',
  requestIdHeader: 'x-request-id'
});

async function start() {
  try {
    // Register plugins
    await server.register(helmet);
    await server.register(cors, {
      origin: config.cors.origins,
      credentials: true
    });

    await server.register(rateLimit, {
      max: config.rateLimit.max,
      timeWindow: config.rateLimit.timeWindow
    });

    // Swagger documentation
    await server.register(swagger, {
      swagger: {
        info: {
          title: 'SlotWise Business Service API',
          description: 'Business and user management service',
          version: '1.0.0'
        },
        host: `localhost:${config.port}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        securityDefinitions: {
          Bearer: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header'
          }
        }
      }
    });

    await server.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      }
    });

    // Global error handler
    server.setErrorHandler(errorHandler);

    // Health check routes (no auth required)
    await server.register(healthRoutes, { prefix: '/health' });

    // API routes with authentication
    await server.register(async function (fastify) {
      await fastify.register(authMiddleware);
      await fastify.register(businessRoutes, { prefix: '/api/v1/businesses' });
      await fastify.register(serviceRoutes, { prefix: '/api/v1/services' });
    });

    // Initialize database connection
    await prisma.$connect();
    logger.info('Connected to database');

    // Initialize Redis connection
    await redisClient.ping();
    logger.info('Connected to Redis');

    // Initialize NATS connection
    await natsConnection.connect();
    logger.info('Connected to NATS');

    // Start server
    const address = await server.listen({
      port: config.port,
      host: config.host
    });

    logger.info(`Business Service started on ${address}`);
    logger.info(`API Documentation available at ${address}/docs`);

  } catch (error) {
    logger.error('Failed to start Business Service', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await server.close();
  await prisma.$disconnect();
  await redisClient.quit();
  await natsConnection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await server.close();
  await prisma.$disconnect();
  await redisClient.quit();
  await natsConnection.close();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

start();
