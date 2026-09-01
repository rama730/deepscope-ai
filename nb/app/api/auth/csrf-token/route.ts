import { NextRequest, NextResponse } from "next/server";
import { getCSRFToken } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { successResponse, errorResponse } from "@/lib/api/response";
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from "@/lib/api/rate-limit";

/**
 * @route GET /api/auth/csrf-token
 * @description API endpoint to generate CSRF tokens for client-side requests
 * @requiresAuth false
 * @rateLimitCategory csrf_token
 * @returns {Object} Object containing the CSRF token
 * @throws {429} Rate limit exceeded
 * @throws {500} Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { identifier, type } = getRateLimitIdentifier(request);
    const rateLimitResult = await checkRateLimit(
      request,
      identifier,
      type,
      'csrf_token',
      RATE_LIMITS.CSRF_TOKEN
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.message || "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
        { 
          status: 429,
          headers: rateLimitResult.lockedUntil ? {
            "Retry-After": Math.ceil((new Date(rateLimitResult.lockedUntil).getTime() - Date.now()) / 1000).toString()
          } : {}
        }
      );
    }

    const token = await getCSRFToken();
    return successResponse({ token });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate CSRF token";
    logger.error("CSRF token generation error", { error: errorMessage });
    return errorResponse("Failed to generate CSRF token", 500);
  }
}

