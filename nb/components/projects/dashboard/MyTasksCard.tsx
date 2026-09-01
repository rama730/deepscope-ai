"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Target,
  Flame,
  User,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
}

type TaskFilter = "my" | "all";

interface MyTasksCardProps {
  tasks: Task[];
  currentUserId: string | null;
  onViewBoard: () => void;
  onTaskClick?: (taskId: string) => void;
}

function getPriorityConfig(priority?: string) {
  switch (priority) {
    case "urgent":
      return {
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-200 dark:border-red-800",
        icon: Flame,
      };
    case "high":
      return {
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-900/20",
        borderColor: "border-orange-200 dark:border-orange-800",
        icon: AlertTriangle,
      };
    case "medium":
      return {
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
        borderColor: "border-amber-200 dark:border-amber-800",
        icon: Target,
      };
    default:
      return {
        color: "text-slate-500 dark:text-zinc-400",
        bgColor: "bg-slate-50 dark:bg-zinc-800/50",
        borderColor: "border-slate-200 dark:border-zinc-700",
        icon: Circle,
      };
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case "in_progress":
      return {
        color: "text-blue-600 dark:text-blue-400",
        icon: Clock,
      };
    case "done":
      return {
        color: "text-emerald-600 dark:text-emerald-400",
        icon: CheckCircle2,
      };
    default:
      return {
        color: "text-slate-500 dark:text-zinc-400",
        icon: Circle,
      };
  }
}

function formatDueDate(dateString?: string): { text: string; isOverdue: boolean; isDueSoon: boolean } {
  if (!dateString) return { text: "", isOverdue: false, isDueSoon: false };

  const now = new Date();
  const dueDate = new Date(dateString);
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d late`, isOverdue: true, isDueSoon: false };
  } else if (diffDays === 0) {
    return { text: "Today", isOverdue: false, isDueSoon: true };
  } else if (diffDays === 1) {
    return { text: "Tmrw", isOverdue: false, isDueSoon: true };
  } else if (diffDays <= 3) {
    return { text: `${diffDays}d`, isOverdue: false, isDueSoon: true };
  } else {
    return {
      text: dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isOverdue: false,
      isDueSoon: false,
    };
  }
}

export default function MyTasksCard({
  tasks,
  currentUserId,
  onViewBoard,
  onTaskClick,
}: MyTasksCardProps) {
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("my");

  const filteredTasks = (() => {
    const activeTasks = tasks.filter((task) => task.status !== "done");
    switch (taskFilter) {
      case "my":
        return activeTasks.filter((task) => task.assigned_to === currentUserId);
      case "all":
        return activeTasks;
      default:
        return activeTasks.filter((task) => task.assigned_to === currentUserId);
    }
  })();

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
    if (aPriority !== bPriority) return aPriority - bPriority;
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  const myTasksCount = tasks.filter((task) => task.assigned_to === currentUserId && task.status !== "done").length;
  const allTasksCount = tasks.filter((task) => task.status !== "done").length;

  const taskFilters = [
    { id: "my" as TaskFilter, label: "My Tasks", icon: User, count: myTasksCount },
    { id: "all" as TaskFilter, label: "All", icon: Users, count: allTasksCount },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col h-fit"
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center">
            <Target className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Tasks</h3>
        </div>

        {/* Compact Tabs */}
        <div className="flex bg-slate-100 dark:bg-zinc-800 rounded-lg p-0.5">
          {taskFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setTaskFilter(filter.id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${taskFilter === filter.id
                  ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-sm"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-700"
                }`}
            >
              <span>{filter.label}</span>
              <span className="bg-slate-200 dark:bg-zinc-600 px-1 rounded-full text-[9px]">{filter.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="px-2 py-2 flex-1 overflow-y-auto min-h-0 max-h-[600px]">
        {sortedTasks.length > 0 ? (
          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {sortedTasks.map((task, index) => {
                const priorityConfig = getPriorityConfig(task.priority);
                const statusConfig = getStatusConfig(task.status);
                const dueInfo = formatDueDate(task.due_date);
                const StatusIcon = statusConfig.icon;
                const PriorityIcon = priorityConfig.icon;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    layout
                    onClick={() => onTaskClick?.(task.id)}
                    className="group flex items-center gap-2 p-1.5 rounded-lg border border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <div className={`shrink-0 ${statusConfig.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-zinc-100 truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1">
                          <PriorityIcon className={`w-2 h-2 ${priorityConfig.color}`} />
                        </div>
                        {dueInfo.text && (
                          <span className={`text-[10px] font-medium ${dueInfo.isOverdue ? "text-red-500" : "text-slate-400"
                            }`}>
                            {dueInfo.text}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">All caught up!</p>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="p-1.5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 shrink-0">
        <button
          onClick={onViewBoard}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
        >
          View Board <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}
