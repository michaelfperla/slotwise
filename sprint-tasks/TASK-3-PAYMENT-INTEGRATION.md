# TASK 3: Payment Processing & Integration

## 🎯 SCOPE DEFINITION

**YOU OWN:**
- Payment processing components and flow
- Stripe integration setup
- Payment confirmation handling
- Revenue tracking for business dashboard
- Payment-related API endpoints

**DO NOT TOUCH:**
- Customer booking UI (integrate with existing)
- Business dashboard layout (add payment data only)
- Authentication flow
- Service/availability management

## 📋 SPECIFIC DELIVERABLES

### 1. Stripe Integration Setup (2 hours)
- [ ] Stripe SDK configuration
- [ ] Payment intent creation endpoint
- [ ] Webhook handling for payment confirmation
- [ ] Environment variables for API keys

### 2. Payment Components (3 hours)
- [ ] Stripe Elements payment form
- [ ] Payment processing loading states
- [ ] Payment success/failure handling
- [ ] Payment method validation

### 3. Backend Payment Service (3 hours)
- [ ] Payment processing endpoint in business-service
- [ ] Booking status update on payment success
- [ ] Payment record storage
- [ ] Revenue calculation for dashboard

## 🌿 BRANCH STRATEGY

```bash
# Create your branch
git checkout -b feature/payment-integration

# Work in these directories
frontend/src/components/payment/
frontend/src/utils/payment.ts
services/business-service/src/controllers/PaymentController.ts
services/business-service/src/services/PaymentService.ts
services/business-service/prisma/migrations/

# Merge strategy
# 1. Test with Stripe test keys
# 2. Coordinate with booking flow developer
# 3. Create PR with payment integration
```

## 🔗 DEPENDENCIES

**DEPENDS ON:**
- Customer booking flow (Task 2) - booking data structure
- Business dashboard (Task 1) - revenue display integration
- Existing booking API endpoints

**OTHERS DEPEND ON:**
- Your payment confirmation (for booking status updates)
- Revenue data (for business analytics)

## 📡 API CONTRACTS

### New Payment Endpoints (You Create)
```typescript
POST /api/v1/payments/create-intent
Body: { bookingId, amount, currency, businessId }
Response: { clientSecret, paymentIntentId }

POST /api/v1/payments/confirm
Body: { paymentIntentId, bookingId }
Response: { status, booking, paymentRecord }

GET /api/v1/businesses/{businessId}/revenue
Response: { 
  totalRevenue, 
  monthlyRevenue, 
  recentPayments: [{ amount, date, customerName }] 
}
```

### Integration with Existing Booking API
```typescript
// Modify existing booking endpoint to include payment
POST /api/v1/bookings
Body: { 
  businessId, serviceId, startTime,
  customerInfo: { name, email, phone },
  requiresPayment: true
}
Response: { 
  id, status: "pending_payment", 
  paymentRequired: true,
  amount, currency
}
```

## 🧪 TESTING CRITERIA

### Manual Testing Checklist
- [ ] Create booking that requires payment
- [ ] Complete Stripe payment with test card (4242 4242 4242 4242)
- [ ] Verify booking status updates to "confirmed"
- [ ] Test payment failure scenarios
- [ ] Check revenue appears in business dashboard
- [ ] Test webhook payment confirmation
- [ ] Verify payment records are stored

### Demo Readiness
- [ ] Smooth payment flow integrated with booking
- [ ] Professional Stripe payment interface
- [ ] Clear payment confirmation messaging
- [ ] Revenue tracking visible to business owner
- [ ] Error handling for payment failures
- [ ] Test mode clearly indicated

## ⏱️ TIME ESTIMATES

**Total: 8 hours**

| Task | Hours | Priority |
|------|-------|----------|
| Stripe setup & configuration | 2h | Critical |
| Payment UI components | 3h | Critical |
| Backend payment processing | 2h | Critical |
| Integration & testing | 1h | High |

## 🚀 QUICK START

1. **Setup Stripe:**
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
# Get test keys from Stripe dashboard
```

2. **Environment variables:**
```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. **Database migration for payments:**
```sql
-- Add to business-service schema
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  stripe_payment_intent_id VARCHAR,
  amount DECIMAL(10,2),
  currency VARCHAR(3),
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 📝 STRIPE TEST DATA

```typescript
// Test card numbers
const testCards = {
  success: "4242424242424242",
  declined: "4000000000000002",
  requiresAuth: "4000002500003155"
}

// Test payment amounts
const testAmounts = {
  strategy_session: 15000, // $150.00 in cents
  consultation: 10000,     // $100.00 in cents
}
```

## 🔧 INTEGRATION POINTS

### With Customer Booking (Task 2)
```typescript
// Add to booking confirmation step
const handlePayment = async (bookingData) => {
  if (service.price > 0) {
    // Redirect to payment flow
    const paymentIntent = await createPaymentIntent(bookingData)
    // Show Stripe payment form
  } else {
    // Free service, confirm immediately
    await confirmBooking(bookingData)
  }
}
```

### With Business Dashboard (Task 1)
```typescript
// Add revenue widget to dashboard
const RevenueWidget = () => {
  const { totalRevenue, monthlyRevenue } = useRevenue(businessId)
  return (
    <div className="revenue-card">
      <h3>Revenue</h3>
      <p>This Month: ${monthlyRevenue}</p>
      <p>Total: ${totalRevenue}</p>
    </div>
  )
}
```

## 🎯 SUCCESS CRITERIA

**DEMO READY = ALL GREEN:**
- ✅ Customer can complete payment for booking
- ✅ Stripe payment form works with test cards
- ✅ Payment success updates booking to confirmed
- ✅ Payment failure shows clear error message
- ✅ Business owner sees revenue in dashboard
- ✅ Payment records are properly stored
- ✅ Webhook handles payment confirmation
- ✅ No payment processing errors in demo
