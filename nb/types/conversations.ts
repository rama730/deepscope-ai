/**
 * Type definitions for conversation-related data structures
 */

export interface ConversationWithMetadata {
  conversation_id: string;
  other_user_id: string;
  other_name: string | null;
  other_username: string | null;
  other_avatar: string | null;
  last_message: string | null;
  last_message_type: string | null;
  last_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
  is_pinned: boolean;
  is_muted: boolean;
  is_archived: boolean;
}

