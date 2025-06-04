// frontend/src/utils/payment.ts
export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  error?: string;
}

export const createPaymentIntentAPI = async (payload: {
  amount: number; // in cents
  currency: string;
  businessId: string;
  bookingId?: string;
  customerEmail?: string;
}): Promise<PaymentIntentResponse | null> => {
  try {
    const response = await fetch('/api/v1/payments/create-intent', { // Assuming API is proxied or base URL is configured
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization header if required
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to create payment intent:', errorData);
      return { clientSecret: '', paymentIntentId: '', error: errorData.error || 'API error' };
    }
    return await response.json() as PaymentIntentResponse;
  } catch (error) {
    console.error('Error calling create payment intent API:', error);
    return { clientSecret: '', paymentIntentId: '', error: (error as Error).message };
  }
};

export interface ConfirmPaymentPayload {
    paymentIntentId: string;
    bookingId?: string;
}

export interface ConfirmPaymentResponse {
    status: string;
    paymentRecord?: unknown; // Define a proper type later
    bookingUpdated?: boolean;
    error?: string;
}

export const confirmPaymentAPI = async (payload: ConfirmPaymentPayload): Promise<ConfirmPaymentResponse | null> => {
    try {
        const response = await fetch('/api/v1/payments/confirm', { // Adjust API path as needed
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add Authorization header if required
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to confirm payment:', errorData);
            return { status: 'error', error: errorData.error || 'API error confirming payment' };
        }
        return await response.json() as ConfirmPaymentResponse;
    } catch (error) {
        console.error('Error calling confirm payment API:', error);
        return { status: 'error', error: (error as Error).message };
    }
};

export interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number;
  recentPayments: Array<{
    amount: number;
    date: string; // Assuming ISO string
    currency: string;
    status: string;
    customerName?: string; // As per task, but might not be available yet
    paymentIntentId?: string;
  }>;
  error?: string;
}

export const getBusinessRevenueAPI = async (businessId: string): Promise<RevenueData | null> => {
  try {
    // TODO: Ensure businessId is available and valid before calling
    if (!businessId) {
        console.warn('Business ID is required to fetch revenue data.');
        return { totalRevenue: 0, monthlyRevenue: 0, recentPayments: [], error: 'Business ID required' };
    }
    const response = await fetch(`/api/v1/businesses/${businessId}/revenue`, { // Assuming API is proxied
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization header if required (e.g., for business owner)
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to fetch revenue data:', errorData);
      return { totalRevenue: 0, monthlyRevenue: 0, recentPayments: [], error: errorData.error || 'API error fetching revenue' };
    }
    return await response.json() as RevenueData;
  } catch (error) {
    console.error('Error calling get business revenue API:', error);
    return { totalRevenue: 0, monthlyRevenue: 0, recentPayments: [], error: (error as Error).message };
  }
};
