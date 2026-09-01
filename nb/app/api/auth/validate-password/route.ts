import { NextRequest, NextResponse } from "next/server";
import { validatePassword } from "@/lib/auth/password-validation";
import { logger } from "@/lib/logger";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { successResponse, errorResponse, validationErrorResponse, csrfErrorResponse } from "@/lib/api/response";
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from "@/lib/api/rate-limit";
import { validateRequestBodySize } from "@/lib/api/validation";

/**
 * @route POST /api/auth/validate-password
 * @description API endpoint to validate password complexity server-side. Can be called before signup or password reset.
 * @requiresAuth false
 * @rateLimitCategory password_validation
 * @requestBody { password: string, email?: string, username?: string }
 * @returns {Object} Validation result with strength and score
 * @throws {400} Validation error or missing password
 * @throws {403} Invalid CSRF token
 * @throws {429} Rate limit exceeded
 * @throws {500} Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body size
    const sizeCheck = validateRequestBodySize(request, 1024); // 1KB max
    if (!sizeCheck.valid) {
      return errorResponse(sizeCheck.error || "Request too large", 400, "REQUEST_TOO_LARGE");
    }

    // Verify CSRF token
    const csrfToken = getCSRFTokenFromHeader(request);
    const isValid = await verifyCSRFToken(csrfToken);
    
    if (!isValid) {
      return csrfErrorResponse();
    }

    // Rate limiting
    const { identifier, type } = getRateLimitIdentifier(request);
    const rateLimitResult = await checkRateLimit(
      request,
      identifier,
      type,
      'password_validation',
      RATE_LIMITS.PASSWORD_VALIDATION
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

    const body = await request.json();
    const { password, email, username } = body as { password?: string; email?: string; username?: string };

    if (!password || typeof password !== 'string') {
      return validationErrorResponse("Password is required");
    }

    // Validate password complexity
    const validation = validatePassword(password, email, username);

    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          errors: validation.errors,
          strength: validation.strength,
          score: validation.score,
        },
        { status: 400 }
      );
    }

    return successResponse({
      valid: true,
      strength: validation.strength,
      score: validation.score,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("Password validation API error", { error: errorMessage });
    return errorResponse("Internal server error", 500);
  }
}
