"use client";

import { Button } from '@/components/ui';
import useAuth from '@/hooks/useAuth';
import { Calendar, LogOut, Menu, User, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

const Navbar: React.FC = () => {
  const { isAuthenticated, logout: authLogout, isLoading, user } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await authLogout();
    router.push('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isBusinessOwner = user?.role === 'business_owner';

  return (
    <nav className="bg-white border-b border-neutral-200 shadow-soft sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-primary-500" />
              <span className="text-xl font-heading font-bold text-secondary-900">
                SlotWise
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-pulse h-4 w-16 bg-neutral-200 rounded"></div>
              </div>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-secondary-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                {isBusinessOwner && (
                  <Link
                    href="/business"
                    className="text-secondary-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Business
                  </Link>
                )}
                <Link
                  href="/bookings"
                  className="text-secondary-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Bookings
                </Link>

                {/* User Menu */}
                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-neutral-200">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-secondary-500" />
                    <span className="text-sm text-secondary-700">
                      {user?.firstName || user?.email}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    leftIcon={<LogOut className="h-4 w-4" />}
                  >
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-secondary-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Button asChild>
                  <Link href="/register">Register</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="block px-3 py-2 rounded-md text-base font-medium text-secondary-700 hover:text-primary-500 hover:bg-neutral-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {isBusinessOwner && (
                  <Link
                    href="/business"
                    className="block px-3 py-2 rounded-md text-base font-medium text-secondary-700 hover:text-primary-500 hover:bg-neutral-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Business
                  </Link>
                )}
                <Link
                  href="/bookings"
                  className="block px-3 py-2 rounded-md text-base font-medium text-secondary-700 hover:text-primary-500 hover:bg-neutral-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Bookings
                </Link>
                <div className="border-t border-neutral-200 pt-4 mt-4">
                  <div className="flex items-center px-3 py-2">
                    <User className="h-5 w-5 text-secondary-500 mr-2" />
                    <span className="text-base font-medium text-secondary-700">
                      {user?.firstName || user?.email}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-secondary-700 hover:text-primary-500 hover:bg-neutral-50"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-secondary-700 hover:text-primary-500 hover:bg-neutral-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium bg-primary-500 text-white hover:bg-primary-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
