// frontend/src/components/payment/PaymentGateway.tsx
import { createPaymentIntentAPI } from '@/utils/payment'; // Adjust path
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import React, { useEffect, useState } from 'react';
import StripeCheckoutForm from './StripeCheckoutForm';

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
// This is your test publishable API key.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentGatewayProps {
  amount: number; // in cents
  currency: string;
  businessId: string;
  bookingId?: string;
  customerEmail?: string;
  onPaymentSuccess: (paymentResult: unknown) => void;
  onPaymentError: (errorMessage: string) => void;
}

const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  amount,
  currency,
  businessId,
  bookingId,
  customerEmail,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentIntent = async () => {
      const result = await createPaymentIntentAPI({
        amount,
        currency,
        businessId,
        bookingId,
        customerEmail,
      });

      if (result && result.clientSecret && result.paymentIntentId) {
        setClientSecret(result.clientSecret);
        setPaymentIntentId(result.paymentIntentId);
        setError(null);
      } else {
        setError(result?.error || 'Failed to initialize payment.');
        onPaymentError(result?.error || 'Failed to initialize payment.');
      }
    };

    if (amount > 0 && businessId) {
        fetchPaymentIntent();
    } else {
        setError("Amount and Business ID are required to initialize payment.");
        // onPaymentError("Amount and Business ID are required."); // Call if it's an error state
    }
  }, [amount, currency, businessId, bookingId, customerEmail, onPaymentError]);

  const options: StripeElementsOptions = {
    clientSecret,
    // appearance, // customize appearance if needed
  };

  if (error) {
    return <div style={{color: 'red'}}>Error: {error}</div>;
  }

  if (!clientSecret || !stripePromise) {
    return <div>Loading payment gateway...</div>;
  }

  return (
    <Elements options={options} stripe={stripePromise}>
      <StripeCheckoutForm
        clientSecret={clientSecret}
        paymentIntentId={paymentIntentId}
        bookingId={bookingId}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
      />
    </Elements>
  );
};

export default PaymentGateway;
