/**
 * Auth Context Provider
 *
 * This component provides authentication context using Zustand store
 * following SlotWise patterns and conventions.
 */

'use client';

import { useAuthStore } from '@/stores/authStore';
import { User } from '@/types/api';
import React, { createContext, useContext, useEffect } from 'react';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasRole: (role: string) => boolean;
  isBusinessOwner: () => boolean;
  isClient: () => boolean;
  isAdmin: () => boolean;
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authStore = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    authStore.checkAuthStatus();

    // Load user profile if authenticated but no user data
    if (authStore.isAuthenticated && !authStore.user) {
      authStore.loadUser();
    }
  }, []);

  const contextValue: AuthContextType = {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    error: authStore.error,
    login: async (email: string, password: string) => {
      await authStore.login({ email, password });
    },
    register: authStore.register,
    logout: authStore.logout,
    clearError: authStore.clearError,
    hasRole: authStore.hasRole,
    isBusinessOwner: authStore.isBusinessOwner,
    isClient: authStore.isClient,
    isAdmin: authStore.isAdmin,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
