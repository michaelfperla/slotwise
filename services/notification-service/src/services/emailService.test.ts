import { emailService } from './emailService'; // Assuming emailService is exported as an instance
import { config } from '../config';
import sgMail from '@sendgrid/mail'; // This will be the Jest mock from setup.ts
import { logger } from '../utils/logger';

// Spy on logger.info, as it's used by the 'console' email provider
jest.spyOn(logger, 'info');
// Spy on logger.error for error cases
jest.spyOn(logger, 'error');


describe('EmailService', () => {
  const originalEmailProvider = config.email.provider;
  const originalSendgridApiKey = config.email.sendgrid.apiKey;

  beforeEach(() => {
    // Reset mocks before each test
    (sgMail.send as jest.Mock).mockClear();
    (logger.info as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();
    
    // Ensure a default state for config if tests modify it
    config.email.provider = originalEmailProvider;
    config.email.sendgrid.apiKey = originalSendgridApiKey;
    // Re-initialize emailService if its constructor depends on mutable config values directly
    // For this example, we assume emailService is stateless enough or picks up config dynamically.
    // If not, new EmailService() might be needed in tests that change config.
  });

  afterAll(() => {
    // Restore original config if necessary
    config.email.provider = originalEmailProvider;
    config.email.sendgrid.apiKey = originalSendgridApiKey;
  });

  it('should send email via SendGrid if provider is "sendgrid" and API key is present', async () => {
    config.email.provider = 'sendgrid';
    config.email.sendgrid.apiKey = 'test-api-key'; // Ensure API key is seen as present
    // Re-create or re-configure service if necessary (if constructor reads config once)
    const testEmailService = new (emailService as any).constructor(); // Re-instantiate to pick up new config

    const testMail = {
      to: 'test@example.com',
      subject: 'Test Subject',
      htmlBody: '<p>Hello World</p>',
      textBody: 'Hello World',
    };

    await testEmailService.sendEmail(testMail.to, testMail.subject, testMail.htmlBody, testMail.textBody);

    expect(sgMail.send).toHaveBeenCalledTimes(1);
    expect(sgMail.send).toHaveBeenCalledWith(expect.objectContaining({
      to: testMail.to,
      from: config.email.sendgrid.fromEmail, // or the default
      subject: testMail.subject,
      html: testMail.htmlBody,
      text: testMail.textBody,
    }));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Email sent successfully via SendGrid'), expect.anything());
  });

  it('should log to console if provider is "console"', async () => {
    config.email.provider = 'console';
    const testEmailService = new (emailService as any).constructor();


    const testMail = {
      to: 'console@example.com',
      subject: 'Console Test',
      htmlBody: '<p>Console Hello</p>',
    };

    await testEmailService.sendEmail(testMail.to, testMail.subject, testMail.htmlBody);
    
    expect(sgMail.send).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('--- CONSOLE EMAIL ---');
    expect(logger.info).toHaveBeenCalledWith(`To: ${testMail.to}`);
    expect(logger.info).toHaveBeenCalledWith(`Subject: ${testMail.subject}`);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('HTML Body'), expect.stringContaining(testMail.htmlBody.substring(0,10)));
    expect(logger.info).toHaveBeenCalledWith('--- END CONSOLE EMAIL ---');
  });

  it('should log to console via SendGrid path if API key is missing', async () => {
    config.email.provider = 'sendgrid';
    config.email.sendgrid.apiKey = undefined; // Simulate missing API key
    const testEmailService = new (emailService as any).constructor();


    const testMail = {
      to: 'fallback@example.com',
      subject: 'Fallback Test',
      htmlBody: '<p>Fallback Hello</p>',
    };

    await testEmailService.sendEmail(testMail.to, testMail.subject, testMail.htmlBody);

    expect(sgMail.send).not.toHaveBeenCalled(); // SendGrid send should not be called
    expect(logger.error).toHaveBeenCalledWith("Cannot send email via SendGrid: API key not configured.");
    expect(logger.info).toHaveBeenCalledWith('--- CONSOLE EMAIL ---'); // Check if it falls back to console
    expect(logger.info).toHaveBeenCalledWith(`To: ${testMail.to}`);
  });
  
  it('should handle SendGrid send errors', async () => {
    config.email.provider = 'sendgrid';
    config.email.sendgrid.apiKey = 'test-api-key';
    const testEmailService = new (emailService as any).constructor();

    (sgMail.send as jest.Mock).mockRejectedValueOnce(new Error('SendGrid API Error'));

    const testMail = {
      to: 'error@example.com',
      subject: 'Error Test',
      htmlBody: '<p>Error Hello</p>',
    };
    
    await expect(testEmailService.sendEmail(testMail.to, testMail.subject, testMail.htmlBody))
      .rejects.toThrow('SendGrid API Error');
    
    expect(sgMail.send).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('Error sending email via SendGrid', expect.objectContaining({ error: 'SendGrid API Error' }));
  });

});
