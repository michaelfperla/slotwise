/**
 * Business Dashboard Page
 *
 * Main dashboard page for business owners with overview, metrics,
 * and quick actions using the new infrastructure.
 */

'use client';

import { BusinessDashboardLayout } from '@/components/business/BusinessDashboardLayout';
import { BusinessDashboardOverview } from '@/components/business/BusinessDashboardOverview';
import { useAuth } from '@/context/AuthContext';

export default function BusinessDashboardPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <BusinessDashboardLayout>
      <BusinessDashboardOverview />
    </BusinessDashboardLayout>
  );
}


