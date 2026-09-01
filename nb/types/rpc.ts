/**
 * Type definitions for Supabase RPC functions
 * These types ensure type safety when calling database functions
 */

// Rate Limiting RPC Types
export interface CheckRateLimitParams {
  p_identifier: string;
  p_identifier_type: 'user_id' | 'email' | 'ip_address';
  p_action_type: string;
  p_max_attempts: number;
  p_window_minutes: number;
  p_lockout_minutes: number;
}

export interface CheckRateLimitResult {
  allowed: boolean;
  attempts_remaining?: number;
  locked_until?: string;
  locked?: boolean;
  message?: string;
}

export interface ResetRateLimitParams {
  p_identifier: string;
  p_identifier_type: 'user_id' | 'email' | 'ip_address';
  p_action_type: string;
}

// Auth RPC Types
export interface RecordLoginAttemptParams {
  p_user_id: string;
  p_email: string;
  p_ip_address: string;
  p_user_agent?: string;
  p_success: boolean;
}

export interface CheckAccountLockoutParams {
  p_user_id?: string;
  p_email?: string;
  p_ip_address?: string;
}

export interface CheckAccountLockoutResult {
  is_locked: boolean;
  locked_until?: string;
  reason?: string;
}

export interface CheckIpSecurityParams {
  p_ip_address: string;
}

export interface CheckIpSecurityResult {
  suspicious: boolean;
  blocked: boolean;
  reason?: string;
}

export interface SendSecurityNotificationParams {
  p_user_id: string;
  p_notification_type: string;
  p_message: string;
  p_metadata?: Record<string, unknown>;
}

// Profile RPC Types
export interface RecordProfileViewParams {
  profile_id_param: string;
  viewer_id_param: string;
}

// Connection RPC Types
export interface SendConnectionRequestParams {
  p_user_id: string;
  p_connected_user_id: string;
  p_message?: string;
}

export interface SendConnectionRequestResult {
  success: boolean;
  connection_id?: string;
  error?: string;
}

// Explorer Feed RPC Types
export interface GetExplorerFeedParams {
  p_user_id: string | null;
  p_limit: number;
  p_tag: string | null;
  p_tab: 'for-you' | 'following' | 'projects';
}

export interface ExplorerFeedPost {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  bookmarks_count: number;
  views_count: number;
  post_type: string;
  media?: string[];
  tags?: string[];
  author_username: string;
  author_full_name: string;
  author_avatar_url?: string;
  project_id?: string;
  project_title?: string;
  project_slug?: string;
  project_status?: string;
  project_type?: string;
  parent_post_id?: string;
  parent_author_username?: string;
  parent_author_full_name?: string;
  project_update_id?: string;
  project_update_details?: Record<string, unknown>;
  project_idea_id?: string;
  project_idea_details?: Record<string, unknown>;
  poll_counts?: number[];
  user_poll_vote?: number;
}

// Messages RPC Types
export interface GetConversationsWithMetadataParams {
  user_uuid: string;
}

export interface ConversationWithMetadata {
  conversation_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  is_pinned: boolean;
  is_muted: boolean;
  is_archived: boolean;
}

export interface GetMessagesWithDetailsParams {
  conv_id: string;
  limit_count?: number;
}

export interface MessageWithDetails {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: string;
  reply_to_id?: string;
  created_at: string;
  updated_at?: string;
  edited_at?: string;
  is_edited: boolean;
  read_at?: string;
  sender_profile: {
    full_name: string;
    username: string;
    avatar_url?: string;
  };
  reply_to?: {
    id: string;
    content: string;
    sender_name: string;
  };
  reactions: Array<{
    emoji: string;
    user_id: string;
    count: number;
  }>;
}

// Project RPC Types
export interface IncrementProjectViewCountParams {
  project_id_param: string;
}

export interface GetConnectionStatsParams {
  user_uuid: string;
}

export interface ConnectionStats {
  total_connections: number;
  pending_incoming: number;
  pending_outgoing: number;
  accepted: number;
}

