"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui-custom/Toast";
import { projectKeys } from "@/lib/queryKeys";
import { updateTaskStatusAction } from "@/app/(main)/projects/[id]/actions";

export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskStatusFlowTask = {
  id: string;
  title?: string | null;
  status: TaskStatus;
  started_at?: string | null;
  completed_at?: string | null;
};

type PatchContext = {
  projectId: string;
  taskId: string;
  previous: Array<[unknown, unknown]>;
  optimisticLocalRollback?: (() => void) | undefined;
};

type SetStatusOptions = {
  projectId?: string;
  /** Optional: update local component state in addition to query cache. */
  optimisticLocal?: () => void;
  /** Optional: how to rollback local state if mutation fails. */
  optimisticLocalRollback?: () => void;
  /** Show toast + Undo for user-initiated actions. */
  withUndoToast?: boolean;
  /** Used for Undo or silent changes. */
  toastLabelOverride?: string;
};

function computeOptimisticTimestamps(args: {
  prevStatus: TaskStatus;
  nextStatus: TaskStatus;
  prevStartedAt?: string | null;
  prevCompletedAt?: string | null;
  nowIso: string;
}) {
  const { nextStatus, prevStartedAt, prevCompletedAt, nowIso } = args;

  if (nextStatus === "todo") {
    return { started_at: null, completed_at: null };
  }
  if (nextStatus === "in_progress") {
    return { started_at: prevStartedAt ?? nowIso, completed_at: null };
  }
  // done
  return { started_at: prevStartedAt ?? nowIso, completed_at: prevCompletedAt ?? nowIso };
}

function patchTasksContainer(old: any, taskId: string, patch: (t: any) => any) {
  if (!old) return old;
  // Infinite query shape: { pages: [{data: []}] }
  if (old.pages && Array.isArray(old.pages)) {
    return {
      ...old,
      pages: old.pages.map((p: any) => {
        if (!p || !Array.isArray(p.data)) return p;
        return { ...p, data: p.data.map((t: any) => (t.id === taskId ? patch(t) : t)) };
      }),
    };
  }
  // Standard shape: { data: [] }
  if (Array.isArray(old.data)) {
    return { ...old, data: old.data.map((t: any) => (t.id === taskId ? patch(t) : t)) };
  }
  // Direct list: []
  if (Array.isArray(old)) {
    return old.map((t: any) => (t.id === taskId ? patch(t) : t));
  }
  return old;
}

export function useTaskStatusFlow(defaultProjectId?: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: async (vars: { projectId: string; taskId: string; nextStatus: TaskStatus }) => {
      const res = await updateTaskStatusAction(vars.projectId, vars.taskId, vars.nextStatus);
      if (!res.success) throw res.error;
      return res.data as any;
    },
  });

  const setStatus = useCallback(
    async (task: TaskStatusFlowTask, nextStatus: TaskStatus, opts: SetStatusOptions = {}) => {
      const projectId = opts.projectId ?? defaultProjectId;
      if (!projectId) throw new Error("projectId is required for task status updates");
      if (task.status === nextStatus) return;

      const nowIso = new Date().toISOString();
      const ts = computeOptimisticTimestamps({
        prevStatus: task.status,
        nextStatus,
        prevStartedAt: task.started_at ?? null,
        prevCompletedAt: task.completed_at ?? null,
        nowIso,
      });

      const baseKey = [...projectKeys.detail(projectId), "tasks"] as const;

      await queryClient.cancelQueries({ queryKey: baseKey });
      const previous = queryClient.getQueriesData({ queryKey: baseKey });

      // Optimistic local patch (if provided)
      opts.optimisticLocal?.();

      // Optimistic cache patch across all task queries under this project
      queryClient.setQueriesData({ queryKey: baseKey }, (old: any) =>
        patchTasksContainer(old, task.id, (t) => ({
          ...t,
          status: nextStatus,
          ...ts,
          updated_at: nowIso,
        }))
      );

      const label =
        opts.toastLabelOverride ??
        (nextStatus === "in_progress" ? "In Progress" : nextStatus === "done" ? "Done" : "To Do");

      try {
        const updated = await mutation.mutateAsync({ projectId, taskId: task.id, nextStatus });

        // Merge server-returned fields (authoritative timestamps, etc.)
        if (updated?.id) {
          queryClient.setQueriesData({ queryKey: baseKey }, (old: any) =>
            patchTasksContainer(old, task.id, (t) => ({ ...t, ...updated }))
          );
        }

        if (opts.withUndoToast) {
          const prevStatus = task.status;
          const prevStartedAt = task.started_at ?? null;
          const prevCompletedAt = task.completed_at ?? null;

          showToast(`Moved \"${task.title || "task"}\" to ${label}.`, "info", 7000, {
            label: "Undo",
            onClick: async () => {
              // Undo should be silent (avoid infinite undo-toasts)
              await setStatus(
                { ...task, status: nextStatus, started_at: ts.started_at, completed_at: ts.completed_at },
                prevStatus,
                {
                  projectId,
                  withUndoToast: false,
                  toastLabelOverride:
                    prevStatus === "in_progress" ? "In Progress" : prevStatus === "done" ? "Done" : "To Do",
                  optimisticLocal: opts.optimisticLocalRollback,
                  optimisticLocalRollback: opts.optimisticLocal,
                }
              );

              // Restore timestamps optimistically and in cache for undo target
              const undoTs = computeOptimisticTimestamps({
                prevStatus: nextStatus,
                nextStatus: prevStatus,
                prevStartedAt,
                prevCompletedAt,
                nowIso: new Date().toISOString(),
              });
              queryClient.setQueriesData({ queryKey: baseKey }, (old: any) =>
                patchTasksContainer(old, task.id, (t) => ({ ...t, status: prevStatus, ...undoTs }))
              );

              showToast("Reverted.", "success", 2500);
            },
          });
        }

        return updated;
      } catch (err) {
        // Rollback cache
        (previous as Array<[unknown, unknown]>).forEach(([key, data]) => {
          queryClient.setQueryData(key as any, data);
        });
        // Rollback local
        opts.optimisticLocalRollback?.();
        showToast("Failed to move task. Please try again.", "error");
        throw err;
      }
    },
    [defaultProjectId, mutation, queryClient, showToast]
  );

  const moveNext = useCallback(
    async (task: TaskStatusFlowTask, opts: SetStatusOptions = {}) => {
      const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : null;
      if (!next) return;
      return setStatus(task, next, opts);
    },
    [setStatus]
  );

  return {
    setStatus,
    moveNext,
    isPending: mutation.isPending,
  };
}

