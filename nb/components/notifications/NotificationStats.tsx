"use client";

import { useMemo } from "react";
import { Notification } from "@/lib/utils/notifications";
import { TrendingUp, MessageSquare, Heart, UserPlus, Briefcase, Bell } from "lucide-react";

interface NotificationStatsProps {
  notifications: Notification[];
}

export default function NotificationStats({ notifications }: NotificationStatsProps) {
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.is_read).length;
    const read = notifications.filter(n => n.is_read).length;

    const byType = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by date (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toDateString();
    }).reverse();

    const byDate = notifications.reduce((acc, n) => {
      const date = new Date(n.created_at).toDateString();
      if (last7Days.includes(date)) {
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const activityTrend = last7Days.map(date => byDate[date] || 0);

    return {
      total,
      unread,
      read,
      byType,
      activityTrend,
      readRate: total > 0 ? Math.round((read / total) * 100) : 0,
    };
  }, [notifications]);

  const typeIcons: Record<string, React.ReactNode> = {
    like: <Heart className="w-4 h-4" />,
    comment: <MessageSquare className="w-4 h-4" />,
    follow: <UserPlus className="w-4 h-4" />,
    project_application: <Briefcase className="w-4 h-4" />,
    default: <Bell className="w-4 h-4" />,
  };

  const topTypes = Object.entries(stats.byType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
      {/* Total */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Bell className="w-4 h-4" />
          <span>Total</span>
        </div>
        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {stats.total}
        </div>
      </div>

      {/* Unread */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Unread</span>
        </div>
        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {stats.unread}
        </div>
      </div>

      {/* Read Rate */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <TrendingUp className="w-4 h-4" />
          <span>Read Rate</span>
        </div>
        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {stats.readRate}%
        </div>
      </div>

      {/* Top Type */}
      {topTypes.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            {typeIcons[topTypes[0]![0]] || typeIcons.default}
            <span>Most Common</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 capitalize">
            {topTypes[0]![0].replace('_', ' ')}
          </div>
        </div>
      )}
    </div>
  );
}
