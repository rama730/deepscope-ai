"use client";

import { useEffect, useCallback } from "react";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
    enabled?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
                target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
                if (shortcut.enabled === false) continue;

        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
                const ctrlMatch = shortcut.ctrlKey === undefined ? true : (shortcut.ctrlKey === (e.ctrlKey || e.metaKey));
                const metaMatch = shortcut.metaKey === undefined ? true : (shortcut.metaKey === e.metaKey);
                const shiftMatch = shortcut.shiftKey === undefined ? true : (shortcut.shiftKey === e.shiftKey);
                const altMatch = shortcut.altKey === undefined ? true : (shortcut.altKey === e.altKey);

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
            e.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}
