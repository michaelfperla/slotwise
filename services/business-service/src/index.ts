import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastify from 'fastify';
import { config } from './config';
import { confirmPaymentHandler, createPaymentIntentHandler, getBusinessRevenueHandler, stripeWebhookHandler } from './controllers/PaymentController';
import { prisma } from './database/prisma';
import { redisClient } from './database/redis';
import { natsConnection } from './events/nats';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { analyticsRoutes } from './routes/analyticsRoutes'; // Import analytics routes
import { businessRoutes } from './routes/business';
import { healthRoutes } from './routes/health';
import { serviceRoutes } from './routes/service';
import { logger } from './utils/logger';

const server = fastify({
  logger: logger,
  requestIdLogLabel: 'requestId',
  requestIdHeader: 'x-request-id',
});

// Decorate Fastify instance with Prisma Client
server.decorate('prisma', prisma);

async function start() {
  try {
    // Register plugins
    await server.register(helmet);
    await server.register(cors, {
      origin: config.cors.origins,
      credentials: true,
    });

    await server.register(rateLimit, {
      max: config.rateLimit.max,
      timeWindow: config.rateLimit.timeWindow,
    });

    // Swagger documentation
    await server.register(swagger, {
      swagger: {
        info: {
          title: 'SlotWise Business Service API',
          description: 'Business and user management service',
          version: '1.0.0',
        },
        host: `localhost:${config.port}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        securityDefinitions: {
          Bearer: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
          },
        },
      },
    });

    await server.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false,
      },
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

      // Register analytics routes under a specific business context
      // The :businessId param will be available to all routes in analyticsRoutes
      await fastify.register(analyticsRoutes, { prefix: '/api/v1/businesses/:businessId/analytics' });

      // Payment routes
      fastify.post('/api/v1/payments/create-intent', createPaymentIntentHandler);
      fastify.post('/api/v1/payments/confirm', confirmPaymentHandler);
      fastify.get('/api/v1/businesses/:businessId/revenue', getBusinessRevenueHandler);
    });
    // Register webhook route separately if it needs different body parsing rules
    // or should not be under the '/api/v1' prefix or auth.
    // For now, adding it here for simplicity, assuming rawBody handling is addressed.
    server.post('/api/v1/stripe-webhook', {
      // config: { rawBody: true } // This is a conceptual representation of enabling rawBody.
      // Actual Fastify setup for rawBody can vary, e.g. via addContentTypeParser
      // or by ensuring no global parser consumes the body before this route.
    }, stripeWebhookHandler);

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
      host: config.host,
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
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

start();
