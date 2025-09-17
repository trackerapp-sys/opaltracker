// Date formatting utilities that respect user settings
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface DateFormatSettings {
  dateFormat: string;
  timezone: string;
}

// Default date format settings
const DEFAULT_SETTINGS: DateFormatSettings = {
  dateFormat: "DD/MM/YYYY HH:MM",
  timezone: "Australia/Sydney"
};

/**
 * Format a date according to user's date format preference and timezone
 */
export function formatDate(date: Date | string, settings: DateFormatSettings = DEFAULT_SETTINGS): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  // Convert UTC date to user's timezone
  const zonedDate = toZonedTime(dateObj, settings.timezone);
  
  const year = zonedDate.getFullYear();
  const month = String(zonedDate.getMonth() + 1).padStart(2, '0');
  const day = String(zonedDate.getDate()).padStart(2, '0');
  
  // Format time with AM/PM
  const hours24 = zonedDate.getHours();
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const minutes = String(zonedDate.getMinutes()).padStart(2, '0');
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const timeString = `${hours12}:${minutes} ${ampm}`;

  switch (settings.dateFormat) {
    case "DD/MM/YYYY HH:MM":
      return `${day}/${month}/${year} ${timeString}`;
    case "MM/DD/YYYY HH:MM":
      return `${month}/${day}/${year} ${timeString}`;
    case "YYYY-MM-DD HH:MM":
      return `${year}-${month}-${day} ${timeString}`;
    case "DD-MM-YYYY HH:MM":
      return `${day}-${month}-${year} ${timeString}`;
    default:
      return `${day}/${month}/${year} ${timeString}`;
  }
}

/**
 * Format a date for display (date only, no time)
 */
export function formatDateOnly(date: Date | string, settings: DateFormatSettings = DEFAULT_SETTINGS): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  // Convert UTC date to user's timezone
  const zonedDate = toZonedTime(dateObj, settings.timezone);

  const year = zonedDate.getFullYear();
  const month = String(zonedDate.getMonth() + 1).padStart(2, '0');
  const day = String(zonedDate.getDate()).padStart(2, '0');

  switch (settings.dateFormat) {
    case "DD/MM/YYYY HH:MM":
      return `${day}/${month}/${year}`;
    case "MM/DD/YYYY HH:MM":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD HH:MM":
      return `${year}-${month}-${day}`;
    case "DD-MM-YYYY HH:MM":
      return `${day}-${month}-${year}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Format a date for display with relative time (e.g., "2 hours ago")
 */
export function formatRelativeDate(date: Date | string, settings: DateFormatSettings = DEFAULT_SETTINGS): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatDateOnly(dateObj, settings);
  }
}

/**
 * Parse a date string according to user's date format preference
 */
export function parseDate(dateString: string, settings: DateFormatSettings = DEFAULT_SETTINGS): Date {
  if (!dateString) {
    return new Date();
  }

  // Handle datetime-local format (YYYY-MM-DDTHH:MM)
  if (dateString.includes('T')) {
    return new Date(dateString);
  }

  // Handle different date formats
  switch (settings.dateFormat) {
    case "DD/MM/YYYY HH:MM":
      return parseDDMMYYYY(dateString);
    case "MM/DD/YYYY HH:MM":
      return parseMMDDYYYY(dateString);
    case "YYYY-MM-DD HH:MM":
      return parseYYYYMMDD(dateString);
    case "DD-MM-YYYY HH:MM":
      return parseDDMMYYYY(dateString.replace(/-/g, '/'));
    default:
      return parseDDMMYYYY(dateString);
  }
}

// Helper functions for parsing different date formats
function parseDDMMYYYY(dateString: string): Date {
  const [datePart, timePart = '00:00'] = dateString.split(' ');
  const [day, month, year] = datePart.split('/');
  const [hours, minutes] = timePart.split(':');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours || '0'), parseInt(minutes || '0'));
}

function parseMMDDYYYY(dateString: string): Date {
  const [datePart, timePart = '00:00'] = dateString.split(' ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes] = timePart.split(':');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours || '0'), parseInt(minutes || '0'));
}

function parseYYYYMMDD(dateString: string): Date {
  const [datePart, timePart = '00:00'] = dateString.split(' ');
  const [year, month, day] = datePart.split('-');
  const [hours, minutes] = timePart.split(':');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours || '0'), parseInt(minutes || '0'));
}

/**
 * Convert a datetime-local input value to UTC for storage
 * @param datetimeLocalValue - Value from datetime-local input (YYYY-MM-DDTHH:MM format)
 * @param timezone - User's timezone setting
 * @returns UTC date string for storage
 */
export function convertToUTC(datetimeLocalValue: string, timezone: string = DEFAULT_SETTINGS.timezone): string {
  if (!datetimeLocalValue) return '';
  
  // Create a date object from the datetime-local value (this is in user's local timezone)
  const localDate = new Date(datetimeLocalValue);
  
  // Convert to UTC for storage
  const utcDate = fromZonedTime(localDate, timezone);
  
  return utcDate.toISOString();
}

/**
 * Convert a UTC date string to datetime-local format for input fields
 * @param utcDateString - UTC date string from storage
 * @param timezone - User's timezone setting
 * @returns datetime-local format string (YYYY-MM-DDTHH:MM)
 */
export function convertFromUTC(utcDateString: string, timezone: string = DEFAULT_SETTINGS.timezone): string {
  if (!utcDateString) return '';
  
  const utcDate = new Date(utcDateString);
  
  // Convert UTC to user's timezone
  const zonedDate = toZonedTime(utcDate, timezone);
  
  // Format as datetime-local (YYYY-MM-DDTHH:MM)
  const year = zonedDate.getFullYear();
  const month = String(zonedDate.getMonth() + 1).padStart(2, '0');
  const day = String(zonedDate.getDate()).padStart(2, '0');
  const hours = String(zonedDate.getHours()).padStart(2, '0');
  const minutes = String(zonedDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}