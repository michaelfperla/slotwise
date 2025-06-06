/**
 * Business Dashboard Overview Component
 * 
 * This component displays the main dashboard overview with key metrics,
 * recent bookings, and quick actions for business owners.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp,
  Clock,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBusiness, useBusinessRevenue, useBookingTrends } from '@/hooks/useBusinessQueries';
import { useBusinessBookings } from '@/hooks/useBookingQueries';
import { businessUtils, schedulingUtils } from '@/lib/services';

interface DashboardMetricProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}

function DashboardMetric({ title, value, change, icon: Icon, href }: DashboardMetricProps) {
  const content = (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              {change.type === 'increase' ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm ml-1 ${
                change.type === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(change.value)}% {change.period}
              </span>
            </div>
          )}
        </div>
        <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary-600" />
        </div>
      </div>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

interface RecentBookingProps {
  booking: any; // Replace with proper Booking type
}

function RecentBookingItem({ booking }: RecentBookingProps) {
  const statusColor = schedulingUtils.getBookingStatusColor(booking.status);
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <div className="flex items-center space-x-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {booking.customerInfo?.name || 'Unknown Customer'}
            </p>
            <p className="text-xs text-gray-500">
              {booking.serviceName || 'Service'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <p className="text-sm text-gray-900">
            {schedulingUtils.formatDate(booking.startTime)}
          </p>
          <p className="text-xs text-gray-500">
            {schedulingUtils.formatTime(new Date(booking.startTime))}
          </p>
        </div>
        <Badge className={statusColor}>
          {schedulingUtils.getBookingStatusLabel(booking.status)}
        </Badge>
      </div>
    </div>
  );
}

export function BusinessDashboardOverview() {
  const { business } = useBusiness();
  const { data: revenueData, isLoading: isRevenueLoading } = useBusinessRevenue(
    business?.id || '',
    { period: 'month' }
  );
  const { data: bookingsData, isLoading: isBookingsLoading } = useBusinessBookings(
    business?.id || '',
    { 
      startDate: new Date().toISOString().split('T')[0],
      limit: 5 
    }
  );
  const { data: trendsData } = useBookingTrends(
    business?.id || '',
    { period: 'week', groupBy: 'day' }
  );

  if (!business) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No business selected</p>
      </div>
    );
  }

  // Calculate metrics
  const todayBookings = bookingsData?.bookings?.filter(booking => {
    const bookingDate = new Date(booking.startTime).toDateString();
    const today = new Date().toDateString();
    return bookingDate === today;
  }).length || 0;

  const monthlyRevenue = revenueData?.totalRevenue || 0;
  const totalCustomers = bookingsData?.pagination?.total || 0;
  const upcomingBookings = bookingsData?.bookings?.filter(booking => 
    new Date(booking.startTime) > new Date() && booking.status === 'confirmed'
  ).length || 0;

  // Calculate revenue change (mock calculation)
  const revenueChange = {
    value: 12.5,
    type: 'increase' as const,
    period: 'vs last month'
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with {business.name} today.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" asChild>
            <Link href={`/${business.subdomain}`} target="_blank">
              <Eye className="h-4 w-4 mr-2" />
              View Public Page
            </Link>
          </Button>
          <Button asChild>
            <Link href="/business/dashboard/bookings/new">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardMetric
          title="Today's Bookings"
          value={todayBookings}
          icon={Calendar}
          href="/business/dashboard/bookings"
        />
        <DashboardMetric
          title="Monthly Revenue"
          value={businessUtils.formatCurrency(monthlyRevenue, business.currency)}
          change={revenueChange}
          icon={DollarSign}
          href="/business/dashboard/payments"
        />
        <DashboardMetric
          title="Total Customers"
          value={totalCustomers}
          icon={Users}
          href="/business/dashboard/customers"
        />
        <DashboardMetric
          title="Upcoming Bookings"
          value={upcomingBookings}
          icon={Clock}
          href="/business/dashboard/bookings"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/business/dashboard/bookings">View all</Link>
            </Button>
          </div>
          
          {isBookingsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : bookingsData?.bookings?.length ? (
            <div className="space-y-1">
              {bookingsData.bookings.slice(0, 5).map((booking) => (
                <RecentBookingItem key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent bookings</p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link href="/business/dashboard/bookings/new">Create First Booking</Link>
              </Button>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/business/dashboard/services/new">
                <Plus className="h-4 w-4 mr-2" />
                Add New Service
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/business/dashboard/availability">
                <Clock className="h-4 w-4 mr-2" />
                Set Availability
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/business/dashboard/analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/business/dashboard/settings">
                <Users className="h-4 w-4 mr-2" />
                Business Settings
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      {/* Business Status */}
      {business.status !== 'active' && (
        <Card className="p-6 border-yellow-200 bg-yellow-50">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800">
                Business Setup Incomplete
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                Complete your business setup to start accepting bookings.
              </p>
            </div>
            <Button size="sm" asChild>
              <Link href="/business/onboarding">Complete Setup</Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default BusinessDashboardOverview;
