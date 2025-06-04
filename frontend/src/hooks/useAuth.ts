"use client";

import { useContext } from 'react';
import AuthContext, { AuthContextType } from '@/context/AuthContext'; // Assuming @ path alias for src

/**
 * Custom hook to access the authentication context.
 * This hook provides an easy way to get the authentication state and methods
 * (user, isAuthenticated, login, logout, etc.) from the AuthProvider.
 *
 * It must be used within a component tree wrapped by AuthProvider.
 *
 * @returns {AuthContextType} The authentication context value.
 * @throws {Error} If used outside of an AuthProvider.
 */
const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider. Make sure your component is a descendant of <AuthProvider>.');
  }

  return context;
};

export default useAuth;
