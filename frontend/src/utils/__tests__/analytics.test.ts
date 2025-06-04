import {
  fetchBusinessOverview,
  fetchBusinessTrends,
  fetchPopularServices,
  fetchCustomerInsights,
  OverviewData,
  TrendsData,
  PopularService,
  CustomerInsights,
} from '../analytics'; // Adjust path as necessary

// Mock console.log to avoid polluting test output, but allow inspection if needed
let consoleLogSpy: jest.SpyInstance;

beforeEach(() => {
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
});


describe('Analytics Utility Functions', () => {
  const mockBusinessId = 'test-business-123';

  describe('fetchBusinessOverview', () => {
    it('should return overview data with the correct structure', async () => {
      const data: OverviewData = await fetchBusinessOverview(mockBusinessId);

      expect(data).toHaveProperty('totalBookings');
      expect(typeof data.totalBookings).toBe('number');

      expect(data).toHaveProperty('totalRevenue');
      expect(typeof data.totalRevenue).toBe('number');

      expect(data).toHaveProperty('averageBookingValue');
      expect(typeof data.averageBookingValue).toBe('number');

      expect(data).toHaveProperty('conversionRate');
      expect(typeof data.conversionRate).toBe('number');

      expect(data).toHaveProperty('peakBookingTime');
      expect(typeof data.peakBookingTime).toBe('string');

      expect(data).toHaveProperty('mostPopularService');
      expect(typeof data.mostPopularService).toBe('string');

      // Check if console.log was called (as per current mock implementation)
      expect(consoleLogSpy).toHaveBeenCalledWith(`Fetching overview data for business: ${mockBusinessId}`);
    });
  });

  describe('fetchBusinessTrends', () => {
    it('should return trends data with the correct structure for default period', async () => {
      const data: TrendsData = await fetchBusinessTrends(mockBusinessId); // Default period is last_30_days

      expect(data).toHaveProperty('period', 'last_30_days');
      expect(data).toHaveProperty('bookingTrends');
      expect(Array.isArray(data.bookingTrends)).toBe(true);
      expect(data.bookingTrends.length).toBe(30); // Default mock generates 30 days

      data.bookingTrends.forEach(point => {
        expect(point).toHaveProperty('date');
        expect(typeof point.date).toBe('string');
        expect(point).toHaveProperty('bookings');
        expect(typeof point.bookings).toBe('number');
        expect(point).toHaveProperty('revenue');
        expect(typeof point.revenue).toBe('number');
      });

      expect(data).toHaveProperty('revenueTrends');
      expect(Array.isArray(data.revenueTrends)).toBe(true);
      expect(data.revenueTrends.length).toBe(30);

      // Check console.log
      expect(consoleLogSpy).toHaveBeenCalledWith(`Fetching trends data for business: ${mockBusinessId}, period: last_30_days`);
    });

    it('should return trends data for a specified period (e.g., last_7_days)', async () => {
      const period = 'last_7_days';
      const data: TrendsData = await fetchBusinessTrends(mockBusinessId, period);

      expect(data).toHaveProperty('period', period);
      expect(data.bookingTrends.length).toBe(7); // Mock generates 7 days for this period
      expect(consoleLogSpy).toHaveBeenCalledWith(`Fetching trends data for business: ${mockBusinessId}, period: ${period}`);
    });
  });

  describe('fetchPopularServices', () => {
    it('should return an array of popular services with the correct structure', async () => {
      const data: PopularService[] = await fetchPopularServices(mockBusinessId);

      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        const service = data[0];
        expect(service).toHaveProperty('serviceId');
        expect(typeof service.serviceId).toBe('string');
        expect(service).toHaveProperty('name');
        expect(typeof service.name).toBe('string');
        expect(service).toHaveProperty('bookings');
        expect(typeof service.bookings).toBe('number');
        expect(service).toHaveProperty('revenue');
        expect(typeof service.revenue).toBe('number');
      }
      expect(consoleLogSpy).toHaveBeenCalledWith(`Fetching popular services for business: ${mockBusinessId}`);
    });
  });

  describe('fetchCustomerInsights', () => {
    it('should return customer insights data with the correct structure', async () => {
      const data: CustomerInsights = await fetchCustomerInsights(mockBusinessId);

      expect(data).toHaveProperty('newCustomers');
      expect(typeof data.newCustomers).toBe('number');
      expect(data).toHaveProperty('returningCustomers');
      expect(typeof data.returningCustomers).toBe('number');
      expect(data).toHaveProperty('averageCustomerLifetimeValue');
      expect(typeof data.averageCustomerLifetimeValue).toBe('number');
      expect(consoleLogSpy).toHaveBeenCalledWith(`Fetching customer insights for business: ${mockBusinessId}`);
    });
  });

  // If these functions were making actual fetch/axios calls, you would mock fetch/axios here.
  // Example for a fetch-based function:
  //
  // global.fetch = jest.fn(() =>
  //   Promise.resolve({
  //     json: () => Promise.resolve({ mockData: 'someValue' }),
  //     ok: true,
  //   })
  // ) as jest.Mock;
  //
  // it('should call fetch with the correct URL for fetchSomething', async () => {
  //   await fetchSomething(mockBusinessId);
  //   expect(fetch).toHaveBeenCalledWith(`your-api-endpoint/businesses/${mockBusinessId}/something`);
  // });
});
