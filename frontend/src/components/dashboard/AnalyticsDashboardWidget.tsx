"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MetricCard from '@/components/analytics/MetricCard';
import { fetchBusinessOverview, OverviewData } from '@/utils/analytics';

interface AnalyticsDashboardWidgetProps {
  businessId: string; // Business ID to fetch data for
}

const AnalyticsDashboardWidget: React.FC<AnalyticsDashboardWidgetProps> = ({ businessId }) => {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchBusinessOverview(businessId);
        setOverviewData(data);
      } catch (err) {
        console.error("Failed to fetch overview data for widget:", err);
        setError("Could not load analytics snapshot.");
        // In a real app, you might want to log this error to a monitoring service
      }
      setLoading(false);
    };

    if (businessId) {
      loadOverview();
    } else {
      setError("Business ID is not available.");
      setLoading(false);
    }
  }, [businessId]);

  if (loading) {
    return (
      <div className="p-4 bg-white shadow-md rounded-lg animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white shadow-md rounded-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Analytics Snapshot</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!overviewData) {
    return null; // Or some other placeholder if data couldn't be loaded but no error thrown
  }

  return (
    <section className="p-4 md:p-6 bg-white shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Analytics Snapshot</h2>
        <Link href="/dashboard/analytics" legacyBehavior>
          <a className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
            View Full Analytics
          </a>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Showing fewer cards for a widget */}
        <MetricCard title="Total Bookings" value={overviewData.totalBookings} />
        <MetricCard title="Total Revenue" value={`$${overviewData.totalRevenue.toLocaleString()}`} />
        <MetricCard title="Avg. Booking Value" value={`$${overviewData.averageBookingValue.toFixed(2)}`} />
        <MetricCard title="Conversion Rate" value={`${overviewData.conversionRate}%`} />
      </div>
    </section>
  );
};

export default AnalyticsDashboardWidget;
