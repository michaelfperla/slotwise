"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth'; // Assuming @ path alias for src

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Ensure checkAuth has completed, especially for initial load or direct navigation
    // to a protected route.
    // isLoading will be false once checkAuth finishes.
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Second useEffect to re-run checkAuth if the component mounts
  // and isLoading is still true (e.g. direct navigation to protected route after browser refresh)
  // This helps ensure we have the latest auth state if useAuth initial check hasn't finished
  // or if localStorage was populated by another tab.
  useEffect(() => {
    if(isLoading) {
        checkAuth();
    }
  }, [isLoading, checkAuth]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg font-semibold text-gray-700">Loading...</p>
        {/* Optionally, replace with a spinner component */}
      </div>
    );
  }

  if (!isAuthenticated) {
    // This check is theoretically covered by the useEffect,
    // but as a safeguard, we can return null or a loading indicator
    // to prevent brief rendering of children before redirection.
    // The useEffect should handle the redirect almost immediately.
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
