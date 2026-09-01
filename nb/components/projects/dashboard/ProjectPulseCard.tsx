"use client";

import { useState, useMemo } from "react";
import {
  Activity,
  CheckCircle2,
  FileUp,
  UserPlus,
  Edit,
  GitBranch,

  Search,
  Zap,
  Target,
  Users,
  Clock,
  AlertTriangle,
  Flame,
  Circle,
  ArrowRight,
  Layout
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Virtuoso } from "react-virtuoso";
import EmptyState from "@/components/projects/EmptyState";

// --- Types ---

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  actor?: {
    name: string;
    id?: string;
  } | null;
  created_at: string;
  metadata?: Record<string, any>;
}

interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority?: "low" | "medium" | "high" | "urgent";
  due_date?: string;
  assigned_to?: string;
  assigned_to_profile?: {
    full_name?: string;
    username?: string;
  };
  created_by?: string;
}

interface ProjectPulseCardProps {
  projectId: string;
  activities: ActivityItem[];
  tasks: Task[];
  currentUserId: string | null;
  isCreator: boolean;
  isCollaborator: boolean;

  // Infinite Scroll Utils
  hasMoreActivities?: boolean;
  isLoadingActivities?: boolean;
  onLoadMoreActivities?: () => void;

  onUploadFile: () => void;
  onViewAnalytics: () => void;
  onViewSprints?: () => void;
  onViewSettings?: () => void;
  onTaskClick?: (taskId: string) => void;
  onViewBoard: () => void;
}

type TabType = "focus" | "stream" | "team";

// --- Helpers ---

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getPriorityConfig(priority?: string) {
  switch (priority) {
    case "urgent":
      return {
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        icon: Flame,
      };
    case "high":
      return {
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-900/20",
        icon: AlertTriangle,
      };
    case "medium":
      return {
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
        icon: Target,
      };
    default:
      return {
        color: "text-slate-500 dark:text-zinc-400",
        bgColor: "bg-slate-50 dark:bg-zinc-800/50",
        icon: Circle,
      };
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case "in_progress":
      return { color: "text-blue-600 dark:text-blue-400", icon: Clock };
    case "done":
      return { color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 };
    default:
      return { color: "text-slate-500 dark:text-zinc-400", icon: Circle };
  }
}

