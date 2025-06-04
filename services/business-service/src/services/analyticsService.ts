import { Prisma, PrismaClient, BookingStatus, PaymentStatus } from '@prisma/client';
import { subDays, startOfDay, endOfDay, formatISO } from 'date-fns';

// 1. Data Structures / DTOs (matching sprint-tasks/TASK-5-NOTIFICATIONS-ANALYTICS.md)

export interface OverviewData {
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  conversionRate?: number; // Optional, as it might require more data (e.g., website visits)
  peakBookingTime?: string; // e.g., "14:00-15:00" - This is more complex, might simplify or omit for now
  mostPopularService?: { id: string; name: string; bookings: number };
}

export interface TrendsDataPoint {
  date: string; // YYYY-MM-DD
  bookings: number;
  revenue: number;
}

export interface TrendsData {
  period: string; // e.g., "7d", "30d", "90d"
  data: TrendsDataPoint[];
}

// Helper function to get date range based on period
const getDateRange = (period: string): { gte: Date; lte: Date } => {
  const now = new Date();
  let daysToSubtract = 0;
  switch (period) {
    case '7d':
      daysToSubtract = 7;
      break;
    case '30d':
      daysToSubtract = 30;
      break;
    case '90d':
      daysToSubtract = 90;
      break;
    default: // Default to 30 days if period is invalid
      daysToSubtract = 30;
  }
  return {
    gte: startOfDay(subDays(now, daysToSubtract -1)), // -1 because we want to include the start day
    lte: endOfDay(now),
  };
};

// 2. Analytics Service Logic

export const getBusinessOverview = async (
  businessId: string,
  prisma: PrismaClient
): Promise<OverviewData> => {
  // --- Total Bookings (Completed or Confirmed) ---
  const totalBookings = await prisma.booking.count({
    where: {
      businessId,
      status: {
        in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED],
      },
      // Potentially filter by date range if "all time" is too broad
    },
  });

  // --- Total Revenue (from successful payments related to completed/confirmed bookings) ---
  // This assumes a structure where Booking has many Payments or a direct link to a Payment.
  // For simplicity, let's assume payments are directly on bookings or a related table.
  // We'll sum 'amount' from 'Payment' records linked to the business's bookings.
  // This query is simplified. A real scenario might need to join Booking and Payment tables.
  const revenueResult = await prisma.payment.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      booking: {
        businessId,
        status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
      },
      status: PaymentStatus.SUCCESSFUL, // Only count successful payments
    },
  });
  const totalRevenue = revenueResult._sum.amount || 0;

  // --- Average Booking Value ---
  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // --- Most Popular Service ---
  // This requires grouping bookings by serviceId and counting them.
  const popularServices = await prisma.booking.groupBy({
    by: ['serviceId'],
    _count: {
      serviceId: true,
    },
    where: {
      businessId,
      status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
      serviceId: { not: null }
    },
    orderBy: {
      _count: {
        serviceId: 'desc',
      },
    },
    take: 1,
  });

  let mostPopularServiceData: OverviewData['mostPopularService'] = undefined;
  if (popularServices.length > 0 && popularServices[0].serviceId) {
    const topServiceDetails = await prisma.service.findUnique({
        where: { id: popularServices[0].serviceId}
    });
    if (topServiceDetails) {
        mostPopularServiceData = {
            id: topServiceDetails.id,
            name: topServiceDetails.name,
            bookings: popularServices[0]._count.serviceId
        };
    }
  }

  // Peak booking time and conversion rate are more complex and might require
  // more specific data or external analytics (like website visits for conversion).
  // For now, they are omitted or can be added as placeholders.

  return {
    totalBookings,
    totalRevenue,
    averageBookingValue: parseFloat(averageBookingValue.toFixed(2)),
    mostPopularService: mostPopularServiceData,
    // conversionRate: 0, // Placeholder
    // peakBookingTime: "N/A", // Placeholder
  };
};


