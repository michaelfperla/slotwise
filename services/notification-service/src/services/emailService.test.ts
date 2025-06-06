// import nodemailer from 'nodemailer'; // Commented out as it's not used in tests
import fs from 'fs/promises';
import handlebars from 'handlebars';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { emailNotificationLog, getEmailNotificationLog, sendEmail } from './emailService.js'; // Import specific functions

// Mocking nodemailer
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail,
}));
jest.mock('nodemailer', () => ({
  createTransport: () => mockCreateTransport(),
}));

// Mocking fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

// Mocking handlebars (partially, just the compile function)
const mockTemplate = jest.fn(() => 'Compiled HTML');
jest.mock('handlebars', () => ({
  compile: jest.fn(() => mockTemplate),
  // Keep other Handlebars exports if used by the service, e.g. registerHelper
  registerHelper: jest.fn(),
}));


// Spy on logger methods
jest.spyOn(logger, 'info');
jest.spyOn(logger, 'error');
jest.spyOn(logger, 'warn');


describe('EmailService', () => {
  const originalEmailProvider = config.email.provider;
  const originalSmtpConfig = { ...config.email.smtp };

  beforeEach(() => {
    // Reset mocks and logs before each test
    mockSendMail.mockClear();
    mockCreateTransport.mockClear();
    (fs.readFile as jest.Mock).mockClear();
    (handlebars.compile as jest.Mock).mockClear();
    mockTemplate.mockClear();
    (logger.info as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();
    (logger.warn as jest.Mock).mockClear();
    emailNotificationLog.length = 0; // Clear in-memory log

    // Restore original config
    config.email.provider = originalEmailProvider;
    config.email.smtp = { ...originalSmtpConfig };
  });

  afterAll(() => {
    // Restore original config fully
    config.email.provider = originalEmailProvider;
    config.email.smtp = originalSmtpConfig;
  });

  describe('sendEmail with SMTP provider', () => {
    beforeEach(() => {
      config.email.provider = 'smtp';
      config.email.smtp = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        user: 'user@example.com',
        pass: 'password',
        fromEmail: 'from@example.com',
      };
      // Reset createTransport mock specifically for SMTP tests
      mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
    });

    it('should send an email using nodemailer and handlebars', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('Raw {{name}} template content');
      mockSendMail.mockResolvedValue({ messageId: 'smtp-123' });

      const result = await sendEmail('to@example.com', 'Test Subject', 'testTemplate', { name: 'Tester' });

      expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('testTemplate.hbs'), 'utf-8');
      expect(handlebars.compile).toHaveBeenCalledWith('Raw {{name}} template content');
      expect(mockTemplate).toHaveBeenCalledWith({ name: 'Tester', currentYear: new Date().getFullYear() });
      expect(mockCreateTransport).toHaveBeenCalled();
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'from@example.com',
        to: 'to@example.com',
        subject: 'Test Subject',
        html: 'Compiled HTML',
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('smtp-123');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Email sent successfully to to@example.com'));
      expect(emailNotificationLog.length).toBe(1);
      expect(emailNotificationLog[0].status).toBe('sent');
      expect(emailNotificationLog[0].recipientEmail).toBe('to@example.com');
    });

    it('should return error if sendMail fails', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('Template content');
      mockSendMail.mockRejectedValue(new Error('SMTP Error'));

      const result = await sendEmail('to@example.com', 'Test Subject', 'testTemplate', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP Error');
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ err: new Error('SMTP Error') }), expect.stringContaining('Error sending email to to@example.com'));
      expect(emailNotificationLog.length).toBe(1);
      expect(emailNotificationLog[0].status).toBe('failed');
      expect(emailNotificationLog[0].error).toBe('SMTP Error');
    });

    it('should return error if template loading fails', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await sendEmail('to@example.com', 'Test Subject', 'testTemplate', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not load or compile email template');
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ err: new Error('File not found')}), expect.stringContaining('Error loading or compiling email template testTemplate'));
      expect(emailNotificationLog.length).toBe(1);
      expect(emailNotificationLog[0].status).toBe('failed');
    });

    it('should not attempt to send if SMTP config is incomplete', async () => {
      config.email.smtp.host = undefined; // Incomplete config
      // Need to re-initialize or mock getTransporter behavior if it's memoized and affected by config changes.
      // For this test structure, sendEmail will call getTransporter internally which will return null.

      const result = await sendEmail('to@example.com', 'Test Subject', 'testTemplate', {});

      expect(mockCreateTransport).not.toHaveBeenCalled(); // transporter should be null
      expect(mockSendMail).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email transporter is not configured');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Email transporter is not configured'));
      expect(emailNotificationLog.length).toBe(1);
      expect(emailNotificationLog[0].status).toBe('failed');
      expect(emailNotificationLog[0].error).toContain('Email transporter is not configured');
    });
  });

  describe('sendEmail with console provider', () => {
    beforeEach(() => {
      config.email.provider = 'console';
      // No need to mock createTransport for console, as it should not be called.
      // Ensure the mock for nodemailer.createTransport() itself is reset or doesn't get called.
       mockCreateTransport.mockClear(); // Clear any previous calls from SMTP tests
       mockSendMail.mockClear();
    });

    it('should log email details to console', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('Raw {{name}} template content'); // Still need to "load" template

      const result = await sendEmail('console@example.com', 'Console Subject', 'consoleTemplate', { name: 'Console User' });

      expect(mockCreateTransport).not.toHaveBeenCalled(); // nodemailer.createTransport should not be called
      expect(mockSendMail).not.toHaveBeenCalled();

      expect(logger.info).toHaveBeenCalledWith('--- MOCK EMAIL (CONSOLE PROVIDER) ---');
      expect(logger.info).toHaveBeenCalledWith('To: console@example.com');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('From:')); // From is default
      expect(logger.info).toHaveBeenCalledWith('Subject: Console Subject');
      expect(logger.info).toHaveBeenCalledWith('Body (HTML):');
      expect(logger.info).toHaveBeenCalledWith('Compiled HTML'); // Since mockTemplate returns this
      expect(logger.info).toHaveBeenCalledWith('--- MOCK EMAIL END ---');

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock-/);
      expect(emailNotificationLog.length).toBe(1);
      expect(emailNotificationLog[0].status).toBe('sent'); // Console provider is treated as 'sent'
    });
  });

  describe('getEmailNotificationLog', () => {
    it('should return a copy of the emailNotificationLog', () => {
        // Add a couple of mock logs
        emailNotificationLog.push({
            id: 'log1', recipientEmail: 'test1@example.com', subject: 'Sub1', templateName: 'temp1',
            status: 'sent', sentAt: new Date(), messageId: 'msg1'
        });
        emailNotificationLog.push({
            id: 'log2', recipientEmail: 'test2@example.com', subject: 'Sub2', templateName: 'temp2',
            status: 'failed', sentAt: new Date(), error: 'Some error'
        });

        const logCopy = getEmailNotificationLog();
        expect(logCopy).toHaveLength(2);
        expect(logCopy).not.toBe(emailNotificationLog); // Ensure it's a copy (slice behavior)
        expect(logCopy[0].id).toBe('log1');
    });

    it('should limit the number of returned log entries', () => {
        for (let i = 0; i < 60; i++) {
            emailNotificationLog.push({
                id: `log${i}`, recipientEmail: `test${i}@example.com`, subject: `Sub${i}`,
                templateName: `temp${i}`, status: 'sent', sentAt: new Date(), messageId: `msg${i}`
            });
        }
        const logCopy = getEmailNotificationLog(50);
        expect(logCopy).toHaveLength(50);
        expect(logCopy[0].id).toBe('log10'); // Should be the 10th original entry (index 10)
    });
  });
});
