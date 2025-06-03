/**
 * API Endpoint Template for SlotWise Platform
 *
 * This template provides a standardized structure for creating REST API endpoints
 * following SlotWise coding standards and best practices.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EntityService, EntityNotFoundError, ValidationError } from '../services/EntityService';
import { Logger } from '../utils/logger';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/api';

// ============================================================================
// REQUEST/RESPONSE SCHEMAS
// ============================================================================

const createEntitySchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string', maxLength: 1000 },
      isActive: { type: 'boolean' },
    },
    additionalProperties: false,
  },
};

const updateEntitySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
      description: { type: 'string', maxLength: 1000 },
      isActive: { type: 'boolean' },
    },
    additionalProperties: false,
  },
};

const getEntitySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
};

const listEntitiesSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      name: { type: 'string' },
      isActive: { type: 'boolean' },
    },
  },
};

const deleteEntitySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
};

// ============================================================================
// REQUEST INTERFACES
// ============================================================================

interface CreateEntityRequest extends FastifyRequest {
  body: {
    name: string;
    description?: string;
    isActive?: boolean;
  };
}

interface UpdateEntityRequest extends FastifyRequest {
  params: {
    id: string;
  };
  body: {
    name?: string;
    description?: string;
    isActive?: boolean;
  };
}

interface GetEntityRequest extends FastifyRequest {
  params: {
    id: string;
  };
}

interface ListEntitiesRequest extends FastifyRequest {
  querystring: {
    page?: number;
    limit?: number;
    name?: string;
    isActive?: boolean;
  };
}

interface DeleteEntityRequest extends FastifyRequest {
  params: {
    id: string;
  };
}

// ============================================================================
// CONTROLLER CLASS
// ============================================================================

export class EntityController {
  private readonly entityService: EntityService;
  private readonly logger: Logger;

  constructor(entityService: EntityService) {
    this.entityService = entityService;
    this.logger = new Logger({ service: 'entity-controller' });
  }

  // ==========================================================================
  // ROUTE REGISTRATION
  // ==========================================================================

  async registerRoutes(fastify: FastifyInstance): Promise<void> {
    // Create entity
    fastify.post(
      '/api/v1/entities',
      {
        schema: createEntitySchema,
        preHandler: [fastify.authenticate], // Authentication middleware
      },
      this.createEntity.bind(this)
    );

    // Get entity by ID
    fastify.get(
      '/api/v1/entities/:id',
      {
        schema: getEntitySchema,
        preHandler: [fastify.authenticate],
      },
      this.getEntity.bind(this)
    );

    // List entities
    fastify.get(
      '/api/v1/entities',
      {
        schema: listEntitiesSchema,
        preHandler: [fastify.authenticate],
      },
      this.listEntities.bind(this)
    );

    // Update entity
    fastify.put(
      '/api/v1/entities/:id',
      {
        schema: updateEntitySchema,
        preHandler: [fastify.authenticate],
      },
      this.updateEntity.bind(this)
    );

    // Delete entity
    fastify.delete(
      '/api/v1/entities/:id',
      {
        schema: deleteEntitySchema,
        preHandler: [fastify.authenticate],
      },
      this.deleteEntity.bind(this)
    );
  }

  // ==========================================================================
  // ROUTE HANDLERS
  // ==========================================================================

  async createEntity(request: CreateEntityRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user.id;
      const { name, description, isActive } = request.body;

      this.logger.info('Creating entity', {
        userId,
        entityName: name,
        correlationId: request.id,
      });

      const entity = await this.entityService.createEntity(userId, {
        name,
        description,
        isActive,
      });

      const response: ApiSuccessResponse<typeof entity> = {
        success: true,
        data: entity,
        message: 'Entity created successfully',
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      reply.status(201).send(response);

      this.logger.info('Entity created successfully', {
        entityId: entity.id,
        userId,
        correlationId: request.id,
      });
    } catch (error) {
      await this.handleError(error, request, reply);
    }
  }

  async getEntity(request: GetEntityRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params;
      const userId = request.user.id;

      this.logger.debug('Fetching entity', {
        entityId: id,
        userId,
        correlationId: request.id,
      });

      const entity = await this.entityService.getEntityById(id);

      if (!entity) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: 'ENTITY_NOT_FOUND',
          message: 'Entity not found',
          timestamp: new Date().toISOString(),
        };

        reply.status(404).send(errorResponse);
        return;
      }

      const response: ApiSuccessResponse<typeof entity> = {
        success: true,
        data: entity,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      reply.status(200).send(response);
    } catch (error) {
      await this.handleError(error, request, reply);
    }
  }

  async listEntities(request: ListEntitiesRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.user.id;
      const { page = 1, limit = 10, name, isActive } = request.query;

      this.logger.debug('Listing entities', {
        userId,
        filters: { name, isActive },
        pagination: { page, limit },
        correlationId: request.id,
      });

      const { entities, total } = await this.entityService.getEntities(
        { name, isActive },
        { page, limit }
      );

      const totalPages = Math.ceil(total / limit);

      const response: ApiSuccessResponse<typeof entities> = {
        success: true,
        data: entities,
        meta: {
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
          timestamp: new Date().toISOString(),
        },
      };

      reply.status(200).send(response);
    } catch (error) {
      await this.handleError(error, request, reply);
    }
  }

  async updateEntity(request: UpdateEntityRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params;
      const userId = request.user.id;
      const updateData = request.body;

      this.logger.info('Updating entity', {
        entityId: id,
        userId,
        updateData,
        correlationId: request.id,
      });

      const entity = await this.entityService.updateEntity(id, userId, updateData);

      const response: ApiSuccessResponse<typeof entity> = {
        success: true,
        data: entity,
        message: 'Entity updated successfully',
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      reply.status(200).send(response);

      this.logger.info('Entity updated successfully', {
        entityId: id,
        userId,
        correlationId: request.id,
      });
    } catch (error) {
      await this.handleError(error, request, reply);
    }
  }

  async deleteEntity(request: DeleteEntityRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params;
      const userId = request.user.id;

      this.logger.info('Deleting entity', {
        entityId: id,
        userId,
        correlationId: request.id,
      });

      await this.entityService.deleteEntity(id, userId);

      reply.status(204).send();

      this.logger.info('Entity deleted successfully', {
        entityId: id,
        userId,
        correlationId: request.id,
      });
    } catch (error) {
      await this.handleError(error, request, reply);
    }
  }

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  private async handleError(
    error: Error,
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const correlationId = request.id;

    this.logger.error('API error occurred', {
      error: error.message,
      stack: error.stack,
      correlationId,
      url: request.url,
      method: request.method,
    });

    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';

    // Handle specific error types
    if (error instanceof EntityNotFoundError) {
      statusCode = 404;
      errorCode = 'ENTITY_NOT_FOUND';
      message = error.message;
    } else if (error instanceof ValidationError) {
      statusCode = 422;
      errorCode = 'VALIDATION_ERROR';
      message = error.message;
    } else if (error.name === 'ValidationError') {
      // Fastify validation errors
      statusCode = 400;
      errorCode = 'BAD_REQUEST';
      message = 'Invalid request data';
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: errorCode,
      message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          stack: error.stack,
          correlationId,
        },
      }),
    };

    reply.status(statusCode).send(errorResponse);
  }
}

// ============================================================================
// ROUTE REGISTRATION HELPER
// ============================================================================

export async function registerEntityRoutes(
  fastify: FastifyInstance,
  entityService: EntityService
): Promise<void> {
  const controller = new EntityController(entityService);
  await controller.registerRoutes(fastify);
}
