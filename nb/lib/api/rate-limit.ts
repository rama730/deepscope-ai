/**
 * Rate limiting utilities for API routes
 * 
 * @deprecated The in-memory rate limiter in lib/ratelimit.ts is deprecated.
 * Use this database-backed implementation instead for production.
 */

import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/auth/validation";
import type { CheckRateLimitParams, CheckRateLimitResult } from "@/types/rpc";

export interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  lockoutMinutes?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  attemptsRemaining?: number;
  lockedUntil?: string;
  locked?: boolean;
  message?: string;
}

/**
 * Check rate limit for a given identifier and action
 */
export async function checkRateLimit(
  request: NextRequest,
  identifier: string,
  identifierType: 'user_id' | 'email' | 'ip_address',
  actionType: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const params: CheckRateLimitParams = {
      p_identifier: identifier,
      p_identifier_type: identifierType,
      p_action_type: actionType,
      p_max_attempts: config.maxAttempts,
      p_window_minutes: config.windowMinutes,
      p_lockout_minutes: config.lockoutMinutes || 0,
    };

    const { data, error } = await supabase.rpc("check_rate_limit", params) as {
      data: CheckRateLimitResult | null;
      error: { message: string } | null;
    };

    if (error) {
      logger.error("Rate limit check error", { error: error.message, identifier, actionType });
      // On error, allow the request but log it
      return { allowed: true };
    }

    if (!data) {
      return { allowed: true };
    }

    return {
      allowed: data.allowed !== false,
      attemptsRemaining: data.attempts_remaining,
      lockedUntil: data.locked_until,
      locked: data.locked === true,
      message: data.message,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Rate limit check exception", { error: errorMessage, identifier, actionType });
    // On exception, allow the request but log it
    return { allowed: true };
  }
}

/**
 * Get rate limit identifier from request (user ID, email, or IP)
 */
export function getRateLimitIdentifier(
  request: NextRequest,
  userId?: string | null,
  email?: string | null
): { identifier: string; type: 'user_id' | 'email' | 'ip_address' } {
  if (userId) {
    return { identifier: userId, type: 'user_id' };
  }
  if (email) {
    return { identifier: email, type: 'email' };
  }
  const ip = getClientIp(request);
  return { identifier: ip, type: 'ip_address' };
}

/**
 * Common rate limit configurations
 */
export const RATE_LIMITS = {
  // Auth endpoints
  CSRF_TOKEN: { maxAttempts: 20, windowMinutes: 1, lockoutMinutes: 5 },
  PASSWORD_VALIDATION: { maxAttempts: 10, windowMinutes: 1, lockoutMinutes: 5 },
  COMPLETE_RESET: { maxAttempts: 5, windowMinutes: 15, lockoutMinutes: 30 },
  
  // Message endpoints
  SEND_MESSAGE: { maxAttempts: 30, windowMinutes: 1, lockoutMinutes: 5 },
  UPLOAD_FILE: { maxAttempts: 10, windowMinutes: 1, lockoutMinutes: 10 },
  EDIT_MESSAGE: { maxAttempts: 20, windowMinutes: 1, lockoutMinutes: 5 },
  DELETE_MESSAGE: { maxAttempts: 10, windowMinutes: 1, lockoutMinutes: 5 },
  MARK_DELIVERED: { maxAttempts: 50, windowMinutes: 1, lockoutMinutes: 0 },
  
  // Project endpoints
  APPLY_TO_PROJECT: { maxAttempts: 5, windowMinutes: 15, lockoutMinutes: 30 },
  HANDLE_APPLICATION: { maxAttempts: 10, windowMinutes: 1, lockoutMinutes: 5 },
  
  // Utility endpoints
  LINK_PREVIEW: { maxAttempts: 20, windowMinutes: 1, lockoutMinutes: 5 },
  UNFURL: { maxAttempts: 20, windowMinutes: 1, lockoutMinutes: 5 },
  TRANSLATE: { maxAttempts: 10, windowMinutes: 1, lockoutMinutes: 5 },
  VIDEO_THUMBNAIL: { maxAttempts: 10, windowMinutes: 1, lockoutMinutes: 5 },
  TRENDING_HASHTAGS: { maxAttempts: 30, windowMinutes: 1, lockoutMinutes: 0 },
} as const;
