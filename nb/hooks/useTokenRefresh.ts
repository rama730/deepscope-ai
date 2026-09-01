"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureValidSession } from "@/lib/auth/session";

/**
 * Hook to automatically refresh auth tokens before expiration
 * 
 * Checks session validity every 5 minutes and refreshes if needed
 * Automatically cleans up on unmount or sign out
 * 
 * @example
 * ```tsx
 * useTokenRefresh(); // Call in root component or layout
 * ```
 */
export function useTokenRefresh() {
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // Check and refresh session on mount
    ensureValidSession().catch(() => {
      // Silently fail - user will be redirected to login if session is invalid
    });

    // Set up interval to check session every 5 minutes
    const interval = setInterval(() => {
      ensureValidSession().catch(() => {
        // Silently fail
      });
    }, 5 * 60 * 1000); // 5 minutes

    // Also listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") {
        // Token was refreshed successfully
      } else if (event === "SIGNED_OUT" || (event === "USER_UPDATED" && !session)) {
        // User signed out or session expired
        clearInterval(interval);
      }
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [supabase]);
}
