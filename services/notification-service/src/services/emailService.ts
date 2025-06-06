import fs from 'fs/promises';
import handlebars from 'handlebars';
import juice from 'juice';
import nodemailer from 'nodemailer';
import path from 'path';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';



// Basic in-memory notification log for email sending
export const emailNotificationLog: Array<{ // Exported for potential external access/admin UI
  id: string;
  recipientEmail: string;
  subject: string;
  templateName: string;
  status: 'sent' | 'failed';
  error?: string;
  sentAt: Date;
  messageId?: string;
}> = [];

const getTransporter = () => {
  if (config.email.provider === 'smtp') {
    if (
      !config.email.smtp.host ||
      !config.email.smtp.user ||
      !config.email.smtp.pass
    ) {
      logger.error(
        'SMTP configuration is incomplete (host, user, or pass missing). Email sending via SMTP will be disabled.'
      );
      return null;
    }
    return nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure, // true for 465, false for other ports
      auth: {
        user: config.email.smtp.user,
        pass: config.email.smtp.pass,
      },
      // Adding a timeout
      connectionTimeout: 5000, // 5 seconds
      greetingTimeout: 5000, // 5 seconds
      socketTimeout: 10000, // 10 seconds
    });
  } else if (config.email.provider === 'console') {
    logger.info('Using "console" email provider. Emails will be logged to the console.');
    return {
      sendMail: async (mailOptions: nodemailer.SendMailOptions) => {
        logger.info('--- MOCK EMAIL (CONSOLE PROVIDER) ---');
        logger.info(`To: ${mailOptions.to}`);
        logger.info(`From: ${mailOptions.from}`);
        logger.info(`Subject: ${mailOptions.subject}`);
        logger.info('Body (HTML):');
        logger.info(mailOptions.html);
        logger.info('--- MOCK EMAIL END ---');
        return { messageId: `mock-${Date.now()}` };
      },
    };
  }
  // TODO: Implement other providers like SendGrid, SES if needed from config
  logger.warn(
    `Email provider "${config.email.provider}" is not explicitly supported by emailService.ts or is misconfigured. Falling back to console output for emails.`
  );
  // Fallback console logger if no valid provider is set up
  return {
      sendMail: async (mailOptions: nodemailer.SendMailOptions) => {
        logger.info('--- MOCK EMAIL START (Fallback/Unsupported Provider) ---');
        logger.info(`To: ${mailOptions.to}`);
        logger.info(`From: ${mailOptions.from}`);
        logger.info(`Subject: ${mailOptions.subject}`);
        logger.info('Body (HTML):');
        logger.info(mailOptions.html);
        logger.info('--- MOCK EMAIL END ---');
        return { messageId: `mock-fallback-${Date.now()}` };
      },
    };
};

const transporter = getTransporter();

const loadAndCompileTemplate = async (templateName: string, data: Record<string, unknown>): Promise<string> => {
  try {
    // Load the base template
    const baseTemplateDir = path.resolve(process.cwd(), 'src', 'templates');
    const baseTemplatePath = path.join(baseTemplateDir, 'email-base.hbs');
    const baseTemplateSource = await fs.readFile(baseTemplatePath, 'utf-8');

    // Load the content template
    const contentTemplateDir = path.resolve(process.cwd(), 'src', 'templates', 'emails');
    const contentTemplatePath = path.join(contentTemplateDir, `${templateName}.hbs`);
    const contentTemplateSource = await fs.readFile(contentTemplatePath, 'utf-8');

    // Compile both templates
    const baseTemplate = handlebars.compile(baseTemplateSource);
    const contentTemplate = handlebars.compile(contentTemplateSource);

    // Render the content template first
    const contentHtml = contentTemplate({ ...data, currentYear: new Date().getFullYear() });

    // Then render the base template with the content
    const fullHtml = baseTemplate({
      ...data,
      content: contentHtml,
      currentYear: new Date().getFullYear()
    });

    // Inline CSS for better email client compatibility
    const inlinedHtml = juice(fullHtml);

    return inlinedHtml;
  } catch (error) {
    logger.error({ err: error, templateName }, `Error loading or compiling email template ${templateName}`);
    throw new Error(`Could not load or compile email template: ${templateName}`);
  }
};

export const sendEmail = async (
  to: string,
  subject: string,
  templateName: string,
  templateData: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  const logEntryBase = {
    recipientEmail: to,
    subject,
    templateName,
    sentAt: new Date(),
  };

  if (!transporter) {
    const errorMessage = 'Email transporter is not configured (likely due to missing SMTP settings). Cannot send email.';
    logger.error(errorMessage);
    emailNotificationLog.push({
      ...logEntryBase,
      id: `log-no-transporter-${Date.now()}`,
      status: 'failed',
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }

  try {
    const htmlContent = await loadAndCompileTemplate(templateName, templateData);

    let fromEmail = 'noreply@slotwise.com'; // Default
    if (config.email.provider === 'smtp' && config.email.smtp.fromEmail) {
      fromEmail = config.email.smtp.fromEmail;
    } else if (config.email.provider === 'sendgrid' && config.email.sendgrid.fromEmail) {
      // This part is for future expansion if sendgrid is directly used here
      fromEmail = config.email.sendgrid.fromEmail;
    }


    const mailOptions: nodemailer.SendMailOptions = {
      from: fromEmail,
      to,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    const messageId = typeof info.messageId === 'string' ? info.messageId : `sent-${Date.now()}`;
    logger.info(`Email sent successfully to ${to}. Message ID: ${messageId}`);
    emailNotificationLog.push({
      ...logEntryBase,
      id: messageId,
      messageId: messageId,
      status: 'sent',
    });
    return { success: true, messageId: messageId };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error sending email';
    logger.error({ err: error, recipient: to, subject }, `Error sending email to ${to}`);
    emailNotificationLog.push({
      ...logEntryBase,
      id: `log-send-error-${Date.now()}`,
      status: 'failed',
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }
};

// Register Handlebars helpers
// (These are already registered in the original file, keeping them here for completeness if this file is a fresh overwrite)
handlebars.registerHelper('eq', (a, b) => a === b);
handlebars.registerHelper('neq', (a, b) => a !== b);
handlebars.registerHelper('gt', (a, b) => a > b);
handlebars.registerHelper('lt', (a, b) => a < b);
handlebars.registerHelper('gte', (a, b) => a >= b);
handlebars.registerHelper('lte', (a, b) => a <= b);
handlebars.registerHelper('formatDate', (date, format) => {
  try {
    // Placeholder for a more robust date formatting library if needed
    return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'});
  } catch {
    logger.warn({ date, format }, "Handlebars formatDate helper failed.");
    return String(date); // Fallback
  }
});
handlebars.registerHelper('formatTime', (date) => {
   try {
       // Placeholder for a more robust time formatting library if needed
       return new Date(date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
   } catch {
       logger.warn({ date }, "Handlebars formatTime helper failed.");
       return String(date); // Fallback
   }
});

// Function to get the log (can be expanded for filtering, pagination etc.)
export const getEmailNotificationLog = (limit: number = 50) => {
  return emailNotificationLog.slice(-limit);
};
