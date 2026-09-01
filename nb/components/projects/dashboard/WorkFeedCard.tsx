"use client";

import { useState, useMemo } from "react";
import {
  Activity,
  CheckCircle2,
  FileUp,
  UserPlus,
  Edit,
  GitBranch,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EmptyState from "@/components/projects/EmptyState";
import DashboardCard from "./DashboardCard";

interface ActivityItem {
  id: string;
  type: "task_completed" | "task_created" | "file_uploaded" | "member_joined" | "member_left" | "message_sent" | "project_updated" | "commit";
  description: string;
  actor?: {
    name: string;
    id?: string;
  };
  created_at: string;
  metadata?: Record<string, any>;
}

type ActivityFilter = "recent" | "my" | "all";
// type ActivityType = "task_completed" | "task_created" | "file_uploaded" | "member_joined" | "member_left" | "message_sent" | "project_updated" | "commit" | "all"; 

interface WorkFeedCardProps {
  activities: ActivityItem[];
  isCreator?: boolean;
  currentUserId?: string | null;
  onUploadFile: () => void;
  onSendMessage: () => void;
  onViewAnalytics: () => void;
  onViewAllActivity: () => void;
  onViewSprints?: () => void;
  onViewSettings?: () => void;
}

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

function getActivityIcon(type: ActivityItem["type"]) {
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
    case "message_sent":
      return { icon: MessageCircle, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/30" };
    case "project_updated":
      return { icon: Edit, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/30" };
    case "commit":
      return { icon: GitBranch, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900/30" };
    default:
      return { icon: Activity, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900/30" };
  }
}

export default function WorkFeedCard({
  activities = [],
  currentUserId,
}: WorkFeedCardProps) {
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("recent");
  // const [typeFilter, setTypeFilter] = useState<ActivityType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter activities based on selected filter
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Apply type filter
    // if (typeFilter !== "all") {
    //   filtered = filtered.filter((a) => a.type === typeFilter);
    // }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a) =>
        a.description.toLowerCase().includes(query) ||
        a.actor?.name?.toLowerCase().includes(query)
      );
    }

    // Apply time/user filter
    switch (activityFilter) {
      case "recent":
        return filtered.slice(0, 5); // Show top 5 in recent
      case "my":
        return filtered.filter((a) => a.actor?.id === currentUserId);
      case "all":
        return filtered;
      default:
        return filtered.slice(0, 5);
    }
  }, [activities, activityFilter, searchQuery, currentUserId]);

  return (
    <DashboardCard
      title="Activity"
      icon={Activity}
      iconColor="text-blue-500 dark:text-blue-400"
      compact
      className="flex flex-col h-fit"
    >
      <div className="flex flex-col overflow-hidden">
        {/* Compact Filters */}
        <div className="flex items-center gap-2 mb-2.5 shrink-0">
          {/* Search Input - Mini */}
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 pr-2 py-1 text-[10px] border border-slate-200 dark:border-zinc-700 rounded-md bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-zinc-600 rounded"
              >
                <X className="w-2.5 h-2.5 text-slate-400" />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-zinc-800 rounded-md p-0.5 shrink-0">
            {(["recent", "all"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActivityFilter(filter)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${activityFilter === filter
                  ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-700"
                  }`}
              >
                {filter === "recent" ? "Recent" : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Activity List */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 max-h-[600px]">
          {filteredActivities.length > 0 ? (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredActivities.map((activity, index) => {
                  const { icon: Icon, color, bg } = getActivityIcon(activity.type);
                  const isLast = index === filteredActivities.length - 1;

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      layout
                      className="relative flex gap-2.5 group"
                    >
                      {/* Timeline Line */}
                      {!isLast && (
                        <div className="absolute left-3 top-6 bottom-[-8px] w-px bg-slate-100 dark:bg-zinc-800" />
                      )}

                      {/* Icon */}
                      <div className={`w-6 h-6 rounded-full ${bg} flex items-center justify-center flex-shrink-0 z-10 ring-2 ring-white dark:ring-zinc-900 mt-0.5`}>
                        <Icon className={`w-3 h-3 ${color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug">
                            {activity.actor && (
                              <span className="font-semibold text-slate-900 dark:text-zinc-200 block mb-0.5 text-xs">
                                {activity.actor.name}
                              </span>
                            )}
                            <span className="text-slate-500 dark:text-zinc-500">
                              {activity.description}
                            </span>
                          </p>
                          <span className="text-[9px] text-slate-400 dark:text-zinc-600 whitespace-nowrap shrink-0">
                            {formatTimeAgo(activity.created_at)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No activities"
              description="New activity will appear here"
            />
          )}
        </div>
      </div>
    </DashboardCard>
  );
}
