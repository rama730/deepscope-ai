import { NextRequest } from "next/server";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { successResponse, errorResponse, csrfErrorResponse } from "@/lib/api/response";

/**
 * @route POST /api/auth/verify-csrf
 * @description API endpoint to verify CSRF tokens
 * @requiresAuth false
 * @requestBody { token?: string } - CSRF token to verify (optional, can be in header)
 * @returns {Object} Object with valid boolean
 * @throws {400} Missing CSRF token
 * @throws {403} Invalid CSRF token
 * @throws {500} Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = (body.token as string | undefined) || getCSRFTokenFromHeader(request);

    if (!token || typeof token !== 'string') {
      return errorResponse("CSRF token missing", 400, "CSRF_MISSING");
    }

    const isValid = await verifyCSRFToken(token);

    if (!isValid) {
      logger.warn("CSRF token validation failed");
      return csrfErrorResponse();
    }

    return successResponse({ valid: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "CSRF verification failed";
    logger.error("CSRF verification error", { error: errorMessage });
    return errorResponse("CSRF verification failed", 500);
  }
}

