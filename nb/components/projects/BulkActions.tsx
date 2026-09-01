"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckSquare,
  Trash2,
  Tag,
  User,
  Flag,
  MoveRight,
  Copy,
} from "lucide-react";

interface BulkActionsProps {
  selectedIds: string[];
  projectId: string;
  members: { user_id: string; profiles: { full_name: string | null; username: string | null } }[];
  sprints?: { id: string; name: string }[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

type BulkAction =
  | "status"
  | "priority"
  | "assignee"
  | "sprint"
  | "delete"
  | "duplicate";

export default function BulkActions({
  selectedIds,
  projectId: _projectId,
  members,
  sprints = [],
  onClearSelection,
  onActionComplete,
}: BulkActionsProps) {
  const supabase = createSupabaseBrowserClient();
  const [activeAction, setActiveAction] = useState<BulkAction | null>(null);
  const [loading, setLoading] = useState(false);

  // Update status
  const updateStatus = async (status: "todo" | "in_progress" | "done") => {
    setLoading(true);
    const updates: Record<string, any> = { status };

    if (status === "in_progress") {
      updates.started_at = new Date().toISOString();
    } else if (status === "done") {
      updates.completed_at = new Date().toISOString();
    }

    await supabase
      .from("project_tasks")
      .update(updates)
      .in("id", selectedIds);

    setLoading(false);
    setActiveAction(null);
    onActionComplete();
  };

  // Update priority
  const updatePriority = async (priority: "low" | "medium" | "high" | "urgent") => {
    setLoading(true);
    await supabase
      .from("project_tasks")
      .update({ priority })
      .in("id", selectedIds);

    setLoading(false);
    setActiveAction(null);
    onActionComplete();
  };

  // Update assignee
  const updateAssignee = async (assigneeId: string | null) => {
    setLoading(true);
    await supabase
      .from("project_tasks")
      .update({ assigned_to: assigneeId })
      .in("id", selectedIds);

    setLoading(false);
    setActiveAction(null);
    onActionComplete();
  };

  // Move to sprint
  const moveToSprint = async (sprintId: string | null) => {
    setLoading(true);
    await supabase
      .from("project_tasks")
      .update({ sprint_id: sprintId })
      .in("id", selectedIds);

    setLoading(false);
    setActiveAction(null);
    onActionComplete();
  };

  // Delete tasks
  const deleteTasks = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} task(s)?`)) {
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("project_tasks")
      .delete()
      .in("id", selectedIds);

    if (error) {
      console.error("Error performing bulk delete:", error);
      alert("Failed to delete tasks: " + error.message);
    } else {
      setActiveAction(null);
      onClearSelection();
      onActionComplete();
    }

    setLoading(false);
  };

  // Duplicate tasks
  const duplicateTasks = async () => {
    setLoading(true);

    // Fetch tasks to duplicate
    const { data: tasks } = await supabase
      .from("project_tasks")
      .select("*")
      .in("id", selectedIds);

    if (tasks) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const duplicates = tasks.map((task) => ({
        project_id: task.project_id,
        title: `${task.title} (Copy)`,
        description: task.description,
        status: "todo" as const,
        priority: task.priority,
        task_type: task.task_type,
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        start_date: task.start_date,
        estimated_hours: task.estimated_hours,
        story_points: task.story_points,
        parent_task_id: task.parent_task_id,
        milestone_id: task.milestone_id,
        created_by: user.id,
      }));

      await supabase.from("project_tasks").insert(duplicates);
    }

    setLoading(false);
    setActiveAction(null);
    onActionComplete();
  };

  if (selectedIds.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
    >
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl">
        {/* Selection Count */}
        <div className="flex items-center gap-2 pr-3 border-r border-zinc-200 dark:border-zinc-700">
          <CheckSquare className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {selectedIds.length} selected
          </span>
          <button
            onClick={onClearSelection}
            className="p-1 rounded hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Status */}
          <div className="relative">
            <button
              onClick={() => setActiveAction(activeAction === "status" ? null : "status")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeAction === "status"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                : "hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                }`}
            >
              <Flag className="w-4 h-4" />
              Status
            </button>
            <AnimatePresence>
              {activeAction === "status" && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full left-0 mb-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg"
                >
                  {[
                    { value: "todo", label: "To Do", color: "bg-zinc-500" },
                    { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
                    { value: "done", label: "Done", color: "bg-green-500" },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => updateStatus(status.value as any)}
                      disabled={loading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${status.color}`} />
                      {status.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Priority */}
          <div className="relative">
            <button
              onClick={() => setActiveAction(activeAction === "priority" ? null : "priority")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeAction === "priority"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                : "hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                }`}
            >
              <Tag className="w-4 h-4" />
              Priority
            </button>
            <AnimatePresence>
              {activeAction === "priority" && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full left-0 mb-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg"
                >
                  {[
                    { value: "low", label: "Low", color: "bg-zinc-500" },
                    { value: "medium", label: "Medium", color: "bg-yellow-500" },
                    { value: "high", label: "High", color: "bg-orange-500" },
                    { value: "urgent", label: "Urgent", color: "bg-red-500" },
                  ].map((priority) => (
                    <button
                      key={priority.value}
                      onClick={() => updatePriority(priority.value as any)}
                      disabled={loading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${priority.color}`} />
                      {priority.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Assignee */}
          <div className="relative">
            <button
              onClick={() => setActiveAction(activeAction === "assignee" ? null : "assignee")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeAction === "assignee"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                : "hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                }`}
            >
              <User className="w-4 h-4" />
              Assignee
            </button>
            <AnimatePresence>
              {activeAction === "assignee" && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full left-0 mb-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-48 overflow-y-auto min-w-[180px]"
                >
                  <button
                    onClick={() => updateAssignee(null)}
                    disabled={loading}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <User className="w-4 h-4 text-zinc-400" />
                    Unassigned
                  </button>
                  {members.map((member) => (
                    <button
                      key={member.user_id}
                      onClick={() => updateAssignee(member.user_id)}
                      disabled={loading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xs font-bold">
                        {(member.profiles?.full_name?.[0] || member.profiles?.username?.[0] || "U").toUpperCase()}
                      </div>
                      <span className="truncate">
                        {member.profiles?.full_name || member.profiles?.username || "User"}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sprint */}
          {sprints.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setActiveAction(activeAction === "sprint" ? null : "sprint")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeAction === "sprint"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                  : "hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
              >
                <MoveRight className="w-4 h-4" />
                Sprint
              </button>
              <AnimatePresence>
                {activeAction === "sprint" && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute bottom-full left-0 mb-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg min-w-[180px]"
                  >
                    <button
                      onClick={() => moveToSprint(null)}
                      disabled={loading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                      Move to Backlog
                    </button>
                    {sprints.map((sprint) => (
                      <button
                        key={sprint.id}
                        onClick={() => moveToSprint(sprint.id)}
                        disabled={loading}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {sprint.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />

          {/* Duplicate */}
          <button
            onClick={duplicateTasks}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>

          {/* Delete */}
          <button
            onClick={deleteTasks}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="pl-2 border-l border-zinc-200 dark:border-zinc-700">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

