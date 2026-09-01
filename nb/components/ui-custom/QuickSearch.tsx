"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  X,
  FileText,
  CheckSquare,
  MessageCircle,
  Folder,
  User,
  Clock,
  ArrowRight,
  Command,
  Hash,
  Paperclip,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MessagingService } from "@/lib/services/messaging/index";
import { updateTasksAction } from "@/app/(main)/projects/[id]/actions";

interface SearchResult {
  id: string;
  type: "task" | "file" | "update" | "sprint" | "message" | "project" | "member";
  title: string;
  subtitle?: string;
  projectId?: string;
  projectName?: string;
  url?: string;
  action?: () => void | Promise<void>;
}

interface QuickSearchProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string; // Optional - if provided, search within project
  context?: "explorer" | "people" | "hub" | "project" | "messages" | "default"; // Search context
  initialQuery?: string; // Initial search query
}

const resultIcons = {
  task: CheckSquare,
  file: FileText,
  update: FileText,
  sprint: Hash,
  message: MessageCircle,
  project: Folder,
  member: User,
};

const resultColors = {
  task: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
  file: "text-pink-500 bg-pink-100 dark:bg-pink-900/30",
  update: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  sprint: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30",
  message: "text-green-500 bg-green-100 dark:bg-green-900/30",
  project: "text-purple-500 bg-purple-100 dark:bg-purple-900/30",
  member: "text-orange-500 bg-orange-100 dark:bg-orange-900/30",
};

