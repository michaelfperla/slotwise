// Core domain types
export * from './user';
export * from './business';
export * from './booking';
export * from './availability';
export * from './notification';
export * from './payment';
export * from './events';
export * from './api';

// Common utility types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export type ServicePort = 8001 | 8002 | 8003 | 8004;

export interface ServiceConfig {
  name: string;
  port: ServicePort;
  version: string;
  environment: 'development' | 'staging' | 'production';
}
