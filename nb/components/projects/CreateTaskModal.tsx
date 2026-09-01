"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { createTaskSchema, type CreateTaskInput } from "@/lib/validations/task";
import TaskTemplates from "@/components/tasks/TaskTemplates";
import { useToast } from "@/components/ui-custom/Toast";
import { useProjectSprints } from "@/hooks/queries/useProjectSprints";
import {
  X,
  Plus,
  Bug,
  Lightbulb,
  BookOpen,
  CheckSquare,
  Layers,

  Calendar,
  User,
  Tag,
  ChevronDown,
  Zap,
  AlertCircle,
  Target,
} from "lucide-react";

// Types
interface Member {
  user_id: string;
  profiles: {
    full_name: string | null;
    username: string | null;
  };
}

interface CreateTaskModalProps {
  projectId: string;
  members: Member[];
  currentUserId: string | null;
  defaultSprintId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Task type configurations
const taskTypes = [
  { value: "bug", label: "Bug", icon: Bug, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  { value: "feature", label: "Feature", icon: Lightbulb, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  { value: "story", label: "Story", icon: BookOpen, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  { value: "task", label: "Task", icon: CheckSquare, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  { value: "epic", label: "Epic", icon: Layers, color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
] as const;

// Priority configurations
const priorities = [
  { value: "low", label: "Low", color: "text-zinc-600 dark:text-zinc-400", bgColor: "bg-zinc-100 dark:bg-zinc-800", icon: Target },
  { value: "medium", label: "Medium", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", icon: Target },
  { value: "high", label: "High", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30", icon: Zap },
  { value: "urgent", label: "Urgent", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30", icon: AlertCircle },
] as const;

export default function CreateTaskModal({
  projectId,
  members,
  currentUserId: _currentUserId,
  defaultSprintId = null,
  onClose,
  onSuccess,
}: CreateTaskModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Custom temporary state for interactions not fully handled by hook form natively (like subtask simple list builder)
  const [newSubtask, setNewSubtask] = useState("");
  const [newTag, setNewTag] = useState("");

  const { control, register, handleSubmit, setValue, reset, getValues, formState: { errors } } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema) as any,
    defaultValues: {
      project_id: projectId,
      sprint_id: defaultSprintId,
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      type: "task",
      story_points: null,
      tags: [],
      assigned_to: null,
      due_date: null,
      subtasks: [],
      label_ids: [],
      watcher_ids: [],
      metadata: {},
    }
  });

  const currentTags = useWatch({ control, name: "tags" }) ?? [];
  const currentSubtasks = useWatch({ control, name: "subtasks" }) ?? [];
  const sprintId = useWatch({ control, name: "sprint_id" });
  const { data: sprints = [] } = useProjectSprints(projectId);

  // Keep project ID in sync if props change (unlikely for modal but good practice)
  useEffect(() => {
    setValue("project_id", projectId);
  }, [projectId, setValue]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape-to-close (disabled while submitting)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (submitting) return;
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, submitting]);

  // Basic focus trap (Tab cycles within modal)
  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first?.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last?.focus();
    }
  };

  // Default to active sprint if none chosen and an active exists.
  useEffect(() => {
    if (defaultSprintId) return;
    if (sprintId != null) return;
    const active = sprints.find((s) => s.status === "active");
    if (active?.id) setValue("sprint_id", active.id);
  }, [defaultSprintId, sprintId, sprints, setValue]);

  const onSubmit = async (data: CreateTaskInput) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create task");
      }

      onSuccess();
      showToast("Task created", "success");

      if (createAnother) {
        // Reset task-specific fields; keep context (sprint/points/priority/type/assignee)
        const nextSprintId = getValues("sprint_id") ?? null;
        const nextPriority = getValues("priority") ?? "medium";
        const nextType = getValues("type") ?? "task";
        const nextAssignee = getValues("assigned_to") ?? null;
        const nextStoryPoints = getValues("story_points") ?? null;

        reset({
          project_id: projectId,
          sprint_id: nextSprintId,
          title: "",
          description: "",
          status: "todo",
          priority: nextPriority,
          type: nextType,
          story_points: nextStoryPoints,
          tags: [],
          assigned_to: nextAssignee,
          due_date: null,
          subtasks: [],
          label_ids: [],
          watcher_ids: [],
          metadata: {},
        });
        setShowAdvanced(false);
        setNewSubtask("");
        setNewTag("");
        return;
      }

      onClose();
    } catch (error: any) {
      console.error("Error creating task:", error);
      showToast(error?.message || "Failed to create task. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !currentTags.includes(newTag.trim())) {
      setValue("tags", [...currentTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue("tags", currentTags.filter(t => t !== tagToRemove));
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setValue("subtasks", [...currentSubtasks, { title: newSubtask.trim() }]);
      setNewSubtask("");
    }
  };

  const removeSubtask = (index: number) => {
    setValue("subtasks", currentSubtasks.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          if (submitting) return;
          onClose();
        }}
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
        onKeyDown={handleDialogKeyDown}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0 bg-white dark:bg-zinc-900 z-10">
          <h2 id="create-task-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Create New Task
          </h2>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (submitting) return;
              onClose();
            }}
            className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="create-task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Sprint & Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                control={control}
                name="sprint_id"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-indigo-500" />
                      Sprint
                    </label>
                    <select
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? e.target.value : null)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Backlog (no sprint)</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.status === "active" ? `Active: ${s.name}` : s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              />

