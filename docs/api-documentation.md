# SlotWise API Documentation

## Overview

SlotWise provides a comprehensive REST API for managing scheduling and booking operations. The API is organized into four main services, each handling specific domain responsibilities.

## Base URLs

- **Development**: `http://localhost:8080/api/v1`
- **Production**: `https://api.slotwise.com/api/v1`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Getting an Access Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "business_owner"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 900
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Auth Service API

### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securepassword",
  "firstName": "Jane",
  "lastName": "Smith",
  "timezone": "America/New_York"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_456",
      "email": "newuser@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "business_owner",
      "status": "pending_verification"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

### Logout

```http
POST /auth/logout
Authorization: Bearer <token>
```

### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

## Business Service API

### Create Business

```http
POST /businesses
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Acme Consulting",
  "description": "Professional consulting services",
  "subdomain": "acme-consulting",
  "email": "contact@acme-consulting.com",
  "phone": "+1-555-0123",
  "website": "https://acme-consulting.com",
  "street": "123 Business Ave",
  "city": "New York",
  "state": "NY",
  "postalCode": "10001",
  "country": "US",
  "timezone": "America/New_York",
  "currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "biz_789",
    "name": "Acme Consulting",
    "subdomain": "acme-consulting",
    "status": "pending_setup",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Get Business by ID

```http
GET /businesses/{businessId}
Authorization: Bearer <token>
```

### Update Business

```http
PUT /businesses/{businessId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Business Name",
  "description": "Updated description"
}
```

### List User Businesses

```http
GET /businesses?page=1&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "biz_789",
      "name": "Acme Consulting",
      "subdomain": "acme-consulting",
      "status": "active",
      "services": [
        {
          "id": "svc_101",
          "name": "Strategy Session",
          "isActive": true
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Get Business by Subdomain (Public)

```http
GET /businesses/subdomain/{subdomain}
```

### Create Service

```http
POST /services
Authorization: Bearer <token>
Content-Type: application/json

{
  "businessId": "biz_789",
  "name": "Strategy Consultation",
  "description": "1-hour strategy consultation session",
  "duration": 60,
  "price": 150.00,
  "currency": "USD",
  "category": "Consulting",
  "maxAdvanceBookingDays": 30,
  "minAdvanceBookingHours": 24,
  "allowOnlinePayment": true,
  "requiresApproval": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "svc_101",
    "name": "Strategy Consultation",
    "duration": 60,
    "price": "150.00",
    "currency": "USD",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Scheduling Service API

### Create Booking

```http
POST /bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "serviceId": "svc_101",
  "startTime": "2024-01-15T14:00:00Z",
  "client": {
    "firstName": "Alice",
    "lastName": "Johnson",
    "email": "alice@example.com",
    "phone": "+1-555-0456",
    "timezone": "America/New_York"
  },
  "notes": "First-time consultation",
  "requirePayment": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking_202",
    "serviceId": "svc_101",
    "startTime": "2024-01-15T14:00:00Z",
    "endTime": "2024-01-15T15:00:00Z",
    "status": "pending",
    "totalAmount": "150.00",
    "currency": "USD",
    "paymentStatus": "pending",
    "client": {
      "firstName": "Alice",
      "lastName": "Johnson",
      "email": "alice@example.com"
    },
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Get Booking

```http
GET /bookings/{bookingId}
Authorization: Bearer <token>
```

### Update Booking

```http
PUT /bookings/{bookingId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "confirmed",
  "notes": "Updated notes"
}
```

### Cancel Booking

```http
DELETE /bookings/{bookingId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Client requested cancellation",
  "refundAmount": 150.00
}
```

### List Bookings

```http
GET /bookings?businessId=biz_789&status=confirmed&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

### Get Availability

```http
GET /availability?businessId=biz_789&serviceId=svc_101&startDate=2024-01-15&endDate=2024-01-21&timezone=America/New_York
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "businessId": "biz_789",
    "serviceId": "svc_101",
    "timezone": "America/New_York",
    "slots": [
      {
        "startTime": "2024-01-15T09:00:00Z",
        "endTime": "2024-01-15T10:00:00Z",
        "isAvailable": true
      },
      {
        "startTime": "2024-01-15T10:00:00Z",
        "endTime": "2024-01-15T11:00:00Z",
        "isAvailable": false,
        "reason": "Already booked"
      }
    ],
    "generatedAt": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Create Availability Rule

```http
POST /availability/rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "businessId": "biz_789",
  "serviceId": "svc_101",
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "17:00",
  "priority": 1
}
```

## Notification Service API

### Send Notification

```http
POST /notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientId": "user_123",
  "type": "booking_confirmation",
  "channel": "email",
  "templateId": "booking_confirmation_template",
  "templateData": {
    "bookingId": "booking_202",
    "serviceName": "Strategy Consultation",
    "startTime": "2024-01-15T14:00:00Z"
  },
  "priority": "normal"
}
```

### Get Notification Status

```http
GET /notifications/{notificationId}
Authorization: Bearer <token>
```

### List Notifications

```http
GET /notifications?recipientId=user_123&type=booking_confirmation&status=sent
Authorization: Bearer <token>
```

## Error Responses

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RESOURCE_ALREADY_EXISTS`: Resource already exists
- `BOOKING_CONFLICT`: Time slot not available
- `PAYMENT_REQUIRED`: Payment needed to complete action
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_SERVER_ERROR`: Server error

## Rate Limiting

API requests are rate limited:
- **Authentication endpoints**: 5 requests per minute
- **General API endpoints**: 100 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Webhooks

SlotWise supports webhooks for real-time event notifications:

### Webhook Events

- `booking.created`
- `booking.confirmed`
- `booking.cancelled`
- `payment.succeeded`
- `payment.failed`

### Webhook Payload Example

```json
{
  "id": "evt_123",
  "type": "booking.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "bookingId": "booking_202",
    "businessId": "biz_789",
    "serviceId": "svc_101",
    "clientId": "client_456"
  }
}
```

## SDKs and Libraries

Official SDKs are available for:
- **JavaScript/TypeScript**: `@slotwise/sdk-js`
- **Go**: `github.com/slotwise/sdk-go`
- **Python**: `slotwise-python`

## Support

For API support:
- **Documentation**: https://docs.slotwise.com
- **Support Email**: api-support@slotwise.com
- **GitHub Issues**: https://github.com/slotwise/slotwise/issues
