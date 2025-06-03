# SlotWise API Documentation

## 🎯 Overview

SlotWise provides a comprehensive REST API for managing scheduling and booking
operations. The API follows RESTful principles and is organized into
microservices, each handling specific domain responsibilities with consistent
response formats and error handling.

## 🌐 Base URLs

**Note**: Currently, services run on individual ports in development. API
Gateway is planned for future implementation.

### Development Service URLs

- **Auth Service**: `http://localhost:8001/api/v1`
- **Business Service**: `http://localhost:8003/api/v1`
- **Scheduling Service**: `http://localhost:8002/api/v1`
- **Notification Service**: `http://localhost:8004/api/v1`

### Future Production URLs (when API Gateway is implemented)

- **Staging**: `https://staging-api.slotwise.com/api/v1`
- **Production**: `https://api.slotwise.com/api/v1`

## 📋 Table of Contents

- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Auth Service API](#auth-service-api)
- [Business Service API](#business-service-api)
- [Scheduling Service API](#scheduling-service-api)
- [Notification Service API](#notification-service-api)
- [Rate Limiting](#rate-limiting)
- [Webhooks](#webhooks)

**Note**: Payment Service API documentation will be added when the service is
implemented.

## 🔐 Authentication

All protected endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Getting an Access Token

```http
POST /api/v1/auth/login
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
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "role": "BUSINESS_OWNER"
    }
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## 📄 Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message",
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    },
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // Additional error details
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## ⚠️ Error Handling

### HTTP Status Codes

- **200 OK** - Successful GET, PUT, PATCH requests
- **201 Created** - Successful POST requests
- **204 No Content** - Successful DELETE requests
- **400 Bad Request** - Invalid request data
- **401 Unauthorized** - Authentication required
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **409 Conflict** - Resource already exists
- **422 Unprocessable Entity** - Validation errors
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Server error

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

## 🔐 Auth Service API

The Auth Service is responsible for user registration, login, token management, and other authentication-related operations.

For detailed API specification, please see the [Auth Service OpenAPI Documentation](./auth-service-api.yaml).

## 🏢 Business Service API

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

## 📅 Scheduling Service API

The Scheduling Service handles the core booking logic, manages appointment slots, and calculates availability.

For detailed API specification, please see the [Scheduling Service OpenAPI Documentation](./scheduling-service-api.yaml).

## 📧 Notification Service API

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
    "startTime": "2025-01-15T14:00:00Z"
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

## 🚦 Rate Limiting

API requests are rate limited:

- **Authentication endpoints**: 5 requests per minute
- **General API endpoints**: 100 requests per minute

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 🔗 Webhooks

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

## 📦 SDKs and Libraries

**Note**: Official SDKs are planned for future development. Currently, use
direct HTTP requests to interact with the APIs.

## 🆘 Support

For API support:

- **Documentation**: https://docs.slotwise.com
- **Support Email**: api-support@slotwise.com
- **GitHub Issues**: https://github.com/slotwise/slotwise/issues
