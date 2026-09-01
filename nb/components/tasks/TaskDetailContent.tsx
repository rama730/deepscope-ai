"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateTasksAction } from "@/app/(main)/projects/[id]/actions";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectSprints } from "@/hooks/queries/useProjectSprints";
import { useToast } from "@/components/ui-custom/Toast";
import { SectionErrorBoundary } from "@/components/common/SectionErrorBoundary";
import {
  X,
  ChevronRight,
  Clock,
  Calendar,
  Users,
  Tag,
  CheckSquare,
  MessageCircle,
  Activity,
  Edit3,
  Trash2,
  Archive,
  CheckCircle2,
  Circle,
  Plus,
  Send,
  Flame,
  Target,
  Paperclip,
  FileText,
  Download,
} from "lucide-react";
import DragDropUpload from "@/components/files/DragDropUpload";

export interface TaskDetailTask {
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
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  started_at: string | null;
  transition_message: string | null;
  assigned_profile?: { full_name: string | null; username: string | null };
  creator_profile?: { full_name: string | null; username: string | null };
}

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url?: string | null;
  };
}

export interface TaskDetailMember {
  user_id: string;
  profiles: { full_name: string | null; username: string | null };
}

interface Label {
  id: string;
  project_id: string;
  name: string;
  color: string;
}

export interface TaskDetailContentProps {
  task: TaskDetailTask;
  projectId: string;
  members: TaskDetailMember[];
  currentUserId: string | null;
  projectCreatorId?: string;
  isOwnerOrMember: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete?: () => void;
}

interface ProjectFile {
  id: string;
  name: string;
  file_url: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  uploaded_by_profile?: { full_name: string | null; username: string | null };
}

type ActiveTab = "details" | "subtasks" | "comments" | "activity" | "files";

