import { NextRequest, NextResponse } from "next/server";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { createApiSupabaseClient } from "@/lib/api/supabase-client";
import { validateRequestBodySize } from "@/lib/api/validation";
import { errorResponse, csrfErrorResponse, unauthorizedResponse, validationErrorResponse } from "@/lib/api/response";

/**
 * Secure message deletion API
 * 
 * @route POST /api/messages/delete
 * @body {string} messageId - Message ID to delete
 * @body {string} senderId - Sender user ID
 * @returns {Object} Success response
 * @throws {400} Missing required parameters
 * @throws {401} Unauthorized
 * @throws {403} Invalid CSRF token or not message owner
 * @throws {404} Message not found
 * @throws {429} Rate limit exceeded
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

    const { messageId, senderId } = await request.json() as {
      messageId?: string;
      senderId?: string;
    };

    if (!messageId || typeof messageId !== 'string' || !senderId || typeof senderId !== 'string') {
      return validationErrorResponse("Missing required parameters: messageId, senderId");
    }

    // Verify authentication
    const supabase = createApiSupabaseClient(request, { useServiceRole: true });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== senderId) {
      return unauthorizedResponse();
    }

    // Verify message belongs to user
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, sender_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return errorResponse("Message not found", 404, "MESSAGE_NOT_FOUND");
    }

    if (message.sender_id !== user.id) {
      return errorResponse("You can only delete your own messages", 403, "NOT_MESSAGE_OWNER");
    }

    // Rate limiting
    const { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } = await import("@/lib/api/rate-limit");
    const { identifier, type } = getRateLimitIdentifier(request, user.id);
    const rateLimitResult = await checkRateLimit(
      request,
      identifier,
      type,
      'delete_message',
      RATE_LIMITS.DELETE_MESSAGE
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

    // Delete message (cascade will handle attachments and reactions)
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      logger.error("Message delete error", { error: deleteError.message });
      return NextResponse.json(
        { error: "Failed to delete message" },
        { status: 500 }
      );
    }

    logger.info("Message deleted successfully", { messageId, userId: user.id });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("Delete message API error", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
