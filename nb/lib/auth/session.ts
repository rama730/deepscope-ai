/**
 * Session management utilities
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Refresh auth session
 */
export async function refreshSession() {
  const supabase = createSupabaseBrowserClient();
  const { data: { session }, error } = await supabase.auth.refreshSession();
  
  if (error) {
    throw error;
  }
  
  return session;
}

/**
 * Check if session is about to expire and refresh if needed
 */
export async function ensureValidSession() {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }
  
  // Check if session expires in less than 5 minutes
  const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + 3600000;
  const timeUntilExpiry = expiresAt - Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (timeUntilExpiry < fiveMinutes) {
    try {
      return await refreshSession();
    } catch (error) {
      // If refresh fails, return current session
      return session;
    }
  }
  
  return session;
}

/**
 * Get current session ID from JWT
 */
export function getSessionIdFromToken(accessToken: string): string | null {
  try {
    // Decode JWT without verification (just to get the payload)
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.jti || payload.session_id || null;
  } catch {
    return null;
  }
}
