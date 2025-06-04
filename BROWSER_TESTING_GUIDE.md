# 🚀 SlotWise Browser Testing Guide

## 🎯 **Complete Setup for Hands-On Testing**

### **📋 Demo Credentials**
```
Email: demo-user@slotwise.com
Password: DemoUser123!
User ID: c8b949d1-0f7b-4a3d-810b-a0b06e18c0a7
Status: ✅ VERIFIED & ACTIVE
```

### **🔑 Valid JWT Token (24 hours)**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjOGI5NDlkMS0wZjdiLTRhM2QtODEwYi1hMGIwNmUxOGMwYTciLCJlbWFpbCI6ImRlbW8tdXNlckBzbG90d2lzZS5jb20iLCJmaXJzdE5hbWUiOiJEZW1vIiwibGFzdE5hbWUiOiJVc2VyIiwicm9sZSI6ImJ1c2luZXNzX293bmVyIiwiaWF0IjoxNzQ5MDIyMTIxLCJleHAiOjE3NDkxMDg1MjF9.FeRzXPHoBq8b4tpD1-V-Fu5N1LXHD8MaizS0IAi3E4A
```

## 🌐 **Browser Testing Steps**

### **Step 1: Open the Application**
1. Open your browser and go to: **http://localhost:3000**
2. You should see the SlotWise homepage with navigation links

### **Step 2: Set Authentication Token**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Run this command to set the auth token:
```javascript
localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjOGI5NDlkMS0wZjdiLTRhM2QtODEwYi1hMGIwNmUxOGMwYTciLCJlbWFpbCI6ImRlbW8tdXNlckBzbG90d2lzZS5jb20iLCJmaXJzdE5hbWUiOiJEZW1vIiwibGFzdE5hbWUiOiJVc2VyIiwicm9sZSI6ImJ1c2luZXNzX293bmVyIiwiaWF0IjoxNzQ5MDIyMTIxLCJleHAiOjE3NDkxMDg1MjF9.FeRzXPHoBq8b4tpD1-V-Fu5N1LXHD8MaizS0IAi3E4A');
```
4. Refresh the page

### **Step 3: Navigate Through the Application**
Try these pages:
- **Login**: http://localhost:3000/login
- **Register**: http://localhost:3000/register  
- **Dashboard**: http://localhost:3000/dashboard
- **Business Registration**: http://localhost:3000/business/register
- **Business Dashboard**: http://localhost:3000/business/dashboard

## 🔧 **API Testing with Browser**

### **Test Business Service APIs**
Open Developer Tools → Network tab, then test these endpoints:

#### **1. Create Business**
```javascript
fetch('http://localhost:8003/api/v1/businesses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjOGI5NDlkMS0wZjdiLTRhM2QtODEwYi1hMGIwNmUxOGMwYTciLCJlbWFpbCI6ImRlbW8tdXNlckBzbG90d2lzZS5jb20iLCJmaXJzdE5hbWUiOiJEZW1vIiwibGFzdE5hbWUiOiJVc2VyIiwicm9sZSI6ImJ1c2luZXNzX293bmVyIiwiaWF0IjoxNzQ5MDIyMTIxLCJleHAiOjE3NDkxMDg1MjF9.FeRzXPHoBq8b4tpD1-V-Fu5N1LXHD8MaizS0IAi3E4A'
  },
  body: JSON.stringify({
    name: 'Demo Consulting Business',
    description: 'Professional consulting services for browser testing',
    subdomain: 'demo-consulting-browser',
    email: 'contact@demo-consulting.com',
    phone: '+1-555-DEMO',
    website: 'https://demo-consulting.com',
    street: '123 Demo Street',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'US',
    timezone: 'America/Los_Angeles',
    currency: 'USD'
  })
})
.then(response => response.json())
.then(data => console.log('Business created:', data));
```

#### **2. Create Service**
```javascript
// Replace BUSINESS_ID with the ID from the business creation response
fetch('http://localhost:8003/api/v1/services', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjOGI5NDlkMS0wZjdiLTRhM2QtODEwYi1hMGIwNmUxOGMwYTciLCJlbWFpbCI6ImRlbW8tdXNlckBzbG90d2lzZS5jb20iLCJmaXJzdE5hbWUiOiJEZW1vIiwibGFzdE5hbWUiOiJVc2VyIiwicm9sZSI6ImJ1c2luZXNzX293bmVyIiwiaWF0IjoxNzQ5MDIyMTIxLCJleHAiOjE3NDkxMDg1MjF9.FeRzXPHoBq8b4tpD1-V-Fu5N1LXHD8MaizS0IAi3E4A'
  },
  body: JSON.stringify({
    businessId: 'BUSINESS_ID_HERE',
    name: 'Strategy Consultation',
    description: '1-hour strategic consultation session',
    duration: 60,
    price: 15000, // $150.00 in cents
    currency: 'USD',
    category: 'Consulting',
    maxAdvanceBookingDays: 30,
    minAdvanceBookingHours: 24,
    allowOnlinePayment: true,
    requiresApproval: false
  })
})
.then(response => response.json())
.then(data => console.log('Service created:', data));
```

### **Test Scheduling Service APIs**

#### **3. Set Availability Rules**
```javascript
// Replace BUSINESS_ID with your business ID
fetch('http://localhost:8080/api/v1/availability/rules', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    businessId: 'BUSINESS_ID_HERE',
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: true
  })
})
.then(response => response.json())
.then(data => console.log('Availability set:', data));
```

#### **4. Get Available Slots**
```javascript
// Replace SERVICE_ID and BUSINESS_ID with your IDs
const date = '2025-06-09'; // Next Monday
fetch(`http://localhost:8080/api/v1/services/SERVICE_ID_HERE/slots?date=${date}&businessId=BUSINESS_ID_HERE`)
.then(response => response.json())
.then(data => console.log('Available slots:', data));
```

#### **5. Create Booking**
```javascript
// Replace SERVICE_ID and BUSINESS_ID with your IDs
fetch('http://localhost:8080/api/v1/bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    serviceId: 'SERVICE_ID_HERE',
    businessId: 'BUSINESS_ID_HERE',
    customerId: 'browser-test-customer',
    customerEmail: 'customer@example.com',
    customerName: 'Browser Test Customer',
    startTime: '2025-06-09T14:00:00.000Z',
    endTime: '2025-06-09T15:00:00.000Z',
    notes: 'Browser testing booking'
  })
})
.then(response => response.json())
.then(data => console.log('Booking created:', data));
```

## 📊 **Service Status Check**

### **Check All Services**
```javascript
// Check all services are running
Promise.all([
  fetch('http://localhost:3000').then(r => ({frontend: r.status})),
  fetch('http://localhost:8001/health').then(r => r.json()).then(d => ({auth: d.status})),
  fetch('http://localhost:8003/health').then(r => r.json()).then(d => ({business: d.status})),
  fetch('http://localhost:8080/health').then(r => r.json()).then(d => ({scheduling: d.status}))
]).then(results => console.log('Service Status:', results));
```

## 🎯 **What You Should See**

### **✅ Working Features**
- Frontend loads and displays properly
- Navigation between pages works
- API calls return proper responses
- Business creation works
- Service creation works
- Availability configuration works
- Booking creation works
- Real database persistence

### **🔍 Testing Checklist**
- [ ] Frontend loads at http://localhost:3000
- [ ] Can navigate to different pages
- [ ] Can set auth token in localStorage
- [ ] Can create business via API
- [ ] Can create service via API
- [ ] Can set availability rules
- [ ] Can get available time slots
- [ ] Can create bookings
- [ ] Can retrieve bookings

## 🚀 **API Documentation**

### **Business Service API Docs**
- **URL**: http://localhost:8003/docs
- **Interactive Swagger UI** with all endpoints

### **Service Endpoints Summary**
- **Frontend**: http://localhost:3000
- **Auth Service**: http://localhost:8001 (Health: /health)
- **Business Service**: http://localhost:8003 (Docs: /docs)
- **Scheduling Service**: http://localhost:8080 (Health: /health)

## 💡 **Tips for Testing**

1. **Use Browser Developer Tools** to monitor network requests
2. **Check Console** for any JavaScript errors
3. **Use Network tab** to see API responses
4. **Copy/paste the JavaScript snippets** above to test APIs
5. **Replace placeholder IDs** with actual IDs from responses
6. **Test the complete flow** from business creation to booking

This gives you **complete hands-on control** to test every aspect of the SlotWise platform!
