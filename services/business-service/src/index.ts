import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastify from 'fastify';
import { config } from './config/index.js';
import { confirmPaymentHandler, createPaymentIntentHandler, getBusinessRevenueHandler, stripeWebhookHandler } from './controllers/PaymentController.js';
import { prisma } from './database/prisma.js';
// import { redisClient } from './database/redis';
// import { natsConnection } from './events/nats';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { analyticsRoutes } from './routes/analyticsRoutes.js'; // Import analytics routes
import { businessRoutes } from './routes/business.js';
import { healthRoutes } from './routes/health.js';
import { serviceRoutes } from './routes/service.js';
import { logger } from './utils/logger.js';

const server = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  },
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
    try {
      await prisma.$connect();
      logger.info('Connected to database');
    } catch {
      logger.warn('Database connection failed, continuing without database');
    }

    // Skip Redis and NATS for now
    logger.info('Skipping Redis and NATS connections for demo');

    // Start server
    const address = await server.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(`Business Service started on ${address}`);
    logger.info(`API Documentation available at ${address}/docs`);
  } catch (error) {
    logger.error('Failed to start Business Service');
    logger.error('Error details:', error);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await server.close();
  try {
    await prisma.$disconnect();
  } catch {
    // Ignore disconnection errors during shutdown
  }
  // try { await redisClient.quit(); } catch {}
  // try { await natsConnection.close(); } catch {}
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await server.close();
  try {
    await prisma.$disconnect();
  } catch {
    // Ignore disconnection errors during shutdown
  }
  // try { await redisClient.quit(); } catch {}
  // try { await natsConnection.close(); } catch {}
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
