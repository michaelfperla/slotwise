import { connect, NatsConnection, StringCodec } from 'nats';
import { config } from '../config/config';
import { logger } from '../utils/logger';

class NATSClient {
  private connection: NatsConnection | null = null;
  private sc = StringCodec();

  async connect(): Promise<void> {
    try {
      this.connection = await connect({ servers: config.nats.url });
      logger.info('Connected to NATS');
      
      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      logger.error('Failed to connect to NATS:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      logger.info('Disconnected from NATS');
    }
  }

  isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }

  async publish(subject: string, data: any): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    const message = JSON.stringify(data);
    this.connection.publish(subject, this.sc.encode(message));
    logger.debug(`Published message to ${subject}:`, data);
  }

  async subscribe(subject: string, handler: (data: any) => Promise<void>): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    const subscription = this.connection.subscribe(subject);
    logger.info(`Subscribed to ${subject}`);

    (async () => {
      for await (const message of subscription) {
        try {
          const data = JSON.parse(this.sc.decode(message.data));
          await handler(data);
        } catch (error) {
          logger.error(`Error processing message from ${subject}:`, error);
        }
      }
    })();
  }

  private setupEventListeners(): void {
    if (!this.connection) return;

    // Subscribe to booking events
    this.subscribe('booking.created', async (data) => {
      logger.info('Received booking.created event:', data);
      // Handle booking confirmation notification
    });

    this.subscribe('booking.cancelled', async (data) => {
      logger.info('Received booking.cancelled event:', data);
      // Handle booking cancellation notification
    });

    this.subscribe('booking.reminder', async (data) => {
      logger.info('Received booking.reminder event:', data);
      // Handle booking reminder notification
    });

    // Subscribe to user events
    this.subscribe('user.registered', async (data) => {
      logger.info('Received user.registered event:', data);
      // Handle welcome email
    });

    // Subscribe to business events
    this.subscribe('business.created', async (data) => {
      logger.info('Received business.created event:', data);
      // Handle business setup notification
    });
  }
}

export const natsClient = new NATSClient();
