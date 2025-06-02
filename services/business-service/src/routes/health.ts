import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database/prisma';
import { redisClient } from '../database/redis';
import { natsConnection } from '../events/nats';

export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'healthy',
      service: 'business-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Readiness check (all dependencies ready)
  fastify.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const dependencies = [];

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      dependencies.push({
        name: 'database',
        status: 'healthy',
        responseTime: 0 // Could measure actual response time
      });
    } catch (error) {
      dependencies.push({
        name: 'database',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check Redis
    try {
      await redisClient.ping();
      dependencies.push({
        name: 'redis',
        status: 'healthy',
        responseTime: 0
      });
    } catch (error) {
      dependencies.push({
        name: 'redis',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check NATS
    try {
      const natsStatus = natsConnection.isConnected() ? 'healthy' : 'unhealthy';
      dependencies.push({
        name: 'nats',
        status: natsStatus,
        responseTime: 0
      });
    } catch (error) {
      dependencies.push({
        name: 'nats',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const allHealthy = dependencies.every(dep => dep.status === 'healthy');
    const status = allHealthy ? 'healthy' : 'unhealthy';

    return reply.status(allHealthy ? 200 : 503).send({
      status,
      service: 'business-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies
    });
  });

  // Liveness check (service is alive)
  fastify.get('/live', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'alive',
      service: 'business-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
}
