// API-specific types and interfaces

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>; // Changed from any
  body?: unknown; // Changed from any
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>; // Changed from any
  statusCode: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown; // Changed from any
}

export interface ApiValidationError extends ApiError {
  code: 'VALIDATION_ERROR';
  details: {
    errors: ValidationError[];
  };
}

// Common API error codes
export enum ApiErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource Management
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Business Logic
  BOOKING_CONFLICT = 'BOOKING_CONFLICT',
  INSUFFICIENT_AVAILABILITY = 'INSUFFICIENT_AVAILABILITY',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

// Health check interfaces
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  version: string;
  uptime: number;
  dependencies: HealthCheckDependency[];
}

export interface HealthCheckDependency {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

// Rate limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

// API versioning
export interface ApiVersion {
  version: string;
  deprecated?: boolean;
  deprecationDate?: Date;
  supportedUntil?: Date;
}

// Webhook interfaces
export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: Date;
  data: Record<string, unknown>; // Changed from any
  signature: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: Date;
  lastDeliveryAt?: Date;
  failureCount: number;
}

// API Gateway interfaces
export interface RouteConfig {
  path: string;
  method: string;
  service: string;
  timeout: number;
  retries: number;
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
  auth?: {
    required: boolean;
    roles?: string[];
  };
}

export interface ServiceRegistry {
  name: string;
  version: string;
  host: string;
  port: number;
  health: string;
  tags: string[];
  lastHeartbeat: Date;
}

// GraphQL specific types
export interface GraphQLRequest {
  query: string;
  variables?: Record<string, unknown>; // Changed from any
  operationName?: string;
}

export interface GraphQLResponse<T = Record<string, unknown>> {
  // Changed default for T
  data?: T;
  errors?: GraphQLError[];
  extensions?: Record<string, unknown>; // Changed from any
}

export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>; // Changed from any
}

// OpenAPI/Swagger interfaces
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, unknown>; // Changed from any
  components?: {
    schemas?: Record<string, unknown>; // Changed from any
    securitySchemes?: Record<string, unknown>; // Changed from any
  };
}

// Metrics and monitoring
export interface ApiMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number; // percentage
}

export interface EndpointMetrics extends ApiMetrics {
  endpoint: string;
  method: string;
}

// Caching
export interface CacheConfig {
  ttl: number; // seconds
  key: string;
  tags?: string[];
  invalidateOn?: string[]; // event types that should invalidate this cache
}

export interface CacheEntry<T = unknown> {
  // Changed default for T
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
  tags: string[];
}
