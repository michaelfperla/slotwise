# TASK 2: Customer Booking Interface & Flow

## 🎯 SCOPE DEFINITION

**YOU OWN:**
- `/frontend/src/pages/booking/` - Public booking pages
- `/frontend/src/components/booking/` - Booking-specific components
- `/frontend/src/pages/book/[businessId]` - Dynamic booking pages
- Customer-facing booking experience (no auth required)

**DO NOT TOUCH:**
- Business dashboard pages (`/dashboard/`)
- Payment processing (create placeholder)
- Business onboarding flow
- Admin/business owner components

## 📋 SPECIFIC DELIVERABLES

### 1. Business Discovery Page (2 hours)
- [ ] Public business profile page (`/book/[businessId]`)
- [ ] Business info display (name, description, services)
- [ ] Service selection with pricing
- [ ] Professional, customer-friendly design

### 2. Time Selection Interface (3 hours)
- [ ] Calendar widget for date selection
- [ ] Available time slots display
- [ ] Service duration and pricing confirmation
- [ ] Real-time slot availability (mock for now)

### 3. Booking Confirmation Flow (3 hours)
- [ ] Customer information form (name, email, phone)
- [ ] Booking summary with all details
- [ ] Payment placeholder ("Pay $X" button)
- [ ] Confirmation page with booking details
- [ ] Email confirmation (mock send)

## 🌿 BRANCH STRATEGY

```bash
# Create your branch
git checkout -b feature/customer-booking

# Work in these directories only
frontend/src/pages/booking/
frontend/src/pages/book/
frontend/src/components/booking/
frontend/src/utils/booking.ts
frontend/src/hooks/useBooking.ts

# Merge strategy
# 1. Test with sample business data
# 2. Create PR to main
# 3. No conflicts with business dashboard
```

## 🔗 DEPENDENCIES

**DEPENDS ON:**
- Business Service API (for business/service data)
- Scheduling Service API (for availability)
- Existing React routing setup

**OTHERS DEPEND ON:**
- Your booking data structure (for payment integration)
- Customer info format (for notifications)

## 📡 API CONTRACTS

### Business Service Endpoints
```typescript
GET /api/v1/businesses/{businessId}/public
Response: { id, name, description, timezone, services[] }

GET /api/v1/services/{serviceId}
Response: { id, name, description, duration, price, currency }
```

### Scheduling Service Endpoints
```typescript
GET /api/v1/services/{serviceId}/slots?date=2024-01-15
Response: { 
  slots: [
    { startTime: "2024-01-15T09:00:00Z", endTime: "2024-01-15T10:00:00Z" }
  ]
}

POST /api/v1/bookings
Body: { 
  businessId, serviceId, customerId, startTime,
  customerInfo: { name, email, phone }
}
Response: { id, status, startTime, endTime, confirmationCode }
```

## 🧪 TESTING CRITERIA

### Manual Testing Checklist
- [ ] Navigate to `/book/biz_123` (sample business)
- [ ] View business profile and services
- [ ] Select a service and see pricing
- [ ] Choose date and available time slot
- [ ] Fill customer information form
- [ ] Complete booking (without payment)
- [ ] See confirmation with booking details
- [ ] Test responsive design on mobile

### Demo Readiness
- [ ] Smooth customer booking flow (< 3 minutes)
- [ ] Professional, trustworthy design
- [ ] Clear pricing and service information
- [ ] Intuitive date/time selection
- [ ] Error handling for unavailable slots
- [ ] Mobile-optimized interface

## ⏱️ TIME ESTIMATES

**Total: 8 hours**

| Task | Hours | Priority |
|------|-------|----------|
| Business profile page | 2h | Critical |
| Calendar & time selection | 3h | Critical |
| Customer form & confirmation | 2h | Critical |
| Polish & mobile optimization | 1h | High |

## 🚀 QUICK START

1. **Setup your environment:**
```bash
cd frontend
npm install
npm run dev
```

2. **Create base structure:**
```bash
mkdir -p src/pages/book src/components/booking
touch src/utils/booking.ts src/hooks/useBooking.ts
```

3. **Start with business profile** - static display first
4. **Add calendar component** - use a library like react-calendar
5. **Build booking flow** - focus on happy path

## 📝 MOCK DATA FOR DEVELOPMENT

```typescript
const mockBusiness = {
  id: "biz_123",
  name: "Acme Consulting",
  description: "Professional business strategy consulting",
  timezone: "America/New_York",
  services: [
    {
      id: "svc_1",
      name: "Strategy Session",
      description: "1-hour business strategy consultation",
      duration: 60,
      price: 150,
      currency: "USD"
    }
  ]
}

const mockAvailableSlots = [
  { startTime: "2024-01-15T09:00:00Z", endTime: "2024-01-15T10:00:00Z" },
  { startTime: "2024-01-15T14:00:00Z", endTime: "2024-01-15T15:00:00Z" },
  { startTime: "2024-01-15T16:00:00Z", endTime: "2024-01-15T17:00:00Z" }
]
```

## 🎨 UI/UX REQUIREMENTS

### Design Principles
- **Trust-building**: Professional, clean design
- **Simplicity**: Minimal steps to book
- **Clarity**: Clear pricing and time information
- **Mobile-first**: Optimized for phone booking

### Key Components Needed
- Business header with logo/name
- Service cards with pricing
- Calendar date picker
- Time slot grid
- Customer information form
- Booking summary card
- Confirmation success page

## 🎯 SUCCESS CRITERIA

**DEMO READY = ALL GREEN:**
- ✅ Customer can find and view business profile
- ✅ Service selection is clear with pricing
- ✅ Date/time selection is intuitive
- ✅ Booking form is simple and complete
- ✅ Confirmation provides all necessary details
- ✅ Mobile experience is smooth
- ✅ Professional design builds customer trust
- ✅ No broken links or console errors
