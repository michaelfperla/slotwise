import { templateService, TemplateName } from './templateService'; // Assuming TemplateName is exported
import path from 'path';
import fs from 'fs/promises';

// Helper to read raw template content for basic checks
const readRawTemplate = async (templateFile: string): Promise<string> => {
  const filePath = path.join(__dirname, '../templates', templateFile);
  return fs.readFile(filePath, 'utf-8');
};

describe('TemplateService', () => {
  // Test preloading (optional, as render should load on demand too)
  // It's good to have a basic check that constructor doesn't throw with existing templates
  it('should preload templates without throwing errors', async () => {
    // The constructor calls preloadTemplates. If it completes, this is a basic pass.
    // We can also check if the cache has been populated after a short delay,
    // but that might make the test flaky or require exposing cache status.
    // For now, just ensuring constructor runs is a simple check.
    expect(templateService).toBeDefined(); 
    // A more robust check might involve waiting for preload to complete if it's truly async
    // and then checking internal cache state, but render() will load on demand anyway.
  });

  const testCases: {
    templateName: TemplateName;
    templateFile: string;
    data: any;
    expectedStrings: string[];
  }[] = [
    {
      templateName: 'booking-confirmation',
      templateFile: 'booking-confirmation.hbs',
      data: {
        customerName: 'John Doe',
        serviceName: 'Awesome Haircut',
        businessName: 'Cool Cuts Inc.',
        bookingId: 'BK123',
        bookingDate: 'October 26, 2023',
        bookingTime: '10:00 AM',
        durationMinutes: 60,
        price: 50,
        currency: 'USD',
        businessPhone: '555-1234',
      },
      expectedStrings: ['Hello John Doe', 'Awesome Haircut', 'Cool Cuts Inc.', 'BK123', 'October 26, 2023', '10:00 AM', '60 minutes', '50 USD', '555-1234', String(new Date().getFullYear())],
    },
    {
      templateName: 'new-booking-to-business',
      templateFile: 'new-booking-to-business.hbs',
      data: {
        businessOwnerName: 'Jane Owner',
        businessName: 'Cool Cuts Inc.',
        serviceName: 'Awesome Haircut',
        bookingId: 'BK123',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        bookingDate: 'October 26, 2023',
        bookingTime: '10:00 AM',
        durationMinutes: 60,
      },
      expectedStrings: ['Hello Jane Owner', 'Awesome Haircut', 'Cool Cuts Inc.', 'BK123', 'John Doe', 'john@example.com', 'October 26, 2023', '10:00 AM'],
    },
    {
      templateName: 'booking-cancellation-customer',
      templateFile: 'booking-cancellation-customer.hbs',
      data: {
        customerName: 'John Doe',
        serviceName: 'Awesome Haircut',
        businessName: 'Cool Cuts Inc.',
        bookingId: 'BK123',
        bookingDate: 'October 26, 2023',
        bookingTime: '10:00 AM',
        cancellationReason: 'Changed my mind',
        bookingLink: 'http://example.com/book',
      },
      expectedStrings: ['Hello John Doe', 'booking for Awesome Haircut with Cool Cuts Inc. has been cancelled', 'BK123', 'Changed my mind', 'http://example.com/book'],
    },
    {
      templateName: 'booking-cancellation-business',
      templateFile: 'booking-cancellation-business.hbs',
      data: {
        businessOwnerName: 'Jane Owner',
        businessName: 'Cool Cuts Inc.',
        serviceName: 'Awesome Haircut',
        bookingId: 'BK123',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        bookingDate: 'October 26, 2023',
        bookingTime: '10:00 AM',
        cancelledBy: 'Customer',
      },
      expectedStrings: ['Hello Jane Owner', 'booking for your service Awesome Haircut', 'BK123', 'John Doe (john@example.com)', 'Cancelled By: Customer'],
    },
  ];

  testCases.forEach(tc => {
    it(`should render template ${tc.templateName} correctly`, async () => {
      const html = await templateService.render(tc.templateName, tc.data);
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
      
      // Check if critical strings are present
      tc.expectedStrings.forEach(expectedStr => {
        expect(html).toContain(expectedStr);
      });

      // Basic check for HTML structure (optional, can be brittle)
      expect(html).toMatch(/<html/);
      expect(html).toMatch(/<\/html>/);
      expect(html).toMatch(/<body/);
      expect(html).toMatch(/<\/body>/);
    });

    it(`should ensure raw template file ${tc.templateFile} exists and is not empty`, async () => {
        const rawContent = await readRawTemplate(tc.templateFile);
        expect(rawContent).toBeDefined();
        expect(rawContent.length).toBeGreaterThan(0);
    });
  });
  
  it('should throw an error for a non-existent template if not preloaded and filename convention fails', async () => {
    // This test assumes 'non-existent-template.hbs' does not exist.
    // And TemplateService is not modified to know about it.
    await expect(templateService.render('non-existent-template' as TemplateName, {}))
      .rejects.toThrow('Could not load template non-existent-template');
  });

  it('should inject currentYear if not provided in data', async () => {
    const data = { customerName: 'Test' }; // No currentYear
    const html = await templateService.render('booking-confirmation', data); // Use a known template
    const currentYear = new Date().getFullYear().toString();
    expect(html).toContain(currentYear);
  });

});
