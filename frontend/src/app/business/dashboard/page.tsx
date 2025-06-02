"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BusinessDashboardPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    // In a real application, you would:
    // 1. Verify the token with the backend.
    // 2. Fetch business-specific data.
    // 3. Ensure the user associated with the token is actually a business owner
    //    and has rights to see this dashboard. This might involve checking userType
    //    from the JWT claims or making a backend call.

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Assuming 'userType' and potentially 'businessName' or 'businessId' are in the JWT payload
      // This is a simplified check for MVP.
      if (payload.userType !== 'owner' && !payload.businessId) {
        // If not an owner or no business associated, redirect to user dashboard or an error page
        // For now, just a console warning and let them see a generic page.
        // In a stricter setup, you might redirect: router.push('/dashboard');
        console.warn("User may not be a business owner or no businessId in token.");
      }
      // For display, try to get a business name if available, otherwise a generic welcome.
      setBusinessName(payload.businessName || "Your Business");

    } catch (e) {
      console.error("Failed to parse token or invalid token:", e);
      localStorage.removeItem('authToken');
      router.push('/login');
    }

  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/login');
  };

  if (!businessName) {
    // Show loading state or handle redirection if checks in useEffect fail more strictly
    return <p>Loading business dashboard...</p>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Business Dashboard</h1>
      <p>Welcome, {businessName}!</p>
      <p>This is your business management dashboard. More features for business owners are coming soon.</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li style={{ marginBottom: '10px' }}><a href="/services/manage" style={{ color: '#0070f3', textDecoration: 'none' }}>Manage Services</a></li>
        <li style={{ marginBottom: '10px' }}><a href="/bookings/view" style={{ color: '#0070f3', textDecoration: 'none' }}>View Bookings</a></li>
        <li style={{ marginBottom: '10px' }}><a href="/staff/manage" style={{ color: '#0070f3', textDecoration: 'none' }}>Manage Staff</a></li>
      </ul>
      <div style={{ marginTop: '30px' }}>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ marginRight: '10px', padding: '10px', backgroundColor: 'grey', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Back to User Dashboard
        </button>
        <button 
          onClick={handleLogout} 
          style={{ padding: '10px', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
