"use client";

import { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  FileUp,
  MessageCircle,
  UserPlus,
  Edit,
  GitBranch,
  Activity,
  Filter,
  ChevronDown,
  Image as ImageIcon,
  Link2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: "task_completed" | "task_created" | "file_uploaded" | "message_sent" | "member_joined" | "project_updated" | "commit";
  title: string;
  description?: string;
  actor: {
    name: string;
    avatar?: string;
    id?: string;
  };
  created_at: string;
  metadata?: {
    preview?: string;
    link?: string;
    fileType?: string;
  };
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  maxItems?: number;
  showFilters?: boolean;
  showSummary?: boolean;
  onActivityClick?: (activity: ActivityItem) => void;
  className?: string;
}

const activityConfig = {
  task_completed: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    borderColor: "border-emerald-200 dark:border-emerald-800/50",
    label: "Completed",
  },
  task_created: {
    icon: Edit,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-200 dark:border-blue-800/50",
    label: "Created",
  },
  file_uploaded: {
    icon: FileUp,
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    borderColor: "border-purple-200 dark:border-purple-800/50",
    label: "Uploaded",
  },
  message_sent: {
    icon: MessageCircle,
    color: "text-cyan-500",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    borderColor: "border-cyan-200 dark:border-cyan-800/50",
    label: "Messaged",
  },
  member_joined: {
    icon: UserPlus,
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800/50",
    label: "Joined",
  },
  project_updated: {
    icon: Edit,
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-200 dark:border-amber-800/50",
    label: "Updated",
  },
  commit: {
    icon: GitBranch,
    color: "text-slate-500",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
    borderColor: "border-slate-200 dark:border-slate-800/50",
    label: "Committed",
  },
};

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupActivitiesByTime(activities: ActivityItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: ActivityItem[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This Week", items: [] },
    { label: "Earlier", items: [] },
  ];

  activities.forEach((activity) => {
    const date = new Date(activity.created_at);
    if (date >= today) {
      groups[0]!.items.push(activity);
    } else if (date >= yesterday) {
      groups[1]!.items.push(activity);
    } else if (date >= lastWeek) {
      groups[2]!.items.push(activity);
    } else {
      groups[3]!.items.push(activity);
    }
  });

  return groups.filter((g) => g.items.length > 0);
}

function ActivityTimeline({
  activities,
  maxItems = 10,
  showFilters = true,
  showSummary = true,
  onActivityClick,
  className,
}: ActivityTimelineProps) {
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState(false);

  const filteredActivities = useMemo(() => {
    let filtered = activities;
    if (filter !== "all") {
      filtered = activities.filter((a) => a.type === filter);
    }
    return expanded ? filtered : filtered.slice(0, maxItems);
  }, [activities, filter, expanded, maxItems]);

  const groupedActivities = useMemo(
    () => groupActivitiesByTime(filteredActivities),
    [filteredActivities]
  );

  // Generate AI summary
  const summary = useMemo(() => {
    if (!showSummary || activities.length === 0) return null;

    const todayActivities = activities.filter((a) => {
      const date = new Date(a.created_at);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    });

    const completed = todayActivities.filter((a) => a.type === "task_completed").length;
    const created = todayActivities.filter((a) => a.type === "task_created").length;
    const files = todayActivities.filter((a) => a.type === "file_uploaded").length;
    const messages = todayActivities.filter((a) => a.type === "message_sent").length;

    const parts: string[] = [];
    if (completed > 0) parts.push(`${completed} task${completed > 1 ? "s" : ""} completed`);
    if (created > 0) parts.push(`${created} task${created > 1 ? "s" : ""} created`);
    if (files > 0) parts.push(`${files} file${files > 1 ? "s" : ""} uploaded`);
    if (messages > 0) parts.push(`${messages} message${messages > 1 ? "s" : ""} sent`);

    if (parts.length === 0) return null;
    return `Today: ${parts.join(", ")}`;
  }, [activities, showSummary]);

  const filterOptions = [
    { value: "all", label: "All Activity" },
    { value: "task_completed", label: "Completed" },
    { value: "task_created", label: "Tasks" },
    { value: "file_uploaded", label: "Files" },
    { value: "message_sent", label: "Messages" },
  ];

  if (activities.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-zinc-400" />
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 font-medium">No activity yet</p>
        <p className="text-sm text-zinc-500 mt-1">Activity will appear as you work</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Card */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800/50"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Daily Summary</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{summary}</p>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Filter className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                filter === option.value
                  ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {groupedActivities.map((group, groupIndex) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: groupIndex * 0.1 }}
            >
              {/* Group label */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Activities in group */}
              <div className="relative pl-6">
                {/* Timeline line */}
                <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gradient-to-b from-zinc-200 via-zinc-200 to-transparent dark:from-zinc-700 dark:via-zinc-700" />

                <div className="space-y-3">
                  {group.items.map((activity, index) => {
                    const config = activityConfig[activity.type];
                    const Icon = config.icon;

                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => onActivityClick?.(activity)}
                        className={cn(
                          "relative group",
                          onActivityClick && "cursor-pointer"
                        )}
                      >
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            "absolute -left-6 top-3 w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 z-10 flex items-center justify-center",
                            config.bgColor
                          )}
                        >
                          <Icon className={cn("w-3 h-3", config.color)} />
                        </div>

                        {/* Activity card */}
                        <div
                          className={cn(
                            "p-4 rounded-xl border transition-all",
                            "bg-white dark:bg-zinc-900",
                            config.borderColor,
                            "hover:shadow-md hover:scale-[1.01]"
                          )}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              {activity.actor.avatar ? (
                                <img
                                  src={activity.actor.avatar}
                                  alt={activity.actor.name}
                                  className="w-6 h-6 rounded-full"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                  {activity.actor.name.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {activity.actor.name}
                              </span>
                              <span className={cn("text-xs font-medium", config.color)}>
                                {config.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(activity.created_at)}
                            </div>
                          </div>

                          {/* Title */}
                          <p className="text-sm text-zinc-800 dark:text-zinc-200 font-medium mb-1">
                            {activity.title}
                          </p>

                          {/* Description */}
                          {activity.description && (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                              {activity.description}
                            </p>
                          )}

                          {/* Preview / Metadata */}
                          {activity.metadata?.preview && (
                            <div className="mt-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700">
                              {activity.metadata.fileType?.startsWith("image") ? (
                                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                  <ImageIcon className="w-4 h-4" />
                                  <span className="truncate">{activity.metadata.preview}</span>
                                </div>
                              ) : activity.metadata.link ? (
                                <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                                  <Link2 className="w-4 h-4" />
                                  <span className="truncate hover:underline">{activity.metadata.preview}</span>
                                </div>
                              ) : (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 italic">
                                  "{activity.metadata.preview}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Show more button */}
      {activities.length > maxItems && (
        <motion.button
          onClick={() => setExpanded(!expanded)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <span>{expanded ? "Show less" : `Show ${activities.length - maxItems} more`}</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
        </motion.button>
      )}
    </div>
  );
}

export default memo(ActivityTimeline);

