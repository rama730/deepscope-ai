"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface QuickStatsWidgetProps {
  projectId: string;
}

export default function QuickStatsWidget({ projectId }: QuickStatsWidgetProps) {
  const supabase = createSupabaseBrowserClient();
  const [stats, setStats] = useState({
    tasksToday: 0,
    messagesWeek: 0,
    filesWeek: 0,
    activeMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadQuickStats();
    }
  }, [projectId]);

  async function loadQuickStats() {
    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [tasksResult, messagesResult, filesResult, membersResult] = await Promise.all([
        // Tasks completed today
        supabase
          .from("project_tasks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("status", "done")
          .gte("completed_at", todayStart),

        // Messages this week
        supabase
          .from("project_chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .gte("created_at", weekAgo),

        // Files uploaded this week
        supabase
          .from("project_files")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .gte("created_at", weekAgo),

        // Active members (posted/updated in last week)
        supabase
          .from("project_chat_messages")
          .select("sender_id")
          .eq("project_id", projectId)
          .gte("created_at", weekAgo)
      ]);

      const uniqueMembers = new Set(membersResult.data?.map((m: any) => m.sender_id) || []);

      setStats({
        tasksToday: tasksResult.count || 0,
        messagesWeek: messagesResult.count || 0,
        filesWeek: filesResult.count || 0,
        activeMembers: uniqueMembers.size,
      });
    } catch (error) {
      console.error("Error loading quick stats:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border-2 bg-white dark:bg-zinc-900 p-4">
            <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 mb-2" />
            <div className="h-6 w-12 bg-zinc-200 dark:bg-zinc-800 rounded mb-1" />
            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: "Completed Today",
      value: stats.tasksToday,
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "from-emerald-500 to-green-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Messages (7d)",
      value: stats.messagesWeek,
      icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
      color: "from-blue-500 to-sky-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Files (7d)",
      value: stats.filesWeek,
      icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
      color: "from-purple-500 to-pink-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      textColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Active Members",
      value: stats.activeMembers,
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
      color: "from-orange-500 to-red-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      textColor: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {statItems.map((stat, index) => (
        <div
          key={index}
          className={`group rounded-xl border-2 border-zinc-200 dark:border-zinc-800 ${stat.bgColor} p-4 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-default`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
              </svg>
            </div>
          </div>
          <div className={`text-3xl font-black mb-1 ${stat.textColor}`}>
            {stat.value}
          </div>
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}


