import sgMail from '@sendgrid/mail';
import { config } from '../config';
import { logger } from '../utils/logger';

class EmailService {
  private emailProvider: string;
  private fromEmail: string;

  constructor() {
    this.emailProvider = config.email.provider;
    if (this.emailProvider === 'sendgrid') {
      if (!config.email.sendgrid.apiKey) {
        logger.warn('SendGrid API key is missing. Email sending will likely fail.');
      } else {
        sgMail.setApiKey(config.email.sendgrid.apiKey);
      }
      this.fromEmail = config.email.sendgrid.fromEmail || 'noreply@slotwise.com';
    } else if (this.emailProvider === 'ses') {
        // AWS SES setup would go here using aws-sdk v3
        // e.g. import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
        // this.sesClient = new SESClient({ region: config.email.ses.region, credentials: {...} });
        logger.warn("SES email provider is configured but not fully implemented in this MVP EmailService example.");
        this.fromEmail = config.email.ses.fromEmail || 'noreply@slotwise.com';
    } else { // Default to console
      this.fromEmail = 'console-sender@slotwise.com'; // From address for console logs
      logger.info(`Email provider set to 'console'. Emails will be logged to the console.`);
    }
  }

  async sendEmail(to: string, subject: string, htmlBody: string, textBody?: string): Promise<void> {
    logger.info(`Attempting to send email`, { to, subject, provider: this.emailProvider });

    if (this.emailProvider === 'sendgrid') {
      if (!config.email.sendgrid.apiKey) {
        logger.error("Cannot send email via SendGrid: API key not configured.");
        // Fallback to console to ensure notification is not lost in dev if key is missing
        this.logToConsole(to, subject, htmlBody, textBody);
        return;
      }
      const msg = {
        to: to,
        from: this.fromEmail, 
        subject: subject,
        text: textBody, // Optional plain text version
        html: htmlBody,
      };
      try {
        await sgMail.send(msg);
        logger.info(`Email sent successfully via SendGrid to ${to}`, { subject });
      } catch (error: any) {
        logger.error('Error sending email via SendGrid', { error: error.response?.body || error.message });
        // Optionally, implement a fallback or re-queue mechanism here
        throw error; // Re-throw to indicate failure
      }
    } else if (this.emailProvider === 'ses') {
        // TODO: Implement AWS SES sending logic
        logger.warn(`SES provider selected, but sending not implemented. Logging to console instead.`);
        this.logToConsole(to, subject, htmlBody, textBody);
    } else { // 'console' or any other provider falls back to console
      this.logToConsole(to, subject, htmlBody, textBody);
    }
  }

  private logToConsole(to: string, subject: string, htmlBody: string, textBody?: string): void {
    logger.info('--- CONSOLE EMAIL ---');
    logger.info(`To: ${to}`);
    logger.info(`From: ${this.fromEmail}`);
    logger.info(`Subject: ${subject}`);
    if (textBody) {
      logger.info('Text Body:\n', textBody);
    }
    logger.info('HTML Body (first 200 chars):\n', htmlBody.substring(0, Math.min(htmlBody.length, 200)) + "...");
    // In a real console logger, you might write the HTML to a temp file or avoid logging very large bodies.
    logger.info('--- END CONSOLE EMAIL ---');
  }
}

export const emailService = new EmailService();
