import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/auth/validation";
import { validateRequestBodySize } from "@/lib/api/validation";
import { errorResponse, csrfErrorResponse, validationErrorResponse } from "@/lib/api/response";

/**
 * @route POST /api/auth/check-ip-security
 * @description API endpoint to check IP security status
 * @requiresAuth false
 * @requestBody { ipAddress?: string } - IP address to check (optional, will be extracted from request)
 * @returns {Object} IP security status (suspicious, blocked, etc.)
 * @throws {400} Missing IP address
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

    const { ipAddress } = await request.json() as { ipAddress?: string };
    const ip = ipAddress || getClientIp(request);

    if (!ip || ip === 'unknown') {
      return validationErrorResponse("Missing or invalid IP address");
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

    const { data, error } = await supabase.rpc("check_ip_security", {
      p_ip_address: ip,
    });

    if (error) {
      logger.error("IP security check error", { error: error.message });
      return NextResponse.json(
        { error: "IP security check failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("IP security check API error", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

