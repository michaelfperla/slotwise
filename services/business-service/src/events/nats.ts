import { connect, NatsConnection, JSONCodec } from 'nats';
import { config } from '../config';
import { logger } from '../utils/logger';

class NATSConnection {
  private connection: NatsConnection | null = null;
  private codec = JSONCodec();

  async connect(): Promise<void> {
    try {
      this.connection = await connect({
        servers: [config.nats.url],
        name: 'business-service',
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
      });

      logger.info('Connected to NATS');

      // Handle connection events
      this.connection.closed().then(err => {
        if (err) {
          logger.error('NATS connection closed with error', { error: err });
        } else {
          logger.info('NATS connection closed');
        }
      });
    } catch (error) {
      logger.error('Failed to connect to NATS', { error });
      throw error;
    }
  }

  async publish(subject: string, data: Record<string, unknown>): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    try {
      this.connection.publish(subject, this.codec.encode(data));
      logger.debug('Published message to NATS', { subject, data });
    } catch (error) {
      logger.error('Failed to publish message to NATS', { subject, error });
      throw error;
    }
  }

  async subscribe(
    subject: string,
    handler: (data: Record<string, unknown>) => Promise<void>
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    try {
      const subscription = this.connection.subscribe(subject);

      (async () => {
        for await (const message of subscription) {
          try {
            const data = this.codec.decode(message.data) as Record<string, unknown>;
            await handler(data);
            logger.debug('Processed NATS message', { subject, data });
          } catch (error) {
            logger.error('Error processing NATS message', { subject, error });
          }
        }
      })();

      logger.info('Subscribed to NATS subject', { subject });
    } catch (error) {
      logger.error('Failed to subscribe to NATS subject', { subject, error });
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      logger.info('NATS connection closed');
    }
  }

  isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }
}

export const natsConnection = new NATSConnection();
