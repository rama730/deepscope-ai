"use client";

import { useEffect, useCallback } from "react";

interface ShortcutActions {
  onNewTask?: () => void;
  onSearch?: () => void;
  onToggleChat?: () => void;
  onToggleFiles?: () => void;
  onToggleTasks?: () => void;
  onToggleDashboard?: () => void;
  onToggleSprints?: () => void;
  onToggleSettings?: () => void;
  onEscape?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onBulkSelect?: () => void;
  onSelectAll?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onRefresh?: () => void;
  onTabSwitch?: (index: number) => void; // For number key tab navigation
}

interface ShortcutConfig {
  enabled?: boolean;
  preventInInputs?: boolean;
}

/**
 * Hook for project-specific keyboard shortcuts
 * 
 * Registers keyboard shortcuts for project management features.
 * Automatically prevents shortcuts when user is typing in inputs.
 * 
 * @param actions - Object containing action handlers for shortcuts
 * @param config - Configuration options (enabled, preventInInputs)
 * @example
 * ```tsx
 * useProjectShortcuts({
 *   onNewTask: () => createTask(),
 *   onSearch: () => openSearch(),
 *   onSave: () => saveProject()
 * }, { enabled: true, preventInInputs: true });
 * ```
 */
export function useProjectShortcuts(
  actions: ShortcutActions,
  config: ShortcutConfig = {}
): void {
  const { enabled = true, preventInInputs = true } = config;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Check if we're in an input/textarea
      const target = e.target as HTMLElement;
      const isInput = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;

      if (preventInInputs && isInput) {
        // Only allow Escape in inputs
        if (e.key === "Escape" && actions.onEscape) {
          actions.onEscape();
          return;
        }
        // Allow Cmd/Ctrl+S in inputs
        if ((e.metaKey || e.ctrlKey) && e.key === "s" && actions.onSave) {
          e.preventDefault();
          actions.onSave();
          return;
        }
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      // Mod + Key combinations
      if (isMod) {
        switch (e.key.toLowerCase()) {
          case "k":
            e.preventDefault();
            actions.onSearch?.();
            break;
          case "s":
            e.preventDefault();
            actions.onSave?.();
            break;
          case "z":
            e.preventDefault();
            if (isShift) {
              actions.onRedo?.();
            } else {
              actions.onUndo?.();
            }
            break;
          case "a":
            if (actions.onSelectAll) {
              e.preventDefault();
              actions.onSelectAll();
            }
            break;
          case "d":
            if (actions.onDuplicate) {
              e.preventDefault();
              actions.onDuplicate();
            }
            break;
          case "r":
            if (actions.onRefresh) {
              e.preventDefault();
              actions.onRefresh();
            }
            break;
        }
        return;
      }

      // Number keys for tab navigation (1-9)
      const numKey = parseInt(e.key);
      if (!isNaN(numKey) && numKey >= 1 && numKey <= 9 && actions.onTabSwitch) {
        e.preventDefault();
        actions.onTabSwitch(numKey - 1); // Convert to 0-based index
        return;
      }

      // Single key shortcuts
      switch (e.key.toLowerCase()) {
        case "n":
          actions.onNewTask?.();
          break;
        case "/":
          e.preventDefault();
          actions.onSearch?.();
          break;
        case "c":
          actions.onToggleChat?.();
          break;
        case "f":
          actions.onToggleFiles?.();
          break;
        case "t":
          actions.onToggleTasks?.();
          break;
        case "d":
          actions.onToggleDashboard?.();
          break;
        case "s":
          actions.onToggleSprints?.();
          break;
        case "b":
          actions.onBulkSelect?.();
          break;
        case "e":
          actions.onEdit?.();
          break;
        case "escape":
          actions.onEscape?.();
          break;
        case "delete":
        case "backspace":
          if (actions.onDelete) {
            e.preventDefault();
            actions.onDelete();
          }
          break;
        case ",":
          actions.onToggleSettings?.();
          break;
      }
    },
    [enabled, preventInInputs, actions]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Keyboard shortcut display component
export function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-400">
      {children}
    </kbd>
  );
}

// Shortcuts help modal data
export const shortcutsList = [
  {
    category: "Navigation",
    shortcuts: [
      { keys: ["1-9"], description: "Switch to tab by number" },
      { keys: ["D"], description: "Go to Dashboard" },
      { keys: ["T"], description: "Go to Tasks" },
      { keys: ["F"], description: "Go to Files" },
      { keys: ["C"], description: "Go to Chat" },
      { keys: ["S"], description: "Go to Sprints" },
      { keys: [","], description: "Open Settings" },
    ],
  },
  {
    category: "Actions",
    shortcuts: [
      { keys: ["N"], description: "New Task" },
      { keys: ["/", "⌘", "K"], description: "Quick Search" },
      { keys: ["B"], description: "Toggle Bulk Select" },
      { keys: ["E"], description: "Edit Selected" },
      { keys: ["⌫"], description: "Delete Selected" },
    ],
  },
  {
    category: "General",
    shortcuts: [
      { keys: ["⌘", "S"], description: "Save" },
      { keys: ["⌘", "Z"], description: "Undo" },
      { keys: ["⌘", "⇧", "Z"], description: "Redo" },
      { keys: ["⌘", "A"], description: "Select All" },
      { keys: ["⌘", "R"], description: "Refresh" },
      { keys: ["Esc"], description: "Close/Cancel" },
    ],
  },
];

