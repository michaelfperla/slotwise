#!/usr/bin/env node

/**
 * SlotWise MVP Demo Script
 * 
 * This script demonstrates the complete end-to-end functionality of SlotWise
 * with real API calls and database operations.
 */

const https = require('https');
const http = require('http');

// Configuration
const AUTH_SERVICE = 'http://localhost:8001';
const BUSINESS_SERVICE = 'http://localhost:8003';
const SCHEDULING_SERVICE = 'http://localhost:8080';

// Demo data
const DEMO_USER = {
  email: 'demo@slotwise.com',
  password: 'DemoPassword123!',
  firstName: 'Demo',
  lastName: 'User',
  timezone: 'America/New_York'
};

const DEMO_BUSINESS = {
  name: 'Demo Consulting',
  description: 'Professional consulting services',
  timezone: 'America/New_York',
  address: {
    street: '123 Business St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US'
  }
};

const DEMO_SERVICE = {
  name: '1-Hour Consultation',
  description: 'Professional consultation session',
  duration: 60,
  price: 15000, // $150.00 in cents
  currency: 'USD'
};

// Utility function to make HTTP requests
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Demo flow functions
async function step1_registerUser() {
  console.log('\n🔐 Step 1: User Registration');
  console.log('================================');
  
  const response = await makeRequest(`${AUTH_SERVICE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, DEMO_USER);
  
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.status === 201 && response.data.success) {
    console.log('✅ User registered successfully!');
    // For demo purposes, we'll use the registration response directly
    // In production, user would verify email first
    return {
      user: response.data.data.user,
      token: response.data.data.accessToken || 'demo-token-for-testing'
    };
  } else if (response.status === 409) {
    console.log('ℹ️  User already exists, proceeding with login...');
    return await step1b_loginUser();
  } else {
    throw new Error(`Registration failed: ${JSON.stringify(response.data)}`);
  }
}

async function step1b_loginUser() {
  console.log('\n🔑 Step 1b: User Login');
  console.log('=======================');
  
  const response = await makeRequest(`${AUTH_SERVICE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: DEMO_USER.email,
    password: DEMO_USER.password
  });
  
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.status === 200 && response.data.success) {
    console.log('✅ User logged in successfully!');
    return {
      user: response.data.data.user,
      token: response.data.data.accessToken
    };
  } else {
    throw new Error(`Login failed: ${JSON.stringify(response.data)}`);
  }
}

async function step2_createBusiness(token, userId) {
  console.log('\n🏢 Step 2: Business Creation');
  console.log('=============================');
  
  const businessData = {
    ...DEMO_BUSINESS,
    ownerId: userId
  };
  
  const response = await makeRequest(`${BUSINESS_SERVICE}/api/v1/businesses`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, businessData);
  
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.status === 201 && response.data.success) {
    console.log('✅ Business created successfully!');
    return response.data.data;
  } else {
    throw new Error(`Business creation failed: ${JSON.stringify(response.data)}`);
  }
}

async function step3_createService(token, businessId) {
  console.log('\n⚙️  Step 3: Service Creation');
  console.log('============================');
  
  const serviceData = {
    ...DEMO_SERVICE,
    businessId: businessId
  };
  
  const response = await makeRequest(`${BUSINESS_SERVICE}/api/v1/services`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, serviceData);
  
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.status === 201 && response.data.success) {
    console.log('✅ Service created successfully!');
    return response.data.data;
  } else {
    throw new Error(`Service creation failed: ${JSON.stringify(response.data)}`);
  }
}

async function step4_setAvailability(token, businessId) {
  console.log('\n📅 Step 4: Set Business Availability');
  console.log('====================================');
  
  const availabilityRule = {
    businessId: businessId,
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: true
  };
  
  const response = await makeRequest(`${SCHEDULING_SERVICE}/api/v1/availability/rules`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, availabilityRule);
  
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.status === 201) {
    console.log('✅ Availability rule created successfully!');
    return response.data;
  } else {
    throw new Error(`Availability creation failed: ${JSON.stringify(response.data)}`);
  }
}