export default function QuickSearch({ isOpen, onClose, projectId, context = "default", initialQuery = "" }: QuickSearchProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [messageFilters, setMessageFilters] = useState<{
    conversationId?: string;
    senderId?: string;
    dateFrom?: string;
    dateTo?: string;
    hasAttachments?: boolean;
    hasMentions?: boolean;
  }>({});
  const [showMessageFilters, setShowMessageFilters] = useState(false);

  const { user } = useAuth();

  const selectedTaskId = searchParams?.get("task") || null;
  const [activeSprint, setActiveSprint] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("project_sprints")
        .select("id, name")
        .eq("project_id", projectId)
        .eq("status", "active")
        .maybeSingle();
      if (cancelled) return;
      if (data?.id) setActiveSprint({ id: data.id, name: data.name });
      else setActiveSprint(null);
    })();
    return () => { cancelled = true; };
  }, [isOpen, projectId, supabase]);

  const taskActionCommands = useMemo((): SearchResult[] => {
    if (!projectId) return [];
    if (!selectedTaskId) return [];
    if (!user?.id) return [];
    const taskId = selectedTaskId;
    const base: SearchResult[] = [
      {
        id: `cmd-task-open-${taskId}`,
        type: "task",
        title: "Open selected task",
        subtitle: "Command",
        url: `/projects/${projectId}?tab=tasks&task=${taskId}`,
      },
      {
        id: `cmd-task-assign-${taskId}`,
        type: "task",
        title: "Assign selected task to me",
        subtitle: "Command",
        action: async () => {
          await updateTasksAction(projectId, [taskId], { assigned_to: user.id });
        },
      },
      {
        id: `cmd-task-start-${taskId}`,
        type: "task",
        title: "Start selected task",
        subtitle: "Command",
        action: async () => {
          await updateTasksAction(projectId, [taskId], { status: "in_progress" });
        },
      },
      {
        id: `cmd-task-done-${taskId}`,
        type: "task",
        title: "Mark selected task done",
        subtitle: "Command",
        action: async () => {
          await updateTasksAction(projectId, [taskId], { status: "done" });
        },
      },
      {
        id: `cmd-task-backlog-${taskId}`,
        type: "task",
        title: "Move selected task to backlog",
        subtitle: "Command",
        action: async () => {
          await updateTasksAction(projectId, [taskId], { sprint_id: null });
        },
      },
    ];

    if (activeSprint?.id) {
      base.splice(4, 0, {
        id: `cmd-task-move-active-sprint-${taskId}`,
        type: "sprint",
        title: `Move selected task to active sprint (${activeSprint.name})`,
        subtitle: "Command",
        action: async () => {
          await updateTasksAction(projectId, [taskId], { sprint_id: activeSprint.id });
        },
      });
    }

    return base;
  }, [projectId, selectedTaskId, user?.id, activeSprint?.id, activeSprint?.name]);

  const projectQuickActions = useMemo(() => {
    if (!projectId) return [];
    const base = `/projects/${projectId}`;
    return [
      { id: "qa-create-task", title: "Create task", subtitle: "Tasks", url: `${base}?tab=tasks&newTask=1`, type: "task" as const },
      { id: "qa-upload-file", title: "Upload file", subtitle: "Files", url: `${base}?tab=files&upload=1`, type: "file" as const },
      { id: "qa-new-update", title: "New update", subtitle: "Updates", url: `${base}?tab=updates&newUpdate=1`, type: "update" as const },
      { id: "qa-create-sprint", title: "Create sprint", subtitle: "Sprints", url: `${base}?tab=sprints&newSprint=1`, type: "sprint" as const },
      { id: "qa-jump-tasks", title: "Go to Tasks", subtitle: "Jump", url: `${base}?tab=tasks`, type: "task" as const },
      { id: "qa-jump-files", title: "Go to Files", subtitle: "Jump", url: `${base}?tab=files`, type: "file" as const },
      { id: "qa-jump-updates", title: "Go to Updates", subtitle: "Jump", url: `${base}?tab=updates`, type: "update" as const },
      { id: "qa-jump-sprints", title: "Go to Sprints", subtitle: "Jump", url: `${base}?tab=sprints`, type: "sprint" as const },
    ];
  }, [projectId]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // Load recent searches from localStorage
      const recent = localStorage.getItem("recentSearches");
      if (recent) setRecentSearches(JSON.parse(recent));
      // Set initial query if provided
      if (initialQuery) {
        setQuery(initialQuery);
      }
      // Show command palette actions immediately when blank.
      if (!initialQuery) {
        const baseResults = [...taskActionCommands, ...projectQuickActions] as any;
        setResults(baseResults);
        setSelectedIndex(0);
      }
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setMessageFilters({});
      setShowMessageFilters(false);
    }
  }, [isOpen, initialQuery]);

  // Search function
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        // Command-palette behavior: when opened inside a project, show quick actions.
        setResults([...taskActionCommands, ...projectQuickActions] as any);
        setSelectedIndex(0);
        return;
      }

      setLoading(true);
      const searchResults: SearchResult[] = [];
      const searchTerm = `%${searchQuery.trim()}%`;

      try {
        // Search tasks
        let tasksQuery = supabase
          .from("project_tasks")
          .select(`
            id, title, status,
            project:projects(id, title, slug)
          `)
          .ilike("title", searchTerm)
          .limit(5);

        if (projectId) {
          tasksQuery = tasksQuery.eq("project_id", projectId);
        }

        const { data: tasks } = await tasksQuery;
        if (tasks) {
          tasks.forEach((task: any) => {
            searchResults.push({
              id: task.id,
              type: "task",
              title: task.title,
              subtitle: `Task • ${task.status.replace("_", " ")}`,
              projectId: task.project?.id,
              projectName: task.project?.title,
              url: `/projects/${(task.project as any)?.slug || task.project?.id}?tab=tasks&task=${task.id}`,
            });
          });
        }

        // Search files
        let filesQuery = supabase
          .from("project_files")
          .select(`
            id, name,
            project:projects(id, title, slug)
          `)
          .ilike("name", searchTerm)
          .limit(5);

        if (projectId) {
          filesQuery = filesQuery.eq("project_id", projectId);
        }

        const { data: files } = await filesQuery;
        if (files) {
          files.forEach((file: any) => {
            searchResults.push({
              id: file.id,
              type: "file",
              title: file.name,
              subtitle: "File",
              projectId: file.project?.id,
              projectName: file.project?.title,
              url: `/projects/${(file.project as any)?.slug || file.project?.id}?tab=files&file=${file.id}`,
            });
          });
        }

        // Search projects (only if not project-specific search)
        if (!projectId) {
          const { data: projects } = await supabase
            .from("projects")
            .select("id, title, description, slug")
            .ilike("title", searchTerm)
            .limit(5);

          if (projects) {
            projects.forEach((project: any) => {
              searchResults.push({
                id: project.id,
                type: "project",
                title: project.title,
                subtitle: project.description?.substring(0, 50) || "Project",
                url: `/projects/${project.slug || project.id}`,
              });
            });
          }
        }

        // Search updates
        let updatesQuery = supabase
          .from("project_updates")
          .select(`
            id, title, update_type,
            project:projects(id, title, slug)
          `)
          .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
          .limit(5);

        if (projectId) {
          updatesQuery = updatesQuery.eq("project_id", projectId);
        }

        const { data: updates } = await updatesQuery;
        if (updates) {
          updates.forEach((u: any) => {
            searchResults.push({
              id: u.id,
              type: "update",
              title: u.title,
              subtitle: `Update • ${(u.update_type || "other").replace("_", " ")}`,
              projectId: u.project?.id,
              projectName: u.project?.title,
              url: `/projects/${(u.project as any)?.slug || u.project?.id}?tab=updates&update=${u.id}`,
            });
          });
        }

        // Search sprints (project-scoped only)
        if (projectId) {
          const { data: sprints } = await supabase
            .from("project_sprints")
            .select("id, name, status")
            .eq("project_id", projectId)
            .ilike("name", searchTerm)
            .limit(5);

          if (sprints) {
            sprints.forEach((s: any) => {
              searchResults.push({
                id: s.id,
                type: "sprint",
                title: s.name,
                subtitle: `Sprint • ${s.status}`,
                projectId,
                url: `/projects/${projectId}?tab=sprints`,
              });
            });
          }
        }

        // Search messages - use MessagingService if context is messages, otherwise search project_chat_messages
        if (context === "messages" && user) {
          try {
            const messageResults = await MessagingService.searchMessages(
              user.id,
              searchQuery,
              messageFilters.conversationId ? {
                conversationId: messageFilters.conversationId,
                senderId: messageFilters.senderId,
                dateFrom: messageFilters.dateFrom,
                dateTo: messageFilters.dateTo,
                hasAttachments: messageFilters.hasAttachments,
                hasMentions: messageFilters.hasMentions,
                limit: 10
              } : undefined
            );

            messageResults.forEach((msg: any) => {
              searchResults.push({
                id: msg.id,
                type: "message",
                title: msg.content.substring(0, 60) + (msg.content.length > 60 ? "..." : ""),
                subtitle: `${msg.conversation_type === 'group' ? 'Group' : msg.conversation_type === 'project' ? 'Project' : 'Direct'} • ${msg.sender_name}`,
                projectId: msg.conversation_type === 'project' ? msg.conversation_id : undefined,
                projectName: msg.conversation_name || undefined,
                url: `/messages?conversation=${msg.conversation_id}&message=${msg.id}`,
              });
            });
          } catch (error) {
            console.error("Error searching messages:", error);
          }
        } else {
          // Search project chat messages (legacy)
          let messagesQuery = supabase
            .from("project_chat_messages")
            .select(`
              id, content,
              project:projects(id, title)
            `)
            .ilike("content", searchTerm)
            .limit(5);

          if (projectId) {
            messagesQuery = messagesQuery.eq("project_id", projectId);
          }

          const { data: messages } = await messagesQuery;
          if (messages) {
            messages.forEach((message: any) => {
              searchResults.push({
                id: message.id,
                type: "message",
                title: message.content.substring(0, 60) + (message.content.length > 60 ? "..." : ""),
                subtitle: "Chat message",
                projectId: message.project?.id,
                projectName: message.project?.title,
                url: `/projects/${message.project?.id}?tab=chat`,
              });
            });
          }
        }

        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    },
    [supabase, projectId, projectQuickActions, taskActionCommands]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            void navigateToResult(results[selectedIndex]);
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    },
    [results, selectedIndex, onClose]
  );

  // Navigate to result
  const navigateToResult = async (result: SearchResult) => {
    // Save to recent searches (skip empty command selections)
    const q = query.trim();
    if (q) {
      const newRecent = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem("recentSearches", JSON.stringify(newRecent));
    }

    try {
      if (result.action) {
        await result.action();
      } else if (result.url) {
        router.push(result.url);
      }
    } finally {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Search Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-2xl mx-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <Search className="w-5 h-5 text-zinc-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  context === "messages" ? "Search messages..." :
                  projectId ? "Search in this project..." : 
                  "Search tasks, files, projects..."}
                className="flex-1 bg-transparent text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 rounded hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              )}
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-500">
                <span>esc</span>
              </div>
              {context === "messages" && (
                <button
                  onClick={() => setShowMessageFilters(!showMessageFilters)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 transition-colors"
                  title="Filter messages"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>
              )}
            </div>

            {/* Message Filters */}
            {context === "messages" && showMessageFilters && (
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 space-y-2">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Filter by:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Date From</label>
                    <input
                      type="date"
                      value={messageFilters.dateFrom || ""}
                      onChange={(e) => setMessageFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                      className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Date To</label>
                    <input
                      type="date"
                      value={messageFilters.dateTo || ""}
                      onChange={(e) => setMessageFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
                      className="w-full px-2 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      checked={messageFilters.hasAttachments === true}
                      onChange={(e) => setMessageFilters(prev => ({ ...prev, hasAttachments: e.target.checked ? true : undefined }))}
                      className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-600"
                    />
                    <Paperclip className="w-3 h-3" />
                    Has attachments
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      checked={messageFilters.hasMentions === true}
                      onChange={(e) => setMessageFilters(prev => ({ ...prev, hasMentions: e.target.checked ? true : undefined }))}
                      className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-600"
                    />
                    <Hash className="w-3 h-3" />
                    Has mentions
                  </label>
                </div>
              </div>
            )}

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : query && results.length === 0 ? (
                <div className="py-8 text-center">
                  <Search className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm text-zinc-500">No results found for "{query}"</p>
                </div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  {results.map((result, index) => {
                    const Icon = resultIcons[result.type];
                    const colorClass = resultColors[result.type];

                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => void navigateToResult(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          index === selectedIndex
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : "hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {result.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>{result.subtitle}</span>
                            {result.projectName && (
                              <>
                                <span>•</span>
                                <span>{result.projectName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-400" />
                      </button>
                    );
                  })}
                </div>
              ) : !query && recentSearches.length > 0 ? (
                <div className="py-2">
                  <div className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Recent Searches
                  </div>
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(search)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    >
                      <Clock className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{search}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Search className="w-10 h-10 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm text-zinc-500">Start typing to search...</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono">↓</kbd>
                  <span>to navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono">↵</kbd>
                  <span>to select</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Command className="w-3 h-3" />
                <span>K to open</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for keyboard shortcut
export function useQuickSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      // / to open search (when not in input)
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsOpen(true);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { isOpen, setIsOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}

