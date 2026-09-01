import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { validateRequestBodySize } from "@/lib/api/validation";
import { errorResponse, csrfErrorResponse, validationErrorResponse, successResponse } from "@/lib/api/response";

/**
 * @route POST /api/auth/send-security-notification
 * @description API endpoint to send security notifications to users
 * @requiresAuth false
 * @requestBody { userId: string, notificationType: string, message: string, metadata?: object }
 * @returns {Object} Success response
 * @throws {400} Missing required parameters
 * @throws {403} Invalid CSRF token
 * @throws {500} Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body size (5KB max for notification with metadata)
    const sizeCheck = validateRequestBodySize(request, 5 * 1024);
    if (!sizeCheck.valid) {
      return errorResponse(sizeCheck.error || "Request too large", 400, "REQUEST_TOO_LARGE");
    }

    // Verify CSRF token
    const csrfToken = getCSRFTokenFromHeader(request);
    const isValid = await verifyCSRFToken(csrfToken);
    
    if (!isValid) {
      return csrfErrorResponse();
    }

    const { userId, notificationType, message, metadata } = await request.json() as {
      userId?: string;
      notificationType?: string;
      message?: string;
      metadata?: Record<string, unknown>;
    };

    if (!userId || typeof userId !== 'string' || !notificationType || typeof notificationType !== 'string' || !message || typeof message !== 'string') {
      return validationErrorResponse("Missing required parameters: userId, notificationType, message");
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

    const { error } = await supabase.rpc("send_security_notification", {
      p_user_id: userId,
      p_notification_type: notificationType,
      p_message: message,
      p_metadata: metadata || null,
    });

    if (error) {
      logger.error("Send security notification error", { error: error.message });
      return NextResponse.json(
        { error: "Failed to send security notification" },
        { status: 500 }
      );
    }

    return successResponse();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("Send security notification API error", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

