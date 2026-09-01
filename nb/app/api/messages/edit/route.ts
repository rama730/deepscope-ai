import { NextRequest, NextResponse } from "next/server";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { cleanMessageContent } from "@/lib/messages/sanitization";
import { logger } from "@/lib/logger";
import { createApiSupabaseClient } from "@/lib/api/supabase-client";
import { validateRequestBodySize } from "@/lib/api/validation";
import { errorResponse, csrfErrorResponse, unauthorizedResponse, validationErrorResponse } from "@/lib/api/response";

/**
 * Secure message editing API
 * 
 * @route POST /api/messages/edit
 * @body {string} messageId - Message ID to edit
 * @body {string} newContent - New message content
 * @body {string} senderId - Sender user ID
 * @returns {Object} Success response with updated message
 * @throws {400} Validation error or edit time limit exceeded
 * @throws {401} Unauthorized
 * @throws {403} Invalid CSRF token or not message owner
 * @throws {404} Message not found
 * @throws {429} Rate limit exceeded
 * @throws {500} Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body size (50KB for message content)
    const sizeCheck = validateRequestBodySize(request, 50 * 1024);
    if (!sizeCheck.valid) {
      return errorResponse(sizeCheck.error || "Request too large", 400, "REQUEST_TOO_LARGE");
    }

    // Verify CSRF token
    const csrfToken = getCSRFTokenFromHeader(request);
    const isValid = await verifyCSRFToken(csrfToken);
    
    if (!isValid) {
      return csrfErrorResponse();
    }

    const { messageId, newContent, senderId } = await request.json() as {
      messageId?: string;
      newContent?: string;
      senderId?: string;
    };

    if (!messageId || typeof messageId !== 'string' || !newContent || typeof newContent !== 'string' || !senderId || typeof senderId !== 'string') {
      return validationErrorResponse("Missing required parameters: messageId, newContent, senderId");
    }

    // Clean and sanitize content
    const cleaned = cleanMessageContent(newContent);
    if (!cleaned.valid) {
      return validationErrorResponse(cleaned.error || "Invalid message content");
    }

    // Verify authentication
    const supabase = createApiSupabaseClient(request, { useServiceRole: true });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== senderId) {
      return unauthorizedResponse();
    }

    // Rate limiting
    const { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } = await import("@/lib/api/rate-limit");
    const { identifier, type } = getRateLimitIdentifier(request, user.id);
    const rateLimitResult = await checkRateLimit(
      request,
      identifier,
      type,
      'edit_message',
      RATE_LIMITS.EDIT_MESSAGE
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

    // Verify message belongs to user
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, sender_id, created_at')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return errorResponse("Message not found", 404, "MESSAGE_NOT_FOUND");
    }

    if (message.sender_id !== user.id) {
      return errorResponse("You can only edit your own messages", 403, "NOT_MESSAGE_OWNER");
    }

    // Check edit time limit (e.g., 15 minutes)
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    const editTimeLimit = 15 * 60 * 1000; // 15 minutes
    if (messageAge > editTimeLimit) {
      return errorResponse("Message can only be edited within 15 minutes of sending", 400, "EDIT_TIME_LIMIT_EXCEEDED");
    }

    // Update message
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({
        content: cleaned.cleaned,
        is_edited: true,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError) {
      logger.error("Message edit error", { error: updateError.message });
      return NextResponse.json(
        { error: "Failed to edit message" },
        { status: 500 }
      );
    }

    logger.info("Message edited successfully", { messageId });

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("Edit message API error", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
