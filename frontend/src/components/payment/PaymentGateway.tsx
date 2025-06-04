// frontend/src/components/payment/PaymentGateway.tsx
import React, { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeCheckoutForm from './StripeCheckoutForm';
import { createPaymentIntentAPI, PaymentIntentResponse } from '@/utils/payment'; // Adjust path

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
  onPaymentSuccess: (paymentResult: any) => void;
  onPaymentError: (errorMessage: string) => void;
}

const PaymentGateway: React.FC<PaymentGatewayProps> = (props) => {
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentIntent = async () => {
      const result = await createPaymentIntentAPI({
        amount: props.amount,
        currency: props.currency,
        businessId: props.businessId,
        bookingId: props.bookingId,
        customerEmail: props.customerEmail,
      });

      if (result && result.clientSecret && result.paymentIntentId) {
        setClientSecret(result.clientSecret);
        setPaymentIntentId(result.paymentIntentId);
        setError(null);
      } else {
        setError(result?.error || 'Failed to initialize payment.');
        props.onPaymentError(result?.error || 'Failed to initialize payment.');
      }
    };

    if (props.amount > 0 && props.businessId) {
        fetchPaymentIntent();
    } else {
        setError("Amount and Business ID are required to initialize payment.");
        // props.onPaymentError("Amount and Business ID are required."); // Call if it's an error state
    }
  }, [props.amount, props.currency, props.businessId, props.bookingId, props.customerEmail, props.onPaymentError]);

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
        bookingId={props.bookingId}
        onPaymentSuccess={props.onPaymentSuccess}
        onPaymentError={props.onPaymentError}
      />
    </Elements>
  );
};

export default PaymentGateway;
