/**
 * Auth React Query Hooks
 *
 * This module provides React Query hooks for authentication operations
 * following SlotWise patterns and conventions.
 */

import { cacheUtils, queryKeys } from '@/lib/queryClient';
import { authApi } from '@/lib/services/authApi';
import { useAuthStore } from '@/stores/authStore';
import { notificationUtils } from '@/stores/uiStore';
import { LoginRequest, RegisterRequest } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

/**
 * Hook for user login mutation
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      await login(credentials);
      return credentials;
    },
    onSuccess: () => {
      // Invalidate and refetch auth-related queries
      cacheUtils.invalidateAuth();
      
      // Show success notification
      notificationUtils.success(
        'Welcome back!',
        'You have been logged in successfully.'
      );
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      
      // Error notification is handled by the auth store
      // but we can add additional handling here if needed
    },
  });
}

/**
 * Hook for user registration mutation
 */
export function useRegister() {
  const queryClient = useQueryClient();
  const register = useAuthStore((state) => state.register);

  return useMutation({
    mutationFn: async (userData: RegisterRequest) => {
      await register(userData);
      return userData;
    },
    onSuccess: () => {
      // Invalidate and refetch auth-related queries
      cacheUtils.invalidateAuth();
      
      // Show success notification
      notificationUtils.success(
        'Account created!',
        'Your account has been created successfully.'
      );
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
    },
  });
}

/**
 * Hook for user logout mutation
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      await logout();
    },
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.clear();
      
      // Show success notification
      notificationUtils.info(
        'Logged out',
        'You have been logged out successfully.'
      );
    },
    onError: (error: any) => {
      console.error('Logout error:', error);
      
      // Even if logout fails on server, clear local state
      queryClient.clear();
    },
  });
}

/**
 * Hook for getting current user profile
 */
export function useProfile() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: () => authApi.getProfile(),
    enabled: isAuthenticated && !user, // Only fetch if authenticated but no user data
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook for email verification mutation
 */
export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    onSuccess: () => {
      notificationUtils.success(
        'Email verified!',
        'Your email has been verified successfully.'
      );
      
      // Refresh user profile
      cacheUtils.invalidateAuth();
    },
    onError: (error: any) => {
      console.error('Email verification error:', error);
      
      notificationUtils.error(
        'Verification failed',
        'Failed to verify email. The link may be expired or invalid.'
      );
    },
  });
}

/**
 * Hook for forgot password mutation
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: () => {
      notificationUtils.success(
        'Reset link sent!',
        'Check your email for password reset instructions.'
      );
    },
    onError: (error: any) => {
      console.error('Forgot password error:', error);
      
      notificationUtils.error(
        'Request failed',
        'Failed to send password reset email. Please try again.'
      );
    },
  });
}

/**
 * Hook for password reset mutation
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authApi.resetPassword(token, newPassword),
    onSuccess: () => {
      notificationUtils.success(
        'Password reset!',
        'Your password has been reset successfully. Please log in with your new password.'
      );
    },
    onError: (error: any) => {
      console.error('Password reset error:', error);
      
      notificationUtils.error(
        'Reset failed',
        'Failed to reset password. The link may be expired or invalid.'
      );
    },
  });
}

/**
 * Hook for token validation query
 */
export function useValidateToken() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.auth.validate(),
    queryFn: () => authApi.validateToken(),
    enabled: isAuthenticated && !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry token validation
    refetchOnWindowFocus: false, // Don't refetch on focus for token validation
  });
}

/**
 * Custom hook that combines auth state and queries
 */
export function useAuth() {
  const authState = useAuthStore();
  const profileQuery = useProfile();
  const validateQuery = useValidateToken();

  return {
    // Auth state
    user: authState.user || profileQuery.data,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading || profileQuery.isLoading,
    error: authState.error || profileQuery.error || validateQuery.error,

    // Auth actions
    login: useLogin(),
    register: useRegister(),
    logout: useLogout(),
    verifyEmail: useVerifyEmail(),
    forgotPassword: useForgotPassword(),
    resetPassword: useResetPassword(),

    // Utility methods
    hasRole: authState.hasRole,
    isBusinessOwner: authState.isBusinessOwner,
    isClient: authState.isClient,
    isAdmin: authState.isAdmin,
    clearError: authState.clearError,

    // Query states
    isValidating: validateQuery.isLoading,
    isProfileLoading: profileQuery.isLoading,
  };
}

/**
 * Hook for checking authentication status
 */
export function useAuthStatus() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);

  // Check auth status on mount
  React.useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    isAuthenticated,
    user,
    isLoading: !isAuthenticated && !user, // Loading if we don't know the auth state yet
  };
}

export default useAuth;