export default function TaskDetailContent({
  task,
  projectId,
  members,
  currentUserId,
  projectCreatorId,
  isOwnerOrMember,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailContentProps) {
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();

  const [currentProfile, setCurrentProfile] = useState<{
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null>(null);
  type CurrentProfile = NonNullable<typeof currentProfile>;

  // Task state
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState(task?.status || "todo");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || "");
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.split("T")[0] : "");
  const [sprintId, setSprintId] = useState<string>(task?.sprint_id || "");
  const [storyPoints, setStoryPoints] = useState<number | null>(task?.story_points ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("details");
  const { data: sprints = [] } = useProjectSprints(projectId);

  // Update local state when task prop changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || "todo");
      setPriority(task.priority || "medium");
      setAssignedTo(task.assigned_to || "");
      setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
      setSprintId(task.sprint_id || "");
      setStoryPoints(task.story_points ?? null);
    }
  }, [task]);

  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Activity (placeholder; future)
  const [_activities, _setActivities] = useState<any[]>([]);

  // Files
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Labels
  const [labels, setLabels] = useState<Label[]>([]);
  const [taskLabels, setTaskLabels] = useState<string[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6366f1");

  const taskIdRef = useRef<string | null>(task?.id ?? null);
  const loadedRef = useRef({ subtasks: false, comments: false, files: false, labels: false });
  const commentsReloadTimerRef = useRef<number | null>(null);

  const taskId = task?.id ?? null;

  // Load current user's profile (for comment composer avatar)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!currentUserId) {
        setCurrentProfile(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("id", currentUserId)
        .maybeSingle();
      if (!cancelled) setCurrentProfile((data as unknown as CurrentProfile) || null);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, supabase]);

  // Reset loaded flags when switching tasks
  useEffect(() => {
    taskIdRef.current = taskId;
    loadedRef.current = { subtasks: false, comments: false, files: false, labels: false };
    setSubtasks([]);
    setComments([]);
    setFiles([]);
    setLabels([]);
    setTaskLabels([]);
  }, [taskId]);

  // Lazy-load tab data (once per tab per task)
  useEffect(() => {
    if (!taskId) return;

    if (activeTab === "subtasks" && !loadedRef.current.subtasks) {
      loadedRef.current.subtasks = true;
      void loadSubtasks(taskId);
      return;
    }

    if (activeTab === "comments" && !loadedRef.current.comments) {
      loadedRef.current.comments = true;
      void loadComments(taskId);
      return;
    }

    if (activeTab === "files" && !loadedRef.current.files) {
      loadedRef.current.files = true;
      void loadFiles(taskId);
      return;
    }

    // Labels live under Details
    if (activeTab === "details" && !loadedRef.current.labels) {
      loadedRef.current.labels = true;
      void loadLabels(projectId, taskId);
    }
  }, [activeTab, taskId, projectId]);

  // Comments realtime: subscribe only while Comments tab is active.
  useEffect(() => {
    if (!taskId) return;
    if (activeTab !== "comments") return;
    const unsubscribe = subscribeToComments(taskId);
    return unsubscribe;
  }, [activeTab, taskId]);

  async function loadSubtasks(forTaskId: string) {
    setLoadingSubtasks(true);
    const { data, error } = await supabase
      .from("task_subtasks")
      .select("*")
      .eq("task_id", forTaskId)
      .order("created_at", { ascending: true });
    if (taskIdRef.current === forTaskId && !error && data) {
      setSubtasks(data);
    }
    setLoadingSubtasks(false);
  }

  async function loadComments(forTaskId: string) {
    setLoadingComments(true);
    const { data, error } = await supabase
      .from("task_comments")
      .select(`*, user_profile:user_id(full_name, username, avatar_url)`)
      .eq("task_id", forTaskId)
      .order("created_at", { ascending: true });
    if (taskIdRef.current === forTaskId && !error && data) {
      setComments(data);
    }
    setLoadingComments(false);
  }

  function subscribeToComments(forTaskId: string) {
    const channel = supabase
      .channel(`task-${forTaskId}-comments-panel`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${forTaskId}` },
        () => {
          // Micro-batch bursts so we don't refetch on every event.
          if (commentsReloadTimerRef.current != null) return;
          commentsReloadTimerRef.current = window.setTimeout(() => {
            commentsReloadTimerRef.current = null;
            void loadComments(forTaskId);
          }, 250);
        }
      )
      .subscribe();

    return () => {
      if (commentsReloadTimerRef.current != null) {
        clearTimeout(commentsReloadTimerRef.current);
        commentsReloadTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }

  async function loadFiles(forTaskId: string) {
    setLoadingFiles(true);
    const { data, error } = await supabase
      .from("project_files")
      .select(`*, uploaded_by_profile:uploaded_by(full_name, username)`)
      .eq("linked_task_id", forTaskId)
      .order("created_at", { ascending: false });

    if (taskIdRef.current === forTaskId && !error && data) {
      setFiles(data);
    }
    setLoadingFiles(false);
  }

  function handleFileUploaded(_fileIds: string[]) {
    if (task?.id) void loadFiles(task.id);
  }

  async function handleSave() {
    if (saving || !task?.id) return;
    setSaving(true);

    const updates = {
      title,
      description: description || null,
      status,
      priority,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      sprint_id: sprintId || null,
      story_points: storyPoints ?? null,
    };

    const result = await updateTasksAction(projectId, [task.id], updates);

    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error("Error updating task:", result.error);
      showToast("Failed to update task", "error");
    } else {
      onUpdate?.();
      setIsEditing(false);
      showToast("Task updated", "success");
    }
    setSaving(false);
  }

  async function handleClaimAndStart() {
    if (!task?.id) return;
    if (!currentUserId) {
      showToast("Please sign in to claim tasks.", "warning");
      return;
    }
    if (!isOwnerOrMember) {
      showToast("You must be a project member to claim tasks.", "error");
      return;
    }
    if (task.assigned_to) return;
    if (claiming) return;

    setClaiming(true);
    try {
      const result = await updateTasksAction(projectId, [task.id], {
        assigned_to: currentUserId,
        status: "in_progress",
      });
      if (!result.success) throw result.error;
      showToast("Claimed task and started it.", "success");
      onUpdate?.();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Claim task failed:", err);
      showToast("Failed to claim task. Please try again.", "error");
    } finally {
      setClaiming(false);
    }
  }

  async function handleAddSubtask() {
    if (!task?.id || !newSubtask.trim()) return;

    const { error } = await supabase.from("task_subtasks").insert({
      task_id: task.id,
      title: newSubtask.trim(),
      completed: false,
    });

    if (!error) {
      setNewSubtask("");
      void loadSubtasks(task.id);
    }
  }

  async function handleToggleSubtask(subtaskId: string, completed: boolean) {
    const { error } = await supabase
      .from("task_subtasks")
      .update({
        completed: !completed,
        completed_at: !completed ? new Date().toISOString() : null,
      })
      .eq("id", subtaskId);

    if (!error && task?.id) {
      void loadSubtasks(task.id);
    }
  }

  async function handleDeleteSubtask(subtaskId: string) {
    const { error } = await supabase.from("task_subtasks").delete().eq("id", subtaskId);
    if (!error && task?.id) {
      void loadSubtasks(task.id);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || !currentUserId || submittingComment || !task?.id) return;

    setSubmittingComment(true);
    const content = newComment.trim();
    setNewComment("");

    const { error } = await supabase.from("task_comments").insert({
      task_id: task.id,
      user_id: currentUserId,
      content,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Error adding comment:", error);
      setNewComment(content);
      showToast("Failed to post comment", "error");
    } else {
      // If user is on comments tab, refresh immediately.
      if (activeTab === "comments") void loadComments(task.id);
    }
    setSubmittingComment(false);
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    await supabase.from("task_comments").delete().eq("id", commentId);
    if (task?.id) void loadComments(task.id);
  }

  // Label functions (kept as-is)
  async function loadLabels(forProjectId: string, forTaskId: string) {
    setLoadingLabels(true);

    const { data: allLabels } = await supabase
      .from("task_labels")
      .select("*")
      .eq("project_id", forProjectId)
      .order("created_at", { ascending: true });

    const { data: assigned } = await supabase
      .from("task_label_assignments")
      .select("label_id")
      .eq("task_id", forTaskId);

    setLabels(Array.isArray(allLabels) ? (allLabels as unknown as Label[]) : []);
    setTaskLabels(
      Array.isArray(assigned)
        ? (assigned as unknown as Array<{ label_id: string }>).map((r) => r.label_id)
        : []
    );
    setLoadingLabels(false);
  }

  async function handleCreateLabel() {
    if (!newLabelName.trim()) return;
    const name = newLabelName.trim();
    setNewLabelName("");

    const { data, error } = await supabase
      .from("task_labels")
      .insert({ project_id: projectId, name, color: newLabelColor })
      .select()
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Error creating label:", error);
      showToast("Failed to create label", "error");
      return;
    }

    setLabels((prev) => [...prev, data as unknown as Label]);
  }

  async function handleToggleLabel(labelId: string) {
    if (!task?.id) return;
    const has = taskLabels.includes(labelId);

    if (has) {
      await supabase.from("task_label_assignments").delete().eq("task_id", task.id).eq("label_id", labelId);
      setTaskLabels((prev) => prev.filter((id) => id !== labelId));
    } else {
      await supabase.from("task_label_assignments").insert({ task_id: task.id, label_id: labelId });
      setTaskLabels((prev) => [...prev, labelId]);
    }
  }

  const priorityConfig = {
    urgent: { label: "Urgent", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", icon: Flame },
    high: { label: "High", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", icon: Target },
    medium: { label: "Medium", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", icon: Circle },
    low: { label: "Low", color: "text-slate-500 dark:text-zinc-400", bg: "bg-slate-50 dark:bg-zinc-800", icon: Circle },
  } as const;

  const statusConfig = {
    todo: { label: "To Do", color: "text-slate-600 dark:text-zinc-400", bg: "bg-slate-100 dark:bg-zinc-800" },
    in_progress: { label: "In Progress", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
    done: { label: "Done", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  } as const;

  const tabs = [
    { id: "details" as ActiveTab, label: "Details", icon: Edit3 },
    { id: "subtasks" as ActiveTab, label: "Subtasks", icon: CheckSquare, count: subtasks.length },
    { id: "comments" as ActiveTab, label: "Comments", icon: MessageCircle, count: comments.length },
    { id: "files" as ActiveTab, label: "Files", icon: Paperclip, count: files.length },
    { id: "activity" as ActiveTab, label: "Activity", icon: Activity },
  ];

  const isCreator = currentUserId === task?.created_by;
  const isProjectOwner = currentUserId === projectCreatorId;
  const canEdit = isCreator || isProjectOwner || isOwnerOrMember;
  const canArchive = isCreator || isProjectOwner || isOwnerOrMember;
  const canPermanentDelete = isProjectOwner;

  async function handleArchiveToggle() {
    if (!task?.id) return;
    if (!canArchive) return;

    const isArchived = !!task.is_deleted;
    const ok = confirm(
      isArchived ? "Restore this task from archive?" : "Archive this task? (It will be hidden from boards by default)"
    );
    if (!ok) return;

    const result = await updateTasksAction(projectId, [task.id], { is_deleted: !isArchived });
    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error("Error archiving task:", result.error);
      showToast("Failed to update archive status", "error");
      return;
    }
    onUpdate?.();
    onClose();
  }

  async function handlePermanentDelete() {
    if (!task?.id) return;
    if (!canPermanentDelete) return;

    if (task.status === "in_progress") {
      const ok = confirm(
        "This task is currently In Progress. It's recommended to archive it instead of deleting.\n\nContinue with permanent delete?"
      );
      if (!ok) return;
    }

    const [chatCountRes, fileCountRes, subCountRes, commentCountRes] = await Promise.all([
      supabase.from("project_chat_messages").select("id", { count: "exact", head: true }).eq("linked_task_id", task.id),
      supabase.from("project_files").select("id", { count: "exact", head: true }).eq("linked_task_id", task.id),
      supabase.from("task_subtasks").select("id", { count: "exact", head: true }).eq("task_id", task.id),
      supabase.from("task_comments").select("id", { count: "exact", head: true }).eq("task_id", task.id),
    ]);

    const chatCount = chatCountRes.count || 0;
    const fileCount = fileCountRes.count || 0;
    const subCount = subCountRes.count || 0;
    const commentCount = commentCountRes.count || 0;

    const confirmMsg =
      `Permanently delete this task?\n\n` +
      `Impact:\n` +
      `- In sprint: ${task.sprint_id ? "Yes" : "No"}\n` +
      `- Linked chat messages: ${chatCount}\n` +
      `- Linked files: ${fileCount}\n` +
      `- Subtasks: ${subCount}\n` +
      `- Comments: ${commentCount}\n\n` +
      `This cannot be undone.`;

    if (!confirm(confirmMsg)) return;

    // Keep history: unlink chat/files from the task before deletion
    await Promise.all([
      chatCount > 0 ? supabase.from("project_chat_messages").update({ linked_task_id: null }).eq("linked_task_id", task.id) : Promise.resolve(),
      fileCount > 0 ? supabase.from("project_files").update({ linked_task_id: null }).eq("linked_task_id", task.id) : Promise.resolve(),
    ]);

    const { error } = await supabase.from("project_tasks").delete().eq("id", task.id);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Error deleting task:", error);
      showToast("Failed to delete task", "error");
      return;
    }

    onDelete?.();
    onClose();
  }

  // Early return if task is not provided
  if (!task) return null;

  // Tab retries (crash-safe)
  const retryDetails = () => {
    if (!taskId) return;
    loadedRef.current.labels = false;
    void loadLabels(projectId, taskId);
  };
  const retrySubtasks = () => {
    if (!taskId) return;
    loadedRef.current.subtasks = false;
    void loadSubtasks(taskId);
  };
  const retryComments = () => {
    if (!taskId) return;
    loadedRef.current.comments = false;
    void loadComments(taskId);
  };
  const retryFiles = () => {
    if (!taskId) return;
    loadedRef.current.files = false;
    void loadFiles(taskId);
  };

  return (
    <>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Task #{task.id.slice(0, 8)}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[status].bg} ${statusConfig[status].color}`}>
                  {statusConfig[status].label}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[priority].bg} ${priorityConfig[priority].color}`}>
                  {priorityConfig[priority].label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            )}
            {canArchive && (
              <button
                onClick={handleArchiveToggle}
                className={`p-2 rounded-lg transition-colors ${task.is_deleted
                  ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  : "text-slate-500 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  }`}
                title={task.is_deleted ? "Restore task" : "Archive task"}
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
            {canPermanentDelete && (
              <button
                onClick={handlePermanentDelete}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete permanently"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${isActive
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs ${isActive
                      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
                      }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <SectionErrorBoundary title="Details" onRetry={retryDetails}>
                {/* --- DETAILS CONTENT (kept from existing panel) --- */}
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Title</label>
                    {isEditing ? (
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    ) : (
                      <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{title}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Description</label>
                    {isEditing ? (
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                      />
                    ) : description ? (
                      <p className="text-sm text-slate-600 dark:text-zinc-400 whitespace-pre-wrap">{description}</p>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-zinc-500 italic">No description provided.</p>
                    )}
                  </div>

                  {/* Core Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Status</label>
                      {isEditing ? (
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as TaskDetailTask["status"])}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {status === "done" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : status === "in_progress" ? (
                            <Clock className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="text-sm text-slate-600 dark:text-zinc-400">{statusConfig[status].label}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Priority</label>
                      {isEditing ? (
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as TaskDetailTask["priority"])}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      ) : (
                        <span className="text-sm text-slate-600 dark:text-zinc-400">{priorityConfig[priority].label}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Assignee</label>
                      {isEditing ? (
                        <select
                          value={assignedTo}
                          onChange={(e) => setAssignedTo(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                        >
                          <option value="">Unassigned</option>
                          {members.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.profiles.full_name || m.profiles.username || m.user_id.slice(0, 8)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span>
                            {task.assigned_profile?.full_name ||
                              task.assigned_profile?.username ||
                              (task.assigned_to ? task.assigned_to.slice(0, 8) : "Unassigned")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Due date</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                        />
                      ) : task.due_date ? (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 dark:text-zinc-500 italic">None</span>
                      )}
                    </div>
                  </div>

                  {/* Sprint + points */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Sprint</label>
                      {isEditing ? (
                        <select
                          value={sprintId}
                          onChange={(e) => setSprintId(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                        >
                          <option value="">Backlog</option>
                          {sprints.map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-slate-600 dark:text-zinc-400">
                          {task.sprint_id ? (sprints.find((s: any) => s.id === task.sprint_id)?.name || "Sprint") : "Backlog"}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Story points</label>
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={storyPoints ?? ""}
                          onChange={(e) => setStoryPoints(e.target.value === "" ? null : Number(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                        />
                      ) : (
                        <span className="text-sm text-slate-600 dark:text-zinc-400">{task.story_points ?? "—"}</span>
                      )}
                    </div>
                  </div>

                  {/* Labels */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-slate-900 dark:text-zinc-100">Labels</label>
                      <button
                        type="button"
                        onClick={() => setShowLabelPicker((v) => !v)}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {showLabelPicker ? "Close" : "Manage"}
                      </button>
                    </div>

                    {loadingLabels ? (
                      <div className="text-xs text-slate-500">Loading labels...</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {taskLabels.length === 0 ? (
                          <span className="text-xs text-slate-400 dark:text-zinc-500 italic">No labels</span>
                        ) : (
                          labels
                            .filter((l) => taskLabels.includes(l.id))
                            .map((l) => (
                              <span
                                key={l.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                                style={{ borderColor: l.color, color: l.color }}
                              >
                                <Tag className="w-3 h-3" />
                                {l.name}
                              </span>
                            ))
                        )}
                      </div>
                    )}

                    {showLabelPicker && (
                      <div className="mt-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            placeholder="New label name"
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                          />
                          <input
                            type="color"
                            value={newLabelColor}
                            onChange={(e) => setNewLabelColor(e.target.value)}
                            className="w-10 h-10 p-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                            title="Label color"
                          />
                          <button
                            type="button"
                            onClick={handleCreateLabel}
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                          >
                            Add
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {labels.map((l) => {
                            const active = taskLabels.includes(l.id);
                            return (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => handleToggleLabel(l.id)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${active
                                  ? "bg-indigo-50 dark:bg-indigo-900/20"
                                  : "bg-white dark:bg-zinc-900"
                                  }`}
                                style={{ borderColor: l.color, color: l.color }}
                              >
                                <Tag className="w-3 h-3" />
                                {l.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick action: Claim & start */}
                  {!task.assigned_to && currentUserId && isOwnerOrMember && task.status !== "done" && (
                    <button
                      type="button"
                      onClick={handleClaimAndStart}
                      disabled={claiming}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {claiming ? "Claiming…" : "Claim & Start"}
                    </button>
                  )}
                </div>
              </SectionErrorBoundary>
            </motion.div>
          )}

          {activeTab === "subtasks" && (
            <motion.div
              key="subtasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <SectionErrorBoundary title="Subtasks" onRetry={retrySubtasks}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Subtasks</h3>
                    <span className="text-xs text-slate-500 dark:text-zinc-400">{subtasks.length}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      placeholder="Add a subtask..."
                      className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubtask}
                      disabled={!newSubtask.trim()}
                      className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {loadingSubtasks ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 bg-slate-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : subtasks.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-zinc-500 italic">No subtasks yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {subtasks.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleSubtask(s.id, s.completed)}
                            className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${s.completed
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 dark:border-zinc-600"
                              }`}
                            title={s.completed ? "Mark incomplete" : "Mark complete"}
                          >
                            {s.completed && <CheckSquare className="w-3.5 h-3.5" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className={`text-sm ${s.completed ? "line-through text-slate-400" : "text-slate-900 dark:text-zinc-100"}`}>
                              {s.title}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSubtask(s.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SectionErrorBoundary>
            </motion.div>
          )}

          {activeTab === "comments" && (
            <motion.div
              key="comments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <SectionErrorBoundary title="Comments" onRetry={retryComments}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Comments</h3>
                    <span className="text-xs text-slate-500 dark:text-zinc-400">{comments.length}</span>
                  </div>

                  {loadingComments ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 bg-slate-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-zinc-500 italic">No comments yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c) => (
                        <div key={c.id} className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                            {c.user_profile?.avatar_url ? (
                              <Image
                                src={c.user_profile.avatar_url}
                                alt="avatar"
                                width={40}
                                height={40}
                                className="w-10 h-10 object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 flex items-center justify-center text-xs font-semibold text-slate-500">
                                {(c.user_profile?.full_name || c.user_profile?.username || "U").slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                                {c.user_profile?.full_name || c.user_profile?.username || "User"}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-400">
                                  {new Date(c.created_at).toLocaleString()}
                                </span>
                                {currentUserId === c.user_id && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(c.id)}
                                    className="text-[10px] text-red-600 hover:underline"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="mt-1 text-sm text-slate-600 dark:text-zinc-400 whitespace-pre-wrap">{c.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                        {currentProfile?.avatar_url ? (
                          <Image
                            src={currentProfile.avatar_url}
                            alt="avatar"
                            width={40}
                            height={40}
                            className="w-10 h-10 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center text-xs font-semibold text-slate-500">
                            {(currentProfile?.full_name || currentProfile?.username || "U").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          rows={2}
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm resize-none"
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            type="button"
                            onClick={handleAddComment}
                            disabled={!newComment.trim() || submittingComment}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Send className="w-4 h-4" />
                            {submittingComment ? "Posting..." : "Post"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionErrorBoundary>
            </motion.div>
          )}

          {activeTab === "files" && (
            <motion.div
              key="files"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 space-y-6"
            >
              <SectionErrorBoundary title="Files" onRetry={retryFiles}>
                <DragDropUpload
                  projectId={projectId}
                  linkedTaskId={task.id}
                  onUploadComplete={handleFileUploaded}
                  category="task_attachment"
                  acceptedTypes={["image/*", "application/pdf", "text/*"]}
                />

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                    Attachments ({files.length})
                  </h3>

                  {loadingFiles ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-16 bg-slate-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : files.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-zinc-500 italic">No files attached yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-lg hover:border-indigo-500 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm font-medium text-slate-900 dark:text-zinc-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              {file.name}
                            </a>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
                              <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                              <span>•</span>
                              <span>{new Date(file.created_at).toLocaleDateString()}</span>
                              <span>by {file.uploaded_by_profile?.full_name || "User"}</span>
                            </div>
                          </div>

                          <a
                            href={file.file_url}
                            download
                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SectionErrorBoundary>
            </motion.div>
          )}

          {activeTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6"
            >
              <SectionErrorBoundary title="Activity">
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">Activity log coming soon</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Track all changes made to this task</p>
                </div>
              </SectionErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer - Save/Cancel when editing */}
      {isEditing && (
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-zinc-800 px-6 py-4 bg-slate-50 dark:bg-zinc-800/50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setTitle(task.title);
                setDescription(task.description || "");
                setStatus(task.status);
                setPriority(task.priority);
                setAssignedTo(task.assigned_to || "");
                setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
                setSprintId(task.sprint_id || "");
                setStoryPoints(task.story_points ?? null);
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-sm font-medium hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

