import { create } from "zustand";

export type TaskDrawerSource =
  | "project_pulse"
  | "project_dashboard"
  | "project_tasks"
  | "deep_link"
  | "other";

export type TaskDrawerCloseStrategy = "back" | "replace";

export interface TaskDrawerSnapshot {
  id: string;
  project_id?: string;
  title?: string;
  status?: string;
  priority?: string;
  assigned_to?: string | null;
  due_date?: string | null;
  [key: string]: unknown;
}

interface TaskDrawerState {
  isOpen: boolean;
  taskId: string | null;
  projectId: string | null;
  source: TaskDrawerSource | null;
  closeStrategy: TaskDrawerCloseStrategy;
  snapshot: TaskDrawerSnapshot | null;

  open: (args: {
    taskId: string;
    projectId?: string | null;
    source?: TaskDrawerSource;
    closeStrategy?: TaskDrawerCloseStrategy;
    snapshot?: TaskDrawerSnapshot | null;
  }) => void;

  close: () => void;
  setSnapshot: (snapshot: TaskDrawerSnapshot | null) => void;
}

export const useTaskDrawerStore = create<TaskDrawerState>((set) => ({
  isOpen: false,
  taskId: null,
  projectId: null,
  source: null,
  closeStrategy: "replace",
  snapshot: null,

  open: ({ taskId, projectId = null, source = "other", closeStrategy = "replace", snapshot = null }) =>
    set({
      isOpen: true,
      taskId,
      projectId,
      source,
      closeStrategy,
      snapshot,
    }),

  close: () =>
    set({
      isOpen: false,
      taskId: null,
      projectId: null,
      source: null,
      closeStrategy: "replace",
      snapshot: null,
    }),

  setSnapshot: (snapshot) => set({ snapshot }),
}));

