import { useState, useEffect, useMemo, useCallback, useRef, useDeferredValue } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import TaskFilters from "@/components/tasks/TaskFilters";
import TasksTable from "@/components/projects/TasksTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ClipboardList, ListOrdered, Save, Users, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { projectKeys } from "@/lib/queryKeys";
import { perfTracker } from "@/lib/performance/measure";
import { useToast } from "@/components/ui-custom/Toast";

import { Virtuoso } from "react-virtuoso";
import { getTaskPermissions, getRoleBadge } from "@/lib/taskPermissions";
import { TabInfoHelp } from "@/components/projects/TabInfoHelp";
import { useProjectTasks } from "@/hooks/queries/useProjectTasks";

import { updateTasksAction, moveTasksToBacklogAction } from "@/app/(main)/projects/[id]/actions";

import CreateTaskModal from "@/components/projects/CreateTaskModal";
import TaskDetailPanel from "@/components/projects/TaskDetailPanel";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { useTaskStatusFlow } from "@/lib/tasks/useTaskStatusFlow";

export interface Task {
  id: string;
  project_id: string;
  sprint_id?: string | null;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  story_points?: number | null;
  backlog_order?: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  assigned_profile?: {
    full_name: string | null;
    username: string | null;
  };
}

export interface Member {
  user_id: string;
  profiles: {
    full_name: string | null;
    username: string | null;
  };
}

interface TasksTabProps {
  projectId: string;
  isOwnerOrMember: boolean;
  projectCreatorId?: string;
  initialTasks?: Task[];
  totalCount?: number;
  initialPage?: number;
  initialLimit?: number;
}

