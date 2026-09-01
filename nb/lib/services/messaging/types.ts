/**
 * Messaging Types - Shared interfaces for messaging system
 */

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to_message_id?: string | null;
  is_edited?: boolean;
  edited_at?: string | null;
  deleted_at?: string | null;
  sender_profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  sender_name?: string | null;
  attachments?: MessageAttachment[];
  mentioned_tasks?: Array<{ id: string; title: string; status: string; project_id: string }>;
  mentioned_task_ids?: string[];
  forwarded_from_message_id?: string | null;
  forwarded_from_conversation_id?: string | null;
  forwarded_by?: string | null;
  read_at?: string | null;
  delivered_at?: string | null;
  read_receipt_count?: number;
}

import type { Application } from "@/lib/types/application";

export type ApplicationData = Application;

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  file_url: string;
  thumbnail_url: string | null;
  mime_type: string | null;
  created_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  project_id: string | null;
  type: 'direct' | 'group' | 'project';
  created_at: string;
  updated_at: string;
}

export interface ConversationSummary {
  conversation_id: string;
  type: 'direct' | 'group' | 'project';
  project_id?: string;
  project_title?: string;
  other_user_id?: string;
  other_user_full_name?: string;
  other_name?: string;
  other_username?: string;
  other_user_avatar_url?: string;
  avatar_url?: string;
  unread_count: number;
  last_message_content?: string;
  last_message?: string;
  last_message_at?: string;
  last_at?: string;
  last_sender_id?: string;
  created_at?: string;
}

export interface AttachmentInput {
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  mime_type?: string;
  thumbnail_url?: string;
}

export interface SearchMessageResult {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name: string;
  sender_avatar_url: string | null;
  conversation_name: string | null;
  conversation_type: string;
  has_attachments: boolean;
  has_mentions: boolean;
  relevance: number;
}

export interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  added_by: string | null;
  profile: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface ReadReceipt {
  user_id: string;
  read_at: string;
  user_profile?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}
