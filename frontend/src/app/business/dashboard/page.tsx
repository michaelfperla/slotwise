// frontend/src/app/business/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBusinessRevenueAPI, RevenueData } from '@/utils/payment'; // Adjust path if utils is elsewhere

const MOCK_BUSINESS_ID = 'business_abc_test'; // Fallback if not in token

const BusinessDashboardPage = () => {
  const router = useRouter();
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.userType !== 'owner' && !payload.businessId) {
        console.warn('User may not be a business owner or no businessId in token.');
        // Potentially redirect or show limited view
      }
      setBusinessName(payload.businessName || 'Your Business');
      setBusinessId(payload.businessId || MOCK_BUSINESS_ID); // Use businessId from token, or mock as fallback
      if (!payload.businessId) {
        console.warn(`Using MOCK_BUSINESS_ID: ${MOCK_BUSINESS_ID} as it was not found in JWT.`);
      }
    } catch (e) {
      console.error('Failed to parse token or invalid token:', e);
      localStorage.removeItem('authToken');
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (businessId) {
      setIsLoadingRevenue(true);
      getBusinessRevenueAPI(businessId)
        .then((data) => {
          if (data) {
            if (data.error) {
              setRevenueError(data.error);
              // If revenue API indicates "Business ID required" or similar, it might be due to using MOCK_BUSINESS_ID
              // if the actual API doesn't have data for it.
              if (data.error.includes("Business ID required") && businessId === MOCK_BUSINESS_ID) {
                console.warn(`Revenue fetch failed for MOCK_BUSINESS_ID (${MOCK_BUSINESS_ID}). This is expected if no such business exists on the backend or has no payments.`);
              }
               if (data.totalRevenue === 0 && data.monthlyRevenue === 0 && data.recentPayments.length === 0 && !data.error) {
                console.log(`Revenue data for business ${businessId} is all zero/empty. This might be correct (no payments) or indicate an issue if payments are expected.`);
              }
            }
            setRevenueData(data); // Set data even if there's a partial error message in it, to display what we have
          } else {
            setRevenueError('Failed to fetch revenue data: No data returned.');
          }
        })
        .catch(err => {
          console.error("Error in getBusinessRevenueAPI call", err);
          setRevenueError('An unexpected error occurred while fetching revenue.');
        })
        .finally(() => {
          setIsLoadingRevenue(false);
        });
    } else if (businessName) { // If businessName is set but businessId is not, it means we couldn't get businessId.
        setRevenueError("Business ID not available. Cannot fetch revenue.");
        setIsLoadingRevenue(false);
    }
  }, [businessId, businessName]); // Added businessName to dependencies

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/login');
  };

  const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!businessName) {
    return <p>Loading business dashboard...</p>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Business Dashboard</h1>
      <p>Welcome, {businessName}!</p>
      <hr />

      {/* Revenue Widget */}
      <div className="revenue-widget" style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h2 style={{ marginTop: '0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Revenue Overview</h2>
        {isLoadingRevenue && <p>Loading revenue data...</p>}
        {revenueError && <p style={{ color: 'red' }}>Error fetching revenue: {revenueError}</p>}

        {revenueData && !revenueData.error && ( // Only display if no error string in revenueData itself
          <div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Total Revenue:</strong>
              <span style={{ fontSize: '1.2em', marginLeft: '10px', color: 'green' }}>
                {formatCurrency(revenueData.totalRevenue, revenueData.recentPayments?.[0]?.currency || 'USD')}
              </span>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <strong>Revenue This Month:</strong>
              <span style={{ fontSize: '1.2em', marginLeft: '10px', color: 'blue' }}>
                {formatCurrency(revenueData.monthlyRevenue, revenueData.recentPayments?.[0]?.currency || 'USD')}
              </span>
            </div>

            <h3>Recent Payments:</h3>
            {revenueData.recentPayments && revenueData.recentPayments.length > 0 ? (
              <ul style={{ listStyleType: 'none', paddingLeft: '0' }}>
                {revenueData.recentPayments.map((payment, index) => (
                  <li key={payment.paymentIntentId || index} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
                    <span>{formatDate(payment.date)}</span> -
                    <span style={{ marginLeft: '10px', color: payment.status === 'succeeded' ? 'green' : 'red' }}>
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                    <span style={{ marginLeft: '10px', fontStyle: 'italic' }}>({payment.status})</span>
                    {payment.customerName && <span style={{ marginLeft: '10px' }}>- {payment.customerName}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No recent payments found for this business.</p>
            )}
          </div>
        )}
         {/* Display error from revenueData if it exists, even if revenueData object itself is present */}
        {revenueData && revenueData.error && !revenueError && <p style={{ color: 'red' }}>Error: {revenueData.error}</p>}
      </div>

      {/* Existing Dashboard Content (Links) */}
      <div style={{ marginTop: '30px' }}>
        <h2 style={{borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Manage Your Business</h2>
         <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '10px' }}>
            <a href="/services/manage" style={{ color: '#0070f3', textDecoration: 'none' }}>
                Manage Services
            </a>
            </li>
            <li style={{ marginBottom: '10px' }}>
            <a href="/bookings/view" style={{ color: '#0070f3', textDecoration: 'none' }}>
                View Bookings
            </a>
            </li>
            <li style={{ marginBottom: '10px' }}>
            <a href="/staff/manage" style={{ color: '#0070f3', textDecoration: 'none' }}>
                Manage Staff (Placeholder)
            </a>
            </li>
             <li style={{ marginBottom: '10px' }}>
                <a href="/business/dashboard/availability">Manage Availability (Placeholder)</a>
            </li>
        </ul>
      </div>


      <div style={{ marginTop: '30px' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            marginRight: '10px',
            padding: '10px',
            backgroundColor: 'grey',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back to User Dashboard
        </button>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px',
            backgroundColor: 'red',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default BusinessDashboardPage;
