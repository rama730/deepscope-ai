import { NextRequest, NextResponse } from "next/server";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { createApiSupabaseClient } from "@/lib/api/supabase-client";
import { validateRequestBodySize } from "@/lib/api/validation";
import { errorResponse, csrfErrorResponse, unauthorizedResponse, validationErrorResponse } from "@/lib/api/response";

/**
 * API endpoint to mark messages as delivered (when recipient's device receives them)
 * 
 * @route POST /api/messages/mark-delivered
 * @body {Array<string>} messageIds - Array of message IDs to mark as delivered
 * @body {string} [conversationId] - Optional conversation ID for validation
 * @returns {Object} Success response
 * @throws {400} Missing or invalid message IDs
 * @throws {401} Unauthorized
 * @throws {403} Invalid CSRF token or not recipient
 * @throws {429} Rate limit exceeded
 * @throws {500} Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body size (10KB max for array of message IDs)
    const sizeCheck = validateRequestBodySize(request, 10 * 1024);
    if (!sizeCheck.valid) {
      return errorResponse(sizeCheck.error || "Request too large", 400, "REQUEST_TOO_LARGE");
    }

    // Verify CSRF token
    const csrfToken = getCSRFTokenFromHeader(request);
    const isValid = await verifyCSRFToken(csrfToken);
    
    if (!isValid) {
      return csrfErrorResponse();
    }

    const { messageIds, conversationId } = await request.json() as {
      messageIds?: unknown;
      conversationId?: string;
    };

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return validationErrorResponse("Message IDs array is required and must not be empty");
    }

    // Validate all message IDs are strings
    if (!messageIds.every(id => typeof id === 'string')) {
      return validationErrorResponse("All message IDs must be strings");
    }

    // Verify authentication
    const supabase = createApiSupabaseClient(request, { useServiceRole: true });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Rate limiting (higher limit for delivery tracking)
    const { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } = await import("@/lib/api/rate-limit");
    const { identifier, type } = getRateLimitIdentifier(request, user.id);
    const rateLimitResult = await checkRateLimit(
      request,
      identifier,
      type,
      'mark_delivered',
      RATE_LIMITS.MARK_DELIVERED
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

    // Verify user is recipient of these messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, recipient_id, conversation_id')
      .in('id', messageIds);

    if (messagesError || !messages) {
      return errorResponse("Failed to verify messages", 500, "VERIFICATION_ERROR");
    }

    // Verify all messages belong to the user and conversation
    const invalidMessages = messages.filter(
      (m: any) => m.recipient_id !== user.id || (conversationId && m.conversation_id !== conversationId)
    );

    if (invalidMessages.length > 0) {
      return errorResponse("Unauthorized: Not recipient of these messages", 403, "NOT_RECIPIENT");
    }

    // Update delivered_at for messages that haven't been marked as delivered
    const { error: updateError } = await supabase
      .from('messages')
      .update({ delivered_at: new Date().toISOString() })
      .in('id', messageIds)
      .is('delivered_at', null);

    if (updateError) {
      logger.error("Mark delivered error", { error: updateError.message });
      return NextResponse.json(
        { error: "Failed to mark messages as delivered" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("Mark delivered API error", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
