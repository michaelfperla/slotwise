"use client";

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute'; // Adjust path as necessary

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

export default DashboardLayout;
