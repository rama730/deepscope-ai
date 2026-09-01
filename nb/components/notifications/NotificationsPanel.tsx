"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  Check,
  CheckCheck,
  UserPlus,
  MessageCircle,
  CheckSquare,
  FileUp,
  Clock,
  AtSign,
  Zap,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  project_id: string | null;
  task_id: string | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
  actor_profile?: {
    full_name: string | null;
    username: string | null;
  };
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const notificationIcons: Record<string, typeof Bell> = {
  task_assigned: UserPlus,
  task_mentioned: AtSign,
  task_completed: CheckSquare,
  task_updated: Zap,
  comment_added: MessageCircle,
  comment_mentioned: AtSign,
  project_invite: UserPlus,
  project_update: Zap,
  file_uploaded: FileUp,
  message_received: MessageCircle,
  message_mentioned: AtSign,
  sprint_started: Clock,
  sprint_ended: CheckCheck,
  deadline_approaching: Clock,
};

const notificationColors: Record<string, string> = {
  task_assigned: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
  task_mentioned: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
  task_completed: "bg-green-100 dark:bg-green-900/30 text-green-600",
  task_updated: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600",
  comment_added: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600",
  comment_mentioned: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
  project_invite: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600",
  project_update: "bg-orange-100 dark:bg-orange-900/30 text-orange-600",
  file_uploaded: "bg-pink-100 dark:bg-pink-900/30 text-pink-600",
  message_received: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600",
  message_mentioned: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
  sprint_started: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
  sprint_ended: "bg-green-100 dark:bg-green-900/30 text-green-600",
  deadline_approaching: "bg-red-100 dark:bg-red-900/30 text-red-600",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US");
}

export default function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const supabase = createSupabaseBrowserClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("notifications")
      .select(`
        *,
        actor_profile:profiles!notifications_actor_id_fkey(full_name, username)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter === "unread") {
      query = query.eq("is_read", false);
    }

    const { data } = await query;
    if (data) {
      setNotifications(data);
    }
    setLoading(false);
  }, [supabase, filter]);

  // Subscribe to new notifications
  useEffect(() => {
    if (!isOpen) return;

    loadNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isOpen, loadNotifications, supabase]);

  // Mark as read
  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unreadIds);

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const displayedNotifications = filter === "unread"
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-4 top-16 z-50 w-96 max-h-[calc(100vh-5rem)] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filters & Actions */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filter === "all"
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400"
                      }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter("unread")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filter === "unread"
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400"
                      }`}
                  >
                    Unread
                  </button>
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : displayedNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    We'll notify you when something happens
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {displayedNotifications.map((notification) => {
                    const Icon = notificationIcons[notification.type] || Bell;
                    const colorClass = notificationColors[notification.type] || "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`relative group px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${!notification.is_read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                          }`}
                      >
                        {/* Unread indicator */}
                        {!notification.is_read && (
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                        )}

                        <div className="flex gap-3">
                          <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            {notification.link ? (
                              <Link
                                href={notification.link}
                                onClick={() => {
                                  markAsRead(notification.id);
                                  onClose();
                                }}
                                className="block"
                              >
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
                                  {notification.title}
                                </p>
                                {notification.message && (
                                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-0.5">
                                    {notification.message}
                                  </p>
                                )}
                              </Link>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
                                  {notification.title}
                                </p>
                                {notification.message && (
                                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-0.5">
                                    {notification.message}
                                  </p>
                                )}
                              </>
                            )}

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-zinc-500">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                              {notification.actor_profile && (
                                <>
                                  <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                  <span className="text-xs text-zinc-500">
                                    by {notification.actor_profile.full_name || notification.actor_profile.username}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1">
                            {!notification.is_read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300"
                                title="Mark as read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-500 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 py-2 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
              <Link
                href="/notifications"
                onClick={onClose}
                className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <Settings className="w-4 h-4" />
                Notification Settings
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Notification Bell Button Component
export function NotificationBell() {
  const supabase = createSupabaseBrowserClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load unread count
    async function loadUnreadCount() {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);

      setUnreadCount(count || 0);
    }

    loadUnreadCount();

    // Subscribe to changes
    const channel = supabase
      .channel("notification-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
      >
        <Bell className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationsPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

