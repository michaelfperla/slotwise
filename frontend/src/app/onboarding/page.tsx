"use client";

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

const OnboardingPage = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            🎉 Welcome to SlotWise!
          </h1>
          <p className="text-gray-600 mt-2">
            Hi {user.firstName}! Let's get your business set up.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900">What's Next?</h3>
            <p className="text-sm text-blue-700 mt-1">
              Create your business profile to start accepting bookings and managing your schedule.
            </p>
          </div>

          <button
            onClick={() => router.push('/business/register')}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create My Business
          </button>

          <p className="text-xs text-gray-500">
            You can always set this up later from your dashboard.
          </p>
        </div>
      </div>

      <footer className="mt-8 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} SlotWise. All rights reserved.
      </footer>
    </div>
  );
};

export default OnboardingPage;
