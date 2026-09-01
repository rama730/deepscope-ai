"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  type: "task" | "milestone" | "project";
  priority?: "low" | "medium" | "high" | "urgent";
  projectName?: string;
  isCompleted?: boolean;
}

interface UpcomingDeadlinesProps {
  deadlines: Deadline[];
  maxItems?: number;
  onDeadlineClick?: (deadline: Deadline) => void;
  onViewAll?: () => void;
  className?: string;
}

function formatDeadline(dateString: string): {
  text: string;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean;
  daysRemaining: number;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(dateString);
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  
  const diffMs = dueDateOnly.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      text: daysRemaining === -1 ? "Yesterday" : `${Math.abs(daysRemaining)} days overdue`,
      isOverdue: true,
      isDueToday: false,
      isDueSoon: false,
      daysRemaining,
    };
  }
  
  if (daysRemaining === 0) {
    return {
      text: "Today",
      isOverdue: false,
      isDueToday: true,
      isDueSoon: true,
      daysRemaining,
    };
  }
  
  if (daysRemaining === 1) {
    return {
      text: "Tomorrow",
      isOverdue: false,
      isDueToday: false,
      isDueSoon: true,
      daysRemaining,
    };
  }
  
  if (daysRemaining <= 7) {
    return {
      text: `${daysRemaining} days`,
      isOverdue: false,
      isDueToday: false,
      isDueSoon: true,
      daysRemaining,
    };
  }

  return {
    text: dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    isOverdue: false,
    isDueToday: false,
    isDueSoon: false,
    daysRemaining,
  };
}

const typeIcons = {
  task: CheckCircle2,
  milestone: Flame,
  project: Calendar,
};

const priorityConfig = {
  urgent: {
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    border: "border-rose-200 dark:border-rose-800/50",
  },
  high: {
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-200 dark:border-orange-800/50",
  },
  medium: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-800/50",
  },
  low: {
    color: "text-zinc-500 dark:text-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    border: "border-zinc-200 dark:border-zinc-700",
  },
};

function UpcomingDeadlines({
  deadlines,
  maxItems = 5,
  onDeadlineClick,
  onViewAll,
  className,
}: UpcomingDeadlinesProps) {
  const sortedDeadlines = useMemo(() => {
    return [...deadlines]
      .filter((d) => !d.isCompleted)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, maxItems);
  }, [deadlines, maxItems]);

  const overdueCount = useMemo(() => {
    return deadlines.filter((d) => {
      const { isOverdue } = formatDeadline(d.dueDate);
      return isOverdue && !d.isCompleted;
    }).length;
  }, [deadlines]);

  if (sortedDeadlines.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-2xl p-6",
          "bg-white dark:bg-zinc-900",
          "border border-zinc-200 dark:border-zinc-800",
          "text-center",
          className
        )}
      >
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          All caught up!
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          No upcoming deadlines
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl overflow-hidden",
        "bg-white dark:bg-zinc-900",
        "border border-zinc-200 dark:border-zinc-800",
        "shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Upcoming Deadlines
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {sortedDeadlines.length} item{sortedDeadlines.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        
        {overdueCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/50">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
              {overdueCount} overdue
            </span>
          </div>
        )}
      </div>

      {/* Deadlines list */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {sortedDeadlines.map((deadline, index) => {
          const { text, isOverdue, isDueToday, isDueSoon } = formatDeadline(deadline.dueDate);
          const priority = deadline.priority || "low";
          const config = priorityConfig[priority];
          const TypeIcon = typeIcons[deadline.type];

          return (
            <motion.div
              key={deadline.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onDeadlineClick?.(deadline)}
              className={cn(
                "flex items-center gap-3 p-4 cursor-pointer",
                "hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50",
                "transition-colors"
              )}
            >
              {/* Type icon */}
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  isOverdue
                    ? "bg-rose-100 dark:bg-rose-900/30"
                    : isDueToday
                    ? "bg-amber-100 dark:bg-amber-900/30"
                    : config.bg
                )}
              >
                {isOverdue ? (
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                ) : isDueToday ? (
                  <Flame className="w-5 h-5 text-amber-500" />
                ) : (
                  <TypeIcon className={cn("w-5 h-5", config.color)} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {deadline.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {deadline.projectName && (
                    <>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">
                        {deadline.projectName}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    </>
                  )}
                  <span className="text-xs capitalize text-zinc-400 dark:text-zinc-500">
                    {deadline.type}
                  </span>
                </div>
              </div>

              {/* Due date */}
              <div className="text-right flex-shrink-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isOverdue
                      ? "text-rose-600 dark:text-rose-400"
                      : isDueToday
                      ? "text-amber-600 dark:text-amber-400"
                      : isDueSoon
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  {text}
                </p>
                {!isOverdue && !isDueToday && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    {new Date(deadline.dueDate).toLocaleDateString("en-US", {
                      weekday: "short",
                    })}
                  </p>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
            </motion.div>
          );
        })}
      </div>

      {/* View all button */}
      {onViewAll && deadlines.length > maxItems && (
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800">
          <motion.button
            onClick={onViewAll}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
          >
            View all {deadlines.length} deadlines
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

export default memo(UpcomingDeadlines);

