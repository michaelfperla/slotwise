**Implementation Description: User Authentication**

**1. Auth Store (`/store/authStore.ts` using Zustand)**

*   **Purpose:** To manage global authentication state including the user object, access token, refresh token, and authentication status.
*   **Structure (Zustand Slice):**
    ```typescript
    // /store/authStore.ts
    import create from 'zustand';
    import { User } from '@/types/domainTypes'; // Assuming User type is defined

    interface AuthState {
      user: User | null;
      accessToken: string | null;
      refreshToken: string | null;
      isAuthenticated: boolean;
      isLoading: boolean; // For login/logout processes
      error: string | null; // For login/logout errors
      login: (credentials: LoginCredentials) => Promise<void>;
      logout: () => Promise<void>;
      setTokens: (accessToken: string, refreshToken: string) => void;
      setUser: (user: User) => void;
      clearAuth: () => void;
      // Potentially: initializeAuth: () => void; // To check for existing tokens on app load
      // Potentially: refreshAccessToken: () => Promise<string | null>;
    }

    // Placeholder for LoginCredentials type
    interface LoginCredentials {
      email: string;
      password: string;
    }

    export const useAuthStore = create<AuthState>((set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          // authApi.login would internally use apiClient to make the POST request
          // to the Auth Service ('http://localhost:8001/api/v1/auth/login')
          const response = await authApi.login(credentials); // Assume authApi.ts exists

          if (response.success && response.data) {
            const { accessToken, refreshToken, user } = response.data;
            set({
              user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
            // Persist tokens (e.g., to localStorage or secure cookie)
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            // apiClient might need to be updated with the new token if not handled by interceptors
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (err: any) {
          set({ error: err.message, isLoading: false, isAuthenticated: false });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          // Optionally call a backend logout endpoint via authApi.logout()
          // await authApi.logout();
        } catch (err: any) {
          // Handle logout error if necessary, though usually we clear client-side state regardless
          console.error("Logout API call failed", err);
        } finally {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          // Redirect to login page or home page
        }
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      // initializeAuth: () => { ... load tokens from localStorage, validate, setUser ... }
      // refreshAccessToken: async () => { ... use refreshToken to get new accessToken ... }
    }));

    // Placeholder for authApi structure (conceptual)
    // This would be in /services/authApi.ts
    const authApi = {
      login: async (credentials: LoginCredentials) => {
        // const response = await apiClient.post('/auth/login', credentials);
        // return response.data; // Assuming apiClient returns the parsed JSON response
        // MOCK IMPLEMENTATION FOR NOW:
        console.log("authApi.login called with", credentials)
        if (credentials.email === "business@example.com" && credentials.password === "password") {
            return Promise.resolve({
                success: true,
                data: {
                    accessToken: "fakeAccessToken123",
                    refreshToken: "fakeRefreshToken456",
                    user: { id: "user1", email: "business@example.com", role: "BUSINESS_OWNER", name: "Sarah Chen" }
                }
            });
        } else {
            return Promise.resolve({ success: false, message: "Invalid credentials", data: null});
        }
      }
    };
    ```

**2. Login Page Component (`/pages/auth/login.tsx`)**

