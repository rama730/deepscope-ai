import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { createServerClient } from "@supabase/ssr";
import { logger } from "@/lib/logger";
import { successResponse, errorResponse, csrfErrorResponse, unauthorizedResponse } from "@/lib/api/response";
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from "@/lib/api/rate-limit";

/**
 * @route POST /api/auth/complete-reset
 * @description API endpoint to complete password reset by clearing the reset pending cookie. Requires authentication and CSRF protection.
 * @requiresAuth true
 * @rateLimitCategory complete_reset
 * @returns {Object} Success response
 * @throws {401} Unauthorized
 * @throws {403} Invalid CSRF token
 * @throws {429} Rate limit exceeded
 * @throws {500} Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Verify CSRF token
    const csrfToken = getCSRFTokenFromHeader(request);
    const isValid = await verifyCSRFToken(csrfToken);
    
    if (!isValid) {
      return csrfErrorResponse();
    }

    // Verify authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Rate limiting
    const { identifier, type } = getRateLimitIdentifier(request, user.id);
    const rateLimitResult = await checkRateLimit(
      request,
      identifier,
      type,
      'complete_reset',
      RATE_LIMITS.COMPLETE_RESET
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

    const cookieStore = await cookies();
    
    // Remove the reset pending cookie
    cookieStore.delete("supabase-auth-reset-pending");
    
    return successResponse();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("Complete reset API error", { error: errorMessage });
    return errorResponse("Internal server error", 500);
  }
}
