"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Calendar,
  Target,
  Clock,
  CheckCircle2,
  Play,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Edit3,
  X,
  Zap,
  TrendingUp,
} from "lucide-react";
import { TabInfoHelp } from "@/components/projects/TabInfoHelp";

interface Sprint {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: "planning" | "active" | "completed" | "cancelled";
  velocity: number | null;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: string;
  story_points: number | null;
  sprint_id: string | null;
  assigned_profile?: {
    full_name: string | null;
    username: string | null;
  };
}

interface SprintPlanningProps {
  projectId: string;
  isOwner: boolean;
}

export default function SprintPlanning({ projectId, isOwner }: SprintPlanningProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  // Load sprints
  const loadSprints = useCallback(async () => {
    const { data } = await supabase
      .from("project_sprints")
      .select("*")
      .eq("project_id", projectId)
      .order("start_date", { ascending: false });

    if (data) setSprints(data);
  }, [projectId, supabase]);

  // Load backlog tasks
  const loadBacklogTasks = useCallback(async () => {
    const { data } = await supabase
      .from("project_tasks")
      .select(`
        id, title, status, priority, story_points, sprint_id,
        assigned_profile:profiles!project_tasks_assigned_to_fkey(full_name, username)
      `)
      .eq("project_id", projectId)
      .is("sprint_id", null)
      .order("backlog_order", { ascending: true });

    if (data) {
      const formattedTasks = data.map((task: any) => ({
        ...task,
        assigned_profile: Array.isArray(task.assigned_profile) ? task.assigned_profile[0] : task.assigned_profile,
      }));
      setBacklogTasks(formattedTasks as Task[]);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([loadSprints(), loadBacklogTasks()]);
      setLoading(false);
    }
    load();
  }, [loadSprints, loadBacklogTasks]);

  // Command palette deep-link: ?tab=sprints&newSprint=1 opens Create Sprint modal (owners only).
  useEffect(() => {
    if (!isOwner) return;
    if (searchParams.get("newSprint") !== "1") return;
    setShowCreateModal(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("newSprint");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [isOwner, router, searchParams]);

  // Realtime: keep sprint planning view up-to-date
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`project-${projectId}-sprints-realtime`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_sprints", filter: `project_id=eq.${projectId}` },
        () => {
          loadSprints();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_tasks", filter: `project_id=eq.${projectId}` },
        () => {
          // backlog membership depends on sprint_id
          loadBacklogTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase, loadSprints, loadBacklogTasks]);

  // Get active sprint
  const activeSprint = sprints.find((s) => s.status === "active");

  // Calculate sprint stats
  const getSprintStats = useCallback(
    async (sprintId: string) => {
      const { data: tasks } = await supabase
        .from("project_tasks")
        .select("status, story_points")
        .eq("sprint_id", sprintId);

      if (!tasks) return { total: 0, completed: 0, points: 0, completedPoints: 0 };

      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === "done").length;
      const points = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
      const completedPoints = tasks
        .filter((t) => t.status === "done")
        .reduce((sum, t) => sum + (t.story_points || 0), 0);

      return { total, completed, points, completedPoints };
    },
    [supabase]
  );

  // Start sprint
  const startSprint = async (sprintId: string) => {
    if (activeSprint && activeSprint.id !== sprintId) {
      const ok = confirm(
        `Starting this sprint will complete the currently active sprint (${activeSprint.name}). Continue?`
      );
      if (!ok) return;
    }
    // First, complete any active sprint
    if (activeSprint) {
      await supabase
        .from("project_sprints")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", activeSprint.id);
    }

    // Capture commitment snapshot for the sprint being started.
    const now = new Date().toISOString();
    const stats = await getSprintStats(sprintId);

    await supabase
      .from("project_sprints")
      .update({
        status: "active",
        started_at: now,
        committed_tasks: stats.total,
        committed_points: stats.points,
        updated_at: now,
      })
      .eq("id", sprintId);

    loadSprints();
  };

  // Complete sprint
  const completeSprint = async (sprintId: string) => {
    const stats = await getSprintStats(sprintId);

    await supabase
      .from("project_sprints")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        velocity: stats.completedPoints,
      })
      .eq("id", sprintId);

    // Move incomplete tasks back to backlog
    await supabase
      .from("project_tasks")
      .update({ sprint_id: null })
      .eq("sprint_id", sprintId)
      .neq("status", "done");

    loadSprints();
    loadBacklogTasks();
  };

  // Delete sprint
  const deleteSprint = async (sprintId: string) => {
    if (!confirm("Are you sure? Tasks will be moved back to backlog.")) return;

    // Move tasks back to backlog
    await supabase
      .from("project_tasks")
      .update({ sprint_id: null })
      .eq("sprint_id", sprintId);

    await supabase.from("project_sprints").delete().eq("id", sprintId);
    loadSprints();
    loadBacklogTasks();
  };

  // Add task to sprint
  const addTaskToSprint = async (taskId: string, sprintId: string) => {
    await supabase
      .from("project_tasks")
      .update({ sprint_id: sprintId })
      .eq("id", taskId);

    loadBacklogTasks();
  };

  // Remove task from sprint
  const removeTaskFromSprint = async (taskId: string) => {
    await supabase
      .from("project_tasks")
      .update({ sprint_id: null })
      .eq("id", taskId);

    loadBacklogTasks();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Sprint Planning
            </h2>
            <TabInfoHelp
              title="Sprints"
              description="Plan work in timeboxes. Assign tasks to a sprint to track what’s committed and what’s done."
              bullets={[
                "Backlog = tasks not in any sprint",
                "Complete sprint moves unfinished tasks back to backlog",
              ]}
            />
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Plan and manage your sprints
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Sprint
          </button>
        )}
      </div>

      {/* Active Sprint Banner */}
      {activeSprint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-blue-100">Active Sprint</p>
                <h3 className="text-lg font-bold">{activeSprint.name}</h3>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-blue-100">Ends</p>
                <p className="font-medium">
                  {new Date(activeSprint.end_date).toLocaleDateString("en-US")}
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={() => completeSprint(activeSprint.id)}
                  className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-900/20 hover:bg-white dark:bg-zinc-900/30 text-sm font-medium transition-colors"
                >
                  Complete Sprint
                </button>
              )}
            </div>
          </div>
          {activeSprint.goal && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-sm">
                <span className="text-blue-200">Goal:</span> {activeSprint.goal}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Sprints Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Backlog Column */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-zinc-500" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Backlog
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-medium">
                  {backlogTasks.length}
                </span>
              </div>
            </div>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            {backlogTasks.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks in backlog</p>
              </div>
            ) : (
              <div className="space-y-1">
                {backlogTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${task.priority === "high" || task.priority === "urgent"
                        ? "bg-red-500"
                        : task.priority === "medium"
                          ? "bg-yellow-500"
                          : "bg-zinc-400"
                        }`}
                    />
                    <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {task.title}
                    </span>
                    {task.story_points && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
                        {task.story_points}
                      </span>
                    )}
                    {activeSprint && isOwner && (
                      <button
                        onClick={() => addTaskToSprint(task.id, activeSprint.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                        title="Add to active sprint"
                      >
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sprints Column */}
        <div className="space-y-4">
          {sprints.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-zinc-400" />
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                No sprints yet
              </h3>
              <p className="text-sm text-zinc-500 mt-1">
                Create your first sprint to start planning
              </p>
            </div>
          ) : (
            sprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                isActive={sprint.status === "active"}
                isOwner={isOwner}
                onStart={() => startSprint(sprint.id)}
                onComplete={() => completeSprint(sprint.id)}
                onEdit={() => setEditingSprint(sprint)}
                onDelete={() => deleteSprint(sprint.id)}
                onSelect={() => setSelectedSprint(sprint)}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Sprint Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateSprintModal
            projectId={projectId}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              loadSprints();
              setShowCreateModal(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit Sprint Modal */}
      <AnimatePresence>
        {editingSprint && (
          <CreateSprintModal
            projectId={projectId}
            sprint={editingSprint}
            onClose={() => setEditingSprint(null)}
            onSuccess={() => {
              loadSprints();
              setEditingSprint(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Sprint Details Modal */}
      <AnimatePresence>
        {selectedSprint && (
          <SprintDetailsModal
            sprint={selectedSprint}
            projectId={projectId}
            isOwner={isOwner}
            onClose={() => setSelectedSprint(null)}
            onMoveTaskToBacklog={async (taskId: string) => {
              await removeTaskFromSprint(taskId);
              // Keep modal stats accurate
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Sprint Card Component
function SprintCard({
  sprint,
  isActive,
  isOwner,
  onStart,
  onComplete,
  onEdit,
  onDelete,
  onSelect,
}: {
  sprint: Sprint;
  isActive: boolean;
  isOwner: boolean;
  onStart: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [stats, setStats] = useState({ total: 0, completed: 0, points: 0, completedPoints: 0 });
  const [showMenu, setShowMenu] = useState(false);

  const loadStats = useCallback(async () => {
    const { data: tasks } = await supabase
      .from("project_tasks")
      .select("status, story_points")
      .eq("sprint_id", sprint.id);

    if (tasks) {
      setStats({
        total: tasks.length,
        completed: tasks.filter((t) => t.status === "done").length,
        points: tasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
        completedPoints: tasks
          .filter((t) => t.status === "done")
          .reduce((sum, t) => sum + (t.story_points || 0), 0),
      });
    }
  }, [supabase, sprint.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Realtime stats for this sprint
  useEffect(() => {
    const channel = supabase
      .channel(`sprint-${sprint.id}-stats`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_tasks", filter: `sprint_id=eq.${sprint.id}` },
        () => loadStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, sprint.id, loadStats]);

  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  const daysRemaining = Math.ceil(
    (new Date(sprint.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const statusColors = {
    planning: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
    active: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    completed: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    cancelled: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  };

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border ${isActive
        ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10"
        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
        } overflow-hidden cursor-pointer hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600 transition-colors`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {sprint.name}
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[sprint.status]}`}>
                {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(sprint.start_date).toLocaleDateString("en-US")} - {new Date(sprint.end_date).toLocaleDateString("en-US")}
              </span>
              {sprint.status === "active" && daysRemaining > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {daysRemaining}d left
                </span>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4 text-zinc-500" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg z-10 min-w-[140px]"
                  >
                    {sprint.status === "planning" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onStart(); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700"
                      >
                        <Play className="w-4 h-4 text-green-500" />
                        Start Sprint
                      </button>
                    )}
                    {sprint.status === "active" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onComplete(); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700"
                      >
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        Complete
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700"
                    >
                      <Edit3 className="w-4 h-4 text-zinc-500" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {sprint.goal && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
            {sprint.goal}
          </p>
        )}

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-500">Progress</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {stats.completed}/{stats.total} tasks
            </span>
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-blue-500 rounded-full"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-500">Points:</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {stats.completedPoints}/{stats.points}
            </span>
          </div>
          {sprint.velocity !== null && (
            <div className="flex items-center gap-1.5 text-xs">
              <Zap className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-zinc-500">Velocity:</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {sprint.velocity}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Create/Edit Sprint Modal
function CreateSprintModal({
  projectId,
  sprint,
  onClose,
  onSuccess,
}: {
  projectId: string;
  sprint?: Sprint;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [name, setName] = useState(sprint?.name || "");
  const [description, setDescription] = useState(sprint?.description || "");
  const [goal, setGoal] = useState(sprint?.goal || "");
  const [startDate, setStartDate] = useState<string>(
    sprint?.start_date || (new Date().toISOString().split("T")[0] ?? "")
  );
  const [endDate, setEndDate] = useState<string>(
    sprint?.end_date ||
    (new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] ?? "")
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Premium defaults: auto-name Sprint N when creating
  useEffect(() => {
    async function hydrateDefaultName() {
      if (sprint) return;
      if (name.trim()) return;
      const { count } = await supabase
        .from("project_sprints")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId);
      const next = (count || 0) + 1;
      setName(`Sprint ${next}`);
    }
    hydrateDefaultName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, sprint]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setErrorMessage(null);
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      setErrorMessage("End date must be after start date.");
      return;
    }
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in");
      setSubmitting(false);
      return;
    }

    const sprintData = {
      project_id: projectId,
      name: name.trim(),
      description: description.trim() || null,
      goal: goal.trim() || null,
      start_date: startDate,
      end_date: endDate,
      created_by: user.id,
    };

    if (sprint) {
      const { error } = await supabase
        .from("project_sprints")
        .update(sprintData)
        .eq("id", sprint.id);

      if (error) {
        setErrorMessage("Failed to update sprint.");
        setSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase.from("project_sprints").insert(sprintData);

      if (error) {
        console.error("Error creating sprint:", JSON.stringify(error, null, 2));
        let errorMsg = "Failed to create sprint";
        if (error.code === "42P01") errorMsg += " (Database table missing - Migration 0051 needed)";
        else if (error.code === "42501") errorMsg += " (Permission Denied)";
        setErrorMessage(errorMsg);
        setSubmitting(false);
        return;
      }
    }

    onSuccess();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {sprint ? "Edit Sprint" : "Create Sprint"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick duration buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const start = new Date(startDate);
                const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
                setEndDate(end.toISOString().split("T")[0] ?? "");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              1 week
            </button>
            <button
              type="button"
              onClick={() => {
                const start = new Date(startDate);
                const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
                setEndDate(end.toISOString().split("T")[0] ?? "");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              2 weeks
            </button>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Sprint Name *
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sprint 1"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Sprint Goal
            </label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What do you want to achieve?"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description..."
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                End Date *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving..." : sprint ? "Update Sprint" : "Create Sprint"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function SprintDetailsModal({
  sprint,
  projectId,
  isOwner,
  onClose,
  onMoveTaskToBacklog,
}: {
  sprint: Sprint;
  projectId: string;
  isOwner: boolean;
  onClose: () => void;
  onMoveTaskToBacklog: (taskId: string) => Promise<void>;
}) {
  const supabase = createSupabaseBrowserClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [commitment, setCommitment] = useState<{
    startedAt: string | null;
    committedTasks: number;
    committedPoints: number;
    addedTasks: number;
    addedPoints: number;
    removedTasks: number;
    removedPoints: number;
  } | null>(null);

  const loadSprintTasks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("project_tasks")
      .select(`
        id, title, status, priority, story_points, sprint_id,
        assigned_profile:profiles!project_tasks_assigned_to_fkey(full_name, username)
      `)
      .eq("project_id", projectId)
      .eq("sprint_id", sprint.id)
      .order("created_at", { ascending: true });

    const formatted = (data || []).map((t: any) => ({
      ...t,
      assigned_profile: Array.isArray(t.assigned_profile) ? t.assigned_profile[0] : t.assigned_profile,
    }));
    setTasks(formatted as any);
    setLoading(false);
  }, [supabase, projectId, sprint.id]);

  useEffect(() => {
    loadSprintTasks();
  }, [loadSprintTasks]);

  useEffect(() => {
    const channel = supabase
      .channel(`sprint-${sprint.id}-tasks`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_tasks", filter: `sprint_id=eq.${sprint.id}` },
        () => loadSprintTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, sprint.id, loadSprintTasks]);

  // Commitment + scope changes (from project_sprints columns + activity events).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sprintRow } = await supabase
        .from("project_sprints")
        .select("started_at, committed_tasks, committed_points, completed_at")
        .eq("id", sprint.id)
        .maybeSingle();

      const startedAt: string | null = (sprintRow as any)?.started_at || null;

      const { data: events } = await supabase
        .from("project_activity_events")
        .select("created_at, metadata")
        .eq("project_id", projectId)
        .eq("event_type", "task_sprint_changed")
        .order("created_at", { ascending: false })
        .limit(500);

      const startedMs = startedAt ? new Date(startedAt).getTime() : 0;

      let addedTasks = 0;
      let addedPoints = 0;
      let removedTasks = 0;
      let removedPoints = 0;

      (events || []).forEach((e: any) => {
        const t = new Date(e.created_at).getTime();
        if (!startedAt) return;
        if (t < startedMs) return;
        const beforeId = e?.metadata?.before_sprint_id || null;
        const afterId = e?.metadata?.after_sprint_id || null;
        const pts = Number(e?.metadata?.story_points || 0) || 0;
        if (afterId === sprint.id) {
          addedTasks += 1;
          addedPoints += pts;
        }
        if (beforeId === sprint.id) {
          removedTasks += 1;
          removedPoints += pts;
        }
      });

      if (cancelled) return;
      setCommitment({
        startedAt,
        committedTasks: Number((sprintRow as any)?.committed_tasks || 0) || 0,
        committedPoints: Number((sprintRow as any)?.committed_points || 0) || 0,
        addedTasks,
        addedPoints,
        removedTasks,
        removedPoints,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, sprint.id, supabase]);

  const byStatus = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  };

  const statusLabel: Record<string, string> = {
    todo: "To do",
    in_progress: "In progress",
    done: "Done",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 10 }}
        className="relative z-10 w-full max-w-4xl rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {sprint.name}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {sprint.status}
              </span>
            </div>
            {sprint.goal && (
              <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{sprint.goal}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {commitment && commitment.startedAt && (
            <div className="mb-5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Commitment</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Started {new Date(commitment.startedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                    <div className="text-zinc-500">Committed</div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {commitment.committedTasks} tasks • {commitment.committedPoints} pts
                    </div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                    <div className="text-zinc-500">Added</div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {commitment.addedTasks} • {commitment.addedPoints} pts
                    </div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                    <div className="text-zinc-500">Removed</div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {commitment.removedTasks} • {commitment.removedPoints} pts
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(["todo", "in_progress", "done"] as const).map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/20 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {statusLabel[key]}
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-medium">
                      {byStatus[key].length}
                    </span>
                  </div>
                  <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
                    {byStatus[key].length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 text-sm">
                        No tasks
                      </div>
                    ) : (
                      byStatus[key].map((t) => (
                        <div
                          key={t.id}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                {t.title}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500 flex items-center gap-2">
                                {t.assigned_profile?.full_name || t.assigned_profile?.username ? (
                                  <span>
                                    @{t.assigned_profile?.username || t.assigned_profile?.full_name}
                                  </span>
                                ) : (
                                  <span>Unassigned</span>
                                )}
                                {t.story_points ? (
                                  <>
                                    <span>•</span>
                                    <span>{t.story_points} pts</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            {isOwner && (
                              <button
                                onClick={async () => {
                                  await onMoveTaskToBacklog(t.id);
                                }}
                                className="px-2 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                title="Move back to backlog"
                              >
                                Backlog
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

