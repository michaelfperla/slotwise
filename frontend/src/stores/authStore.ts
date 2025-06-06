/**
 * Auth Store - Zustand State Management
 * 
 * This store manages global authentication state including user data,
 * tokens, and authentication status following SlotWise patterns.
 */

import { authApi, tokenUtils } from '@/lib/services/authApi';
import { LoginRequest, RegisterRequest, User } from '@/types/api';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;

  // Magic login actions
  sendPhoneCode: (phone: string) => Promise<void>;
  sendEmailCode: (email: string) => Promise<void>;
  verifyCode: (identifier: string, code: string) => Promise<void>;
  
  // Utility actions
  checkAuthStatus: () => void;
  hasRole: (role: string) => boolean;
  isBusinessOwner: () => boolean;
  isClient: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(credentials);
          const { accessToken, refreshToken, user } = response;

          // Store tokens
          tokenUtils.storeTokens(accessToken, refreshToken);

          // Update state
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          console.log('User logged in successfully:', user.email);
        } catch (error: any) {
          console.error('Login failed:', error);
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Login failed',
          });
          throw error;
        }
      },

      // Register action
      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.register(userData);
          const { accessToken, refreshToken, user } = response;

          // Store tokens
          tokenUtils.storeTokens(accessToken, refreshToken);

          // Update state
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          console.log('User registered successfully:', user.email);
        } catch (error: any) {
          console.error('Registration failed:', error);
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Registration failed',
          });
          throw error;
        }
      },

      // Magic login - Send phone verification code
      sendPhoneCode: async (phone: string) => {
        set({ isLoading: true, error: null });

        try {
          await authApi.sendPhoneCode(phone);
          set({ isLoading: false });
          console.log('Phone verification code sent to:', phone);
        } catch (error: any) {
          console.error('Failed to send phone code:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to send verification code',
          });
          throw error;
        }
      },

      // Magic login - Send email verification code
      sendEmailCode: async (email: string) => {
        set({ isLoading: true, error: null });

        try {
          await authApi.sendEmailCode(email);
          set({ isLoading: false });
          console.log('Email verification code sent to:', email);
        } catch (error: any) {
          console.error('Failed to send email code:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to send verification code',
          });
          throw error;
        }
      },

      // Magic login - Verify code and login
      verifyCode: async (identifier: string, code: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.verifyCode(identifier, code);
          const { accessToken, refreshToken, user } = response;

          // Store tokens
          tokenUtils.storeTokens(accessToken, refreshToken);

          // Update state
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          console.log('User logged in via magic link:', user.email);
        } catch (error: any) {
          console.error('Code verification failed:', error);
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Invalid verification code',
          });
          throw error;
        }
      },

      // Logout action
      logout: async () => {
        set({ isLoading: true });
        
        try {
          // Call logout API to invalidate tokens on server
          await authApi.logout();
        } catch (error) {
          console.error('Logout API call failed:', error);
          // Continue with local logout even if API call fails
        }

        // Clear tokens from storage
        tokenUtils.clearTokens();

        // Reset state
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });

        console.log('User logged out successfully');
      },

      // Refresh tokens action
      refreshTokens: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await authApi.refreshToken({ refreshToken });
          const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = response;

          // Store new tokens
          tokenUtils.storeTokens(newAccessToken, newRefreshToken);

          // Update state
          set({
            user,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            isAuthenticated: true,
            error: null,
          });

          console.log('Tokens refreshed successfully');
        } catch (error: any) {
          console.error('Token refresh failed:', error);
          
          // Clear invalid tokens and logout
          get().logout();
          throw error;
        }
      },

      // Load user profile
      loadUser: async () => {
        const { accessToken } = get();
        
        if (!accessToken) {
          return;
        }

        set({ isLoading: true });

        try {
          const user = await authApi.getProfile();
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Failed to load user:', error);
          
          // If token is invalid, try to refresh
          if (error.status === 401) {
            try {
              await get().refreshTokens();
              // Retry loading user after refresh
              const user = await authApi.getProfile();
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } catch (refreshError) {
              // Refresh failed, logout user
              get().logout();
            }
          } else {
            set({
              isLoading: false,
              error: error.message || 'Failed to load user',
            });
          }
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Check authentication status
      checkAuthStatus: () => {
        const { accessToken, refreshToken } = get();
        
        if (!accessToken || !refreshToken) {
          set({ isAuthenticated: false });
          return;
        }

        // Check if token is expired
        if (tokenUtils.isTokenExpired(accessToken)) {
          // Try to refresh token
          get().refreshTokens().catch(() => {
            // Refresh failed, user needs to login again
            get().logout();
          });
        } else {
          set({ isAuthenticated: true });
        }
      },

      // Utility methods
      hasRole: (role: string) => {
        const { user } = get();
        return user?.role === role;
      },

      isBusinessOwner: () => {
        return get().hasRole('business_owner');
      },

      isClient: () => {
        return get().hasRole('client');
      },

      isAdmin: () => {
        return get().hasRole('admin');
      },
    }),
    {
      name: 'slotwise-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Check auth status after rehydration
        if (state) {
          state.checkAuthStatus();
        }
      },
    }
  )
);

// Initialize auth store on app load
if (typeof window !== 'undefined') {
  // Check authentication status on page load
  useAuthStore.getState().checkAuthStatus();
  
  // Load user profile if authenticated
  if (useAuthStore.getState().isAuthenticated) {
    useAuthStore.getState().loadUser();
  }
}

export default useAuthStore;
