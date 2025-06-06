**SlotWise Frontend Architecture Plan**

**1. Frontend Technology Stack Recommendation**

*   **Core Framework:** React with Next.js
    *   **React:** Component-based UI library.
    *   **Next.js:** Framework for SSR, SSG, routing, API routes, performance optimization.
*   **State Management:** Zustand (preferred for simplicity initially) or Redux Toolkit (if complexity warrants).
*   **Styling:** Tailwind CSS (utility-first CSS framework).
*   **Data Fetching/Caching:** React Query (TanStack Query).
*   **Form Handling:** React Hook Form.
*   **Programming Language:** TypeScript.
*   **Testing:**
    *   Unit/Integration: Jest & React Testing Library.
    *   End-to-End: Cypress or Playwright.
*   **Linting/Formatting:** ESLint, Prettier.

**2. Initial Project Structure (Conceptual - for Next.js)**

```
/slotwise-frontend
|-- /components             # Reusable UI components
|   |-- /ui                 # General-purpose (Button.tsx, Card.tsx, Input.tsx)
|   |-- /layout             # (DashboardLayout.tsx, PublicPageLayout.tsx, AuthLayout.tsx)
|   |-- /dashboard          # Components specific to dashboard features (e.g., Calendar.tsx, ServiceForm.tsx)
|   |-- /public-pages       # Components for client-facing pages (e.g., ServiceCard.tsx, BookingStepper.tsx)
|-- /contexts               # React Context API for localized state if needed (e.g., BookingFlowContext.tsx)
|-- /hooks                  # Custom React hooks (e.g., useAuth.ts, useBusiness.ts)
|-- /lib                    # Utility functions, helpers, constants
|   |-- apiHelpers.ts       # Functions to handle API responses, errors
|   |-- constants.ts
|   |-- utils.ts
|-- /pages                  # Next.js file-system routing
|   |-- /app                # Business Owner Dashboard (protected routes)
|   |   |-- dashboard.tsx
|   |   |-- schedule.tsx
|   |   |-- services/
|   |   |   |-- index.tsx
|   |   |   |-- [serviceId].tsx
|   |   |   |-- new.tsx
|   |   |-- bookings/
|   |   |   |-- index.tsx
|   |   |   |-- [bookingId].tsx
|   |   |-- staff/
|   |   |-- settings.tsx
|   |-- /auth               # Auth pages
|   |   |-- login.tsx
|   |   |-- register.tsx    # If self-registration for business owners
|   |   |-- forgot-password.tsx
|   |-- /[subdomainOrBusinessId] # Dynamic routes for public business pages
|   |   |-- index.tsx           # Business profile & service listing
|   |   |-- book.tsx            # Multi-step booking flow
|   |   |-- booking-confirmed.tsx
|   |-- /my-bookings        # Client's page to view their bookings (if logged in)
|   |-- _app.tsx            # Custom App: global styles, layout wrapper, context providers
|   |-- _document.tsx       # Custom Document
|   |-- index.tsx           # SlotWise marketing homepage (if any)
|-- /public                 # Static assets (images, fonts, favicons)
|-- /services               # API interaction layer (using React Query for actual calls)
|   |-- authApi.ts          # (login, logout, register, refresh token)
|   |-- businessApi.ts      # (CRUD businesses, services, staff)
|   |-- schedulingApi.ts    # (get availability, create booking, manage booking)
|   |-- notificationApi.ts  # (potentially for client to manage notification preferences)
|   |-- apiClient.ts        # Central Axios/fetch instance configuration (base URLs, headers, interceptors)
|-- /store                  # Global state management (Zustand)
|   |-- authStore.ts        # (user object, token, isAuthenticated status)
|   |-- uiStore.ts          # (global loading states, modal visibility, notifications/toasts)
|-- /styles                 # Global styles, Tailwind CSS base, theme configuration
|   |-- globals.css
|   |-- theme.ts            # (if customizing Tailwind theme extensively)
|-- /types                  # TypeScript type definitions
|   |-- index.ts            # General types
|   |-- apiTypes.ts         # Request/Response types for all services
|   |-- domainTypes.ts      # Business domain types (User, Business, Service, Booking)
|-- .env.local              # Environment variables (API base URLs)
|-- .eslintrc.json
|-- .prettierrc.json
|-- next.config.js
|-- package.json
|-- tailwind.config.js
|-- tsconfig.json
```