async function step5_getAvailableSlots(serviceId, businessId) {
  console.log('\n🕐 Step 5: Get Available Time Slots');
  console.log('===================================');
  
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + (1 + 7 - today.getDay()) % 7);
  const dateStr = nextMonday.toISOString().split('T')[0];
  
  const response = await makeRequest(`${SCHEDULING_SERVICE}/api/v1/services/${serviceId}/slots?date=${dateStr}&businessId=${businessId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.status === 200) {
    console.log('✅ Available slots retrieved successfully!');
    return response.data;
  } else {
    throw new Error(`Slot retrieval failed: ${JSON.stringify(response.data)}`);
  }
}

async function step6_createBooking(token, serviceId, businessId) {
  console.log('\n📝 Step 6: Create Real Booking');
  console.log('==============================');
  
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + (1 + 7 - today.getDay()) % 7);
  nextMonday.setHours(10, 0, 0, 0); // 10:00 AM
  
  const bookingData = {
    serviceId: serviceId,
    businessId: businessId,
    customerId: 'demo-customer-id', // In real app, this would be the logged-in customer
    customerEmail: 'customer@example.com',
    customerName: 'John Customer',
    startTime: nextMonday.toISOString(),
    endTime: new Date(nextMonday.getTime() + 60 * 60 * 1000).toISOString(), // +1 hour
    notes: 'Demo booking for investor presentation'
  };
  
  const response = await makeRequest(`${SCHEDULING_SERVICE}/api/v1/bookings`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, bookingData);
  
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.status === 201) {
    console.log('✅ Booking created successfully!');
    return response.data;
  } else {
    throw new Error(`Booking creation failed: ${JSON.stringify(response.data)}`);
  }
}

async function step7_getBooking(token, bookingId) {
  console.log('\n📋 Step 7: Retrieve Booking Details');
  console.log('===================================');
  
  const response = await makeRequest(`${SCHEDULING_SERVICE}/api/v1/bookings/${bookingId}`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log(`Status: ${response.status}`);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.status === 200) {
    console.log('✅ Booking retrieved successfully!');
    return response.data;
  } else {
    throw new Error(`Booking retrieval failed: ${JSON.stringify(response.data)}`);
  }
}

// Main demo flow
async function runMVPDemo() {
  console.log('🚀 SlotWise MVP Demo - Real End-to-End Functionality');
  console.log('====================================================');
  console.log('This demo shows REAL functionality with actual database operations');
  console.log('Perfect for technical investor presentations!\n');
  
  try {
    // Step 1: User Registration/Login
    const authResult = await step1_registerUser();
    const token = authResult.token || (await step1b_loginUser()).token;
    const user = authResult.user || (await step1b_loginUser()).user;
    
    // Step 2: Business Creation
    const business = await step2_createBusiness(token, user.id);
    
    // Step 3: Service Creation
    const service = await step3_createService(token, business.id);
    
    // Step 4: Set Availability
    await step4_setAvailability(token, business.id);
    
    // Step 5: Get Available Slots
    const slots = await step5_getAvailableSlots(service.id, business.id);
    
    // Step 6: Create Booking
    const booking = await step6_createBooking(token, service.id, business.id);
    
    // Step 7: Retrieve Booking
    await step7_getBooking(token, booking.data.id);
    
    console.log('\n🎉 MVP DEMO COMPLETED SUCCESSFULLY!');
    console.log('===================================');
    console.log('✅ User Registration & Authentication');
    console.log('✅ Business Management');
    console.log('✅ Service Configuration');
    console.log('✅ Availability Management');
    console.log('✅ Real-time Slot Calculation');
    console.log('✅ Booking Creation & Management');
    console.log('✅ Database Persistence');
    console.log('✅ API Integration');
    console.log('\n🎯 Ready for investor demo!');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  runMVPDemo();
}

module.exports = { runMVPDemo };
