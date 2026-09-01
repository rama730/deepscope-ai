import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { validateRequestBodySize } from "@/lib/api/validation";
import { errorResponse, csrfErrorResponse, validationErrorResponse, successResponse } from "@/lib/api/response";

/**
 * @route POST /api/auth/reset-rate-limit
 * @description API endpoint to reset rate limits for a given identifier and action
 * @requiresAuth false
 * @requestBody { identifier: string, identifierType: string, actionType: string }
 * @returns {Object} Success response
 * @throws {400} Missing required parameters
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

    const { identifier, identifierType, actionType } = await request.json() as {
      identifier?: string;
      identifierType?: string;
      actionType?: string;
    };

    if (!identifier || typeof identifier !== 'string' || !identifierType || typeof identifierType !== 'string' || !actionType || typeof actionType !== 'string') {
      return validationErrorResponse("Missing required parameters: identifier, identifierType, actionType");
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

    const { error } = await supabase.rpc("reset_rate_limit", {
      p_identifier: identifier,
      p_identifier_type: identifierType,
      p_action_type: actionType,
    });

    if (error) {
      logger.error("Reset rate limit error", { error: error.message });
      return NextResponse.json(
        { error: "Failed to reset rate limit" },
        { status: 500 }
      );
    }

    return successResponse();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("Reset rate limit API error", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

