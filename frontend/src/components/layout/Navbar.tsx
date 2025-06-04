"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth'; // Assuming @ path alias for src

const Navbar: React.FC = () => {
  const { isAuthenticated, logout: authLogout, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await authLogout();
    router.push('/login');
  };

  // Avoid rendering anything or showing a flicker during initial auth check
  // if (isLoading) {
  //   return (
  //     <nav className="bg-gray-800 text-white p-4 shadow-md">
  //       <div className="container mx-auto flex justify-between items-center">
  //         <Link href="/" className="text-xl font-bold hover:text-gray-300">
  //           My App
  //         </Link>
  //         <div className="flex items-center space-x-4">
  //           {/* Placeholder for loading state in navbar if needed */}
  //         </div>
  //       </div>
  //     </nav>
  //   );
  // }

  return (
    <nav className="bg-indigo-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-indigo-200">
          MyApp
        </Link>
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <span className="text-sm">Loading...</span>
          ) : isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="hover:text-indigo-200 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hover:text-indigo-200 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-green-500 hover:bg-green-600 px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
