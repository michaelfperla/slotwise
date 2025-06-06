"use client";

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardLayout as DashboardLayoutComponent } from '@/components/layout/DashboardLayout';
import React from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <ProtectedRoute>
      <DashboardLayoutComponent>
        {children}
      </DashboardLayoutComponent>
    </ProtectedRoute>
  );
};

export default DashboardLayout;
