/**
 * Domain object types for business entities
 * These types represent the core business logic entities
 */

// User & Profile Types
export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  user_metadata?: Record<string, unknown>;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  headline?: string;
  created_at: string;
  updated_at: string;
}

// Post Types
export interface Post {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  bookmarks_count: number;
  views_count: number;
  post_type: PostType;
  media?: string[];
  tags?: string[];
  parent_post_id?: string;
  is_reply: boolean;
  profiles?: Profile;
  project?: ProjectReference;
  parent_post?: PostReference;
}

export type PostType = 
  | 'standard' 
  | 'project_update' 
  | 'achievement' 
  | 'collaboration' 
  | 'media' 
  | 'poll';

export interface PostReference {
  id: string;
  user_id?: string;
  profiles?: {
    username: string;
    full_name: string;
  };
}

// Project Types
export interface Project {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  short_description?: string;
  status: ProjectStatus;
  project_type?: string;
  tags?: string[];
  technologies_used?: string[];
  view_count: number;
  popularity_score: number;
  slug?: string;

  created_at: string;
  updated_at: string;
  last_activity_at?: string;
  profiles?: Profile;
}

export type ProjectStatus = 
  | 'open' 
  | 'in_progress' 
  | 'completed' 
  | 'archived';

export interface ProjectReference {
  id: string;
  title: string;
  slug?: string;
  status?: string;
  project_type?: string;
}

// Connection Types
export interface Connection {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: ConnectionStatus;
  created_at: string;
  accepted_at?: string;
  profiles?: Profile;
  connected_profiles?: Profile;
}

export type ConnectionStatus = 
  | 'pending' 
  | 'accepted' 
  | 'rejected';

// Message Types
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: MessageType;
  reply_to_id?: string;
  created_at: string;
  updated_at?: string;
  edited_at?: string;
  is_edited: boolean;
}

export type MessageType = 
  | 'text' 
  | 'system' 
  | 'task_started' 
  | 'task_completed' 
  | 'application_received' 
  | 'application_accepted' 
  | 'application_rejected';

// Task Types
export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export type TaskStatus = 
  | 'todo' 
  | 'in_progress' 
  | 'done';

export type TaskPriority = 
  | 'low' 
  | 'medium' 
  | 'high';

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_id?: string;
  related_entity_type?: string;
  is_read: boolean;
  created_at: string;
}

export type NotificationType = 
  | 'connection_request' 
  | 'connection_accepted' 
  | 'project_invite'
  | 'project_access_granted'
  | 'task_assigned' 
  | 'comment' 
  | 'like' 
  | 'mention';

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Rate Limit Types
export interface RateLimitResult {
  allowed: boolean;
  attempts_remaining?: number;
  locked_until?: string;
  locked?: boolean;
  message?: string;
}

