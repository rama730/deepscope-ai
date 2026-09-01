"use client";

import { memo, useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Command,
  Plus,
  FileUp,
  MessageCircle,
  BarChart3,
  Settings,
  User,
  Search,
  Zap,
  ArrowRight,
  Keyboard,
  Clock,
  Star,
  Users,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  shortcut?: string;
  color: string;
  category: "create" | "navigate" | "settings" | "recent";
  onClick: () => void;
}

interface GroupedActions {
  recent: QuickAction[];
  create: QuickAction[];
  navigate: QuickAction[];
  settings: QuickAction[];
}

interface CommandPaletteProps {
  actions?: QuickAction[];
  recentActions?: string[];
  onCreateProject?: () => void;
  onCreateTask?: () => void;
  onUploadFile?: () => void;
  onOpenMessages?: () => void;
  onOpenAnalytics?: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onOpenCalendar?: () => void;
  onOpenTeam?: () => void;
  className?: string;
}

const defaultActions: Omit<QuickAction, "onClick">[] = [
  {
    id: "create-project",
    label: "New Project",
    description: "Start a new project",
    icon: Plus,
    shortcut: "⌘ P",
    color: "text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30",
    category: "create",
  },
  {
    id: "create-task",
    label: "New Task",
    description: "Create a quick task",
    icon: Zap,
    shortcut: "⌘ T",
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
    category: "create",
  },
  {
    id: "upload-file",
    label: "Upload File",
    description: "Upload a new file",
    icon: FileUp,
    shortcut: "⌘ U",
    color: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
    category: "create",
  },
  {
    id: "open-messages",
    label: "Messages",
    description: "Open your messages",
    icon: MessageCircle,
    shortcut: "⌘ M",
    color: "text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30",
    category: "navigate",
  },
  {
    id: "open-analytics",
    label: "Analytics",
    description: "View your analytics",
    icon: BarChart3,
    shortcut: "⌘ A",
    color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
    category: "navigate",
  },
  {
    id: "open-calendar",
    label: "Calendar",
    description: "View your schedule",
    icon: Calendar,
    color: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30",
    category: "navigate",
  },
  {
    id: "open-team",
    label: "Team",
    description: "Manage your team",
    icon: Users,
    color: "text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30",
    category: "navigate",
  },
  {
    id: "open-settings",
    label: "Settings",
    description: "App settings",
    icon: Settings,
    shortcut: "⌘ ,",
    color: "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800",
    category: "settings",
  },
  {
    id: "open-profile",
    label: "Profile",
    description: "Edit your profile",
    icon: User,
    color: "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800",
    category: "settings",
  },
];

