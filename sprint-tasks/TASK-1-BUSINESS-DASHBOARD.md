# TASK 1: Business Owner Dashboard & Onboarding

## 🎯 SCOPE DEFINITION

**YOU OWN:**
- `/frontend/src/pages/dashboard/` - Complete business dashboard
- `/frontend/src/components/business/` - Business-specific components
- `/frontend/src/pages/onboarding/` - Business setup flow
- Business authentication flow integration

**DO NOT TOUCH:**
- Customer-facing booking pages (`/booking/`, `/book/`)
- Payment processing components
- Real-time availability components
- Notification settings (basic placeholder only)

## 📋 SPECIFIC DELIVERABLES

### 1. Business Registration & Login (2 hours)
- [ ] Login page (`/login`) with email/password
- [ ] Registration page (`/register`) with business details
- [ ] JWT token handling and storage
- [ ] Protected route wrapper for dashboard

### 2. Business Onboarding Flow (3 hours)
- [ ] Step 1: Business profile (name, description, timezone)
- [ ] Step 2: Service creation (name, duration, price)
- [ ] Step 3: Basic availability setup (business hours)
- [ ] Step 4: "Go Live" confirmation with shareable booking link

### 3. Main Dashboard (3 hours)
- [ ] Overview stats (total bookings, revenue, upcoming appointments)
- [ ] Recent bookings list with status indicators
- [ ] Quick actions (add service, view calendar, settings)
- [ ] Navigation sidebar with all business functions

## 🌿 BRANCH STRATEGY

```bash
# Create your branch
git checkout -b feature/business-dashboard

# Work in these directories only
frontend/src/pages/dashboard/
frontend/src/pages/onboarding/
frontend/src/components/business/
frontend/src/hooks/useAuth.ts
frontend/src/utils/auth.ts

# Merge strategy
# 1. Test locally with mock data
# 2. Create PR to main
# 3. No conflicts expected with other tasks
```

## 🔗 DEPENDENCIES

**DEPENDS ON:**
- Auth Service API (already implemented)
- Business Service API (already implemented)
- Existing React app structure

**OTHERS DEPEND ON:**
- Your auth token handling (for other protected routes)
- Business ID context (for booking links)

## 📡 API CONTRACTS

### Auth Service Endpoints
```typescript
POST /api/v1/auth/register
Body: { email, password, firstName, lastName, timezone, role: "business_owner", businessName }
Response: { user, accessToken, refreshToken }

POST /api/v1/auth/login
Body: { email, password }
Response: { user, accessToken, refreshToken }
```

### Business Service Endpoints
```typescript
POST /api/v1/businesses
Headers: { Authorization: "Bearer <token>" }
Body: { name, description, timezone, category }
Response: { id, name, description, ... }

GET /api/v1/businesses/me
Headers: { Authorization: "Bearer <token>" }
Response: { id, name, services[], bookings[] }

POST /api/v1/services
Body: { businessId, name, description, duration, price, currency }
Response: { id, name, duration, price, ... }
```

## 🧪 TESTING CRITERIA

### Manual Testing Checklist
- [ ] Register new business owner account
- [ ] Login with created credentials
- [ ] Complete onboarding flow (4 steps)
- [ ] Access dashboard with sample data
- [ ] Create at least one service
- [ ] Generate shareable booking link
- [ ] Logout and login again (token persistence)

### Demo Readiness
- [ ] Smooth registration → onboarding → dashboard flow
- [ ] Professional UI that looks production-ready
- [ ] Error handling for API failures
- [ ] Loading states for all API calls
- [ ] Responsive design (desktop + tablet)

## ⏱️ TIME ESTIMATES

**Total: 8 hours**

| Task | Hours | Priority |
|------|-------|----------|
| Auth pages & token handling | 2h | Critical |
| Onboarding flow (4 steps) | 3h | Critical |
| Dashboard overview | 2h | Critical |
| Polish & error handling | 1h | High |

## 🚀 QUICK START

1. **Setup your environment:**
```bash
cd frontend
npm install
npm run dev
```

2. **Create base components:**
```bash
mkdir -p src/pages/dashboard src/pages/onboarding src/components/business
touch src/hooks/useAuth.ts src/utils/auth.ts
```

3. **Start with auth flow** - get login working first
4. **Build onboarding** - focus on happy path
5. **Create dashboard** - use mock data initially

## 📝 MOCK DATA FOR DEVELOPMENT

```typescript
const mockBusiness = {
  id: "biz_123",
  name: "Acme Consulting",
  description: "Business strategy consulting",
  timezone: "America/New_York",
  services: [
    { id: "svc_1", name: "Strategy Session", duration: 60, price: 150 }
  ],
  bookings: [
    { id: "bkg_1", customerName: "John Doe", startTime: "2024-01-15T10:00:00Z", status: "confirmed" }
  ]
}
```

## 🎯 SUCCESS CRITERIA

**DEMO READY = ALL GREEN:**
- ✅ Business owner can register in < 2 minutes
- ✅ Onboarding flow is intuitive and complete
- ✅ Dashboard shows professional business overview
- ✅ Can create services and get booking link
- ✅ UI looks polished and production-ready
- ✅ No console errors or broken functionality
