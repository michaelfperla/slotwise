"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface BookingDetails {
  serviceId: string;
  serviceName: string;
  businessId: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  price: string; 
}

export default function ConfirmBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null); // From auth token
  const [customerEmail, setCustomerEmail] = useState<string | null>(null); // For displaying in success message
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedBookingDetails, setConfirmedBookingDetails] = useState<{bookingId: string, status: string} | null>(null);

  useEffect(() => {
    const serviceId = searchParams.get('serviceId');
    const serviceName = searchParams.get('serviceName');
    const businessId = searchParams.get('businessId');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const price = searchParams.get('price');

    if (serviceId && serviceName && businessId && startTime && endTime && price) {
      setBookingDetails({ serviceId, serviceName, businessId, startTime, endTime, price });
    } else {
      setError("Booking details are incomplete. Please try again.");
      // Optionally redirect back or show an error message prominently
      // router.replace('/some-error-page-or-back'); 
    }

    // Get customerId from auth token (placeholder)
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCustomerId(payload.sub || payload.userId || payload.id); 
        setCustomerEmail(payload.email); // Assuming email is in JWT payload
      } catch (e) {
        console.error("Error decoding token for customerId/email:", e);
        setError("Invalid authentication token. Please login again.");
        router.push('/login');
      }
    } else {
      setError("You must be logged in to confirm a booking.");
      router.push('/login');
    }
  }, [searchParams, router]);

  const handleConfirmBooking = async () => {
    if (!bookingDetails || !customerId) {
      setError("Booking information or user ID is missing.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken'); // Re-check token for safety
      if (!token) throw new Error("Authentication required.");

      const response = await fetch('/api/v1/bookings', { // Scheduling Service POST endpoint
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`, // Auth token for customerId on backend
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: bookingDetails.businessId,
          serviceId: bookingDetails.serviceId,
          customerId: customerId, // Send customerId obtained from token
          startTime: bookingDetails.startTime, // ISO string as collected
          // EndTime is calculated by backend based on service duration
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Booking failed: ${response.statusText}` }));
        throw new Error(errorData.message || "An unknown error occurred during booking.");
      }
      
      const newBooking = await response.json();
      // Display success message instead of alert and immediate redirect
      setBookingConfirmed(true);
      setConfirmedBookingDetails({ bookingId: newBooking.id, status: newBooking.status });
      // Optionally, redirect after a delay or provide a button to go to "My Bookings"
      // setTimeout(() => router.push('/dashboard/bookings'), 5000); 

    } catch (err: any) {
      setError(err.message || 'Failed to confirm booking.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!bookingDetails && !error) {
    return <p>Loading booking details...</p>;
  }
  if (error) {
    return <div style={{padding: '20px', color: 'red'}}>Error: {error} <button onClick={() => router.back()}>Go Back</button></div>;
  }

  if (bookingConfirmed && confirmedBookingDetails) {
    return (
      <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px', textAlign: 'center' }}>
        <h1 style={{color: 'green'}}>Booking Confirmed!</h1>
        <p>Your booking (ID: {confirmedBookingDetails.bookingId.substring(0,8)}...) is {confirmedBookingDetails.status}.</p>
        {customerEmail && <p>A confirmation email has been sent to <strong>{customerEmail}</strong>.</p>}
        {!customerEmail && <p>A confirmation email will be sent shortly.</p>}
        <div style={{marginTop: '30px'}}>
            <button onClick={() => router.push('/dashboard/bookings')} style={{padding: '10px 20px', marginRight: '10px'}}>View My Bookings</button>
            <button onClick={() => router.push('/')} style={{padding: '10px 20px'}}>Book Another Service</button>
        </div>
      </div>
    );
  }


  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <h1>Confirm Your Booking</h1>
      {bookingDetails && (
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px' }}>
          <p><strong>Service:</strong> {decodeURIComponent(bookingDetails.serviceName)}</p>
          <p><strong>Date:</strong> {new Date(bookingDetails.startTime).toLocaleDateString()}</p>
          <p>
            <strong>Time:</strong> 
            {new Date(bookingDetails.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            {' - '}
            {new Date(bookingDetails.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
          </p>
          <p><strong>Price:</strong> ${bookingDetails.price}</p>
          
          <button 
            onClick={handleConfirmBooking} 
            disabled={isLoading}
            style={{ 
              padding: '12px 25px', 
              backgroundColor: isLoading? '#ccc' : '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer', 
              fontSize: '1.1em',
              marginTop: '20px' 
            }}
          >
            {isLoading ? 'Processing...' : 'Confirm Booking'}
          </button>
        </div>
      )}
       <button onClick={() => router.back()} style={{ marginTop: '20px', padding: '10px 15px' }} disabled={isLoading}>
         Back to Select Slot
       </button>
    </div>
  );
}
