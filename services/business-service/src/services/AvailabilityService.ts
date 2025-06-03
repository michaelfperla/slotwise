import { Availability, DayOfWeek, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../database/prisma';
import { natsConnection } from '../events/nats';
import { logger } from '../utils/logger';

export interface AvailabilityRuleData {
  dayOfWeek: DayOfWeek; // Make sure DayOfWeek enum is correctly imported/available
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface SetAvailabilityData {
  rules: AvailabilityRuleData[];
}

export class AvailabilityService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  // Helper to validate a single rule
  private isValidRule(rule: AvailabilityRuleData): boolean {
    if (!Object.values(DayOfWeek).includes(rule.dayOfWeek)) {
      return false;
    }
    // Basic time format validation (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(rule.startTime) || !timeRegex.test(rule.endTime)) {
      return false;
    }
    // Start time should be before end time
    if (rule.startTime >= rule.endTime) {
      return false;
    }
    return true;
  }

  async setAvailability(
    businessId: string,
    userId: string,
    data: SetAvailabilityData
  ): Promise<Availability[]> {
    // Verify business ownership
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId: userId },
    });

    if (!business) {
      throw new Error('Business not found or user is not the owner.');
    }

    // Validate all rules
    for (const rule of data.rules) {
      if (!this.isValidRule(rule)) {
        throw new Error(
          `Invalid availability rule: ${rule.dayOfWeek} ${rule.startTime}-${rule.endTime}`
        );
      }
    }

    // Atomically update availability: delete all existing rules for the business and create new ones
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.availability.deleteMany({
        where: { businessId: businessId },
      });

      if (data.rules.length > 0) {
        await tx.availability.createMany({
          data: data.rules.map((rule: AvailabilityRuleData) => ({
            businessId: businessId,
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
          })),
        });
      }
    });

    // Fetch the created rules with all fields
    const fullNewRules = await this.prisma.availability.findMany({
      where: { businessId: businessId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Publish NATS event
    try {
      const eventPayload = {
        businessId: businessId,
        // scheduleId: could be a version or a specific ID if availabilities are versioned
        rules: fullNewRules.map((rule: Availability) => ({
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
        })),
      };
      await natsConnection.publish('business.availability.updated', eventPayload);
      logger.info('Published business.availability.updated event to NATS', { businessId });
    } catch (error) {
      logger.error('Failed to publish business.availability.updated event', { businessId, error });
      // Do not block core functionality if NATS fails
    }

    return fullNewRules;
  }

  async getAvailability(businessId: string, userId?: string): Promise<Availability[]> {
    // If userId is provided, verify ownership. Otherwise, assume public access or internal call.
    if (userId) {
      const business = await this.prisma.business.findFirst({
        where: { id: businessId, ownerId: userId },
      });
      if (!business) {
        throw new Error('Business not found or user is not the owner.');
      }
    } else {
      // Check if business exists even for public access
      const business = await this.prisma.business.findUnique({ where: { id: businessId } });
      if (!business) {
        throw new Error('Business not found.');
      }
    }

    return this.prisma.availability.findMany({
      where: { businessId: businessId },
      orderBy: [
        // Sort by day of week (requires mapping enum to sort order or handling in client)
        { dayOfWeek: 'asc' }, // This will sort alphabetically by enum name. Custom sort order might be needed.
        { startTime: 'asc' },
      ],
    });
  }
}
