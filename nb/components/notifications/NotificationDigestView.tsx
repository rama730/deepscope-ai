"use client";

import { useMemo } from "react";
import { Notification, groupNotifications } from "@/lib/utils/notifications";
import { formatDistanceToNow, format, startOfDay, isToday, isYesterday, isThisWeek } from "date-fns";

interface NotificationDigestViewProps {
  notifications: Notification[];
  groupedBy?: "day" | "week";
}

export default function NotificationDigestView({
  notifications,
  groupedBy = "day"
}: NotificationDigestViewProps) {
  const groupedByPeriod = useMemo(() => {
    const groups: Record<string, Notification[]> = {};

    notifications.forEach(notification => {
      const date = new Date(notification.created_at);
      let key: string;

      if (groupedBy === "week") {
        const weekStart = format(startOfDay(date), "yyyy-MM-dd");
        key = weekStart;
      } else {
        if (isToday(date)) {
          key = "Today";
        } else if (isYesterday(date)) {
          key = "Yesterday";
        } else if (isThisWeek(date)) {
          key = format(date, "EEEE"); // Day name
        } else {
          key = format(date, "MMMM d, yyyy");
        }
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key]!.push(notification);
    });

    return groups;
  }, [notifications, groupedBy]);

  const periods = Object.keys(groupedByPeriod).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Yesterday") return -1;
    if (b === "Yesterday") return 1;
    return b.localeCompare(a);
  });

  return (
    <div className="space-y-6">
      {periods.map(period => {
        const periodNotifications = groupedByPeriod[period] || [];
        const groups = groupNotifications(periodNotifications);
        const unreadCount = periodNotifications.filter(n => !n.is_read).length;

        return (
          <div key={period} className="space-y-3">
            <div className="flex items-center gap-3 sticky top-0 bg-white dark:bg-zinc-950 py-2 z-10">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {period}
              </h3>
              <span className="text-sm text-zinc-500">
                {periodNotifications.length} notification{periodNotifications.length !== 1 ? 's' : ''}
                {unreadCount > 0 && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    ({unreadCount} unread)
                  </span>
                )}
              </span>
            </div>
            <div className="space-y-1">
              {groups.map(group => (
                <div
                  key={group.id}
                  className={`p-3 rounded-lg ${!group.is_read
                    ? 'bg-blue-50/40 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800'
                    : 'bg-zinc-50 dark:bg-zinc-900/50'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {group.notifications[0]?.message || ''}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {formatDistanceToNow(new Date(group.latest_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!group.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
