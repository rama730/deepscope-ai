import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { validateRequestBodySize } from "@/lib/api/validation";
import { errorResponse, csrfErrorResponse, validationErrorResponse } from "@/lib/api/response";

/**
 * @route POST /api/auth/check-lockout
 * @description API endpoint to check if an account is locked out
 * @requiresAuth false
 * @requestBody { userId: string }
 * @returns {Object} Lockout status (locked, locked_until, etc.)
 * @throws {400} Missing user ID
 * @throws {403} Invalid CSRF token
 * @throws {500} Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body size (1KB max)
    const sizeCheck = validateRequestBodySize(request, 1024);
    if (!sizeCheck.valid) {
      return errorResponse(sizeCheck.error || "Request too large", 400, "REQUEST_TOO_LARGE");
    }

    // Verify CSRF token
    const csrfToken = getCSRFTokenFromHeader(request);
    const isValid = await verifyCSRFToken(csrfToken);
    
    if (!isValid) {
      return csrfErrorResponse();
    }

    const { userId } = await request.json() as { userId?: string };

    if (!userId || typeof userId !== 'string') {
      return validationErrorResponse("User ID is required");
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { data, error } = await supabase.rpc("check_account_lockout", {
      p_user_id: userId,
    });

    if (error) {
      logger.error("Check lockout error", { error: error.message });
      return NextResponse.json(
        { error: "Failed to check lockout" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("Check lockout API error", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

