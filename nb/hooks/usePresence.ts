"use client";

import { useEffect, useCallback, useRef } from "react";
import { MessagingService } from "@/lib/services/messaging/index";

/**
 * Hook to track and update user presence (last_active_at).
 * Updates presence on user activity (mouse movement, page visibility, etc.)
 */
export function usePresence(userId: string | null | undefined) {
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_THROTTLE = 30000; // Update at most once every 30 seconds

  const updatePresence = useCallback(async () => {
    if (!userId) return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_THROTTLE) {
      return; // Throttle updates
    }

    lastUpdateRef.current = now;
    await MessagingService.updatePresence();
  }, [userId]);

  // Update on mount
  useEffect(() => {
    if (userId) {
      updatePresence();
    }
  }, [userId, updatePresence]);

  // Update on user activity
  useEffect(() => {
    if (!userId) return;

    const handleActivity = () => {
      updatePresence();
    };

    // Throttle mouse movement
    let mouseMoveTimeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      clearTimeout(mouseMoveTimeout);
      mouseMoveTimeout = setTimeout(handleActivity, 5000); // Update 5s after last mouse move
    };

    // Update on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updatePresence();
      }
    };

    // Update on focus
    const handleFocus = () => {
      updatePresence();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Periodic update (every 2 minutes)
    updateIntervalRef.current = setInterval(updatePresence, 120000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      clearTimeout(mouseMoveTimeout);
    };
  }, [userId, updatePresence]);

  // Update on unmount (mark as offline)
  useEffect(() => {
    return () => {
      // Note: We don't mark as offline on unmount because the user might just be navigating
      // The last_active_at timestamp will naturally indicate when they were last active
    };
  }, []);
}

/**
 * Check if a user is online based on last_active_at timestamp.
 * A user is considered online if they were active within the last 5 minutes.
 */
export function isUserOnline(lastActiveAt: string | null | undefined): boolean {
  if (!lastActiveAt) return false;
  const lastActive = new Date(lastActiveAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes < 5;
}
