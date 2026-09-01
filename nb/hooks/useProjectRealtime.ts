import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/useSubscription";
import { projectKeys } from "@/lib/queryKeys";
import { perfTracker } from "@/lib/performance/measure";

type AnyRecord = Record<string, any>;

type ProjectRealtimeOptions = {
  enabled?: boolean;
  currentUserId?: string | null;
  onFollowersDelta?: (delta: number, payload: AnyRecord) => void;
  onFollowingChanged?: (following: boolean) => void;
};

function createRafBatch(cb: () => void) {
  // Micro-batch bursts to avoid render storms while keeping strict realtime.
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      cb();
    });
  };
}

export function useProjectRealtime(projectId: string | null, options: ProjectRealtimeOptions = {}) {
  const queryClient = useQueryClient();

  const filter = useMemo(() => (projectId ? `project_id=eq.${projectId}` : undefined), [projectId]);
  const isEnabled = !!projectId && (options.enabled ?? true);

  // Batch counters for perf visibility
  const batchStatsRef = useRef({ tasks: 0, files: 0, updates: 0, activity: 0, followers: 0 });
  const invalidateRef = useRef({ tasks: false, files: false, updates: false, activity: false, project: false });

  // Flush batched invalidations (keeps strict correctness but avoids per-event thrash)
  const flushBatched = useMemo(
    () =>
      createRafBatch(() => {
        if (!projectId) return;
        const baseTasksKey = [...projectKeys.detail(projectId), "tasks"] as const;
        if (invalidateRef.current.tasks) {
          queryClient.invalidateQueries({ queryKey: baseTasksKey });
        }
        if (invalidateRef.current.files) {
          queryClient.invalidateQueries({ queryKey: projectKeys.files(projectId) });
        }
        if (invalidateRef.current.updates) {
          queryClient.invalidateQueries({ queryKey: projectKeys.updates(projectId) });
        }
        if (invalidateRef.current.activity) {
          queryClient.invalidateQueries({ queryKey: projectKeys.activity(projectId) });
        }
        if (invalidateRef.current.project) {
          queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        }
        invalidateRef.current = { tasks: false, files: false, updates: false, activity: false, project: false };

        const stats = batchStatsRef.current;
        perfTracker.end("project-realtime-batch", { ...stats, projectId });
        // Start the next batch window immediately so subsequent events produce sane durations.
        perfTracker.start("project-realtime-batch", { projectId });
        batchStatsRef.current = { tasks: 0, files: 0, updates: 0, activity: 0, followers: 0 };
      }),
    [projectId, queryClient]
  );

  useEffect(() => {
    if (!isEnabled) return;
    perfTracker.start("project-realtime-batch", { projectId });
    return () => {
      // Ensure a final flush metadata end if something unmounts mid-batch
      perfTracker.end("project-realtime-batch", { ...batchStatsRef.current, projectId, unmounted: true });
    };
  }, [isEnabled, projectId]);

  // --- TASKS: apply deltas to all cached task queries for this project ---
  useSubscription<AnyRecord>({
    table: "project_tasks",
    event: "*",
    filter,
    enabled: isEnabled,
    onData: (payload: any) => {
      batchStatsRef.current.tasks += 1;

      const eventType = (payload as any).eventType || (payload.new && !payload.old ? "INSERT" : payload.old && !payload.new ? "DELETE" : "UPDATE");
      const newRow = payload.new as AnyRecord | null | undefined;
      const oldRow = payload.old as AnyRecord | null | undefined;

      // Update cached task lists for UPDATE/DELETE (safe by id). INSERT can affect pagination/sorts, so invalidate.
      const baseKey = [...projectKeys.detail(projectId as string), "tasks"] as const;
      if (eventType === "UPDATE" && newRow?.id) {
        queryClient.setQueriesData({ queryKey: baseKey }, (old: any) => {
          if (!old || !Array.isArray(old.data)) return old;
          return { ...old, data: old.data.map((t: any) => (t.id === newRow.id ? { ...t, ...newRow } : t)) };
        });
      } else if (eventType === "DELETE") {
        const id = (oldRow as any)?.id;
        if (id) {
          queryClient.setQueriesData({ queryKey: baseKey }, (old: any) => {
            if (!old || !Array.isArray(old.data)) return old;
            return { ...old, data: old.data.filter((t: any) => t.id !== id) };
          });
        }
      }

      invalidateRef.current.tasks = true;
      flushBatched();
    },
  });

  // --- FILES: apply deltas to cached files list ---
  useSubscription<AnyRecord>({
    table: "project_files",
    event: "*",
    filter,
    enabled: isEnabled,
    onData: (payload: any) => {
      batchStatsRef.current.files += 1;

      const eventType = (payload as any).eventType || (payload.new && !payload.old ? "INSERT" : payload.old && !payload.new ? "DELETE" : "UPDATE");
      const newRow = payload.new as AnyRecord | null | undefined;
      const oldRow = payload.old as AnyRecord | null | undefined;

      const key = projectKeys.files(projectId as string);
      if (eventType === "UPDATE" && newRow?.id) {
        queryClient.setQueryData(key, (old: any) => {
          const list = Array.isArray(old) ? old : [];
          return list.map((f: any) => (f.id === newRow.id ? { ...f, ...newRow } : f));
        });
      } else if (eventType === "DELETE") {
        const id = (oldRow as any)?.id;
        if (id) {
          queryClient.setQueryData(key, (old: any) => {
            const list = Array.isArray(old) ? old : [];
            return list.filter((f: any) => f.id !== id);
          });
        }
      }

      invalidateRef.current.files = true;
      flushBatched();
    },
  });

  // --- UPDATES: invalidate (simple + correct) ---
  useSubscription<AnyRecord>({
    table: "project_updates",
    event: "*",
    filter,
    enabled: isEnabled,
    onData: () => {
      batchStatsRef.current.updates += 1;
      invalidateRef.current.updates = true;
      flushBatched();
    },
  });

  // --- ACTIVITY EVENTS: invalidate (simple + correct) ---
  useSubscription<AnyRecord>({
    table: "project_activity_events",
    event: "INSERT",
    filter,
    enabled: isEnabled,
    onData: (payload: any) => {
      batchStatsRef.current.activity += 1;

      // Optimistically prepend new event if present
      const newRow = payload.new as AnyRecord | null | undefined;
      const key = projectKeys.activity(projectId as string);
      if (newRow?.id) {
        queryClient.setQueryData(key, (old: any) => {
          const list = Array.isArray(old) ? old : [];
          if (list.some((e: any) => e.id === newRow.id)) return old;
          return [newRow, ...list];
        });
      }

      invalidateRef.current.activity = true;
      flushBatched();
    },
  });

  // --- FOLLOWERS: leave count state handling to ProjectDashboardClient, but keep cache fresh ---
  useSubscription<AnyRecord>({
    table: "project_followers",
    event: "*",
    filter,
    enabled: isEnabled,
    onData: (payload: any) => {
      batchStatsRef.current.followers += 1;

      const eventType = (payload as any).eventType || (payload.new && !payload.old ? "INSERT" : payload.old && !payload.new ? "DELETE" : "UPDATE");
      const newRow = payload.new as AnyRecord | null | undefined;
      const oldRow = payload.old as AnyRecord | null | undefined;

      if (eventType === "INSERT") {
        options.onFollowersDelta?.(1, payload);
        if (options.currentUserId && newRow?.user_id === options.currentUserId) {
          options.onFollowingChanged?.(true);
        }
      } else if (eventType === "DELETE") {
        options.onFollowersDelta?.(-1, payload);
        if (options.currentUserId && oldRow?.user_id === options.currentUserId) {
          options.onFollowingChanged?.(false);
        }
      }

      // Project detail query includes counts/fields that should stay consistent
      invalidateRef.current.project = true;
      flushBatched();
    },
  });
}