export const getBusinessTrends = async (
  businessId: string,
  period: string, // e.g., "7d", "30d", "90d"
  prisma: PrismaClient
): Promise<TrendsData> => {
  const dateRange = getDateRange(period);

  // Fetch bookings grouped by date
  // Prisma's groupBy doesn't directly support date functions like DATE() for grouping by day part of DateTime.
  // A common workaround is to fetch records and process in application code, or use raw SQL ($queryRaw).
  // For simplicity and to avoid raw SQL if not strictly necessary for this sub-task,
  // we'll fetch all relevant bookings and aggregate them in code.
  // This might be inefficient for very large datasets / long periods.

  const bookingsInPeriod = await prisma.booking.findMany({
    where: {
      businessId,
      status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
      createdAt: { // Assuming trends are based on booking creation date
        gte: dateRange.gte,
        lte: dateRange.lte,
      },
    },
    include: {
      payments: { // To calculate revenue per booking
        where: { status: PaymentStatus.SUCCESSFUL },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Process data to create daily trend points
  const trendsMap: Map<string, { date: string; bookings: number; revenue: number }> = new Map();

  // Initialize map for all dates in the period to ensure days with no bookings are included
  let currentDate = new Date(dateRange.gte);
  while (currentDate <= dateRange.lte) {
    const isoDate = formatISO(currentDate, { representation: 'date' });
    trendsMap.set(isoDate, { date: isoDate, bookings: 0, revenue: 0 });
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
  }

  bookingsInPeriod.forEach(booking => {
    const dateStr = formatISO(booking.createdAt, { representation: 'date' });
    const dayData = trendsMap.get(dateStr);

    if (dayData) {
      dayData.bookings += 1;
      const bookingRevenue = booking.payments.reduce((sum, payment) => sum + payment.amount, 0);
      dayData.revenue += bookingRevenue;
      trendsMap.set(dateStr, dayData);
    }
  });

  return {
    period,
    data: Array.from(trendsMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), // Ensure sorted by date
  };
};

// Example of how Prisma client might be instantiated and passed (usually done in a central place)
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
// getBusinessOverview("some-business-id", prisma).then(...);
// getBusinessTrends("some-business-id", "30d", prisma).then(...);

// Note on Prisma Schema:
// This implementation assumes the following about `schema.prisma`:
// model Business {
//   id        String    @id @default(cuid())
//   bookings  Booking[]
//   // ... other fields
// }
// model Service {
//   id        String    @id @default(cuid())
//   name      String
//   bookings  Booking[]
//   // ... other fields
// }
// model Booking {
//   id          String        @id @default(cuid())
//   businessId  String
//   business    Business      @relation(fields: [businessId], references: [id])
//   serviceId   String?       // Made optional for cases where service might not be relevant
//   service     Service?      @relation(fields: [serviceId], references: [id])
//   createdAt   DateTime      @default(now())
//   status      BookingStatus // Enum: PENDING, CONFIRMED, CANCELLED, COMPLETED etc.
//   payments    Payment[]
//   // ... other fields like price, startTime, endTime
// }
// model Payment {
//   id          String        @id @default(cuid())
//   bookingId   String
//   booking     Booking       @relation(fields: [bookingId], references: [id])
//   amount      Float
//   status      PaymentStatus // Enum: PENDING, SUCCESSFUL, FAILED
//   createdAt   DateTime      @default(now())
//   // ... other fields like paymentMethod, transactionId
// }
// enum BookingStatus { PENDING CONFIRMED COMPLETED CANCELLED ... }
// enum PaymentStatus { PENDING SUCCESSFUL FAILED ... }

// If `serviceId` on `Booking` is mandatory, the query for popular services can be simplified (no need to check for null).
// The revenue calculation assumes payments are linked to bookings. If revenue is stored directly on the booking,
// the queries would need to be adjusted.
// The `createdAt` field on `Booking` is used for trend analysis.
// `BookingStatus` and `PaymentStatus` enums are crucial for filtering.
// Run `npx prisma generate` after any schema changes.
// For this subtask, I will assume these fields and relations exist.
// If `date-fns` is not available, it should be installed: `npm install date-fns` or `pnpm add date-fns`
// in the `services/business-service` directory.
// For now, I'll assume it's available or will be installed.
// Also, I'll add the `date-fns` import.```typescript
import { Prisma, PrismaClient, BookingStatus, PaymentStatus } from '@prisma/client';
import { subDays, startOfDay, endOfDay, formatISO, eachDayOfInterval } from 'date-fns';

// 1. Data Structures / DTOs (matching sprint-tasks/TASK-5-NOTIFICATIONS-ANALYTICS.md)

export interface OverviewData {
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  // conversionRate?: number; // Optional, as it might require more data (e.g., website visits)
  // peakBookingTime?: string; // e.g., "14:00-15:00" - This is more complex, might simplify or omit for now
  mostPopularService?: { id: string; name: string; bookings: number };
  // Other relevant metrics can be added here
}

export interface TrendsDataPoint {
  date: string; // YYYY-MM-DD
  bookings: number;
  revenue: number;
}

export interface TrendsData {
  period: string; // e.g., "7d", "30d", "90d"
  data: TrendsDataPoint[];
}

// Helper function to get date range based on period
const getDateRange = (period: string): { startDate: Date; endDate: Date } => {
  const endDate = endOfDay(new Date()); // Today, end of day
  let daysToSubtract = 30; // Default to 30 days

  if (period === '7d') {
    daysToSubtract = 7;
  } else if (period === '90d') {
    daysToSubtract = 90;
  }
  // Add more periods like 'yesterday', 'this_week', 'last_month' if needed

  const startDate = startOfDay(subDays(endDate, daysToSubtract - 1)); // -1 to make the period inclusive
  return { startDate, endDate };
};

// 2. Analytics Service Logic

export const getBusinessOverview = async (
  businessId: string,
  prisma: PrismaClient
): Promise<OverviewData> => {
  if (!businessId) {
    throw new Error('Business ID is required');
  }

  // --- Total Bookings (Completed or Confirmed) ---
  const totalBookingsCount = await prisma.booking.count({
    where: {
      businessId,
      status: {
        in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED],
      },
      // Consider if a date range filter is needed for "all time" or a specific operational period
    },
  });

  // --- Total Revenue (from successful payments related to the business's bookings) ---
  const revenueAggregation = await prisma.payment.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      booking: {
        businessId,
        // We might want to ensure these bookings are also COMPLETED or CONFIRMED,
        // though payment success should ideally correlate.
        // status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
      },
      status: PaymentStatus.SUCCESSFUL,
    },
  });
  const totalRevenueAmount = revenueAggregation._sum.amount || 0;

  // --- Average Booking Value ---
  const averageBookingValue = totalBookingsCount > 0 ? totalRevenueAmount / totalBookingsCount : 0;

  // --- Most Popular Service ---
  let mostPopularServiceData: OverviewData['mostPopularService'] = undefined;
  const popularServiceQueryResults = await prisma.booking.groupBy({
    by: ['serviceId'],
    _count: {
      serviceId: true,
    },
    where: {
      businessId,
      status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
      serviceId: { not: null }, // Ensure serviceId is not null
    },
    orderBy: {
      _count: {
        serviceId: 'desc',
      },
    },
    take: 1,
  });

  if (popularServiceQueryResults.length > 0 && popularServiceQueryResults[0].serviceId) {
    const topServiceId = popularServiceQueryResults[0].serviceId;
    const serviceDetails = await prisma.service.findUnique({
      where: { id: topServiceId },
    });
    if (serviceDetails) {
      mostPopularServiceData = {
        id: serviceDetails.id,
        name: serviceDetails.name,
        bookings: popularServiceQueryResults[0]._count.serviceId || 0,
      };
    }
  }

  return {
    totalBookings: totalBookingsCount,
    totalRevenue: totalRevenueAmount,
    averageBookingValue: parseFloat(averageBookingValue.toFixed(2)), // Round to 2 decimal places
    mostPopularService: mostPopularServiceData,
  };
};


