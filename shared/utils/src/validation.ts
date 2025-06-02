import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');
export const timezoneSchema = z.string().min(1, 'Timezone is required');
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const subdomainSchema = z.string()
  .min(3, 'Subdomain must be at least 3 characters')
  .max(63, 'Subdomain must be at most 63 characters')
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Invalid subdomain format');

// Date validation schemas
export const dateSchema = z.coerce.date();
export const timeStringSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)');

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Business validation schemas
export const businessNameSchema = z.string().min(1, 'Business name is required').max(100);
export const serviceNameSchema = z.string().min(1, 'Service name is required').max(100);
export const durationSchema = z.number().int().min(15).max(480); // 15 minutes to 8 hours
export const priceSchema = z.number().min(0).max(999999.99);

// User validation schemas
export const nameSchema = z.string().min(1, 'Name is required').max(50);

// Validation helper functions
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

export function validatePhone(phone: string): boolean {
  return phoneSchema.safeParse(phone).success;
}

export function validateSubdomain(subdomain: string): boolean {
  return subdomainSchema.safeParse(subdomain).success;
}

export function validateTimeString(time: string): boolean {
  return timeStringSchema.safeParse(time).success;
}

// Custom validation functions
export function isValidBookingTime(startTime: Date, endTime: Date): boolean {
  return startTime < endTime && startTime > new Date();
}

export function isValidDuration(duration: number): boolean {
  return duration >= 15 && duration <= 480 && duration % 15 === 0; // Must be 15-minute increments
}

export function isValidPrice(price: number, currency: string): boolean {
  if (price < 0) return false;
  
  // Different minimum amounts based on currency
  const minimums: Record<string, number> = {
    USD: 0.50,
    EUR: 0.50,
    GBP: 0.30,
    CAD: 0.50,
    AUD: 0.50
  };
  
  const minimum = minimums[currency] || 0.50;
  return price >= minimum;
}

export function isValidTimeSlot(startTime: string, endTime: string): boolean {
  if (!validateTimeString(startTime) || !validateTimeString(endTime)) {
    return false;
  }
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  return startMinutes < endMinutes;
}

// Sanitization functions
export function sanitizeSubdomain(subdomain: string): string {
  return subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 63);
}

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Validation error formatting
export function formatValidationErrors(errors: z.ZodError): Array<{ field: string; message: string }> {
  return errors.errors.map(error => ({
    field: error.path.join('.'),
    message: error.message
  }));
}

// Schema validation wrapper
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: Array<{ field: string; message: string }> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: formatValidationErrors(result.error)
  };
}
