// frontend/src/components/payment/StripeCheckoutForm.tsx
import { confirmPaymentAPI, ConfirmPaymentPayload } from '@/utils/payment'; // Adjust path as needed
import {
    PaymentElement,
    useElements,
    useStripe,
} from '@stripe/react-stripe-js';
import React, { useState } from 'react';

interface StripeCheckoutFormProps {
  clientSecret: string;
  paymentIntentId: string;
  bookingId?: string; // Pass bookingId to link payment confirmation
  onPaymentSuccess: (paymentResult: unknown) => void; // Callback for success
  onPaymentError: (errorMessage: string) => void; // Callback for error
}

const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({
  bookingId,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      onPaymentError('Stripe.js has not loaded yet.');
      return;
    }

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      // confirmParams: {
      //   // Make sure to change this to your payment completion page
      //   return_url: `${window.location.origin}/booking-confirmation`, // Example return URL
      // },
      redirect: 'if_required', // To handle confirmation within the component
    });

    if (error) {
      const errorMessage = error.message || 'An unexpected error occurred.';
      setMessage(errorMessage);
      onPaymentError(errorMessage);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Call backend to confirm payment and update booking
        const confirmPayload: ConfirmPaymentPayload = { paymentIntentId: paymentIntent.id, bookingId };
        const backendConfirm = await confirmPaymentAPI(confirmPayload);

        if (backendConfirm && backendConfirm.status === 'success') {
            setMessage('Payment Succeeded!');
            onPaymentSuccess({ paymentIntent, backendConfirm });
        } else {
            const errMsg = backendConfirm?.error || 'Payment succeeded with Stripe but failed to confirm with backend.';
            setMessage(errMsg);
            onPaymentError(errMsg);
        }
    } else if (paymentIntent) {
         setMessage(`Payment status: ${paymentIntent.status}`);
         onPaymentError(`Payment status: ${paymentIntent.status}`);
    } else {
         setMessage('An unexpected situation occurred with the payment intent.');
         onPaymentError('An unexpected situation occurred.');
    }

    setIsLoading(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" options={{layout: "tabs"}} />
      <button disabled={isLoading || !stripe || !elements} id="submit" style={{ marginTop: '20px' }}>
        <span id="button-text">
          {isLoading ? <div className="spinner" id="spinner"></div> : 'Pay now'}
        </span>
      </button>
      {/* Show any error or success messages */}
      {message && <div id="payment-message" style={{ marginTop: '20px', color: message.startsWith('Payment Succeeded') ? 'green' : 'red' }}>{message}</div>}
    </form>
  );
};

export default StripeCheckoutForm;
