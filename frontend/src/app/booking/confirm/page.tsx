// frontend/src/app/booking/confirm/page.tsx
'use client'; // Required for hooks like useState, useEffect

import PaymentGateway from '@/components/payment/PaymentGateway'; // Adjust path if needed
import { useEffect, useState } from 'react';
// import { useSearchParams } from 'next/navigation'; // Example: if bookingId comes from URL

// Placeholder for how booking data might be fetched or passed
interface BookingDetails {
  id?: string; // bookingId
  serviceName?: string;
  servicePrice?: number; // in cents
  currency?: string;
  businessId?: string;
  customerEmail?: string; // Or get from user session
  // Add other relevant details
}

const BookingConfirmPage = () => {
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>(''); // 'success', 'error', ''
  const [paymentMessage, setPaymentMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Example: Fetch booking details (e.g., using a bookingId from query params or context)
  // const searchParams = useSearchParams();
  // const bookingIdFromQuery = searchParams.get('bookingId');

  useEffect(() => {
    // Simulate fetching booking details
    // In a real app, this would be an API call or data passed via state/props/context
    const fetchBookingDetails = async () => {
      setIsLoading(true);
      // --- Replace with actual data fetching ---
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
      // Example:
      // if (bookingIdFromQuery) {
      //   const response = await fetch(`/api/v1/bookings/${bookingIdFromQuery}`);
      //   if (response.ok) {
      //     const data = await response.json();
      //     setBookingDetails({
      //       id: data.id,
      //       serviceName: data.service.name,
      //       servicePrice: data.service.price * 100, // Assuming price is in dollars, convert to cents
      //       currency: data.service.currency || 'USD',
      //       businessId: data.business.id,
      //       customerEmail: data.customer.email,
      //     });
      //   } else {
      //     setPaymentMessage('Failed to load booking details.');
      //   }
      // } else {
      // For this example, using mock data:
      setBookingDetails({
        id: 'booking_123_test', // Example booking ID
        serviceName: 'Consultation Session',
        servicePrice: 5000, // e.g., $50.00 in cents
        currency: 'USD',
        businessId: 'business_abc_test', // Example business ID
        customerEmail: 'customer@example.com',
      });
      // --- End of replacement section ---
      setIsLoading(false);
    };
    fetchBookingDetails();
  }, []); // Add dependencies if bookingIdFromQuery or similar is used

  const handleConfirmBooking = async () => {
    if (!bookingDetails || !customerId) {
      setError('Booking information or user ID is missing.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken'); // Re-check token for safety
      if (!token) throw new Error('Authentication required.');

      const response = await fetch('/api/v1/bookings', {
        // Scheduling Service POST endpoint
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`, // Auth token for customerId on backend
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
      // --- End of replacement section ---
      setIsLoading(false);
    };
    fetchBookingDetails();
  }, []); // Add dependencies if bookingIdFromQuery or similar is used

  const handlePaymentSuccess = (paymentResult: unknown) => {
    console.log('Payment successful!', paymentResult);
    setPaymentStatus('success');
    const result = paymentResult as { paymentIntent?: { id?: string } };
    setPaymentMessage(`Payment Confirmed! Your booking for ${bookingDetails?.serviceName} is successful. Payment Intent ID: ${result?.paymentIntent?.id || 'N/A'}`);
    // TODO: Redirect to a final confirmation/thank you page or update UI
    // e.g., router.push(`/booking-confirmed?bookingId=${bookingDetails?.id}`);
  };

  const handlePaymentError = (errorMessage: string) => {
    console.error('Payment error:', errorMessage);
    setPaymentStatus('error');
    setPaymentMessage(`Payment Failed: ${errorMessage}`);
    // TODO: Allow user to retry or contact support
  };

  if (isLoading) {
    return <div>Loading booking confirmation...</div>;
  }

  if (!bookingDetails) {
    return <div>Error loading booking details. Please try again. {paymentMessage}</div>;
  }

  const requiresPayment = bookingDetails.servicePrice && bookingDetails.servicePrice > 0;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1>Confirm Your Booking</h1>
      <p>Service: {bookingDetails.serviceName}</p>
      <p>Price: {bookingDetails.servicePrice ? (bookingDetails.servicePrice / 100).toFixed(2) : 'Free'} {bookingDetails.currency}</p>

      {paymentStatus === 'success' && (
        <div style={{ color: 'green', padding: '10px', border: '1px solid green', margin: '10px 0' }}>
          {paymentMessage}
        </div>
      )}

      {paymentStatus === 'error' && (
        <div style={{ color: 'red', padding: '10px', border: '1px solid red', margin: '10px 0' }}>
          {paymentMessage}
        </div>
      )}

      {paymentStatus !== 'success' && requiresPayment && (
        <div style={{ marginTop: '20px' }}>
          <h2>Complete Your Payment</h2>
          <PaymentGateway
            amount={bookingDetails.servicePrice!}
            currency={bookingDetails.currency!}
            businessId={bookingDetails.businessId!}
            bookingId={bookingDetails.id}
            customerEmail={bookingDetails.customerEmail}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </div>
      )}

      {paymentStatus !== 'success' && !requiresPayment && (
        <div style={{ marginTop: '20px' }}>
          <p>This is a free service. Click here to confirm your booking.</p>
          {/* <button onClick={async () => {
                // TODO: Call backend to confirm free booking
                // const confirmed = await confirmFreeBooking(bookingDetails.id);
                // if(confirmed) { handlePaymentSuccess({ message: "Booking Confirmed (Free)"}); }
                // else { handlePaymentError("Failed to confirm free booking."); }
                alert("Free booking confirmation logic to be implemented.");
            }}>Confirm Free Booking</button> */}
            <p style={{color: 'orange'}}>Free booking confirmation logic to be implemented.</p>
        </div>
      )}
    </div>
  );
};

export default BookingConfirmPage;
