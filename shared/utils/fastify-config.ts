/**
 * Shared Fastify configuration utilities for SlotWise services
 * Handles breaking changes in Fastify v5 and related plugins
 */

import { FastifyRegisterOptions } from 'fastify';

/**
 * CORS configuration for Fastify v5 with @fastify/cors v11+
 * Breaking change: v11 changed default methods to CORS-safelisted methods only
 * We explicitly specify all methods to maintain previous behavior
 */
export const corsConfig = {
  // Explicitly specify methods to maintain compatibility with v8 behavior
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],

  // Allow credentials for authenticated requests
  credentials: true,

  // Configure allowed origins based on environment
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000', // Frontend development
      'http://localhost:3001', // Alternative frontend port
      'https://slotwise.app', // Production frontend
      'https://app.slotwise.com', // Alternative production domain
    ];

    // Add environment-specific origins
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },

  // Allow common headers
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
  ],

  // Expose headers that clients can access
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Rate-Limit-Remaining'],
};

/**
 * Helmet security configuration for Fastify v5
 * Updated for @fastify/helmet v12+
 */
export const helmetConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'wss:', 'ws:'],
    },
  },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Disable for API services

  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
};

/**
 * Rate limiting configuration for @fastify/rate-limit v10+
 */
export const rateLimitConfig = {
  // Global rate limit
  global: true,

  // Maximum requests per time window
  max: 100,

  // Time window in milliseconds (15 minutes)
  timeWindow: 15 * 60 * 1000,

  // Skip successful requests in count
  skipSuccessfulRequests: false,

  // Skip failed requests in count
  skipFailedRequests: false,

  // Custom key generator for rate limiting
  keyGenerator: (request: any) => {
    // Use IP address and user ID if available
    const ip = request.ip;
    const userId = request.user?.id;
    return userId ? `${ip}:${userId}` : ip;
  },

  // Custom error response
  errorResponseBuilder: (request: any, context: any) => {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      error: 'Rate limit exceeded',
      message: `Too many requests. Try again in ${Math.round(context.ttl / 1000)} seconds.`,
      retryAfter: context.ttl,
    };
  },

  // Add rate limit headers to response
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
};

/**
 * Swagger configuration for @fastify/swagger v9+ and @fastify/swagger-ui v5+
 */
export const swaggerConfig = {
  swagger: {
    info: {
      title: 'SlotWise API',
      description: 'High-velocity scheduling platform API',
      version: '1.0.0',
      contact: {
        name: 'SlotWise Team',
        email: 'support@slotwise.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    host: process.env.API_HOST || 'localhost:3000',
    schemes: process.env.NODE_ENV === 'production' ? ['https'] : ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    securityDefinitions: {
      Bearer: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'Enter JWT token in format: Bearer <token>',
      },
    },
    security: [{ Bearer: [] }],
  },

  // Transform schema for better documentation
  transform: ({ schema, url }: any) => {
    // Add common response schemas
    if (schema.response) {
      schema.response['400'] = {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'number' },
        },
      };

      schema.response['401'] = {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'number' },
        },
      };

      schema.response['500'] = {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'number' },
        },
      };
    }

    return { schema, url };
  },
};

/**
 * Swagger UI configuration for @fastify/swagger-ui v5+
 */
export const swaggerUIConfig = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
  uiHooks: {
    onRequest: function (request: any, reply: any, next: any) {
      // Add authentication check for production
      if (process.env.NODE_ENV === 'production' && !request.headers.authorization) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      next();
    },
  },
  staticCSP: true,
  transformStaticCSP: (header: string) => header,
  transformSpecification: (swaggerObject: any, request: any, reply: any) => {
    // Add server information
    swaggerObject.servers = [
      {
        url: `${request.protocol}://${request.hostname}`,
        description: 'Current server',
      },
    ];
    return swaggerObject;
  },
};

/**
 * Common Fastify server options for Fastify v5
 */
export const serverConfig = {
  // Logger configuration
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },

  // Request ID generation
  genReqId: () => {
    return require('nanoid').nanoid();
  },

  // Trust proxy for proper IP detection
  trustProxy: true,

  // Request timeout (30 seconds)
  connectionTimeout: 30000,

  // Keep alive timeout
  keepAliveTimeout: 5000,

  // Maximum request payload size (10MB)
  bodyLimit: 10 * 1024 * 1024,

  // Disable Fastify's default error handler for custom error handling
  disableRequestLogging: false,

  // Request validation options
  ajv: {
    customOptions: {
      removeAdditional: 'all',
      useDefaults: true,
      coerceTypes: 'array',
      allErrors: true,
    },
  },
};

/**
 * Plugin registration helper with error handling
 */
export async function registerPlugin(
  fastify: any,
  plugin: any,
  options: any = {},
  pluginName: string = 'unknown'
) {
  try {
    await fastify.register(plugin, options);
    fastify.log.info(`Successfully registered plugin: ${pluginName}`);
  } catch (error) {
    fastify.log.error(`Failed to register plugin ${pluginName}:`, error);
    throw error;
  }
}
