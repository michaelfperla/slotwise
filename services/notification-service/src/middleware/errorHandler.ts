import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  // Validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    switch (prismaError.code) {
      case 'P2002':
        return reply.status(409).send({
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'A record with this data already exists',
            details: prismaError.meta || {},
          },
          timestamp: new Date().toISOString(),
        });
      case 'P2025':
        return reply.status(404).send({
          success: false,
          error: {
            code: 'RECORD_NOT_FOUND',
            message: 'The requested record was not found',
            details: prismaError.meta || {},
          },
          timestamp: new Date().toISOString(),
        });
      default:
        return reply.status(400).send({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
            details: error.message,
          },
          timestamp: new Date().toISOString(),
        });
    }
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
    },
    timestamp: new Date().toISOString(),
  });
}
