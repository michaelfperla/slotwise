import {
  waitForServices,
  makeApiRequest,
  createTestBusiness,
  createTestService,
  createTestBooking,
  AUTH_SERVICE_URL,
  BUSINESS_SERVICE_URL,
  SCHEDULING_SERVICE_URL,
  NOTIFICATION_SERVICE_URL
} from '../setup';

describe('End-to-End Booking Flow', () => {
  let authToken: string;
  let businessId: string;
  let serviceId: string;
  let bookingId: string;

  beforeAll(async () => {
    // Wait for all services to be ready
    await waitForServices();
  });

  describe('Complete booking flow', () => {
    it('should complete the full booking journey', async () => {
      // Step 1: User Registration
      const registrationData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User'
      };

      const registrationResponse = await makeApiRequest(`${AUTH_SERVICE_URL}/api/auth/register`, {
        method: 'POST',
        body: JSON.stringify(registrationData)
      });

      expect(registrationResponse.user).toBeDefined();
      expect(registrationResponse.token).toBeDefined();
      authToken = registrationResponse.token;

      // Step 2: Business Setup
      const businessData = createTestBusiness();
      const businessResponse = await makeApiRequest(`${BUSINESS_SERVICE_URL}/api/businesses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(businessData)
      });

      expect(businessResponse.id).toBeDefined();
      businessId = businessResponse.id;

      // Step 3: Service Creation
      const serviceData = createTestService();
      const serviceResponse = await makeApiRequest(`${BUSINESS_SERVICE_URL}/api/businesses/${businessId}/services`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(serviceData)
      });

      expect(serviceResponse.id).toBeDefined();
      serviceId = serviceResponse.id;

      // Step 4: Booking Creation
      const bookingData = {
        ...createTestBooking(),
        serviceId
      };

      const bookingResponse = await makeApiRequest(`${SCHEDULING_SERVICE_URL}/api/bookings`, {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });

      expect(bookingResponse.id).toBeDefined();
      expect(bookingResponse.status).toBe('confirmed');
      bookingId = bookingResponse.id;

      // Step 5: Verify booking confirmation
      const confirmationResponse = await makeApiRequest(`${SCHEDULING_SERVICE_URL}/api/bookings/${bookingId}`);
      
      expect(confirmationResponse.id).toBe(bookingId);
      expect(confirmationResponse.customerEmail).toBe(bookingData.customerEmail);
      expect(confirmationResponse.status).toBe('confirmed');

      // Step 6: Verify notification was sent (check notification service)
      // This would typically check that an email/SMS was queued
      const notificationResponse = await makeApiRequest(`${NOTIFICATION_SERVICE_URL}/api/notifications?bookingId=${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(notificationResponse.notifications).toBeDefined();
      expect(notificationResponse.notifications.length).toBeGreaterThan(0);
    });

    it('should handle booking conflicts correctly', async () => {
      // Try to book the same time slot again
      const conflictingBookingData = {
        ...createTestBooking(),
        serviceId,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Same time as previous booking
      };

      try {
        await makeApiRequest(`${SCHEDULING_SERVICE_URL}/api/bookings`, {
          method: 'POST',
          body: JSON.stringify(conflictingBookingData)
        });
        fail('Should have thrown a conflict error');
      } catch (error) {
        expect(error.message).toContain('409');
      }
    });

    it('should allow booking cancellation', async () => {
      // Cancel the booking
      const cancellationResponse = await makeApiRequest(`${SCHEDULING_SERVICE_URL}/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(cancellationResponse.status).toBe('cancelled');

      // Verify cancellation notification was sent
      const notificationResponse = await makeApiRequest(`${NOTIFICATION_SERVICE_URL}/api/notifications?bookingId=${bookingId}&type=cancellation`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(notificationResponse.notifications).toBeDefined();
    });
  });
});