function getActivityIcon(type: string) {
  switch (type) {
    case "task_completed":
      return { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/30" };
    case "task_created":
      return { icon: Edit, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/30" };
    case "file_uploaded":
      return { icon: FileUp, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/30" };
    case "member_joined":
      return { icon: UserPlus, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/30" };
    case "member_left":
      return { icon: UserPlus, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/30" };

    case "project_updated":
      return { icon: Edit, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/30" };
    case "commit":
      return { icon: GitBranch, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900/30" };
    default:
      return { icon: Activity, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900/30" };
  }
}

export default function ProjectPulseCard({
  // projectId is kept for interface compatibility (URLs, future hooks), but this component is now pure/prop-driven.
  projectId: _projectId,
  activities: initialActivities = [],
  tasks: initialTasks = [],
  currentUserId,
  onViewBoard,
  onTaskClick,
  hasMoreActivities,
  isLoadingActivities,
  onLoadMoreActivities,
}: ProjectPulseCardProps) {
  const tasks = initialTasks;

  const [activeTab, setActiveTab] = useState<TabType>("focus");
  const [searchQuery, setSearchQuery] = useState("");

  const activities = useMemo(() => initialActivities, [initialActivities]);

  // --- Derived Data ---

  // 1. Focus Tab Data: Tasks relevant to ME
  const focusTasks = useMemo(() => {
    if (!currentUserId) return [];
    return tasks
      .filter((t) => t.status !== "done" && t.assigned_to === currentUserId)
      .sort((a, b) => {
        // Sort by priority then due date
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const pA = priorityOrder[a.priority || "low"] ?? 3;
        const pB = priorityOrder[b.priority || "low"] ?? 3;
        return pA - pB;
      });
  }, [tasks, currentUserId]);

  // 2. Team Tab Data: Unassigned, Blocking, or All Active (if manager)
  const teamTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "done" && !t.assigned_to) // Unassigned tasks
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const pA = priorityOrder[a.priority || "low"] ?? 3;
        const pB = priorityOrder[b.priority || "low"] ?? 3;
        return pA - pB;
      });
  }, [tasks]);

  // 3. Stream Tab Data: Activities
  // If search query exists, we filter locally. If not, we rely on the passed activities (which might include infinite scroll data).
  const filteredActivities = useMemo(() => {
    let filtered = activities;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.description.toLowerCase().includes(q) ||
          a.actor?.name?.toLowerCase().includes(q)
      );
    }
    // Note: Previously this sliced to 10. Now we want to show all (handled by Virtuoso)
    return filtered;
  }, [activities, searchQuery]);

  // --- Render Helpers ---

  const renderTaskItem = (task: Task, context: "focus" | "team") => {
    const priority = getPriorityConfig(task.priority);
    const status = getStatusConfig(task.status);
    const PriorityIcon = priority.icon;
    const StatusIcon = status.icon;

    return (
      <motion.div
        key={task.id}
        layout
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onTaskClick?.(task.id)}
        className="group relative flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-sm cursor-pointer transition-all"
      >
        {/* Status Indicator */}
        <div className={`shrink-0 ${status.color}`}>
          <StatusIcon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-slate-900 dark:text-zinc-100 truncate pr-2">
              {task.title}
            </h4>
            {task.priority && task.priority !== "low" && (
              <div className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${priority.bgColor} ${priority.color}`}>
                <PriorityIcon className="w-3 h-3" />
                <span className="capitalize">{task.priority}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
            {context === "team" && !task.assigned_to && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 px-1.5 py-0.5 rounded">
                <Users className="w-3 h-3" /> Unassigned
              </span>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Chevron on Hover */}
        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200" />
      </motion.div>
    );
  };

  const ActivityRow = (activity: ActivityItem, index: number) => {
    const { icon: Icon, color, bg } = getActivityIcon(activity.type);
    const isLast = index === filteredActivities.length - 1;
    const metaKind = activity.metadata?.kind;

    return (
      <div className="relative flex gap-3 group pb-1"> {/* pb-1 added for spacing in virtual list */}
        {/* Timeline Line */}
        {!isLast && (
          <div className="absolute left-3.5 top-8 bottom-[-4px] w-px bg-slate-100 dark:bg-zinc-800" />
        )}

        {/* Icon */}
        <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-white dark:ring-zinc-950 mt-0.5`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-4">
          <div className="flex justify-between items-start gap-2">
            <p className="text-sm text-slate-600 dark:text-zinc-400 leading-snug">
              {activity.actor && (
                <span className="font-semibold text-slate-900 dark:text-zinc-200 mr-1">
                  {activity.actor.name}
                </span>
              )}
              {activity.description}
            </p>
            <span className="text-[10px] text-slate-400 dark:text-zinc-600 whitespace-nowrap shrink-0 mt-0.5">
              {formatTimeAgo(activity.created_at)}
            </span>
          </div>

          {/* Optional rich details for key project events */}
          {metaKind === "project_created" && activity.metadata?.project && (
            <div className="mt-2 space-y-1">
              {(activity.metadata.project.description || activity.metadata.project.vision) && (
                <p className="text-[12px] text-slate-500 dark:text-zinc-500 leading-snug line-clamp-3">
                  {activity.metadata.project.vision || activity.metadata.project.description}
                </p>
              )}
              {Array.isArray(activity.metadata.project.technologies_used) &&
                activity.metadata.project.technologies_used.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {activity.metadata.project.technologies_used.slice(0, 6).map((tech: string) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                      >
                        {tech}
                      </span>
                    ))}
                    {activity.metadata.project.technologies_used.length > 6 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                        +{activity.metadata.project.technologies_used.length - 6}
                      </span>
                    )}
                  </div>
                )}
            </div>
          )}

          {metaKind === "project_update" && typeof activity.metadata?.content === "string" && activity.metadata.content.trim() && (
            <p className="mt-2 text-[12px] text-slate-500 dark:text-zinc-500 leading-snug line-clamp-3">
              {activity.metadata.content}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col h-full min-h-[320px] max-h-[500px]">
      {/* Header & Tabs */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800/50 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Activity className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Project Pulse</h3>
            </div>
          </div>

          {/* Quick Actions (Mini) */}
          <div className="flex items-center gap-1">
            {activeTab === "stream" && (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-20 focus:w-32 transition-all pl-7 pr-2 py-0.5 text-[10px] bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Smart Tabs */}
        <div className="flex gap-1 p-0.5 bg-slate-100/50 dark:bg-zinc-900/50 rounded-lg">
          <button
            onClick={() => setActiveTab("focus")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-[10px] font-medium transition-all ${activeTab === "focus"
              ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-zinc-700"
              : "text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50"
              }`}
          >
            <Zap className="w-3 h-3" />
            <span>My Focus</span>
            {focusTasks.length > 0 && (
              <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1 rounded-full text-[9px] min-w-[14px] text-center">
                {focusTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("stream")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-[10px] font-medium transition-all ${activeTab === "stream"
              ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-zinc-700"
              : "text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50"
              }`}
          >
            <Layout className="w-3 h-3" />
            <span>Stream</span>
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-[10px] font-medium transition-all ${activeTab === "team"
              ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-zinc-700"
              : "text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50"
              }`}
          >
            <Users className="w-3 h-3" />
            <span>Team</span>
            {teamTasks.length > 0 && (
              <span className="bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 px-1 rounded-full text-[9px] min-w-[14px] text-center">
                {teamTasks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-2 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === "focus" && (
            <motion.div
              key="focus"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-1.5 h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800"
            >
              {focusTasks.length > 0 ? (
                <>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-zinc-400 mb-0.5 px-1">
                    <span>Assigned to you</span>
                    <span>Priority ordered</span>
                  </div>
                  {focusTasks.map(t => renderTaskItem(t, "focus"))}
                </>
              ) : (
                <EmptyState
                  icon={Zap}
                  title="All caught up!"
                  description="You have no pending tasks assigned to you."
                  compact
                />
              )}
            </motion.div>
          )}

          {activeTab === "stream" && (
            <motion.div
              key="stream"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="pl-2 h-full"
            >
              {filteredActivities.length > 0 ? (
                <Virtuoso
                  style={{ height: '100%' }}
                  data={filteredActivities}
                  endReached={!searchQuery && hasMoreActivities ? onLoadMoreActivities : undefined} // Only load more if not searching
                  overscan={200}
                  itemContent={(index, activity) => ActivityRow(activity, index)}
                  components={{
                    Footer: () => (
                      isLoadingActivities ? (
                        <div className="flex justify-center py-2">
                          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : null
                    )
                  }}
                />
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No activity yet"
                  description="Project updates will appear here."
                  compact
                />
              )}
            </motion.div>
          )}

          {activeTab === "team" && (
            <motion.div
              key="team"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 0, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-1.5 h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800"
            >
              {teamTasks.length > 0 ? (
                <>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-zinc-400 mb-0.5 px-1">
                    <span>Unassigned Tasks</span>
                    <span>Needs attention</span>
                  </div>
                  {teamTasks.map(t => renderTaskItem(t, "team"))}
                </>
              ) : (
                <EmptyState
                  icon={Users}
                  title="Team is clear"
                  description="No unassigned tasks found."
                  compact
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 rounded-b-2xl shrink-0">
        <button
          onClick={onViewBoard}
          className="w-full flex items-center justify-center gap-1.5 py-1 rounded-md text-[10px] font-medium text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 transition-all shadow-sm hover:shadow"
        >
          Go to Task Board <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
