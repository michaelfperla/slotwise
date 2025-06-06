"use client";

import useAuth from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import React from 'react';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const { user } = useAuth();
  
  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <Sidebar userRole={user?.role} />
      
      {/* Main Content */}
      <main className={cn('flex-1 overflow-auto', className)}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
