"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TaskDetailContent, { TaskDetailMember, TaskDetailTask } from "@/components/tasks/TaskDetailContent";

type Props = {
  taskId: string;
  onClose: () => void;
};

export default function TaskDetailView({ taskId, onClose }: Props) {
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth();

  const [task, setTask] = useState<TaskDetailTask | null>(null);
  const [members, setMembers] = useState<TaskDetailMember[]>([]);
  const [projectCreatorId, setProjectCreatorId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = user?.id ?? null;

  const projectId = task?.project_id ?? null;

  const isOwnerOrMember = useMemo(() => {
    if (!currentUserId) return false;
    if (projectCreatorId && currentUserId === projectCreatorId) return true;
    return members.some((m) => m.user_id === currentUserId);
  }, [currentUserId, members, projectCreatorId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: t, error: taskErr } = await supabase
        .from("project_tasks")
        .select(
          `
          *,
          assigned_profile:assigned_to(full_name, username),
          creator_profile:created_by(full_name, username)
        `
        )
        .eq("id", taskId)
        .single();

      if (taskErr || !t) throw taskErr || new Error("Task not found");

      const typedTask = t as unknown as TaskDetailTask;
      setTask(typedTask);

      const pid = typedTask.project_id as string;

      const [{ data: proj }, { data: collabs }] = await Promise.all([
        supabase.from("projects").select("creator_id").eq("id", pid).maybeSingle(),
        supabase
          .from("project_collaborators")
          .select("user_id, profiles(full_name, username)")
          .eq("project_id", pid),
      ]);

      setProjectCreatorId((proj as unknown as { creator_id?: string } | null)?.creator_id ?? undefined);
      setMembers(Array.isArray(collabs) ? (collabs as unknown as TaskDetailMember[]) : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load task";
      setError(msg);
      setTask(null);
      setMembers([]);
      setProjectCreatorId(undefined);
    } finally {
      setLoading(false);
    }
  }, [supabase, taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading task…</div>
      </div>
    );
  }

  if (error || !task || !projectId) {
    return (
      <div className="h-full p-6">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Couldn’t open task</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{error || "Task not available."}</div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={load}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TaskDetailContent
        task={task}
        projectId={projectId}
        members={members}
        currentUserId={currentUserId}
        projectCreatorId={projectCreatorId}
        isOwnerOrMember={isOwnerOrMember}
        onClose={onClose}
        onUpdate={load}
        onDelete={onClose}
      />
    </div>
  );
}

