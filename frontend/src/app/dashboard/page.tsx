"use client";

import React from 'react';
import useAuth from '@/hooks/useAuth'; // Assuming @ path alias

const DashboardPage: React.FC = () => {
  const { user } = useAuth(); // Optionally use user data

import AnalyticsDashboardWidget from '@/components/dashboard/AnalyticsDashboardWidget'; // Import the widget

// Mock businessId for the widget - in a real app, this would come from user's context or similar
const MOCK_BUSINESS_ID_FOR_DASHBOARD = "business123";

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null); // Assuming token might contain email or user info
  const [businessId, setBusinessId] = useState<string | null>(MOCK_BUSINESS_ID_FOR_DASHBOARD); // Added businessId state

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    } else {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(payload.email || 'User');
        // TODO: In a real application, the businessId should be derived from the user's session or context,
        // e.g., if a user is associated with a specific business.
        // For now, we're using a mock one. If payload contains business_id, use it:
        // setBusinessId(payload.business_id || MOCK_BUSINESS_ID_FOR_DASHBOARD);
      } catch (e) {
        console.error('Failed to parse token:', e);
        localStorage.removeItem('authToken');
        router.push('/login');
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/login');
  };

  if (!userEmail) {
    return <p className="p-4 text-center">Loading user data...</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {userEmail}!</p>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 sm:mt-0 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </header>

      <p className="text-gray-700">
        This is your main dashboard. More features and business-specific information will be available soon.
      </p>

      {/* Analytics Widget Section */}
      {businessId ? (
        <AnalyticsDashboardWidget businessId={businessId} />
      ) : (
        <p className="text-center text-gray-500">Analytics data requires a business context.</p>
      )}

      {/* Placeholder for other dashboard content */}
      <div className="mt-8 p-6 bg-white shadow-lg rounded-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Other Features</h2>
        <p className="text-gray-600">Further dashboard sections and functionalities will be added here.</p>
        {/* Example: Link to manage bookings, settings, etc. */}
      </div>
    </div>
  );
};

export default DashboardPage;
