"use client"; // This directive is often needed for pages with hooks and event handlers

import React, { useEffect, useState } from 'react';
import MetricCard from '@/components/analytics/MetricCard';
import BookingTrendsChart from '@/components/analytics/BookingTrendsChart';
import {
  fetchBusinessOverview,
  fetchBusinessTrends,
  fetchPopularServices,
  // fetchCustomerInsights, // Example for future use
  OverviewData,
  TrendsData,
  PopularService,
  // CustomerInsights, // Example for future use
} from '@/utils/analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assuming ShadCN Tabs component

// Mock businessId - in a real app, this would come from context, props, or auth state
const MOCK_BUSINESS_ID = "business123";

const AnalyticsPage: React.FC = () => {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [popularServices, setPopularServices] = useState<PopularService[]>([]);
  // const [customerInsights, setCustomerInsights] = useState<CustomerInsights | null>(null); // Example for future use

  const [trendsPeriod, setTrendsPeriod] = useState<string>("last_30_days");
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [loadingTrends, setLoadingTrends] = useState<boolean>(true);
  const [loadingServices, setLoadingServices] = useState<boolean>(true);
  // const [loadingInsights, setLoadingInsights] = useState<boolean>(true); // Example for future use

  useEffect(() => {
    const loadOverview = async () => {
      setLoadingOverview(true);
      try {
        const data = await fetchBusinessOverview(MOCK_BUSINESS_ID);
        setOverviewData(data);
      } catch (error) {
        console.error("Failed to fetch overview data:", error);
        // Handle error state in UI if necessary
      }
      setLoadingOverview(false);
    };

    // const loadInsights = async () => { // Example for future use
    //   setLoadingInsights(true);
    //   const data = await fetchCustomerInsights(MOCK_BUSINESS_ID);
    //   setCustomerInsights(data);
    //   setLoadingInsights(false);
    // };

    loadOverview();
    // loadInsights();
  }, []);

  useEffect(() => {
    const loadTrends = async () => {
      setLoadingTrends(true);
      try {
        const data = await fetchBusinessTrends(MOCK_BUSINESS_ID, trendsPeriod);
        setTrendsData(data);
      } catch (error) {
        console.error("Failed to fetch trends data:", error);
      }
      setLoadingTrends(false);
    };

    loadTrends();
  }, [trendsPeriod]);

  useEffect(() => {
    const loadPopularServices = async () => {
      setLoadingServices(true);
      try {
        const data = await fetchPopularServices(MOCK_BUSINESS_ID);
        setPopularServices(data);
      } catch (error) {
        console.error("Failed to fetch popular services:", error);
      }
      setLoadingServices(false);
    };
    loadPopularServices();
  }, []);

  // Basic loading state
  if (loadingOverview || loadingServices) {
    return (
      <div className="container mx-auto p-6 min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-500">Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Business Analytics</h1>
        <p className="text-gray-600">Insights for {MOCK_BUSINESS_ID}</p>
      </header>

      {/* Overview Metrics */}
      {overviewData && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          <MetricCard title="Total Bookings" value={overviewData.totalBookings} description="All time" />
          <MetricCard title="Total Revenue" value={`$${overviewData.totalRevenue.toLocaleString()}`} description="All time" />
          <MetricCard title="Avg. Booking Value" value={`$${overviewData.averageBookingValue.toFixed(2)}`} />
          <MetricCard title="Conversion Rate" value={`${overviewData.conversionRate}%`} />
          <MetricCard title="Peak Booking Time" value={overviewData.peakBookingTime} />
          <MetricCard title="Most Popular Service" value={overviewData.mostPopularService} />
        </section>
      )}

      {/* Trends Section */}
      <section>
        <Tabs value={trendsPeriod} onValueChange={setTrendsPeriod}>
          <TabsList className="mb-4">
            <TabsTrigger value="last_7_days">Last 7 Days</TabsTrigger>
            <TabsTrigger value="last_30_days">Last 30 Days</TabsTrigger>
            <TabsTrigger value="last_90_days">Last 90 Days</TabsTrigger>
          </TabsList>
          <TabsContent value="last_7_days">
            {loadingTrends && <p>Loading 7-day trends...</p>}
            {!loadingTrends && trendsData && <BookingTrendsChart data={trendsData.bookingTrends} chartTitle="7-Day Booking Trends" />}
          </TabsContent>
          <TabsContent value="last_30_days">
            {loadingTrends && <p>Loading 30-day trends...</p>}
            {!loadingTrends && trendsData && <BookingTrendsChart data={trendsData.bookingTrends} chartTitle="30-Day Booking Trends" />}
          </TabsContent>
          <TabsContent value="last_90_days">
            {loadingTrends && <p>Loading 90-day trends...</p>}
            {!loadingTrends && trendsData && <BookingTrendsChart data={trendsData.bookingTrends} chartTitle="90-Day Booking Trends" />}
          </TabsContent>
        </Tabs>
      </section>

      {/* Popular Services Section */}
      {!loadingServices && popularServices.length > 0 && (
        <section className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Most Popular Services</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {popularServices.map((service) => (
                  <tr key={service.serviceId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{service.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{service.bookings}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${service.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Placeholder for Customer Insights - Example for future use */}
      {/* {customerInsights && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="New Customers" value={customerInsights.newCustomers} />
          <MetricCard title="Returning Customers" value={customerInsights.returningCustomers} />
          <MetricCard title="Avg. LTV" value={`$${customerInsights.averageCustomerLifetimeValue.toFixed(2)}`} />
        </section>
      )} */}
    </div>
  );
};

export default AnalyticsPage;
