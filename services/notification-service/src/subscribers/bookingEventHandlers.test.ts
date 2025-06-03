import { emailService } from '../services/emailService';
import { templateService } from '../services/templateService';
import { logger } from '../utils/logger';
import {
    handleBookingCancelled,
    handleBookingConfirmed,
    initializeBookingEventSubscribers,
} from './bookingEventHandlers'; // Assuming direct import for test

// Mock services
jest.mock('../services/templateService');
jest.mock('../services/emailService');
jest.mock('../utils/logger'); // Mock logger to check reminder log

// Mock natsConnection for initializeBookingEventSubscribers
// We only need to test if subscribe is called correctly by initializeBookingEventSubscribers
// The actual callback execution (handleBookingConfirmed, handleBookingCancelled) will be tested directly.
const mockNatsSubscribe = jest.fn().mockResolvedValue(undefined); // .mockResolvedValue for async subscribe if it returns Promise
jest.mock('../events/natsClient', () => ({
  natsClient: {
    isConnected: jest.fn().mockReturnValue(true),
    subscribe: jest.fn((subject, handler) => {
      // Store handler to simulate message later if needed, or just check subject
      mockNatsSubscribe(subject, handler); // Call our spy
      return Promise.resolve(); // If your subscribe returns a Promise
    }),
  },
}));

describe('Booking Event Handlers', () => {
  // Define mock payloads based on interfaces in bookingEventHandlers.ts
  // These must align with the assumed enriched payloads.
  const mockConfirmedPayload = {
    bookingId: 'confirm123',
    customer: { name: 'Alice Customer', email: 'alice@example.com' },
    business: { name: "Bob's Barbershop", ownerEmail: 'bob@barbershop.com', phone: '555-0101' },
    service: { name: 'Haircut', durationMinutes: 30, price: 25, currency: 'USD' },
    startTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 24 * 3600 * 1000 + 30 * 60 * 1000).toISOString(),
  };

  const mockCancelledPayload = {
    bookingId: 'cancel456',
    customer: { name: 'Charlie Client', email: 'charlie@example.com' },
    business: {
      name: "Dave's Driving School",
      ownerEmail: 'dave@drivingschool.com',
      phone: '555-0202',
    },
    service: { name: 'Driving Lesson', durationMinutes: 60 },
    startTime: new Date(Date.now() + 48 * 3600 * 1000).toISOString(), // Day after tomorrow
    cancellationReason: 'No longer needed',
    cancelledBy: 'Customer',
  };

  beforeEach(() => {
    // Clear all mock instances before each test
    (templateService.render as jest.Mock).mockClear();
    (emailService.sendEmail as jest.Mock).mockClear();
    (logger.info as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();
    mockNatsSubscribe.mockClear(); // Clear our nats subscribe spy
    (natsClient.isConnected as jest.Mock).mockReturnValue(true); // Reset to connected
  });

  describe('handleBookingConfirmed', () => {
    it('should render templates and send emails to customer and business', async () => {
      (templateService.render as jest.Mock).mockImplementation(async (templateName, data) => {
        return `<html>Mocked ${templateName} for ${data.customerName || data.businessOwnerName}</html>`;
      });

      await handleBookingConfirmed(mockConfirmedPayload);

      // Check template rendering calls
      expect(templateService.render).toHaveBeenCalledTimes(2);
      expect(templateService.render).toHaveBeenCalledWith(
        'booking-confirmation',
        expect.objectContaining({
          customerName: mockConfirmedPayload.customer.name,
          serviceName: mockConfirmedPayload.service.name,
        })
      );
      expect(templateService.render).toHaveBeenCalledWith(
        'new-booking-to-business',
        expect.objectContaining({
          businessOwnerName: mockConfirmedPayload.business.name, // Using businessName as ownerName for simplicity here
          serviceName: mockConfirmedPayload.service.name,
        })
      );

      // Check email sending calls
      expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
      // Customer email
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        mockConfirmedPayload.customer.email,
        expect.stringContaining(
          `Your Booking for ${mockConfirmedPayload.service.name} is Confirmed!`
        ),
        expect.stringContaining('Mocked booking-confirmation')
      );
      // Business email
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        mockConfirmedPayload.business.ownerEmail,
        expect.stringContaining(`New Booking Received: ${mockConfirmedPayload.service.name}`),
        expect.stringContaining('Mocked new-booking-to-business')
      );

      // Check reminder log
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Reminder scheduling (MVP): Logged for booking'),
        expect.any(String)
      );
    });

    it('should handle errors during template rendering or email sending gracefully', async () => {
      (templateService.render as jest.Mock).mockImplementationOnce(async templateName => {
        if (templateName === 'booking-confirmation') throw new Error('Customer template error');
        return `<html>OK ${templateName}</html>`;
      });
      (emailService.sendEmail as jest.Mock).mockImplementationOnce(async to => {
        if (to === mockConfirmedPayload.business.ownerEmail)
          throw new Error('Business email send error');
      });

      await handleBookingConfirmed(mockConfirmedPayload);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send booking confirmation to customer',
        expect.anything()
      );
      // It should still attempt to send to business if customer email fails (or vice-versa)
      expect(templateService.render).toHaveBeenCalledTimes(2); // Both render attempts
      expect(emailService.sendEmail).toHaveBeenCalledTimes(2); // Both send attempts
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send new booking notification to business',
        expect.anything()
      );
    });
  });

  describe('handleBookingCancelled', () => {
    it('should render templates and send cancellation emails to customer and business', async () => {
      (templateService.render as jest.Mock).mockResolvedValue('<html>Mocked cancellation</html>');

      await handleBookingCancelled(mockCancelledPayload);

      expect(templateService.render).toHaveBeenCalledTimes(2);
      expect(templateService.render).toHaveBeenCalledWith(
        'booking-cancellation-customer',
        expect.anything()
      );
      expect(templateService.render).toHaveBeenCalledWith(
        'booking-cancellation-business',
        expect.anything()
      );

      expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        mockCancelledPayload.customer.email,
        expect.stringContaining('Your Booking for') &&
          expect.stringContaining('has been Cancelled'),
        '<html>Mocked cancellation</html>'
      );
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        mockCancelledPayload.business.ownerEmail,
        expect.stringContaining('Booking Cancelled:') &&
          expect.stringContaining(mockCancelledPayload.service.name),
        '<html>Mocked cancellation</html>'
      );
    });
  });

  describe('initializeBookingEventSubscribers', () => {
    it('should subscribe to booking.confirmed and booking.cancelled', () => {
      initializeBookingEventSubscribers();
      expect(natsClient.subscribe).toHaveBeenCalledTimes(2);
      expect(natsClient.subscribe).toHaveBeenCalledWith(
        'booking.confirmed',
        expect.any(Function)
      );
      expect(natsClient.subscribe).toHaveBeenCalledWith(
        'booking.cancelled',
        expect.any(Function)
      );
    });

    it('should log a warning if NATS connection is not established', () => {
      (natsClient.isConnected as jest.Mock).mockReturnValueOnce(false);
      initializeBookingEventSubscribers();
      expect(logger.warn).toHaveBeenCalledWith(
        'NATS connection not established. Cannot initialize booking event subscribers.'
      );
      expect(natsClient.subscribe).not.toHaveBeenCalled();
    });
  });
});
