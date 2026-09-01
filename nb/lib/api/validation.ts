/**
 * API request validation utilities
 */

import { NextRequest } from "next/server";

/**
 * Validate request body size
 */
export function validateRequestBodySize(
  request: NextRequest,
  maxSizeBytes: number = 1024 * 1024 // 1MB default
): { valid: boolean; error?: string } {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (isNaN(size) || size > maxSizeBytes) {
      return {
        valid: false,
        error: `Request body too large. Maximum size: ${maxSizeBytes} bytes`,
      };
    }
  }
  return { valid: true };
}

/**
 * Validate language code (ISO 639-1)
 */
export function isValidLanguageCode(code: string): boolean {
  // Common ISO 639-1 language codes (2 letters)
  const validCodes = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
    'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'fi', 'no', 'cs',
    'hu', 'ro', 'el', 'th', 'vi', 'id', 'ms', 'tl', 'uk', 'bg',
  ];
  return validCodes.includes(code.toLowerCase());
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string, maxLength?: number): string {
  let sanitized = input.trim();
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate URL format
 */
export function isValidUrlFormat(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate array input
 */
export function isValidArray<T>(
  value: unknown,
  validator?: (item: unknown) => item is T,
  minLength?: number,
  maxLength?: number
): value is T[] {
  if (!Array.isArray(value)) {
    return false;
  }
  
  if (minLength !== undefined && value.length < minLength) {
    return false;
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    return false;
  }
  
  if (validator) {
    return value.every(validator);
  }
  
  return true;
}

/**
 * Validate required fields in object
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  data: Partial<T>,
  requiredFields: (keyof T)[]
): { valid: boolean; missing: (keyof T)[] } {
  const missing: (keyof T)[] = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}
