import { NextRequest, NextResponse } from "next/server";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { validateMessage } from "@/lib/messages/validation";
import { cleanMessageContent } from "@/lib/messages/sanitization";
import { logger } from "@/lib/logger";
import { createApiSupabaseClient } from "@/lib/api/supabase-client";
import { validateRequestBodySize } from "@/lib/api/validation";
import { errorResponse, csrfErrorResponse, unauthorizedResponse, validationErrorResponse } from "@/lib/api/response";

/**
 * Secure message sending API with rate limiting and validation
 * 
 * @route POST /api/messages/send
 * @body {string} content - Message content
 * @body {string} conversation_id - Conversation ID
 * @body {string} sender_id - Sender user ID
 * @body {string} recipient_id - Recipient user ID
 * @body {string} [message_type] - Message type (default: 'text')
 * @body {string} [reply_to_id] - ID of message being replied to
 * @body {Array} [attachments] - Message attachments
 * @returns {Object} Success response with message data
 * @throws {400} Validation error
 * @throws {401} Unauthorized
 * @throws {403} Invalid CSRF token
 * @throws {429} Rate limit exceeded
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
    const { content, conversation_id, sender_id, recipient_id, message_type, reply_to_id, attachments } = body;

    // Validate message
    const validation = validateMessage({
      content: content || '',
      conversation_id,
      sender_id,
      recipient_id,
      message_type,
      attachments,
    });

    if (!validation.valid) {
      return validationErrorResponse(validation.errors);
    }

    // Clean and sanitize content
    const cleaned = cleanMessageContent(content);
    if (!cleaned.valid) {
      return validationErrorResponse(cleaned.error || "Invalid message content");
    }

    // Verify authentication
    const supabase = createApiSupabaseClient(request, { useServiceRole: true });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== sender_id) {
      return unauthorizedResponse();
    }

    // Check rate limiting
    // const ip = getClientIp(request);
    const { data: rateLimitData, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_identifier: sender_id,
      p_identifier_type: 'user_id',
      p_action_type: 'send_message',
      p_max_attempts: 30, // 30 messages per window
      p_window_minutes: 1, // 1 minute window
      p_lockout_minutes: 5,
    });

    if (rateLimitError) {
      logger.error("Rate limit check error", { error: rateLimitError.message });
    } else if (rateLimitData && !rateLimitData.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please slow down.", code: "RATE_LIMIT_EXCEEDED" },
        { 
          status: 429,
          headers: rateLimitData.locked_until ? {
            "Retry-After": Math.ceil((new Date(rateLimitData.locked_until).getTime() - Date.now()) / 1000).toString()
          } : {}
        }
      );
    }

    // Verify user is participant
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversation_id)
      .eq('user_id', sender_id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_id,
        recipient_id,
        content: cleaned.cleaned,
        message_type: message_type || 'text',
        reply_to_id: reply_to_id || null,
      })
      .select()
      .single();

    if (insertError) {
      logger.error("Message insert error", { error: insertError.message });
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    logger.info("Message sent successfully", { messageId: message.id, conversationId: conversation_id });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("Send message API error", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
