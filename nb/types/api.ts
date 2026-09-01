/**
 * API request and response type definitions
 * Ensures type safety for API route handlers
 */

import type { NextRequest } from "next/server";

// Common API Request Types
export interface ApiRequest extends NextRequest {}

// Auth API Types
export interface LoginRequest {
  email: string;
  password: string;
  csrfToken?: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  username: string;
  fullName?: string;
  csrfToken?: string;
}

export interface ResetPasswordRequest {
  email: string;
  csrfToken?: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// Message API Types
export interface SendMessageRequest {
  conversation_id: string;
  content: string;
  message_type?: string;
  reply_to_id?: string;
}

export interface EditMessageRequest {
  message_id: string;
  content: string;
}

export interface DeleteMessageRequest {
  message_id: string;
}

// Project API Types
export interface ApplyToProjectRequest {
  project_id: string;
  role_applied_for: string;
  message?: string;
}

export interface HandleApplicationRequest {
  application_id: string;
  action: 'accept' | 'reject';
  message?: string;
}

// Profile API Types
export interface UpdateProfileRequest {
  username?: string;
  full_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  headline?: string;
  avatar_url?: string;
}

// Post API Types
export interface CreatePostRequest {
  content: string;
  post_type?: string;
  media?: string[];
  tags?: string[];
  parent_post_id?: string;
  collaboration_data?: Record<string, unknown>;
  achievement_data?: Record<string, unknown>;
  poll_data?: Record<string, unknown>;
  cta?: {
    label: string;
    url: string;
  };
}

export interface UpdatePostRequest {
  post_id: string;
  content: string;
}

// Search API Types
export interface SearchRequest {
  q: string;
  type?: 'users' | 'projects' | 'posts' | 'all';
  limit?: number;
  offset?: number;
}

// Common API Response Types
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// File Upload Types
export interface FileUploadRequest {
  file: File | Blob;
  filename?: string;
  folder?: string;
  maxSize?: number;
}

export interface FileUploadResponse {
  url: string;
  path: string;
  size: number;
  mime_type: string;
}

// Rate Limit API Types
export interface CheckRateLimitRequest {
  identifier: string;
  identifierType: 'user_id' | 'email' | 'ip_address';
  actionType: string;
}

export interface RateLimitStatusResponse {
  allowed: boolean;
  attempts_remaining?: number;
  locked_until?: string;
  locked?: boolean;
  message?: string;
}

