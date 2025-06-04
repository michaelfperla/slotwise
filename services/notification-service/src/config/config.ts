export const config = {
  port: parseInt(process.env.PORT || '8004'),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:password@localhost:5432/slotwise_notifications',
  },

  // NATS
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
  },

  // Email
  email: {
    provider: process.env.EMAIL_PROVIDER || 'console', // console, sendgrid, ses, smtp
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@slotwise.com',
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@slotwise.com',
    },
    ses: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      fromEmail: process.env.SES_FROM_EMAIL || 'noreply@slotwise.com',
    },
  },

  // SMS
  sms: {
    provider: process.env.SMS_PROVIDER || 'console', // console, twilio
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER,
    },
  },

  // Push notifications
  push: {
    provider: process.env.PUSH_PROVIDER || 'console', // console, fcm
    fcm: {
      serverKey: process.env.FCM_SERVER_KEY,
    },
  },
};
