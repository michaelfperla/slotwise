import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database/prisma';
import { redisClient } from '../database/redis';
import { natsClient } from '../events/natsClient';

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Readiness check
  fastify.get('/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
    const checks = {
      database: false,
      redis: false,
      nats: false
    };

    try {
      // Check database
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      fastify.log.error('Database health check failed:', error);
    }

    try {
      // Check Redis
      await redisClient.ping();
      checks.redis = true;
    } catch (error) {
      fastify.log.error('Redis health check failed:', error);
    }

    try {
      // Check NATS
      checks.nats = natsClient.isConnected();
    } catch (error) {
      fastify.log.error('NATS health check failed:', error);
    }

    const isReady = Object.values(checks).every(check => check === true);
    const statusCode = isReady ? 200 : 503;

    return reply.code(statusCode).send({
      status: isReady ? 'ready' : 'not ready',
      service: 'notification-service',
      checks,
      timestamp: new Date().toISOString()
    });
  });

  // Liveness check
  fastify.get('/live', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'alive',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  });
}
