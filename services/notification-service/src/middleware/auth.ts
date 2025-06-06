import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role?: string;
    };
  }
}

export async function authMiddleware(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health checks
    if (request.url.startsWith('/health')) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);

    try {
      // Define a type for the expected JWT payload structure
      type JwtPayload = { sub?: string; id?: string; email: string; role?: string };
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      request.user = {
        id: decoded.sub || decoded.id || '', // Ensure id is always string
        email: decoded.email,
        role: decoded.role,
      };
    } catch {
      return reply.code(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  });
}