*   **Purpose:** Allow users (Business Owners) to log into the dashboard.
*   **Structure (React Component using Next.js, Tailwind CSS, React Hook Form):**
    ```typescript
    // /pages/auth/login.tsx
    import { useForm, SubmitHandler } from 'react-hook-form';
    import { useRouter } from 'next/router';
    import { useAuthStore } from '@/store/authStore';
    import Link from 'next/link';
    // Assume AuthLayout is a layout component for auth pages
    // import AuthLayout from '@/components/layout/AuthLayout';
    // Assume Button and Input are styled UI components from /components/ui
    // import Button from '@/components/ui/Button';
    // import Input from '@/components/ui/Input';

    type LoginFormInputs = {
      email: string;
      password: string;
    };

    const LoginPage = () => {
      const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>();
      const login = useAuthStore((state) => state.login);
      const isLoading = useAuthStore((state) => state.isLoading);
      const loginError = useAuthStore((state) => state.error);
      const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
      const router = useRouter();

      const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
        await login(data);
      };

      // Redirect if already authenticated or after successful login
      if (typeof window !== 'undefined' && isAuthenticated) {
        router.push('/app/dashboard'); // Redirect to dashboard
        return null; // Or a loading spinner
      }

      return (
        // <AuthLayout title="Login to SlotWise">
        //   <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        //     <h2 className="text-2xl font-bold text-center text-gray-800">
        //       Welcome Back!
        //     </h2>
        //     <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        //       <div>
        //         <label htmlFor="email" className="block text-sm font-medium text-gray-700">
        //           Email Address
        //         </label>
        //         <Input // Styled Input component
        //           id="email"
        //           type="email"
        //           {...register('email', { required: 'Email is required' })}
        //           className={`mt-1 block w-full ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
        //           placeholder="you@example.com"
        //         />
        //         {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        //       </div>

        //       <div>
        //         <div className="flex items-center justify-between">
        //           <label htmlFor="password" className="block text-sm font-medium text-gray-700">
        //             Password
        //           </label
        //           <div className="text-sm">
        //             <Link href="/auth/forgot-password">
        //               <a className="font-medium text-teal-600 hover:text-teal-500">
        //                 Forgot your password?
        //               </a>
        //             </Link>
        //           </div>
        //         </div>
        //         <Input // Styled Input component
        //           id="password"
        //           type="password"
        //           {...register('password', { required: 'Password is required' })}
        //           className={`mt-1 block w-full ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
        //           placeholder="••••••••"
        //         />
        //         {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        //       </div>

        //       {loginError && (
        //         <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{loginError}</p>
        //       )}

        //       <div>
        //         <Button // Styled Button component
        //           type="submit"
        //           className="w-full flex justify-center"
        //           disabled={isLoading}
        //         >
        //           {isLoading ? 'Logging in...' : 'Login'}
        //         </Button>
        //       </div>
        //     </form>

        //     <p className="text-sm text-center text-gray-600">
        //       No account yet?{' '}
        //       <Link href="/auth/register">
        //         <a className="font-medium text-teal-600 hover:text-teal-500">
        //           Register here
        //         </a>
        //       </Link>
        //     </p>
        //   </div>
        // </AuthLayout>

        // Simplified version for textual output:
        React.createElement('div', null,
          React.createElement('h1', null, 'Login Page (Conceptual)'),
          React.createElement('form', { onSubmit: handleSubmit(onSubmit) },
            React.createElement('input', { type: 'email', ...register('email', { required: true }), placeholder: 'Email' }),
            errors.email && React.createElement('p', null, 'Email is required'),
            React.createElement('input', { type: 'password', ...register('password', { required: true }), placeholder: 'Password' }),
            errors.password && React.createElement('p', null, 'Password is required'),
            loginError && React.createElement('p', { style: { color: 'red' } }, loginError),
            React.createElement('button', { type: 'submit', disabled: isLoading }, isLoading ? 'Logging in...' : 'Login')
          ),
          React.createElement('p', null, "Don't have an account? Register (Link)"),
          React.createElement('p', null, "Forgot password? (Link)")
        )
      );
    };

    export default LoginPage;

    // Mock React and Next.js modules for this textual representation
    const React = { createElement: (tag: any, props: any, ...children: any[]) => ({ tag, props, children }) };
    const useForm = () => ({ register: () => {}, handleSubmit: (fn: any) => fn, formState: { errors: {} } });
    const useRouter = () => ({ push: (path: string) => console.log(`Router push to: ${path}`) });
    const Link = ({ href, children }: any) => React.createElement('a', { href }, children);

    ```
*   **Key Features & Logic:**
    *   Uses `react-hook-form` for form state management and validation.
    *   Calls `login` action from `useAuthStore` on submit.
    *   Displays loading state and error messages from the store.
    *   Redirects to `/app/dashboard` upon successful authentication (or if already authenticated).
    *   Links to registration and forgot password pages.
    *   Would be wrapped in an `AuthLayout` component for consistent auth page styling.