function CommandPalette({
  actions,
  recentActions = [],
  onCreateProject,
  onCreateTask,
  onUploadFile,
  onOpenMessages,
  onOpenAnalytics,
  onOpenSettings,
  onOpenProfile,
  onOpenCalendar,
  onOpenTeam,
  className,
}: CommandPaletteProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handlers: Record<string, (() => void) | undefined> = {
    "create-project": onCreateProject,
    "create-task": onCreateTask,
    "upload-file": onUploadFile,
    "open-messages": onOpenMessages,
    "open-analytics": onOpenAnalytics,
    "open-settings": onOpenSettings,
    "open-profile": onOpenProfile,
    "open-calendar": onOpenCalendar,
    "open-team": onOpenTeam,
  };

  const allActions: QuickAction[] = useMemo(() => {
    if (actions) return actions;
    return defaultActions.map((action) => ({
      ...action,
      onClick: handlers[action.id] || (() => { }),
    }));
  }, [actions, handlers]);

  const filteredActions = useMemo(() => {
    if (!searchQuery) return allActions;
    const query = searchQuery.toLowerCase();
    return allActions.filter(
      (action) =>
        action.label.toLowerCase().includes(query) ||
        action.description?.toLowerCase().includes(query)
    );
  }, [allActions, searchQuery]);

  // Group actions by category
  const groupedActions = useMemo<GroupedActions>(() => {
    const groups: GroupedActions = {
      recent: [],
      create: [],
      navigate: [],
      settings: [],
    };

    // Add recent actions first
    if (!searchQuery && recentActions.length > 0) {
      recentActions.slice(0, 3).forEach((id) => {
        const action = allActions.find((a) => a.id === id);
        if (action) groups.recent.push({ ...action, category: "recent" });
      });
    }

    filteredActions.forEach((action) => {
      if (!groups.recent.some((a) => a.id === action.id)) {
        groups[action.category].push(action);
      }
    });

    return groups;
  }, [filteredActions, recentActions, searchQuery, allActions]);

  const flatActions = useMemo(() => {
    return [
      ...groupedActions.recent,
      ...groupedActions.create,
      ...groupedActions.navigate,
      ...groupedActions.settings,
    ];
  }, [groupedActions]);

  // Keyboard navigation
  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, flatActions.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatActions[selectedIndex]) {
            flatActions[selectedIndex].onClick();
            setIsExpanded(false);
            setSearchQuery("");
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsExpanded(false);
          setSearchQuery("");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, flatActions, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const executeAction = useCallback(
    (action: QuickAction) => {
      action.onClick();
      setIsExpanded(false);
      setSearchQuery("");
    },
    []
  );

  const categoryLabels: Record<string, string> = {
    recent: "Recent",
    create: "Create",
    navigate: "Navigate",
    settings: "Settings",
  };

  return (
    <div className={cn("relative", className)}>
      {/* Collapsed trigger */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "w-full flex items-center gap-3 p-4 rounded-2xl",
          "bg-gradient-to-r from-zinc-50 to-zinc-100",
          "dark:from-zinc-800 dark:to-zinc-900",
          "border border-zinc-200 dark:border-zinc-700",
          "hover:border-indigo-300 dark:hover:border-indigo-700",
          "hover:shadow-lg hover:shadow-indigo-500/5",
          "transition-all duration-200"
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <Command className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Quick Actions
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Press ⌘K or click to open
          </p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700">
          <Keyboard className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">⌘K</span>
        </div>
      </motion.button>

      {/* Expanded command palette */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40"
            />

            {/* Command palette panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3 }}
              className={cn(
                "absolute top-0 left-0 right-0 z-50",
                "bg-white dark:bg-zinc-900",
                "rounded-2xl border border-zinc-200 dark:border-zinc-700",
                "shadow-2xl shadow-zinc-400/20 dark:shadow-zinc-900/50",
                "overflow-hidden"
              )}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 p-4 border-b border-zinc-100 dark:border-zinc-800">
                <Search className="w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search actions..."
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                />
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  ESC
                </button>
              </div>

              {/* Actions list */}
              <div className="max-h-80 overflow-y-auto p-2">
                {Object.entries(groupedActions).map(([category, categoryActions]) => {
                  if (categoryActions.length === 0) return null;

                  return (
                    <div key={category} className="mb-2">
                      <p className="px-3 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        {category === "recent" && <Clock className="w-3 h-3 inline mr-1" />}
                        {category === "recent" && <Star className="w-3 h-3 inline mr-1 text-amber-500" />}
                        {categoryLabels[category]}
                      </p>
                      {categoryActions.map((action: QuickAction) => {
                        const globalIndex = flatActions.findIndex((a) => a.id === action.id);
                        const isSelected = globalIndex === selectedIndex;
                        const Icon = action.icon;

                        return (
                          <motion.button
                            key={action.id}
                            onClick={() => executeAction(action)}
                            whileHover={{ x: 4 }}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                              isSelected
                                ? "bg-indigo-50 dark:bg-indigo-900/20"
                                : "hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
                            )}
                          >
                            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", action.color)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {action.label}
                              </p>
                              {action.description && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {action.description}
                                </p>
                              )}
                            </div>
                            {action.shortcut && (
                              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                                {action.shortcut}
                              </span>
                            )}
                            <ArrowRight
                              className={cn(
                                "w-4 h-4 text-zinc-300 dark:text-zinc-600 transition-opacity",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </motion.button>
                        );
                      })}
                    </div>
                  );
                })}

                {filteredActions.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No actions found</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">↵</kbd>
                    Select
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(CommandPalette);

