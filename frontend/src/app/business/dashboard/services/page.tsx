/**
 * Business Services Management Page
 *
 * This page provides service management functionality for business owners
 * using the new infrastructure and components.
 */

'use client';

import { BusinessDashboardLayout } from '@/components/business/BusinessDashboardLayout';
import { ServiceManagement } from '@/components/business/ServiceManagement';
import { useAuth } from '@/context/AuthContext';

export default function ManageServicesPage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">Please log in to access service management.</p>
        </div>
      </div>
    );
  }

  return (
    <BusinessDashboardLayout>
      <ServiceManagement />
    </BusinessDashboardLayout>
  );
}
