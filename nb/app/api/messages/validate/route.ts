import { NextRequest, NextResponse } from "next/server";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { validateMessage } from "@/lib/messages/validation";
import { cleanMessageContent } from "@/lib/messages/sanitization";
import { logger } from "@/lib/logger";
import { createApiSupabaseClient } from "@/lib/api/supabase-client";
import { validateRequestBodySize } from "@/lib/api/validation";
import { errorResponse, csrfErrorResponse, unauthorizedResponse, validationErrorResponse } from "@/lib/api/response";

/**
 * API endpoint to validate messages before sending
 * 
 * @route POST /api/messages/validate
 * @body {string} content - Message content to validate
 * @body {string} conversation_id - Conversation ID
 * @body {string} sender_id - Sender user ID
 * @body {string} recipient_id - Recipient user ID
 * @body {string} [message_type] - Message type
 * @body {Array} [attachments] - Message attachments
 * @returns {Object} Validation result with cleaned content
 * @throws {400} Validation error
 * @throws {401} Unauthorized
 * @throws {403} Invalid CSRF token or not participant
 * @throws {500} Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body size (50KB for messages with potential attachments metadata)
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

    const body = await request.json();
    const { content, conversation_id, sender_id, recipient_id, message_type, attachments } = body;

    // Validate message structure
    const validation = validateMessage({
      content: content || '',
      conversation_id,
      sender_id,
      recipient_id,
      message_type,
      attachments,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { valid: false, errors: validation.errors },
        { status: 400 }
      );
    }

    // Sanitize and clean content
    const cleaned = cleanMessageContent(content);
    if (!cleaned.valid) {
      return validationErrorResponse(cleaned.error || 'Invalid message content');
    }

    // Verify user has access to conversation
    const supabase = createApiSupabaseClient(request, { useServiceRole: true });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== sender_id) {
      return unauthorizedResponse();
    }

    // Check if user is participant in conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversation_id)
      .eq('user_id', sender_id)
      .single();

    if (participantError || !participant) {
      return errorResponse("You are not a participant in this conversation", 403, "NOT_PARTICIPANT");
    }

    return NextResponse.json({
      valid: true,
      cleanedContent: cleaned.cleaned,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("Message validation API error", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
