import { createSupabaseServerClient } from '@/lib/supabase/server';
import { unauthorizedResponse, errorResponse } from '@/lib/api/response';

/**
 * Authentication and authorization guards
 * 
 * This module provides authentication and authorization utilities used across API routes.
 * It is intentionally designed as a high-impact shared utility to ensure:
 * - Consistent authentication patterns
 * - Centralized authorization logic
 * - Easy maintenance of security checks
 * 
 * This high coupling is intentional and beneficial for maintaining security consistency.
 * 
 * Usage:
 * const auth = await requireAuth();
 * if (auth.error) return auth.error;
 * const { user } = auth;
 */
export async function requireAuth() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: unauthorizedResponse() };
  }
  
  // Fire and forget (ish)
  // In a real high-scale app, put this in a queue.
  // trackSessionActivity(user.id).catch(() => {}); 

  return { user, error: null };
}

/**
 * Require specific role for a route handler.
 */
export async function requireRole(allowedRoles: ('user' | 'admin')[]) {
  const auth = await requireAuth();
  if (auth.error) return auth;

  const { user } = auth;
  const supabase = createSupabaseServerClient();

  // Fetch profile to check role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single();

  if (error || !profile) {
     return { user, error: errorResponse("Profile not found", 404) };
  }

  // Cast role to string to check inclusion. 
  // Ideally 'profile.role' is typed, but Supabase query returns partial.
  const userRole = profile.role as 'user' | 'admin';

  if (!allowedRoles.includes(userRole)) {
    return { user, error: errorResponse("Forbidden: Insufficient permissions", 403, "FORBIDDEN") };
  }

  return { user, error: null };
}