export default function TasksTab({
  projectId,
  isOwnerOrMember,
  projectCreatorId,
  initialTasks = [],
  totalCount: initialTotalCount = 0,
}: TasksTabProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { moveNext: moveTaskNext } = useTaskStatusFlow(projectId);

  // Filters
  const taskFilters = useMemo(() => {
    const params: any = {};
    searchParams?.forEach((value, key) => {
      if (key.startsWith("task_") || ["status", "priority", "sprint", "page", "limit", "archived"].includes(key)) {
        params[key] = value;
      }
    });
    return {
      ...params,
      page: parseInt(params.page || "1"),
      limit: parseInt(params.limit || "10")
    };
  }, [searchParams]);

  // Data Fetching
  const { data: tasksRes, isLoading: tasksLoading } = useProjectTasks(
    projectId,
    taskFilters,
    { data: initialTasks, count: initialTotalCount } // Use initial data if provided (e.g. from SSR cache dehyration if we had it, or just empty)
  );

  // Local state for tasks to support optimistic updates
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Sync local tasks with fetched data (or initial)
  useEffect(() => {
    if (tasksRes?.data) {
      setTasks(tasksRes.data);
    }
  }, [tasksRes?.data]);

  const totalCount = tasksRes?.count || initialTotalCount;

  const tasksRef = useRef<Task[]>(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const urlSearchQuery = (searchParams.get("search") || "").trim();
  const deferredSearchQuery = useDeferredValue(urlSearchQuery);
  const perfEndedRef = useRef(false);

  // Sort State from URL
  const sortField = searchParams.get('task_sort') || 'created_at';
  const sortOrder = (searchParams.get('task_order') as 'asc' | 'desc') || 'desc';

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false); // Default false as data is passed
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Bulk selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [sprints, setSprints] = useState<{ id: string; name: string; status?: string }[]>([]);
  const sprintFilter = searchParams.get("sprint") || "all"; // all | backlog | <sprint_uuid>
  const showArchived = searchParams.get("archived") === "1" || searchParams.get("archived") === "true";

  // Focus lists (high signal)
  const [myFocusTasks, setMyFocusTasks] = useState<Task[]>([]);
  const [needsOwnerTasks, setNeedsOwnerTasks] = useState<Task[]>([]);
  const [claimLoading, setClaimLoading] = useState<Record<string, boolean>>({});

  // Compact cards: expand automatically when items appear, but allow manual collapse.
  const [myFocusExpanded, setMyFocusExpanded] = useState(false);
  const [needsOwnerExpanded, setNeedsOwnerExpanded] = useState(false);
  const myFocusAutoExpandRef = useRef(true);
  const needsOwnerAutoExpandRef = useRef(true);

  // Saved views (local)
  const [savedViews, setSavedViews] = useState<Array<{ id: string; name: string; query: string }>>([]);

  // Backlog reorder
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [backlogAll, setBacklogAll] = useState<Task[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  // Command palette deep-link: ?tab=tasks&newTask=1 opens the Create Task modal.
  useEffect(() => {
    if (searchParams.get("newTask") !== "1") return;
    setShowCreateModal(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("newTask");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // End the "first render" timer once the Tasks tab actually mounts and paints.
  useEffect(() => {
    if (perfEndedRef.current) return;
    perfEndedRef.current = true;
    requestAnimationFrame(() => {
      perfTracker.end("project-tasks-first-render", { projectId, taskCount: initialTasks.length, totalCount });
    });
  }, [projectId, initialTasks.length, totalCount]);

  // Keep focus lists / backlog panels in sync with realtime-driven task changes
  useEffect(() => {
    if (!projectId || !currentUserId) return;
    loadFocusTasks();
    if (isReorderMode && sprintFilter === "backlog") {
      loadBacklogAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, currentUserId, initialTasks, isReorderMode, sprintFilter, showArchived]);

  // Saved views (localStorage)
  useEffect(() => {
    if (!projectId) return;
    // client-only
    loadSavedViews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Load focus tasks once we know who the user is
  useEffect(() => {
    if (!projectId || !currentUserId) return;
    loadFocusTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, currentUserId]);

  // Auto-expand compact cards when they get items; collapse when empty.
  useEffect(() => {
    const hasItems = myFocusTasks.length > 0;
    if (!hasItems) {
      setMyFocusExpanded(false);
      myFocusAutoExpandRef.current = true;
      return;
    }
    if (myFocusAutoExpandRef.current) {
      setMyFocusExpanded(true);
      myFocusAutoExpandRef.current = false;
    }
  }, [myFocusTasks.length]);

  useEffect(() => {
    const hasItems = needsOwnerTasks.length > 0;
    if (!hasItems) {
      setNeedsOwnerExpanded(false);
      needsOwnerAutoExpandRef.current = true;
      return;
    }
    if (needsOwnerAutoExpandRef.current) {
      setNeedsOwnerExpanded(true);
      needsOwnerAutoExpandRef.current = false;
    }
  }, [needsOwnerTasks.length]);

  // Initialization
  useEffect(() => {
    if (projectId) {
      loadCurrentUser();
      loadMembers();
      loadSprints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, projectCreatorId]);

  async function loadCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  }

  // Loaders
  const loadTasks = useCallback(() => {
    if (!projectId) return;
    // Avoid full route refresh; let TanStack Query refetch the relevant task queries.
    queryClient.invalidateQueries({ queryKey: [...projectKeys.detail(projectId), "tasks"] });
  }, [projectId, queryClient]);

  async function loadMembers() {
    // Some deployments use project_collaborators instead of project_members.
    // Try project_members first; fall back if the relation doesn't exist.
    const membersRes = await supabase
      .from("project_members")
      .select(`
        user_id,
        profiles:user_id (
          full_name,
          username
        )
      `)
      .eq("project_id", projectId);

    let loadedMembers: Member[] = [];

    if (!membersRes.error && membersRes.data) {
      loadedMembers = (membersRes.data as any[]).map(item => ({
        user_id: item.user_id,
        profiles: item.profiles
      }));
    } else {
      // Fallback: project_collaborators
      const collabRes = await supabase
        .from("project_collaborators")
        .select(`
          user_id,
          profiles:user_id (
            full_name,
            username
          )
        `)
        .eq("project_id", projectId);

      if (collabRes.data) {
        loadedMembers = (collabRes.data as any[]).map(item => ({
          user_id: item.user_id,
          profiles: item.profiles
        }));
      }
    }

    // Ensure creator is included in members list (if not already present)
    if (projectCreatorId) {
      const creatorExists = loadedMembers.some(m => m.user_id === projectCreatorId);
      if (!creatorExists) {
        // Fetch creator profile
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", projectCreatorId)
          .single();

        if (creatorProfile) {
          loadedMembers.unshift({
            user_id: projectCreatorId,
            profiles: {
              full_name: creatorProfile.full_name,
              username: creatorProfile.username
            }
          });
        }
      }
    }

    setMembers(loadedMembers);
  }

  async function loadSprints() {
    const { data } = await supabase
      .from("project_sprints")
      .select("id, name, status")
      .eq("project_id", projectId)
      .order("start_date", { ascending: false });
    setSprints((data || []) as any);
  }

  function loadSavedViews() {
    try {
      const raw = localStorage.getItem(`nb.taskViews.${projectId}`);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setSavedViews(parsed);
    } catch {
      // ignore
    }
  }

  function persistSavedViews(next: Array<{ id: string; name: string; query: string }>) {
    setSavedViews(next);
    try {
      localStorage.setItem(`nb.taskViews.${projectId}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  async function loadFocusTasks() {
    if (!projectId) return;
    if (!currentUserId) return;

    const baseSelect = `
      id, project_id, sprint_id, title, description, status, priority, assigned_to, created_by, due_date, story_points, backlog_order, created_at, started_at, completed_at,
      assigned_profile:profiles!project_tasks_assigned_to_fkey(full_name, username)
    `;

    const [myRes, needRes] = await Promise.all([
      supabase
        .from("project_tasks")
        .select(baseSelect)
        .eq("project_id", projectId)
        .eq("is_deleted", showArchived ? (true as any) : (false as any))
        .eq("assigned_to", currentUserId)
        .neq("status", "done")
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("project_tasks")
        .select(baseSelect)
        .eq("project_id", projectId)
        .eq("is_deleted", showArchived ? (true as any) : (false as any))
        .is("assigned_to", null)
        .neq("status", "done")
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

    const normalize = (rows: any[] | null | undefined) =>
      (rows || []).map((t: any) => ({
        ...t,
        assigned_profile: Array.isArray(t.assigned_profile) ? t.assigned_profile[0] : t.assigned_profile,
      }));

    setMyFocusTasks(normalize(myRes.data as any));
    setNeedsOwnerTasks(normalize(needRes.data as any));
  }

  async function loadBacklogAll() {
    if (!projectId) return;
    const { data } = await supabase
      .from("project_tasks")
      .select("id, project_id, sprint_id, title, description, status, priority, assigned_to, created_by, due_date, story_points, backlog_order, created_at, started_at, completed_at")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .is("sprint_id", null)
      .order("backlog_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(500);
    setBacklogAll((data || []) as any);
  }

  // Sorting
  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortField === field) {
      params.set('task_order', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('task_sort', field);
      params.set('task_order', 'desc');
    }
    router.push(`?${params.toString()}`);
  };

  // Bulk Selection
  const toggleTaskSelection = (taskId: string) => {
    const newSet = new Set(selectedTaskIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedTaskIds(newSet);
  };

  const applySprintFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("sprint");
    else params.set("sprint", value);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const toggleArchived = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (showArchived) params.delete("archived");
    else params.set("archived", "1");
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const saveCurrentView = () => {
    const name = prompt("Name this view (e.g., My urgent tasks):");
    if (!name) return;
    const params = new URLSearchParams(searchParams.toString());
    // Don't persist pagination controls in views
    params.delete("page");
    params.delete("limit");
    const query = params.toString();
    const next = [
      ...savedViews,
      { id: crypto.randomUUID(), name: name.trim(), query },
    ];
    persistSavedViews(next);
  };

  const deleteView = (id: string) => {
    persistSavedViews(savedViews.filter((v) => v.id !== id));
  };

  const applyView = (query: string) => {
    router.push(`?${query}`);
  };

  const applyBulk = async (updates: Record<string, any>) => {
    const ids = Array.from(selectedTaskIds);
    if (ids.length === 0) return;

    const result = await updateTasksAction(projectId, ids, updates);

    if (!result.success) {
      console.error("Bulk update error:", result.error);
      alert("Failed to apply bulk action.");
      return;
    }

    // loadTasks(); // No longer needed as we have RT and revalidation
    setSelectedTaskIds(new Set());
  };

  const moveSelectedToBacklog = async () => {
    const ids = Array.from(selectedTaskIds);
    if (ids.length === 0) return;

    const result = await moveTasksToBacklogAction(projectId, ids);

    if (!result.success) {
      console.error("Move to backlog error:", result.error);
      alert("Failed to move tasks to backlog.");
    }

    setSelectedTaskIds(new Set());
  };

  const moveSelectedToSprint = async (sprintId: string) => {
    const ids = Array.from(selectedTaskIds);
    if (ids.length === 0) return;

    const result = await updateTasksAction(projectId, ids, { sprint_id: sprintId });

    if (!result.success) {
      console.error("Bulk move sprint error:", result.error);
      alert("Failed to move tasks to sprint.");
      return;
    }

    setSelectedTaskIds(new Set());
  };



  const hasExplicitSort = !!searchParams.get("task_sort");

  // Memoized filtered tasks with search
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Sprint filter
    if (sprintFilter === "backlog") {
      result = result.filter((t) => !t.sprint_id);
    } else if (sprintFilter !== "all") {
      result = result.filter((t) => t.sprint_id === sprintFilter);
    }

    // Search filter (deferred for performance)
    if (deferredSearchQuery.trim()) {
      const query = deferredSearchQuery.toLowerCase().trim();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
      );
    }

    return result;
  }, [tasks, sprintFilter, deferredSearchQuery]);

  const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const smartSortedFilteredTasks = useMemo(() => {
    const base = [...filteredTasks];
    if (hasExplicitSort) return base;
    return base.sort((a, b) => {
      const pa = priorityRank[a.priority] ?? 9;
      const pb = priorityRank[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      const da = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const db = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredTasks, hasExplicitSort]);

  // Update URL when search changes (debounced via deferred value)
  const clearSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.set("page", "1");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  }, [router, searchParams]);

  // ... 

  // Memoized callbacks - handleTaskMove removed, using useTaskStatusFlow moveNext instead

  const claimTask = useCallback(async (taskId: string) => {
    if (!taskId) return;
    if (!currentUserId) {
      showToast("Please sign in to claim tasks.", "warning");
      return;
    }
    if (!isOwnerOrMember) {
      showToast("You must be a project member to claim tasks.", "error");
      return;
    }
    if (claimLoading[taskId]) return;

    const prev =
      tasks.find((t) => t.id === taskId) ||
      needsOwnerTasks.find((t) => t.id === taskId) ||
      myFocusTasks.find((t) => t.id === taskId) ||
      null;

    // Idempotent: already claimed and in progress.
    if (prev?.assigned_to === currentUserId && prev?.status === "in_progress") return;

    const me = members.find((m) => m.user_id === currentUserId);
    const myProfile = me
      ? { full_name: me.profiles.full_name ?? null, username: me.profiles.username ?? null }
      : null;

    const applyClaim = (t: Task): Task => ({
      ...t,
      assigned_to: currentUserId,
      status: "in_progress",
      assigned_profile: myProfile ?? t.assigned_profile,
    });

    setClaimLoading((m) => ({ ...m, [taskId]: true }));

    // Optimistic updates (instant UI)
    setTasks((prevList) => prevList.map((t) => (t.id === taskId ? applyClaim(t) : t)));
    setNeedsOwnerTasks((prevList) => prevList.filter((t) => t.id !== taskId));
    setMyFocusTasks((prevList) => {
      const base = prev ?? prevList.find((t) => t.id === taskId) ?? null;
      if (!base) return prevList;
      const next = applyClaim(base);
      return [next, ...prevList.filter((t) => t.id !== taskId)].slice(0, 5);
    });

    try {
      const result = await updateTasksAction(projectId, [taskId], {
        assigned_to: currentUserId,
        status: "in_progress",
      });
      if (!result.success) throw result.error;

      showToast("Claimed task and started it.", "success");
      // Keep correctness: refresh task queries (no route reload).
      queryClient.invalidateQueries({ queryKey: [...projectKeys.detail(projectId), "tasks"] });
    } catch (err) {
      console.error("Claim task failed:", err);
      showToast("Failed to claim task. Please try again.", "error");

      // Best-effort revert
      if (prev) {
        setTasks((prevList) => prevList.map((t) => (t.id === taskId ? prev : t)));
        if (prev.assigned_to == null) {
          setNeedsOwnerTasks((prevList) => [prev, ...prevList.filter((t) => t.id !== taskId)].slice(0, 5));
        }
        setMyFocusTasks((prevList) => prevList.filter((t) => t.id !== taskId));
      }
    } finally {
      setClaimLoading((m) => {
        const next = { ...m };
        delete next[taskId];
        return next;
      });
    }
  }, [claimLoading, currentUserId, isOwnerOrMember, members, myFocusTasks, needsOwnerTasks, projectId, queryClient, showToast, tasks]);

  const handleTaskClick = useCallback((t: Task) => {
    setEditingTask(t);
  }, []);

  const handleAddTask = useCallback((status: Task['status']) => {
    setShowCreateModal(true);
    // Could set default status here if CreateTaskModal supports it
  }, []);

  return (
    <div className="space-y-4">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 pb-4 -mx-4 px-4 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Task Board</h2>
              <TabInfoHelp
                title="Tasks"
                description="Create and manage tasks. Use Backlog for unplanned work and move tasks into sprints when ready."
                bullets={[
                  "Archive hides tasks without breaking history",
                ]}
              />
            </div>
            <div className="mt-2 text-sm text-zinc-500">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{totalCount}</span> total tasks
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TaskFilters
              viewMode={viewMode}
              setViewMode={setViewMode}
              isBulkMode={isBulkMode}
              setIsBulkMode={(next) => {
                setIsBulkMode(next);
                if (!next) setSelectedTaskIds(new Set());
              }}
              selectedCount={selectedTaskIds.size}
              sprints={sprints}
              sprintFilter={sprintFilter}
              applySprintFilter={applySprintFilter}
              showArchived={showArchived}
              toggleArchived={toggleArchived}
              savedViews={savedViews}
              onSaveCurrentView={saveCurrentView}
              onApplyView={applyView}
              onDeleteView={deleteView}
              searchQuery={urlSearchQuery}
              onClearSearch={clearSearch}
              canReorder={sprintFilter === "backlog"}
              isReorderMode={isReorderMode}
              onToggleReorder={async () => {
                if (sprintFilter !== "backlog") return;
                if (!isReorderMode) {
                  await loadBacklogAll();
                  setIsReorderMode(true);
                } else {
                  setIsReorderMode(false);
                }
              }}
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
            >
              New Task
            </button>
          </div>
        </div>
      </div>

      {/* Focus strip */}
      {currentUserId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => {
                if (myFocusTasks.length === 0) return;
                setMyFocusExpanded((v) => !v);
                myFocusAutoExpandRef.current = false;
              }}
              className="w-full flex items-center justify-between gap-3 px-4 py-3"
              title={myFocusTasks.length === 0 ? "My Focus" : (myFocusExpanded ? "Collapse" : "Expand")}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <Users className="w-4 h-4 text-indigo-500" />
                My Focus
              </div>
              {myFocusTasks.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{myFocusTasks.length}</span>
                  {myFocusExpanded ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              )}
            </button>
            {myFocusExpanded && myFocusTasks.length > 0 && (
              <div className="px-4 pb-4 space-y-2">
                {myFocusTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEditingTask(t)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{t.title}</div>
                      {t.story_points ? (
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{t.story_points} pts</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-zinc-500 capitalize">
                      {t.priority.replace("_", " ")} • {t.status.replace("_", " ")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => {
                if (needsOwnerTasks.length === 0) return;
                setNeedsOwnerExpanded((v) => !v);
                needsOwnerAutoExpandRef.current = false;
              }}
              className="w-full flex items-center justify-between gap-3 px-4 py-3"
              title={needsOwnerTasks.length === 0 ? "Needs Owner" : (needsOwnerExpanded ? "Collapse" : "Expand")}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <UserPlus className="w-4 h-4 text-orange-500" />
                Needs Owner
              </div>
              {needsOwnerTasks.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{needsOwnerTasks.length}</span>
                  {needsOwnerExpanded ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              )}
            </button>
            {needsOwnerExpanded && needsOwnerTasks.length > 0 && (
              <div className="px-4 pb-4 space-y-2">
                {needsOwnerTasks.map((t) => (
                  <div
                    key={t.id}
                    className="w-full px-3 py-2 rounded-lg hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors flex items-start justify-between gap-3 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                  >
                    <button
                      onClick={() => setEditingTask(t)}
                      className="flex-1 min-w-0 text-left"
                      title="Open task"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{t.title}</div>
                        {t.story_points ? (
                          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">{t.story_points} pts</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-zinc-500 capitalize">
                        {t.priority.replace("_", " ")} • {t.status.replace("_", " ")}
                      </div>
                    </button>

                    <button
                      disabled={!!claimLoading[t.id]}
                      onClick={(e) => {
                        e.stopPropagation();
                        claimTask(t.id);
                      }}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Claim & start"
                    >
                      {claimLoading[t.id] ? "Claiming…" : "Claim"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Bulk actions bar */}
      {isBulkMode && selectedTaskIds.size > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="text-sm text-zinc-700 dark:text-zinc-200">
            <span className="font-semibold">{selectedTaskIds.size}</span> selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkAction || ""}
              onChange={(e) => setBulkAction(e.target.value || null)}
              className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
            >
              <option value="">Choose action…</option>
              <option value="move">Move (sprint/backlog)</option>
              <option value="assign">Assign</option>
              <option value="status">Set status</option>
              <option value="priority">Set priority</option>
            </select>

            {bulkAction === "move" && (
              <>
                <select
                  defaultValue=""
                  onChange={async (e) => {
                    const v = e.target.value;
                    if (!v) return;
                    if (v === "backlog") await moveSelectedToBacklog();
                    else await moveSelectedToSprint(v);
                  }}
                  className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                >
                  <option value="">Move to…</option>
                  <option value="backlog">Backlog</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </>
            )}

            {bulkAction === "assign" && (
              <select
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  applyBulk({ assigned_to: v === "unassigned" ? null : v });
                }}
                className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              >
                <option value="">Assign to…</option>
                <option value="unassigned">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles.full_name || m.profiles.username}
                  </option>
                ))}
              </select>
            )}

            {bulkAction === "status" && (
              <select
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  applyBulk({ status: v });
                }}
                className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              >
                <option value="">Status…</option>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            )}

            {bulkAction === "priority" && (
              <select
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  applyBulk({ priority: v });
                }}
                className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              >
                <option value="">Priority…</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            )}

            <button
              onClick={() => {
                setSelectedTaskIds(new Set());
              }}
              className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Backlog reorder panel */}
      {isReorderMode && sprintFilter === "backlog" && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <ListOrdered className="w-4 h-4 text-indigo-500" />
              Reorder backlog
            </div>
            <button
              disabled={savingOrder}
              onClick={async () => {
                setSavingOrder(true);
                const now = new Date().toISOString();
                try {
                  // Use UPDATEs (not UPSERT) to avoid requiring INSERT privileges under RLS.
                  await Promise.all(
                    backlogAll.map((t, idx) =>
                      supabase
                        .from("project_tasks")
                        .update({ backlog_order: idx + 1, updated_at: now })
                        .eq("id", t.id)
                    )
                  );
                  loadTasks();
                } catch (e) {
                  console.error("Backlog order save error:", e);
                  alert("Failed to save backlog order.");
                }
                setSavingOrder(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {savingOrder ? "Saving…" : "Save order"}
            </button>
          </div>
          <div className="p-3 max-h-[420px] overflow-y-auto">
            <Reorder.Group axis="y" values={backlogAll} onReorder={setBacklogAll} className="space-y-2">
              {backlogAll.map((t) => (
                <Reorder.Item
                  key={t.id}
                  value={t}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{t.title}</div>
                      <div className="text-xs text-zinc-500 capitalize">{t.priority} • {t.status.replace("_", " ")}</div>
                    </div>
                  </div>
                  {t.story_points ? (
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{t.story_points} pts</span>
                  ) : (
                    <span className="text-xs text-zinc-400"> </span>
                  )}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'list' ? (
        <TasksTable
          tasks={smartSortedFilteredTasks}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          selectedTaskIds={selectedTaskIds}
          onToggleSelect={toggleTaskSelection}
          onTaskClick={(t) => setEditingTask(t as unknown as Task)}
          isBulkMode={isBulkMode}
          onClaimTask={currentUserId && isOwnerOrMember ? claimTask : undefined}
          claimLoading={claimLoading}
        />
      ) : (
        <KanbanBoard
          tasks={filteredTasks}
          onMoveNext={
            moveTaskNext
              ? async (task) => {
                if (!confirmMoveNext(task)) return;
                await moveTaskNext(task, { withUndoToast: true });
              }
              : undefined
          }
          onTaskClick={handleTaskClick}
          currentUserId={currentUserId}
          projectCreatorId={projectCreatorId}
          isOwnerOrMember={isOwnerOrMember}
          isBulkMode={isBulkMode}
          selectedTaskIds={selectedTaskIds}
          onToggleSelect={toggleTaskSelection}
          onAddTask={handleAddTask}
          onClaimTask={currentUserId && isOwnerOrMember ? claimTask : undefined}
          claimLoading={claimLoading}
        />
      )}


      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          projectId={projectId}
          members={members}
          currentUserId={currentUserId}
          defaultSprintId={sprintFilter === "all" || sprintFilter === "backlog" ? null : sprintFilter}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadTasks();
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Task Detail Panel (for viewing/editing existing tasks) */}
      <AnimatePresence>
        {editingTask && (
          <TaskDetailPanel
            task={editingTask as any}
            projectId={projectId}
            members={members.map((m) => ({
              user_id: m.user_id,
              profiles: m.profiles || { full_name: null, username: null },
            }))}
            currentUserId={currentUserId}
            projectCreatorId={projectCreatorId}
            isOwnerOrMember={isOwnerOrMember}
            onClose={() => setEditingTask(null)}
            onUpdate={() => {
              loadTasks();
              setEditingTask(null);
            }}
            onDelete={() => {
              loadTasks();
              setEditingTask(null);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

