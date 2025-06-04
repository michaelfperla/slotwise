"use client";

import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import {
    safeDecodeToken,
    safeGetAccessToken,
    safeGetRefreshToken,
    safeRemoveTokens,
    safeStoreTokens,
} from '../utils/auth'; // Assuming @ alias is not used here for simplicity, direct path

// Define a basic User interface
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

// Define the shape of the AuthContext
export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (newAccessToken: string, newRefreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define AuthProviderProps
export interface AuthProviderProps {
  children: ReactNode;
}

// Create the AuthProvider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = useCallback(async (newAccessToken: string, newRefreshToken: string) => {
    try {
      safeStoreTokens(newAccessToken, newRefreshToken);
      const decodedUser = safeDecodeToken<User>(newAccessToken);

      if (decodedUser) {
        setUser(decodedUser);
        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);
        setIsAuthenticated(true);
      } else {
        // This case might happen if token is malformed or safeDecodeToken returns null
        console.error('Login error: Could not decode token or token is invalid.');
        await logout(); // Perform a logout to clear any partial state
      }
    } catch (error) {
      console.error('Error during login:', error);
      await logout(); // Ensure clean state on error
    }
  }, []);

  const logout = useCallback(async () => {
    safeRemoveTokens();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
  }, []);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const existingAccessToken = safeGetAccessToken();
      const existingRefreshToken = safeGetRefreshToken(); // Get refresh token as well

      if (existingAccessToken) {
        const decodedUser = safeDecodeToken<User>(existingAccessToken);
        if (decodedUser && decodedUser.exp && decodedUser.exp * 1000 > Date.now()) {
          // Token exists and is not expired
          // For login to set all states correctly, we need both tokens.
          // If refresh token is missing, it's a partial state, consider logout.
          if (existingRefreshToken) {
            await login(existingAccessToken, existingRefreshToken);
          } else {
            // If there's an access token but no refresh token, treat as invalid session
            console.warn('Access token found but refresh token is missing. Logging out.');
            await logout();
          }
        } else {
          // Token is expired or invalid
          // Future: Implement refresh token logic here if it exists
          // For now, just log out
          if (decodedUser && decodedUser.exp && decodedUser.exp * 1000 <= Date.now()){
            console.log("Token expired.");
          }
          await logout();
        }
      } else {
        // No access token found
        await logout(); // Ensure all states are cleared if no token
      }
    } catch (error) {
      console.error('Error during checkAuth:', error);
      await logout(); // Ensure clean state on error
    } finally {
      setIsLoading(false);
    }
  }, [login, logout]); // Add login and logout as dependencies

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; // Exporting AuthContext as default for convenience if needed
                           // but useAuthContext is the primary way to consume it.
