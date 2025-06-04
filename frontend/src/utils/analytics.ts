// Mock data structures based on API contract in sprint-tasks/TASK-5-NOTIFICATIONS-ANALYTICS.md

export interface OverviewData {
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  conversionRate: number; // Percentage
  peakBookingTime: string; // e.g., "14:00-15:00"
  mostPopularService: string;
  // Potentially other overview metrics
}

export interface TrendsDataPoint {
  date: string; // e.g., "2024-01-01"
  bookings: number;
  revenue: number;
}

export interface TrendsData {
  period: string; // e.g., "last_7_days", "last_30_days", "last_90_days"
  bookingTrends: TrendsDataPoint[];
  revenueTrends: TrendsDataPoint[]; // Could be the same as bookingTrends if revenue is tied to bookings directly
  // Potentially other trend lines like new customers, etc.
}

export interface PopularService {
  serviceId: string;
  name: string;
  bookings: number;
  revenue: number;
}

export interface CustomerInsights {
  newCustomers: number;
  returningCustomers: number;
  averageCustomerLifetimeValue: number;
  // Other customer-related metrics
}

// Mock fetch functions
export const fetchBusinessOverview = async (businessId: string): Promise<OverviewData> => {
  console.log(`Fetching overview data for business: ${businessId}`);
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return mock data
  return {
    totalBookings: 1250,
    totalRevenue: 75000,
    averageBookingValue: 60,
    conversionRate: 15.5,
    peakBookingTime: "18:00-19:00",
    mostPopularService: "Standard Haircut",
  };
};

export const fetchBusinessTrends = async (businessId: string, period: string = "last_30_days"): Promise<TrendsData> => {
  console.log(`Fetching trends data for business: ${businessId}, period: ${period}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  const generateTrendData = (days: number): TrendsDataPoint[] => {
    const data: TrendsDataPoint[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        bookings: Math.floor(Math.random() * 50) + 10, // Random bookings between 10-60
        revenue: (Math.floor(Math.random() * 50) + 10) * (Math.random() * 30 + 50), // Random revenue
      });
    }
    return data;
  };

  let days = 30;
  if (period === "last_7_days") days = 7;
  if (period === "last_90_days") days = 90;

  const trends = generateTrendData(days);

  return {
    period,
    bookingTrends: trends,
    revenueTrends: trends.map(t => ({ ...t, revenue: t.revenue * (Math.random() * 0.5 + 0.8) })), // Slightly different revenue
  };
};

export const fetchPopularServices = async (businessId: string): Promise<PopularService[]> => {
  console.log(`Fetching popular services for business: ${businessId}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { serviceId: "svc_1", name: "Standard Haircut", bookings: 450, revenue: 22500 },
    { serviceId: "svc_2", name: "Beard Trim", bookings: 300, revenue: 9000 },
    { serviceId: "svc_3", name: "Wash & Cut", bookings: 250, revenue: 17500 },
    { serviceId: "svc_4", name: "Kids Cut", bookings: 150, revenue: 6000 },
    { serviceId: "svc_5", name: "Coloring", bookings: 100, revenue: 10000 },
  ];
};

export const fetchCustomerInsights = async (businessId: string): Promise<CustomerInsights> => {
  console.log(`Fetching customer insights for business: ${businessId}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    newCustomers: 80,
    returningCustomers: 420,
    averageCustomerLifetimeValue: 250,
  };
};
