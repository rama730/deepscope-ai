/**
 * Standardized API response utilities
 * 
 * This module provides centralized response helpers used across all API routes.
 * It is intentionally designed as a high-impact shared utility to ensure:
 * - Consistent response format across all endpoints
 * - Type safety for API responses
 * - Easy maintenance of response patterns
 * 
 * This high coupling is intentional and beneficial for maintaining API consistency.
 */

import { NextResponse } from "next/server";

export interface ApiErrorResponse {
  success: false;
  message: string; // Changed from 'error' to 'message' to match prompt
  error?: {
    statusCode?: number;
    code?: string;
    details?: Record<string, unknown> | unknown[];
  };
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  [key: string]: unknown;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: Record<string, unknown> | unknown[]
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    message,
    error: {
      statusCode,
      ...(code && { code }),
      ...(details && { details }),
    }
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data?: T,
  status: number = 200,
  additionalFields?: Record<string, unknown>,
  headers?: HeadersInit
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...additionalFields,
  };

  return NextResponse.json(response, { status, headers });
}

/**
 * Create a rate limit error response with headers
 */
export function rateLimitResponse(
  message: string = "Rate limit exceeded",
  retryAfter?: number
): NextResponse<ApiErrorResponse> {
  const headers: HeadersInit = {};
  if (retryAfter) {
    headers["Retry-After"] = retryAfter.toString();
  }

  return NextResponse.json(
    { 
      success: false,
      message, 
      error: { code: "RATE_LIMIT_EXCEEDED" } 
    },
    { status: 429, headers }
  );
}

/**
 * Create a CSRF error response
 */
export function csrfErrorResponse(): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { 
      success: false,
      message: "Invalid CSRF token", 
      error: { code: "CSRF_INVALID" } 
    },
    { status: 403 }
  );
}

/**
 * Create an unauthorized error response
 */
export function unauthorizedResponse(message: string = "Unauthorized"): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { 
      success: false,
      message, 
      error: { code: "UNAUTHORIZED" }
    },
    { status: 401 }
  );
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(
  errors: string[] | string,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const errorMessage = Array.isArray(errors) ? errors.join(", ") : errors;
  return NextResponse.json(
    {
      success: false,
      message: errorMessage,
      error: {
        code: "VALIDATION_ERROR",
        ...(details && { details }),
      }
    },
    { status: 400 }
  );
}

/**
 * Create a not found error response
 */
export function notFoundResponse(
  message: string = "Resource not found",
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, 404, "NOT_FOUND", details);
}
