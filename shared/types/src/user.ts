import { BaseEntity } from './index';

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  timezone: string;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  role: UserRole;
  status: UserStatus;
  preferences: UserPreferences;
}

export enum UserRole {
  ADMIN = 'admin',
  BUSINESS_OWNER = 'business_owner',
  CLIENT = 'client'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification'
}

export interface UserPreferences {
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: {
    bookingConfirmation: boolean;
    bookingReminder: boolean;
    bookingCancellation: boolean;
    paymentConfirmation: boolean;
    marketingEmails: boolean;
  };
  sms: {
    bookingReminder: boolean;
    bookingConfirmation: boolean;
  };
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  timezone: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  timezone?: string;
  preferences?: Partial<UserPreferences>;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  businessId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}
