"use client";

import { PageContent, PageHeader } from '@/components/layout/PageLayout';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import useAuth from '@/hooks/useAuth';
import {
    CalendarDays,
    Clock,
    DollarSign,
    Plus,
    TrendingUp,
    Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-secondary-500">Loading user data...</div>
      </div>
    );
  }

  const isBusinessOwner = user.role === 'business_owner';

  // Mock data - in real app this would come from API
  const stats = {
    todayBookings: 5,
    weeklyRevenue: 1250,
    totalClients: 42,
    upcomingBookings: 12,
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user.firstName || user.email}!`}
      >
        {isBusinessOwner && (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        )}
      </PageHeader>

      <PageContent>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card hover="lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Bookings</CardTitle>
              <CalendarDays className="h-4 w-4 text-secondary-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary-600">{stats.todayBookings}</div>
              <p className="text-xs text-secondary-500">
                +2 from yesterday
              </p>
            </CardContent>
          </Card>

          {isBusinessOwner && (
            <>
              <Card hover="lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Weekly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-secondary-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success-600">${stats.weeklyRevenue}</div>
                  <p className="text-xs text-secondary-500">
                    +12% from last week
                  </p>
                </CardContent>
              </Card>

              <Card hover="lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                  <Users className="h-4 w-4 text-secondary-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent-600">{stats.totalClients}</div>
                  <p className="text-xs text-secondary-500">
                    +3 new this week
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          <Card hover="lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-secondary-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning-600">{stats.upcomingBookings}</div>
              <p className="text-xs text-secondary-500">
                Next 7 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with these common tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex-col space-y-2"
                onClick={() => router.push('/bookings')}
              >
                <CalendarDays className="h-6 w-6" />
                <span>View Bookings</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex-col space-y-2"
                onClick={() => router.push('/book')}
              >
                <Plus className="h-6 w-6" />
                <span>Book Appointment</span>
              </Button>

              {isBusinessOwner && (
                <Button
                  variant="outline"
                  className="h-auto p-4 flex-col space-y-2"
                  onClick={() => router.push('/dashboard/analytics')}
                >
                  <TrendingUp className="h-6 w-6" />
                  <span>View Analytics</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your current account details and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm text-secondary-600">
                  {user.firstName} {user.lastName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email:</span>
                <span className="text-sm text-secondary-600">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Account Type:</span>
                <Badge variant={isBusinessOwner ? 'accent' : 'secondary'}>
                  {isBusinessOwner ? 'Business Owner' : 'Client'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant="success">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
