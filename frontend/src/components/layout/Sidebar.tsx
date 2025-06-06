"use client";

import { Badge, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  BarChart3,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Users,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  children?: SidebarItem[];
}

const businessOwnerNavItems: SidebarItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    label: 'Calendar',
    href: '/dashboard/calendar',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    label: 'Bookings',
    href: '/dashboard/bookings',
    icon: <CalendarDays className="h-5 w-5" />,
    badge: '3', // This would come from real data
  },
  {
    label: 'Services',
    href: '/dashboard/services',
    icon: <Wrench className="h-5 w-5" />,
  },
  {
    label: 'Staff',
    href: '/dashboard/staff',
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings className="h-5 w-5" />,
  },
];

const clientNavItems: SidebarItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    label: 'My Bookings',
    href: '/bookings',
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    label: 'Book Appointment',
    href: '/book',
    icon: <Calendar className="h-5 w-5" />,
  },
];

interface SidebarProps {
  userRole?: 'business_owner' | 'client' | string;
  className?: string;
}

export function Sidebar({ userRole = 'client', className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  
  const navItems = userRole === 'business_owner' ? businessOwnerNavItems : clientNavItems;

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside
      className={cn(
        'bg-white border-r border-neutral-200 transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="font-heading font-semibold text-secondary-900">
                {userRole === 'business_owner' ? 'Business' : 'Client'} Portal
              </h2>
              <p className="text-xs text-secondary-500 mt-1">
                {userRole === 'business_owner' ? 'Manage your business' : 'Your appointments'}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-secondary-700 hover:bg-neutral-50 hover:text-secondary-900',
                    isCollapsed && 'justify-center'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" size="sm">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-neutral-200">
          <div className="text-xs text-secondary-500">
            <p>SlotWise v1.0</p>
            <p className="mt-1">© 2024 SlotWise</p>
          </div>
        </div>
      )}
    </aside>
  );
}
