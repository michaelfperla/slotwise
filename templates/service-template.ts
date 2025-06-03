/**
 * Service Template for SlotWise Platform
 *
 * This template provides a standardized structure for creating new services
 * following SlotWise coding standards and best practices.
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger';
import { EventPublisher } from '../utils/eventPublisher';
import { BaseEvent } from '../types/events';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface ServiceConfig {
  database: {
    url: string;
  };
  nats: {
    url: string;
  };
  logger: {
    level: string;
  };
}

interface CreateEntityData {
  name: string;
  description?: string;
  // Add other required fields
}

interface UpdateEntityData {
  name?: string;
  description?: string;
  // Add other updatable fields
}

interface EntityFilters {
  name?: string;
  isActive?: boolean;
  // Add other filter fields
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class EntityNotFoundError extends Error {
  constructor(entityId: string) {
    super(`Entity not found: ${entityId}`);
    this.name = 'EntityNotFoundError';
  }
}

export class EntityAlreadyExistsError extends Error {
  constructor(identifier: string) {
    super(`Entity already exists: ${identifier}`);
    this.name = 'EntityAlreadyExistsError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// EVENT DEFINITIONS
// ============================================================================

interface EntityCreatedEvent extends BaseEvent {
  type: 'service.entity.created';
  data: {
    entityId: string;
    name: string;
    createdBy: string;
    // Add other relevant fields
  };
}

interface EntityUpdatedEvent extends BaseEvent {
  type: 'service.entity.updated';
  data: {
    entityId: string;
    changes: Partial<UpdateEntityData>;
    updatedBy: string;
  };
}

interface EntityDeletedEvent extends BaseEvent {
  type: 'service.entity.deleted';
  data: {
    entityId: string;
    deletedBy: string;
  };
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class EntityService {
  private readonly prisma: PrismaClient;
  private readonly logger: Logger;
  private readonly eventPublisher: EventPublisher;

  constructor(config: ServiceConfig) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.database.url,
        },
      },
    });

    this.logger = new Logger({
      service: 'entity-service',
      level: config.logger.level,
    });

    this.eventPublisher = new EventPublisher(config.nats.url);
  }

  // ==========================================================================
  // CREATE OPERATIONS
  // ==========================================================================

  async createEntity(userId: string, data: CreateEntityData): Promise<Entity> {
    try {
      this.logger.info('Creating entity', { userId, entityName: data.name });

      // Validation
      await this.validateCreateData(data);

      // Check for duplicates
      const existingEntity = await this.findEntityByName(data.name);
      if (existingEntity) {
        throw new EntityAlreadyExistsError(data.name);
      }

      // Create entity
      const entity = await this.prisma.entity.create({
        data: {
          ...data,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Publish event
      await this.publishEntityCreatedEvent(entity, userId);

      this.logger.info('Entity created successfully', {
        entityId: entity.id,
        userId,
      });

      return entity;
    } catch (error) {
      this.logger.error('Failed to create entity', {
        userId,
        entityName: data.name,
        error: error.message,
      });
      throw error;
    }
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  async getEntityById(entityId: string): Promise<Entity | null> {
    try {
      this.logger.debug('Fetching entity by ID', { entityId });

      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
        include: {
          // Add related data as needed
        },
      });

      if (!entity) {
        this.logger.warn('Entity not found', { entityId });
        return null;
      }

      return entity;
    } catch (error) {
      this.logger.error('Failed to fetch entity', {
        entityId,
        error: error.message,
      });
      throw error;
    }
  }

  async getEntities(
    filters: EntityFilters = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 10 }
  ): Promise<{ entities: Entity[]; total: number }> {
    try {
      this.logger.debug('Fetching entities', { filters, pagination });

      const where = this.buildWhereClause(filters);
      const skip = (pagination.page - 1) * pagination.limit;

      const [entities, total] = await Promise.all([
        this.prisma.entity.findMany({
          where,
          skip,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.entity.count({ where }),
      ]);

      this.logger.debug('Entities fetched successfully', {
        count: entities.length,
        total,
      });

      return { entities, total };
    } catch (error) {
      this.logger.error('Failed to fetch entities', {
        filters,
        error: error.message,
      });
      throw error;
    }
  }

  // ==========================================================================
  // UPDATE OPERATIONS
  // ==========================================================================

  async updateEntity(entityId: string, userId: string, data: UpdateEntityData): Promise<Entity> {
    try {
      this.logger.info('Updating entity', { entityId, userId });

      // Check if entity exists
      const existingEntity = await this.getEntityById(entityId);
      if (!existingEntity) {
        throw new EntityNotFoundError(entityId);
      }

      // Validation
      await this.validateUpdateData(data);

      // Update entity
      const updatedEntity = await this.prisma.entity.update({
        where: { id: entityId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Publish event
      await this.publishEntityUpdatedEvent(updatedEntity, data, userId);

      this.logger.info('Entity updated successfully', {
        entityId,
        userId,
      });

      return updatedEntity;
    } catch (error) {
      this.logger.error('Failed to update entity', {
        entityId,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  // ==========================================================================
  // DELETE OPERATIONS
  // ==========================================================================

  async deleteEntity(entityId: string, userId: string): Promise<void> {
    try {
      this.logger.info('Deleting entity', { entityId, userId });

      // Check if entity exists
      const existingEntity = await this.getEntityById(entityId);
      if (!existingEntity) {
        throw new EntityNotFoundError(entityId);
      }

      // Soft delete (recommended) or hard delete
      await this.prisma.entity.update({
        where: { id: entityId },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      // Publish event
      await this.publishEntityDeletedEvent(entityId, userId);

      this.logger.info('Entity deleted successfully', {
        entityId,
        userId,
      });
    } catch (error) {
      this.logger.error('Failed to delete entity', {
        entityId,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private async validateCreateData(data: CreateEntityData): Promise<void> {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Name is required', 'name');
    }

    if (data.name.length > 255) {
      throw new ValidationError('Name must be less than 255 characters', 'name');
    }

    // Add other validation rules
  }

  private async validateUpdateData(data: UpdateEntityData): Promise<void> {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new ValidationError('Name cannot be empty', 'name');
      }

      if (data.name.length > 255) {
        throw new ValidationError('Name must be less than 255 characters', 'name');
      }
    }

    // Add other validation rules
  }

  private async findEntityByName(name: string): Promise<Entity | null> {
    return this.prisma.entity.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        deletedAt: null,
      },
    });
  }

  private buildWhereClause(filters: EntityFilters): any {
    const where: any = {
      deletedAt: null, // Exclude soft-deleted entities
    };

    if (filters.name) {
      where.name = {
        contains: filters.name,
        mode: 'insensitive',
      };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return where;
  }

  // ==========================================================================
  // EVENT PUBLISHING METHODS
  // ==========================================================================

  private async publishEntityCreatedEvent(entity: Entity, userId: string): Promise<void> {
    const event: EntityCreatedEvent = {
      id: this.generateEventId(),
      type: 'service.entity.created',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      source: 'entity-service',
      userId,
      data: {
        entityId: entity.id,
        name: entity.name,
        createdBy: userId,
      },
    };

    await this.eventPublisher.publishEvent(event);
  }

  private async publishEntityUpdatedEvent(
    entity: Entity,
    changes: UpdateEntityData,
    userId: string
  ): Promise<void> {
    const event: EntityUpdatedEvent = {
      id: this.generateEventId(),
      type: 'service.entity.updated',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      source: 'entity-service',
      userId,
      data: {
        entityId: entity.id,
        changes,
        updatedBy: userId,
      },
    };

    await this.eventPublisher.publishEvent(event);
  }

  private async publishEntityDeletedEvent(entityId: string, userId: string): Promise<void> {
    const event: EntityDeletedEvent = {
      id: this.generateEventId(),
      type: 'service.entity.deleted',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      source: 'entity-service',
      userId,
      data: {
        entityId,
        deletedBy: userId,
      },
    };

    await this.eventPublisher.publishEvent(event);
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    await this.eventPublisher.disconnect();
  }
}
