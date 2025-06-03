import {
  addMinutes,
  subMinutes,
  isAfter,
  isBefore,
  isEqual,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
} from 'date-fns';
import { fromZonedTime, toZonedTime, format as formatTz } from 'date-fns-tz';

export class DateUtils {
  /**
   * Convert a date to UTC from a specific timezone
   */
  static toUTC(date: Date, timezone: string): Date {
    return fromZonedTime(date, timezone);
  }

  /**
   * Convert a UTC date to a specific timezone
   */
  static fromUTC(date: Date, timezone: string): Date {
    return toZonedTime(date, timezone);
  }

  /**
   * Format a date in a specific timezone
   */
  static formatInTimezone(
    date: Date,
    timezone: string,
    formatString: string = 'yyyy-MM-dd HH:mm:ss'
  ): string {
    const zonedDate = toZonedTime(date, timezone);
    return formatTz(zonedDate, formatString, { timeZone: timezone });
  }

  /**
   * Parse a time string (HH:mm) and create a date for today in the specified timezone
   */
  static parseTimeString(timeString: string, timezone: string, baseDate?: Date): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const base = baseDate || new Date();
    const dateInTimezone = toZonedTime(base, timezone);

    dateInTimezone.setHours(hours, minutes, 0, 0);
    return fromZonedTime(dateInTimezone, timezone);
  }

  /**
   * Get the start of day in a specific timezone
   */
  static startOfDayInTimezone(date: Date, timezone: string): Date {
    const zonedDate = toZonedTime(date, timezone);
    const startOfDayZoned = startOfDay(zonedDate);
    return fromZonedTime(startOfDayZoned, timezone);
  }

  /**
   * Get the end of day in a specific timezone
   */
  static endOfDayInTimezone(date: Date, timezone: string): Date {
    const zonedDate = toZonedTime(date, timezone);
    const endOfDayZoned = endOfDay(zonedDate);
    return fromZonedTime(endOfDayZoned, timezone);
  }

  /**
   * Check if two time slots overlap
   */
  static doTimeSlotsOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return isBefore(start1, end2) && isAfter(end1, start2);
  }

  /**
   * Generate time slots for a given day
   */
  static generateTimeSlots(
    startTime: string,
    endTime: string,
    duration: number, // in minutes
    timezone: string,
    date: Date = new Date()
  ): Date[] {
    const slots: Date[] = [];

    const start = this.parseTimeString(startTime, timezone, date);
    const end = this.parseTimeString(endTime, timezone, date);

    let current = start;

    while (isBefore(current, end)) {
      const slotEnd = addMinutes(current, duration);
      if (isBefore(slotEnd, end) || isEqual(slotEnd, end)) {
        slots.push(new Date(current));
      }
      current = addMinutes(current, duration);
    }

    return slots;
  }

  /**
   * Check if a date is within business hours
   */
  static isWithinBusinessHours(
    date: Date,
    startTime: string,
    endTime: string,
    timezone: string
  ): boolean {
    const dateInTimezone = toZonedTime(date, timezone);
    const dayStart = this.parseTimeString(startTime, timezone, dateInTimezone);
    const dayEnd = this.parseTimeString(endTime, timezone, dateInTimezone);

    return !isBefore(date, dayStart) && !isAfter(date, dayEnd);
  }

  /**
   * Add buffer time to a date
   */
  static addBuffer(date: Date, bufferMinutes: number): Date {
    return addMinutes(date, bufferMinutes);
  }

  /**
   * Subtract buffer time from a date
   */
  static subtractBuffer(date: Date, bufferMinutes: number): Date {
    return subMinutes(date, bufferMinutes);
  }

  /**
   * Get the day of week (0 = Sunday, 6 = Saturday)
   */
  static getDayOfWeek(date: Date, timezone: string): number {
    const dateInTimezone = toZonedTime(date, timezone);
    return dateInTimezone.getDay();
  }

  /**
   * Check if a booking time is valid (not in the past, within advance booking limits)
   */
  static isValidBookingTime(
    bookingTime: Date,
    minAdvanceHours: number,
    maxAdvanceDays: number,
    _timezone: string
  ): boolean {
    const now = new Date();
    const minTime = addMinutes(now, minAdvanceHours * 60);
    const maxTime = addDays(now, maxAdvanceDays);

    return !isBefore(bookingTime, minTime) && !isAfter(bookingTime, maxTime);
  }

  /**
   * Format duration in minutes to human readable format
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Get date range for a week
   */
  static getWeekRange(date: Date, timezone: string): { start: Date; end: Date } {
    const dateInTimezone = toZonedTime(date, timezone);
    const dayOfWeek = dateInTimezone.getDay();

    const start = this.startOfDayInTimezone(subDays(dateInTimezone, dayOfWeek), timezone);
    const end = this.endOfDayInTimezone(addDays(start, 6), timezone);

    return { start, end };
  }

  /**
   * Get date range for a month
   */
  static getMonthRange(date: Date, timezone: string): { start: Date; end: Date } {
    const dateInTimezone = toZonedTime(date, timezone);
    const year = dateInTimezone.getFullYear();
    const month = dateInTimezone.getMonth();

    const start = this.startOfDayInTimezone(new Date(year, month, 1), timezone);
    const end = this.endOfDayInTimezone(new Date(year, month + 1, 0), timezone);

    return { start, end };
  }
}