              <Controller
                control={control}
                name="story_points"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-emerald-500" />
                      Story points
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      placeholder="e.g. 1, 2, 3, 5"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    {errors.story_points && (
                      <p className="text-xs text-red-500">{errors.story_points.message as any}</p>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Title */}
            <div>
              <input
                {...register("title")}
                placeholder="Task title"
                className="w-full text-xl font-semibold bg-transparent border-none placeholder-zinc-400 focus:ring-0 p-0 text-zinc-900 dark:text-zinc-100"
                autoFocus
              />
              {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            {/* Type & Priority Row */}
            <div className="flex gap-4">
              {/* Type Selector */}
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <div className="relative group">
                    <select
                      {...field}
                      value={field.value || "task"}
                      className="appearance-none pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      {taskTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {taskTypes.find(t => t.value === field.value)?.icon && (
                        (() => {
                          const Icon = taskTypes.find(t => t.value === field.value)!.icon;
                          return <Icon className={`w-4 h-4 ${taskTypes.find(t => t.value === field.value)?.color}`} />;
                        })()
                      )}
                    </div>
                  </div>
                )}
              />

              {/* Priority Selector */}
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <div className="relative group">
                    <select
                      {...field}
                      className="appearance-none pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer capitalize"
                    >
                      {priorities.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {priorities.find(p => p.value === field.value)?.icon && (
                        (() => {
                          const Icon = priorities.find(p => p.value === field.value)!.icon;
                          return <Icon className={`w-4 h-4 ${priorities.find(p => p.value === field.value)?.color}`} />;
                        })()
                      )}
                    </div>
                  </div>
                )}
              />
            </div>

            {/* Description (always visible) */}
            <div>
              <textarea
                {...register("description")}
                placeholder="Add a short description..."
                rows={3}
                className="w-full bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/50 rounded-lg p-4 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
              />
              {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>}
            </div>

            {/* Meta Info Grid (Fast mode fields) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Assignee */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Assignee</label>
                <Controller
                  control={control}
                  name="assigned_to"
                  render={({ field }) => (
                    <div className="relative">
                      <select
                        className="w-full appearance-none pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      >
                        <option value="">Unassigned</option>
                        {members.map(m => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.profiles.full_name || m.profiles.username}
                          </option>
                        ))}
                      </select>
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    </div>
                  )}
                />
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Due Date</label>
                <Controller
                  control={control}
                  name="due_date"
                  render={({ field }) => {
                    const toDateInput = (iso: string) => {
                      const d = new Date(iso);
                      if (Number.isNaN(d.getTime())) return "";
                      return d.toISOString().slice(0, 10);
                    };
                    const toIsoUtc = (ymd: string) => {
                      const [y, m, d] = ymd.split("-").map((n) => Number(n));
                      if (!y || !m || !d) return null;
                      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).toISOString();
                    };

                    return (
                      <div className="relative">
                        <input
                          type="date"
                          value={field.value ? toDateInput(field.value) : ""}
                          onChange={(e) => field.onChange(e.target.value ? toIsoUtc(e.target.value) : null)}
                          className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-zinc-900 dark:text-zinc-100"
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      </div>
                    );
                  }}
                />
              </div>
            </div>

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              {showAdvanced ? "Hide advanced fields" : "Add more details"}
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence initial={false}>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="space-y-6"
                >
                  {/* Templates */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    <TaskTemplates
                      projectId={projectId}
                      onSelectTemplate={(t) => {
                        setValue("title", t.title);
                        setValue("description", t.task_description || "");
                        // TaskTemplates priority is string; schema allows it
                        // @ts-ignore
                        setValue("priority", t.priority);
                        setValue("tags", t.tags || []);
                        setShowAdvanced(true);
                      }}
                    />
                  </div>

                  {/* Subtasks */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                      <CheckSquare className="w-3.5 h-3.5" />
                      Subtasks
                    </label>

                    <div className="space-y-2">
                      {currentSubtasks.map((st, idx) => (
                        <div key={idx} className="flex items-center gap-2 group">
                          <div className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-600" />
                          <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{st.title}</span>
                          <button type="button" onClick={() => removeSubtask(idx)} className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-zinc-400" />
                        <input
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addSubtask();
                            }
                          }}
                          placeholder="Add subtask..."
                          className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 placeholder-zinc-400 dark:text-zinc-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5" />
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {currentTags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          #{tag}
                          <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="Add tag..."
                        className="bg-transparent border-none p-0 text-sm w-24 focus:ring-0 placeholder-zinc-400 dark:text-zinc-200"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between gap-3 flex-shrink-0">
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 select-none">
            <input
              type="checkbox"
              checked={createAnother}
              onChange={(e) => setCreateAnother(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
            />
            Create & add another
          </label>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-task-form"
              disabled={submitting}
              className="px-6 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
