'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Booking {
  // Same interface as MyBookingsPage
  id: string;
  serviceId: string;
  businessId: string;
  customerId: string; // Important for business view
  startTime: string;
  endTime: string;
  status: string;
  // Consider adding serviceName, customerEmail/Name if backend can provide it or if fetched separately
}

export default function BusinessBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Assuming businessId is stored in the token for business owners
        if (
          payload.businessId &&
          (payload.role === 'business_owner' || payload.userType === 'owner')
        ) {
          setBusinessId(payload.businessId);
        } else {
          setError('No business ID found in your session, or you are not a business owner.');
          setIsLoading(false);
          // router.push('/dashboard'); // Redirect to user dashboard or login
        }
      } catch (_e: unknown) {
        // e -> _e
        setError('Failed to process authentication token.');
        setIsLoading(false);
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!businessId) {
      // Check businessId again before setting error, similar to availability page
      if (!isLoading && !error && !businessId) {
        setError('Business ID not available for fetching bookings.');
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('authToken');

    fetch(`/api/v1/bookings?businessId=${businessId}`, {
      // Scheduling Service endpoint
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: `Failed to fetch bookings: ${res.statusText}` }));
          throw new Error(errorData.message);
        }
        return res.json();
      })
      .then(data => {
        setBookings(data.data || []); // Assuming pagination structure
      })
      .catch(err => {
        setError(err.message);
        setBookings([]);
      })
      .finally(() => setIsLoading(false));
  }, [businessId, isLoading, error]); // Added isLoading, error

  const handleUpdateBookingStatus = async (
    bookingId: string,
    newStatus: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  ) => {
    if (!window.confirm(`Are you sure you want to change this booking status to ${newStatus}?`))
      return;

    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`/api/v1/bookings/${bookingId}/status`, {
        // Scheduling Service
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to update booking status.' }));
        throw new Error(errorData.message);
      }
      setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, status: newStatus } : b)));
      alert(`Booking ${bookingId} status updated to ${newStatus}.`);
    } catch (err: unknown) {
      // Changed from any
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      alert(`Error updating booking: ${errorMessage}`);
    }
  };

  if (isLoading && !bookings.length) return <p>Loading bookings for your business...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (!businessId && !isLoading && !error)
    return (
      <p>Could not determine your business ID. Ensure you are logged in as a business owner.</p>
    );

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: 'auto' }}>
      <h1>Business Bookings</h1>
      {!isLoading && bookings.length === 0 && !error && <p>Your business has no bookings yet.</p>}
      {bookings.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Booking ID</th>
              <th style={tableHeaderStyle}>Customer ID</th>
              <th style={tableHeaderStyle}>Service ID</th>
              <th style={tableHeaderStyle}>Date</th>
              <th style={tableHeaderStyle}>Time</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(booking => (
              <tr key={booking.id}>
                <td style={tableCellStyle} title={booking.id}>
                  {booking.id.substring(0, 8)}...
                </td>
                <td style={tableCellStyle} title={booking.customerId}>
                  {booking.customerId.substring(0, 8)}...
                </td>
                <td style={tableCellStyle} title={booking.serviceId}>
                  {booking.serviceId.substring(0, 8)}...
                </td>
                <td style={tableCellStyle}>{new Date(booking.startTime).toLocaleDateString()}</td>
                <td style={tableCellStyle}>
                  {new Date(booking.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                  {' - '}
                  {new Date(booking.endTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </td>
                <td
                  style={{
                    ...tableCellStyle,
                    color: getStatusColor(booking.status),
                    fontWeight: 'bold',
                  }}
                >
                  {booking.status}
                </td>
                <td style={tableCellStyle}>
                  {booking.status === 'PENDING_PAYMENT' && (
                    <button
                      onClick={() => handleUpdateBookingStatus(booking.id, 'CONFIRMED')}
                      style={{ ...actionButtonStyle, backgroundColor: 'green', marginRight: '5px' }}
                    >
                      Confirm
                    </button>
                  )}
                  {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleUpdateBookingStatus(booking.id, 'CANCELLED')}
                      style={{ ...actionButtonStyle, backgroundColor: 'red' }}
                    >
                      Cancel
                    </button>
                  )}
                  {/* Add more actions as needed, e.g., mark as COMPLETED */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button
        onClick={() => router.push('/business/dashboard')}
        style={{ marginTop: '20px', padding: '10px 15px' }}
      >
        Back to Business Dashboard
      </button>
    </div>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  borderBottom: '2px solid #ddd',
  padding: '10px',
  textAlign: 'left',
  backgroundColor: '#f9f9f9',
};
const tableCellStyle: React.CSSProperties = {
  borderBottom: '1px solid #eee',
  padding: '10px',
  textAlign: 'left',
};
const actionButtonStyle: React.CSSProperties = {
  padding: '5px 10px',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  color: 'white',
  fontSize: '0.9em',
};

function getStatusColor(status: string): string {
  // Copied from MyBookingsPage
  switch (status.toUpperCase()) {
    case 'CONFIRMED':
      return 'green';
    case 'PENDING_PAYMENT':
      return 'orange';
    case 'CANCELLED':
      return 'red';
    case 'COMPLETED':
      return 'blue';
    default:
      return 'black';
  }
}
