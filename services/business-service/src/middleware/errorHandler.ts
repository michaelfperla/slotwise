import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

// Define a more specific type for Prisma known request errors
interface PrismaKnownError extends FastifyError {
  code?: string;
  meta?: Record<string, unknown>;
}

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    requestId: request.id,
  });

  // Validation errors (Zod)
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as PrismaKnownError; // Use defined interface
    switch (prismaError.code) {
      case 'P2002':
        return reply.status(409).send({
          success: false,
          error: {
            code: 'RESOURCE_ALREADY_EXISTS',
            message: 'Resource already exists',
            details: prismaError.meta || {},
          },
          timestamp: new Date().toISOString(),
        });

      case 'P2025':
        return reply.status(404).send({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found',
            details: prismaError.meta || {},
          },
          timestamp: new Date().toISOString(),
        });

      default:
        return reply.status(500).send({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          },
          timestamp: new Date().toISOString(),
        });
    }
  }

  // HTTP errors
  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code || 'HTTP_ERROR',
        message: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Default server error
  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    },
    timestamp: new Date().toISOString(),
  });
}