export const getBusinessTrends = async (
  businessId: string,
  period: string, // e.g., "7d", "30d", "90d"
  prisma: PrismaClient
): Promise<TrendsData> => {
  if (!businessId) {
    throw new Error('Business ID is required');
  }

  const { startDate, endDate } = getDateRange(period);

  // Fetch bookings within the period, including payments for revenue calculation
  const bookingsInPeriod = await prisma.booking.findMany({
    where: {
      businessId,
      status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] }, // Or other relevant statuses
      createdAt: { // Assuming trends are based on booking creation date
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      payments: {
        where: { status: PaymentStatus.SUCCESSFUL },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Initialize a map for all dates in the period with 0 bookings/revenue
  const allDatesInPeriod = eachDayOfInterval({ start: startDate, end: endDate });
  const trendsMap: Map<string, TrendsDataPoint> = new Map(
    allDatesInPeriod.map(date => {
      const isoDate = formatISO(date, { representation: 'date' });
      return [isoDate, { date: isoDate, bookings: 0, revenue: 0 }];
    })
  );

  // Populate the map with actual data
  bookingsInPeriod.forEach(booking => {
    const dateStr = formatISO(booking.createdAt, { representation: 'date' });
    const dayData = trendsMap.get(dateStr);

    if (dayData) {
      dayData.bookings += 1;
      const bookingRevenue = booking.payments.reduce((sum, payment) => sum + payment.amount, 0);
      dayData.revenue += bookingRevenue;
      // trendsMap.set(dateStr, dayData); // Not strictly necessary as object is mutated by reference
    }
  });

  return {
    period,
    data: Array.from(trendsMap.values()), // Map values are already sorted by date due to initialization
  };
};

// Assumptions for Prisma Schema (as per previous thought block):
// - Models: Business, Service, Booking, Payment
// - Enums: BookingStatus, PaymentStatus
// - Key fields: Booking.createdAt, Booking.status, Booking.serviceId,
//               Payment.amount, Payment.status, Payment.bookingId
// - Relations: Business <> Booking, Service <> Booking, Booking <> Payment
//
// Ensure `date-fns` is installed in `services/business-service`:
// `cd services/business-service && npm install date-fns` (or pnpm/yarn)
```

The initial thought block was a bit messy. This refined version provides the `analyticsService.ts` content.
I've defined the DTOs (`OverviewData`, `TrendsData`, `TrendsDataPoint`) and implemented `getBusinessOverview` and `getBusinessTrends`.
The `getBusinessTrends` function now initializes all dates in the period with zero values, ensuring a complete trend line.
I've also added `date-fns` for date manipulations. I'll proceed assuming `date-fns` is available or will be installed as part of the setup for this service.

Next, I will create the `analyticsRoutes.ts` file.
