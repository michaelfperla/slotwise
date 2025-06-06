/**
 * Auth Service API
 * 
 * This module provides functions for interacting with the Auth Service API.
 * Follows SlotWise API design standards and coding conventions.
 */

import { authClient, get, post } from '@/lib/apiClient';
import {
    AuthResponse,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    User
} from '@/types/api';

/**
 * Authentication API functions
 */
export const authApi = {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return post<AuthResponse>(authClient, '/auth/login', credentials);
  },

  /**
   * Register new user account
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return post<AuthResponse>(authClient, '/auth/register', userData);
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<AuthResponse> {
    return post<AuthResponse>(authClient, '/auth/refresh', request);
  },

  /**
   * Logout user (invalidate tokens)
   */
  async logout(): Promise<void> {
    return post<void>(authClient, '/auth/logout');
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    return get<User>(authClient, '/auth/me');
  },

  /**
   * Verify email with verification token
   */
  async verifyEmail(token: string): Promise<void> {
    return post<void>(authClient, '/auth/verify-email', { token });
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    return post<void>(authClient, '/auth/forgot-password', { email });
  },

  /**
   * Reset password with reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    return post<void>(authClient, '/auth/reset-password', { 
      token, 
      newPassword 
    });
  },

  /**
   * Validate current access token
   */
  async validateToken(): Promise<User> {
    return get<User>(authClient, '/auth/validate');
  },

  /**
   * Magic Login - Send verification code to phone number
   */
  async sendPhoneCode(phone: string): Promise<void> {
    return post<void>(authClient, '/auth/phone-login', { phone });
  },

  /**
   * Magic Login - Send verification code to email address
   */
  async sendEmailCode(email: string): Promise<void> {
    return post<void>(authClient, '/auth/email-login', { email });
  },

  /**
   * Magic Login - Verify code and login
   */
  async verifyCode(identifier: string, code: string): Promise<AuthResponse> {
    return post<AuthResponse>(authClient, '/auth/verify-code', {
      identifier,
      code
    });
  },
};

/**
 * Token management utilities
 */
export const tokenUtils = {
  /**
   * Store authentication tokens in localStorage
   */
  storeTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  },

  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  },

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  },

  /**
   * Clear all tokens from localStorage
   */
  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  /**
   * Check if user has valid tokens
   */
  hasValidTokens(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    return !!(accessToken && refreshToken);
  },

  /**
   * Decode JWT token (basic implementation)
   * Note: This is for client-side token inspection only, not for security validation
   */
  decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  },

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    
    return new Date(decoded.exp * 1000);
  },
};

/**
 * Auth state management utilities
 */
export const authUtils = {
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = tokenUtils.getAccessToken();
    return !!(token && !tokenUtils.isTokenExpired(token));
  },

  /**
   * Get user role from token
   */
  getUserRole(): string | null {
    const token = tokenUtils.getAccessToken();
    if (!token) return null;
    
    const decoded = tokenUtils.decodeToken(token);
    return decoded?.role || null;
  },

  /**
   * Get user ID from token
   */
  getUserId(): string | null {
    const token = tokenUtils.getAccessToken();
    if (!token) return null;
    
    const decoded = tokenUtils.decodeToken(token);
    return decoded?.sub || decoded?.userId || null;
  },

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const userRole = this.getUserRole();
    return userRole === role;
  },

  /**
   * Check if user is business owner
   */
  isBusinessOwner(): boolean {
    return this.hasRole('business_owner');
  },

  /**
   * Check if user is client
   */
  isClient(): boolean {
    return this.hasRole('client');
  },

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  },
};

export default authApi;
