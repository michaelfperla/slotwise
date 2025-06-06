/**
 * Business Onboarding Page
 * 
 * This page provides the onboarding flow for new business owners
 * to set up their business and start accepting bookings.
 */

'use client';

import React from 'react';
import { BusinessOnboarding } from '@/components/business/BusinessOnboarding';
import { useAuth } from '@/context/AuthContext';

export default function BusinessOnboardingPage() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">Please log in to start the onboarding process.</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'business_owner') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Business Owner Account Required
          </h2>
          <p className="text-gray-600">
            You need a business owner account to access this onboarding flow.
          </p>
        </div>
      </div>
    );
  }

  return <BusinessOnboarding />;
}
