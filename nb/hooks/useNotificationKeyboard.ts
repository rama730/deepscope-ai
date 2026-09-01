"use client";

import { useEffect, useCallback } from "react";

/**
 * Options for notification keyboard hook
 */
interface UseNotificationKeyboardOptions {
  /** Whether notifications panel is currently open */
  isOpen: boolean;
  /** Function to toggle notifications panel */
  onToggle: () => void;
  /** Whether keyboard shortcuts are enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook to handle keyboard shortcuts for notifications panel
 * 
 * Registers Ctrl/Cmd+K and Ctrl/Cmd+N to toggle notifications.
 * Automatically prevents triggering when user is typing in inputs.
 * 
 * @param options - Configuration options
 * @example
 * ```tsx
 * useNotificationKeyboard({
 *   isOpen: showNotifications,
 *   onToggle: () => setShowNotifications(!showNotifications),
 *   enabled: true
 * });
 * ```
 */
export function useNotificationKeyboard({
  isOpen,
  onToggle,
  enabled = true,
}: UseNotificationKeyboardOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K or N to toggle notifications
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.key === 'n' || e.key === 'N')) {
        // Only if not in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onToggle();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onToggle]);
}