**3. API Integration Strategy**

*   **API Client (`/services/apiClient.ts`):**
    *   Configure a central API client (e.g., using Axios or a `fetch` wrapper).
    *   This client will handle:
        *   Base URLs for different microservices (these will come from environment variables).
            *   Auth Service: `http://localhost:8001/api/v1`
            *   Business Service: `http://localhost:8003/api/v1`
            *   Scheduling Service: `http://localhost:8002/api/v1`
            *   Notification Service: `http://localhost:8004/api/v1`
            *   (Note: These will change when an API Gateway is implemented).
        *   Setting the `Authorization: Bearer <token>` header for protected requests. The token will be retrieved from the global auth store (Zustand).
        *   Consistent error handling: Intercept responses to normalize error formats, handle standard HTTP error codes (401, 403, 404, 500), and potentially trigger global error notifications.
        *   Request/response transformation if needed (though backend seems to have a standard format).
*   **Service-Specific API Modules (`/services/*.ts`):**
    *   Each module will encapsulate functions for interacting with a specific microservice (e.g., `businessApi.ts`).
    *   These functions will use the `apiClient` to make requests.
    *   They will be integrated with React Query for data fetching, caching, mutations.
    *   Example (`businessApi.ts`):
        ```typescript
        // (Conceptual)
        import apiClient from './apiClient';
        import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
        import { Business, Service } from '@/types/domainTypes'; // Assuming type definitions

        const BUSINESS_QUERY_KEY = 'businesses';
        const SERVICES_QUERY_KEY = 'services';

        // Fetch all businesses for the logged-in user
        export const useUserBusinesses = () => {
          return useQuery<Business[], Error>([BUSINESS_QUERY_KEY], async () => {
            const response = await apiClient.get('/businesses'); // Endpoint from Business Service
            return response.data.data; // Assuming backend structure { success: true, data: [...] }
          });
        };

        // Fetch a single business by ID
        export const useBusinessById = (businessId: string) => {
          return useQuery<Business, Error>(
            [BUSINESS_QUERY_KEY, businessId],
            async () => {
              const response = await apiClient.get(`/businesses/${businessId}`);
              return response.data.data;
            },
            { enabled: !!businessId } // Only run if businessId is provided
          );
        };

        // Create a new service
        export const useCreateService = () => {
          const queryClient = useQueryClient();
          return useMutation<Service, Error, Partial<Service>>( // Result, Error, Variables
            async (serviceData) => {
              const response = await apiClient.post('/services', serviceData); // Endpoint from Business Service
              return response.data.data;
            },
            {
              onSuccess: () => {
                queryClient.invalidateQueries([SERVICES_QUERY_KEY]); // Refetch services list
              },
            }
          );
        };
        ```
*   **Authentication Flow:**
    1.  User submits login credentials (POST to Auth Service `/auth/login`).
    2.  On success, Auth Service returns JWT (`accessToken`, `refreshToken`) and user info.
    3.  Store `accessToken`, `refreshToken`, and user info in the Zustand `authStore`.
    4.  `apiClient` automatically includes `accessToken` in headers for subsequent protected requests.
    5.  Implement logic for `refreshToken` to obtain a new `accessToken` when it expires (ideally handled by an interceptor in `apiClient`).
    6.  Logout: Clear auth store, potentially call a logout endpoint on the Auth Service.
*   **Protected Routes (Next.js Middleware):**
    *   Use Next.js middleware (`middleware.ts` at the root or in `/pages/app`) to check for authentication status (from `authStore` or by verifying token presence/validity) before allowing access to protected pages (e.g., `/app/*`). Redirect to `/auth/login` if not authenticated.
*   **Error Handling in UI Components:**
    *   React Query provides `isLoading`, `isError`, `error` states for queries and mutations.
    *   Components will use these states to display loading indicators, error messages, or success notifications.
    *   Global error notifications (e.g., toasts) can be triggered from `apiClient` interceptors or React Query's global error handlers.
*   **Typed APIs:**
    *   Use TypeScript types defined in `/types/apiTypes.ts` and `/types/domainTypes.ts` for all API request payloads and response data to ensure type safety throughout the application. These types should align with the OpenAPI specifications if available (e.g., `auth-service-api.yaml`).
