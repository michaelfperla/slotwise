// Assuming jwt-decode is available or will be added as a dependency.
// If not, the decodeToken function will need to be adjusted or its usage conditional.
import { jwtDecode } from 'jwt-decode';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const storeTokens = (accessToken: string, refreshToken: string): void => {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Error storing tokens in localStorage:', error);
    // Handle cases where localStorage is not available (e.g., server-side rendering or private browsing)
  }
};

export const getAccessToken = (): string | null => {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting access token from localStorage:', error);
    return null;
  }
};

export const getRefreshToken = (): string | null => {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting refresh token from localStorage:', error);
    return null;
  }
};

export const removeTokens = (): void => {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error removing tokens from localStorage:', error);
  }
};

export const decodeToken = <T = unknown>(token: string): T | null => {
  try {
    if (!token) {
      return null;
    }
    return jwtDecode<T>(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Helper to check if running in a browser environment
const isBrowser = typeof window !== 'undefined';

// Update functions to be environment-aware for Next.js
export const safeStoreTokens = (accessToken: string, refreshToken: string): void => {
  if (isBrowser) {
    storeTokens(accessToken, refreshToken);
  }
};

export const safeGetAccessToken = (): string | null => {
  return isBrowser ? getAccessToken() : null;
};

export const safeGetRefreshToken = (): string | null => {
  return isBrowser ? getRefreshToken() : null;
};

export const safeRemoveTokens = (): void => {
  if (isBrowser) {
    removeTokens();
  }
};

export const safeDecodeToken = <T = unknown>(token: string): T | null => {
  if (isBrowser) {
    return decodeToken(token);
  }
  return null;
};
