# TASK 4: Real-time Availability & Calendar Management

## 🎯 SCOPE DEFINITION

**YOU OWN:**
- Real-time availability checking and updates
- Calendar integration and time slot management
- Booking conflict prevention
- Availability API optimization
- WebSocket/real-time updates for slot availability

**DO NOT TOUCH:**
- Customer booking UI layout (enhance existing)
- Business dashboard layout (add calendar widget only)
- Payment processing
- Authentication flow

## 📋 SPECIFIC DELIVERABLES

### 1. Enhanced Availability API (3 hours)
- [ ] Optimized slot calculation with conflict checking
- [ ] Real-time availability updates
- [ ] Business hours and blackout date handling
- [ ] Buffer time between appointments

### 2. Calendar Management Interface (3 hours)
- [ ] Business owner calendar view (week/month)
- [ ] Availability rule configuration
- [ ] Manual booking creation/editing
- [ ] Appointment conflict visualization

### 3. Real-time Slot Updates (2 hours)
- [ ] WebSocket connection for live availability
- [ ] Automatic slot refresh on booking
- [ ] Conflict prevention during booking process
- [ ] Optimistic UI updates

## 🌿 BRANCH STRATEGY

```bash
# Create your branch
git checkout -b feature/realtime-availability

# Work in these directories
services/scheduling-service/internal/handlers/
services/scheduling-service/internal/service/
frontend/src/components/calendar/
frontend/src/hooks/useAvailability.ts
frontend/src/utils/websocket.ts

# Merge strategy
# 1. Test availability calculations thoroughly
# 2. Coordinate with booking flow for integration
# 3. Create PR with real-time features
```

## 🔗 DEPENDENCIES

**DEPENDS ON:**
- Existing scheduling service API
- Customer booking flow (Task 2) - slot selection integration
- Business service data (business hours, services)

**OTHERS DEPEND ON:**
- Your availability data (for accurate booking)
- Real-time updates (for booking conflict prevention)

## 📡 API CONTRACTS

### Enhanced Scheduling Endpoints (You Improve)
```typescript
GET /api/v1/services/{serviceId}/slots?date=2024-01-15&realtime=true
Response: { 
  slots: [
    { 
      startTime: "2024-01-15T09:00:00Z", 
      endTime: "2024-01-15T10:00:00Z",
      available: true,
      conflictReason?: string
    }
  ],
  lastUpdated: "2024-01-15T08:30:00Z"
}

POST /api/v1/availability/rules
Body: { 
  businessId, 
  dayOfWeek: 1, 
  startTime: "09:00", 
  endTime: "17:00",
  bufferMinutes: 15
}

GET /api/v1/businesses/{businessId}/calendar?start=2024-01-15&end=2024-01-21
Response: {
  appointments: [
    { id, startTime, endTime, customerName, serviceName, status }
  ],
  availability: [
    { date, totalSlots, bookedSlots, availableSlots }
  ]
}
```

### WebSocket Events
```typescript
// Client subscribes to availability updates
ws.send({ type: "subscribe", businessId: "biz_123" })

// Server sends real-time updates
{
  type: "availability_updated",
  businessId: "biz_123",
  date: "2024-01-15",
  updatedSlots: [...]
}

{
  type: "booking_created",
  bookingId: "bkg_456",
  affectedSlots: [...]
}
```

## 🧪 TESTING CRITERIA

### Manual Testing Checklist
- [ ] Create booking and verify slot becomes unavailable
- [ ] Test business hours configuration
- [ ] Verify buffer time between appointments
- [ ] Check calendar view shows all appointments
- [ ] Test real-time updates with multiple browser tabs
- [ ] Verify conflict prevention during simultaneous booking
- [ ] Test availability rules (weekends, holidays)

### Demo Readiness
- [ ] Calendar shows professional appointment view
- [ ] Real-time availability updates work smoothly
- [ ] No double-booking possible
- [ ] Business owner can manage availability easily
- [ ] Slot calculations are accurate and fast
- [ ] WebSocket connections are stable

## ⏱️ TIME ESTIMATES

**Total: 8 hours**

| Task | Hours | Priority |
|------|-------|----------|
| Enhanced availability API | 3h | Critical |
| Calendar management UI | 3h | Critical |
| Real-time WebSocket updates | 2h | High |

## 🚀 QUICK START

1. **Setup WebSocket server:**
```go
// In scheduling-service
go get github.com/gorilla/websocket
// Add WebSocket handler for real-time updates
```

2. **Frontend WebSocket client:**
```bash
cd frontend
npm install ws
# Create WebSocket hook for availability updates
```

3. **Database optimization:**
```sql
-- Add indexes for fast availability queries
CREATE INDEX idx_bookings_service_time ON bookings(service_id, start_time);
CREATE INDEX idx_availability_business_day ON availability_rules(business_id, day_of_week);
```

## 📝 AVAILABILITY CALCULATION LOGIC

```typescript
const calculateAvailableSlots = (
  businessHours: BusinessHours,
  existingBookings: Booking[],
  serviceId: string,
  date: string
) => {
  const service = getService(serviceId)
  const dayStart = parseBusinessHours(businessHours, date)
  const dayEnd = parseBusinessHours(businessHours, date)
  
  const slots = []
  let currentTime = dayStart
  
  while (currentTime < dayEnd) {
    const slotEnd = addMinutes(currentTime, service.duration)
    
    // Check for conflicts
    const hasConflict = existingBookings.some(booking => 
      isTimeOverlap(currentTime, slotEnd, booking.startTime, booking.endTime)
    )
    
    if (!hasConflict) {
      slots.push({
        startTime: currentTime,
        endTime: slotEnd,
        available: true
      })
    }
    
    currentTime = addMinutes(currentTime, service.duration + bufferMinutes)
  }
  
  return slots
}
```

## 🔧 INTEGRATION POINTS

### With Customer Booking (Task 2)
```typescript
// Enhance existing slot selection
const SlotSelector = ({ serviceId, selectedDate }) => {
  const { slots, loading } = useRealTimeAvailability(serviceId, selectedDate)
  
  useEffect(() => {
    // Subscribe to real-time updates
    subscribeToAvailability(serviceId)
  }, [serviceId])
  
  return (
    <div className="slot-grid">
      {slots.map(slot => (
        <SlotButton 
          key={slot.startTime}
          slot={slot}
          disabled={!slot.available}
          onClick={() => selectSlot(slot)}
        />
      ))}
    </div>
  )
}
```

### With Business Dashboard (Task 1)
```typescript
// Add calendar widget to dashboard
const CalendarWidget = ({ businessId }) => {
  const { appointments, stats } = useBusinessCalendar(businessId)
  
  return (
    <div className="calendar-widget">
      <h3>Today's Schedule</h3>
      <div className="stats">
        <span>{stats.totalAppointments} appointments</span>
        <span>{stats.availableSlots} slots available</span>
      </div>
      <AppointmentList appointments={appointments} />
    </div>
  )
}
```

## 🎯 SUCCESS CRITERIA

**DEMO READY = ALL GREEN:**
- ✅ Availability calculations are accurate and fast
- ✅ Real-time updates work across multiple clients
- ✅ Business owner can view and manage calendar
- ✅ No double-booking scenarios possible
- ✅ Buffer times and business hours respected
- ✅ Professional calendar interface
- ✅ WebSocket connections are stable
- ✅ Slot selection updates immediately
