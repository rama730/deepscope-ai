"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TabLoadingScreen } from "@/components/ui-custom/LoadingSkeleton";
import { TabInfoHelp } from "@/components/projects/TabInfoHelp";

interface AnalyticsTabProps {
  projectId: string;
  project: any;
}

interface ActivityLogItem {
  id: string;
  user_id: string;
  activity_type: string;
  activity_title: string;
  activity_description: string | null;
  created_at: string;
  metadata: any;
  user_profile?: {
    full_name: string | null;
    username: string | null;
  };
  related_task?: {
    id: string;
    title: string;
    status: string;
  };
  related_file?: {
    id: string;
    name: string;
  };
}

export default function AnalyticsTab({ projectId, project }: AnalyticsTabProps) {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    todoTasks: 0,
    totalFiles: 0,
    totalMembers: 0,
    totalApplications: 0,
    pendingApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
    totalMessages: 0,
    viewCount: 0,
    bookmarkCount: 0,
  });
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>("all");

  useEffect(() => {
    if (projectId) {
      loadAnalytics();
      loadActivityLog();
      subscribeToActivity();
    }
  }, [projectId]);

  async function loadAnalytics() {
    setLoading(true);

    try {
      const [
        tasksResult,
        filesResult,
        membersResult,
        applicationsResult,
        messagesResult,
        bookmarksResult,
      ] = await Promise.all([
        supabase
          .from("project_tasks")
          .select("status")
          .eq("project_id", projectId),
        supabase
          .from("project_files")
          .select("submission_type")
          .eq("project_id", projectId),
        supabase
          .from("project_collaborators")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("project_applications")
          .select("status")
          .eq("project_id", projectId),
        supabase
          .from("project_chat_messages")
          .select("message_type")
          .eq("project_id", projectId),
        supabase
          .from("project_bookmarks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId),
      ]);

      const tasks = tasksResult.data || [];
      const files = filesResult.data || [];
      const messages = messagesResult.data || [];
      const applications = applicationsResult.data || [];

      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t: any) => t.status === "done").length,
        inProgressTasks: tasks.filter((t: any) => t.status === "in_progress").length,
        todoTasks: tasks.filter((t: any) => t.status === "todo").length,
        totalFiles: files.length,
        totalMembers: (membersResult.count || 0) + 1,
        totalApplications: applications.length,
        pendingApplications: applications.filter((a: any) => a.status === "pending").length,
        acceptedApplications: applications.filter((a: any) => a.status === "accepted").length,
        rejectedApplications: applications.filter((a: any) => a.status === "rejected").length,
        totalMessages: messages.length,
        viewCount: project?.view_count || 0,
        bookmarkCount: bookmarksResult.count || 0,
      });
    } catch (error: any) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadActivityLog() {
    try {
      // Try with full relations first
      let { data, error } = await supabase
        .from("project_activity_log")
        .select(`
          *,
          user_profile:user_id(full_name, username),
          related_task:related_task_id(id, title, status),
          related_file:related_file_id(id, name)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50);

      // If error is about missing columns, try without relations
      if (error && (
        (error as any).code === '42703' || 
        (error as any).message?.includes('column') ||
        (error as any).message?.includes('does not exist')
      )) {
        // Fallback to basic query without relations
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("project_activity_log")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (fallbackError) {
          throw fallbackError;
        }
        data = fallbackData;
        error = null;
      }

      if (error) {
        throw error;
      }

      setActivityLog(data || []);
    } catch (err) {
      // Better error logging
      if (err && typeof err === 'object') {
        const errorDetails = {
          message: (err as any).message || 'Unknown error',
          code: (err as any).code || 'unknown',
          details: (err as any).details || null,
          hint: (err as any).hint || null
        };
        console.warn("Error loading activity log (non-critical):", errorDetails);
      } else {
        console.warn("Error loading activity log (non-critical):", err);
      }
      // Set empty array on error - graceful degradation
      setActivityLog([]);
    }
  }

  function subscribeToActivity() {
    const channel = supabase
      .channel(`project-${projectId}-activity`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_activity_log",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadActivityLog();
          loadAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  if (loading) {
    return <TabLoadingScreen type="analytics" />;
  }

  const taskCompletionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const applicationAcceptanceRate = stats.totalApplications > 0
    ? Math.round((stats.acceptedApplications / stats.totalApplications) * 100)
    : 0;

  const filteredActivity = activityFilter === "all"
    ? activityLog
    : activityLog.filter(a => a.activity_type === activityFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Analytics & Insights</h2>
          <TabInfoHelp
            title="Analytics"
            description="See project activity, productivity signals, and outcomes over time."
            bullets={[
              "Track tasks/files/chat volume",
              "Use Activity Timeline filters to focus on what matters",
            ]}
          />
        </div>
        <p className="text-sm text-zinc-500 mt-1">Project performance and activity metrics</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Views"
          value={stats.viewCount}
          icon="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          color="blue"
        />

        <StatCard
          title="Bookmarks"
          value={stats.bookmarkCount}
          icon="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          color="yellow"
        />

        <StatCard
          title="Team Members"
          value={stats.totalMembers}
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          color="purple"
        />

        <StatCard
          title="Applications"
          value={stats.totalApplications}
          subtitle={`${stats.pendingApplications} pending`}
          icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          color="emerald"
        />
      </div>

      {/* Progress Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Task Progress */}
        <div className="rounded-xl border bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Task Progress
            </h3>
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
              {taskCompletionRate}%
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Completed</span>
              <span className="font-bold">{stats.completedTasks} / {stats.totalTasks}</span>
            </div>
            <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${taskCompletionRate}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center">
              <p className="text-xs text-zinc-500 mb-1">To Do</p>
              <p className="text-xl font-bold text-zinc-600 dark:text-zinc-400">{stats.todoTasks}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500 mb-1">In Progress</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.inProgressTasks}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500 mb-1">Done</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completedTasks}</p>
            </div>
          </div>
        </div>

        {/* Application Stats */}
        <div className="rounded-xl border bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Application Stats
            </h3>
            <span className="text-3xl font-bold text-purple-600">{applicationAcceptanceRate}%</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Acceptance Rate</span>
              <span className="font-bold">{stats.acceptedApplications} / {stats.totalApplications}</span>
            </div>
            <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${applicationAcceptanceRate}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center">
              <p className="text-xs text-zinc-500 mb-1">Pending</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingApplications}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500 mb-1">Accepted</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.acceptedApplications}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500 mb-1">Rejected</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.rejectedApplications}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Files Uploaded</p>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.totalFiles}</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Project files</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-600 text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Chat Messages</p>
              <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{stats.totalMessages}</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">Project chat activity</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-600 text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-xl border bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Activity Timeline
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse"></span>
            Live Updates
          </div>
        </div>

        {/* Activity Filter */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          {[
            { id: "all", label: "All Activity", count: activityLog.length },
            { id: "task_created", label: "Tasks Created", icon: "M12 4v16m8-8H4" },
            { id: "task_completed", label: "Tasks Completed", icon: "M5 13l4 4L19 7" },
            { id: "file_uploaded", label: "Files Uploaded", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" },
            { id: "member_joined", label: "Members Joined", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setActivityFilter(filter.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activityFilter === filter.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
            >
              {filter.icon && (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={filter.icon} />
                </svg>
              )}
              {filter.label}
              {filter.count && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activityFilter === filter.id ? "bg-white/20" : "bg-zinc-200 dark:bg-zinc-700"
                  }`}>
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Activity List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {filteredActivity.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-zinc-500">No activity found</p>
              <p className="text-xs text-zinc-400 mt-1">
                {activityFilter !== "all" ? "Try selecting a different filter" : "Activity will appear here"}
              </p>
            </div>
          ) : (
            filteredActivity.map(activity => (
              <ActivityItem key={activity.id} activity={activity} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon, color }: {
  title: string;
  value: number;
  subtitle?: string;
  icon: string;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className="rounded-xl border bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{title}</p>
          <p className="text-3xl font-bold mt-2">{value.toLocaleString("en-US")}</p>
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ activity }: { activity: ActivityLogItem }) {
  const icons = {
    task_created: { path: "M12 4v16m8-8H4", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30" },
    task_completed: { path: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30" },
    file_uploaded: { path: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z", color: "text-purple-600 bg-purple-50 dark:bg-purple-900/30" },
    member_joined: { path: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30" },
  };

  const iconInfo = icons[activity.activity_type as keyof typeof icons] || {
    path: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800"
  };

  function formatTimeAgo(timestamp: string) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-200 dark:border-zinc-700 dark:hover:border-zinc-700">
      <div className={`flex-shrink-0 p-2.5 rounded-lg ${iconInfo.color}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconInfo.path} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {activity.activity_title}
        </p>
        {activity.activity_description && (
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            {activity.activity_description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
          <span className="font-medium">
            {activity.user_profile?.full_name || activity.user_profile?.username || "User"}
          </span>
          <span>•</span>
          <span>{formatTimeAgo(activity.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
