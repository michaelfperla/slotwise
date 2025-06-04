#!/usr/bin/env node

/**
 * Create a valid JWT token for demo purposes
 */

const jwt = require('jsonwebtoken');

// Use the same secret as the services
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

// Create a demo user payload
const userPayload = {
  sub: 'c8b949d1-0f7b-4a3d-810b-a0b06e18c0a7', // User ID from database
  email: 'demo-user@slotwise.com',
  firstName: 'Demo',
  lastName: 'User',
  role: 'business_owner', // Give business owner role for full access
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

const token = jwt.sign(userPayload, JWT_SECRET);

console.log('🎫 Demo JWT Token Created!');
console.log('==========================');
console.log('User ID:', userPayload.sub);
console.log('Email:', userPayload.email);
console.log('Role:', userPayload.role);
console.log('Expires:', new Date(userPayload.exp * 1000).toLocaleString());
console.log('');
console.log('🔑 JWT Token:');
console.log(token);
console.log('');
console.log('📋 Use this token in API calls:');
console.log(`Authorization: Bearer ${token}`);
console.log('');
console.log('🌐 For browser testing, store this in localStorage:');
console.log(`localStorage.setItem('authToken', '${token}');`);
