'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Booking {
  id: string;
  serviceId: string; // Consider fetching serviceName for display
  businessId: string; // Consider fetching businessName for display
  startTime: string;
  endTime: string;
  status: string;
  // Add other fields like serviceName, businessName if populated by backend or fetched separately
  // For now, we'll keep it simple.
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCustomerId(payload.sub || payload.userId || payload.id);
      } catch {
        setError('Failed to process authentication token.');
        setIsLoading(false);
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!customerId) {
      // Don't fetch if customerId isn't set yet, or if there was an auth error.
      // If still loading customerId, isLoading will be true.
      // If error occurred setting customerId, error state will be set.
      if (!isLoading && !error && !customerId) {
        // Check customerId again
        setError('Could not determine user ID for fetching bookings.');
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('authToken'); // Get token again for the API call

    fetch(`/api/v1/bookings?customerId=${customerId}`, {
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
        setBookings(data.data || []); // Assuming pagination structure with "data" field
      })
      .catch(err => {
        setError(err.message);
        setBookings([]);
      })
      .finally(() => setIsLoading(false));
  }, [customerId, isLoading, error]); // Added isLoading, error

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`/api/v1/bookings/${bookingId}/status`, {
        // Scheduling Service
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CANCELLED' }), // Use the enum value from backend
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to cancel booking.' }));
        throw new Error(errorData.message);
      }
      // Update booking status in the local list or re-fetch
      setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, status: 'CANCELLED' } : b)));
      alert('Booking cancelled successfully.');
    } catch (err: unknown) {
      // Changed from any
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      alert(`Error cancelling booking: ${errorMessage}`);
    }
  };

  if (isLoading && !bookings.length) return <p>Loading your bookings...</p>;
  // Show error only if not loading and no customerId yet (implies auth issue)
  if (error && !customerId && !isLoading)
    return <p style={{ color: 'red' }}>Error: {error}. Please try logging in again.</p>;
  if (error && customerId) return <p style={{ color: 'red' }}>Error fetching bookings: {error}</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <h1>My Bookings</h1>
      {!isLoading && bookings.length === 0 && !error && (
        <p>
          You have no bookings yet.{' '}
          <a href="/services" style={{ color: '#0070f3' }}>
            Find a service to book!
          </a>
        </p>
      )}
      {bookings.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {bookings.map(booking => (
            <li
              key={booking.id}
              style={{
                border: '1px solid #eee',
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '5px',
              }}
            >
              <p>
                <strong>Booking ID:</strong> {booking.id}
              </p>
              <p>
                <strong>Service ID:</strong> {booking.serviceId}
              </p>{' '}
              {/* TODO: Fetch and show service name */}
              <p>
                <strong>Business ID:</strong> {booking.businessId}
              </p>{' '}
              {/* TODO: Fetch and show business name */}
              <p>
                <strong>Date:</strong> {new Date(booking.startTime).toLocaleDateString()}
              </p>
              <p>
                <strong>Time:</strong>
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
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <span style={{ fontWeight: 'bold', color: getStatusColor(booking.status) }}>
                  {booking.status}
                </span>
              </p>
              {booking.status === 'CONFIRMED' || booking.status === 'PENDING_PAYMENT' ? ( // Adjust based on actual cancellable statuses
                <button
                  onClick={() => handleCancelBooking(booking.id)}
                  style={{
                    backgroundColor: 'red',
                    color: 'white',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '5px',
                  }}
                >
                  Cancel Booking
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={() => router.push('/dashboard')}
        style={{ marginTop: '20px', padding: '10px 15px' }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}

function getStatusColor(status: string): string {
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
