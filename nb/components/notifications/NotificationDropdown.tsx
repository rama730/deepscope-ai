"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useNotifications } from "./NotificationProvider";
import { profileHref } from "@/lib/routing/identifiers";

interface Notification {
  id: string;
  type: string;
  message: string;
  link?: string | null;
  actor_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  post?: {
    id: string;
    content: string | null;
    media: any | null;
  } | null;
  project?: {
    id: string;
    slug: string | null;
  } | null;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
  bellContainerId?: string;
}

export default function NotificationDropdown({ isOpen, onClose, onNotificationClick, bellContainerId }: NotificationDropdownProps) {
  const supabase = createSupabaseBrowserClient();

  const { unreadCount, reloadUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && bellContainerId) {
      const updatePosition = () => {
        const bellContainer = document.getElementById(bellContainerId);
        if (bellContainer) {
          const rect = bellContainer.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right
          });
        }
      };
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
    return undefined;
  }, [isOpen, bellContainerId]);

  // Custom click-outside handler that ignores clicks on the bell button
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!isOpen) return;

      const target = event.target as Node;

      // Check if click is inside dropdown
      if (dropdownRef.current?.contains(target)) return;

      // Check if click is on the bell button container
      if (bellContainerId) {
        const bellContainer = document.getElementById(bellContainerId);
        if (bellContainer?.contains(target)) return;
      }

      // Click is outside both - close the dropdown
      onClose();
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, bellContainerId]);

  const loadNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      // Fetch related posts for notifications that reference posts
      const postIds = (data as any[])
        .filter(n => n.related_entity_type === 'post' && n.related_entity_id)
        .map(n => n.related_entity_id);

      let postsById: Record<string, { id: string; content: string | null; media: any | null }> = {};
      if (postIds.length > 0) {
        const { data: posts } = await supabase
          .from('posts')
          .select('id, content, media')
          .in('id', postIds);

        if (posts) {
          postsById = Object.fromEntries(
            posts.map((p: any) => [p.id, { id: p.id, content: p.content, media: p.media }])
          );
        }
      }

      // Fetch related projects for notifications that reference projects (so links use slugs instead of UUIDs)
      const projectIds = (data as any[])
        .filter(n => (n.related_entity_type === 'project' || n.type === 'project_invite') && n.related_entity_id)
        .map(n => n.related_entity_id);

      let projectsById: Record<string, { id: string; slug: string | null }> = {};
      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, slug')
          .in('id', projectIds);

        if (projects) {
          projectsById = Object.fromEntries(
            projects.map((p: any) => [p.id, { id: p.id, slug: p.slug }])
          );
        }
      }

      setNotifications((data as any[]).map((n: any) => ({
        ...n,
        actor: n.actor || null,
        post: n.related_entity_type === 'post' && n.related_entity_id
          ? postsById[n.related_entity_id] || null
          : null,
        project: (n.related_entity_type === 'project' || n.type === 'project_invite') && n.related_entity_id
          ? projectsById[n.related_entity_id] || null
          : null,
      })));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Subscribe to realtime updates - but only reload the list, don't add duplicates
  const supabaseRef = useRef(supabase);
  useEffect(() => {
    supabaseRef.current = supabase;
  }, [supabase]);

  useEffect(() => {
    let channel: ReturnType<typeof supabaseRef.current.channel> | null = null;

    async function setupSubscription() {
      const { data: { user } } = await supabaseRef.current.auth.getUser();
      if (!user) return;

      channel = supabaseRef.current
        .channel('notifications-dropdown-reload')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Just reload the full list to avoid duplicates
            if (isOpen) {
              loadNotifications();
            }
          }
        )
        .subscribe();
    }

    setupSubscription();

    return () => {
      if (channel) {
        supabaseRef.current.removeChannel(channel);
      }
    };
  }, [isOpen, loadNotifications]);



  async function markAsRead(notificationId: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    reloadUnreadCount();
  }

  async function markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    reloadUnreadCount();
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>;
      case 'comment':
        return <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>;
      case 'repost':
        return <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>;
      case 'message':
        return <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>;
      case 'project_invite':
        return <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>;
      default:
        return <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString("en-US");
  };

  if (!isOpen || !bellContainerId) return null;

  return typeof window !== 'undefined' && dropdownPosition.top > 0 && createPortal(
    <div
      ref={dropdownRef}
      className="notification-dropdown fixed w-96 max-h-[600px] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden z-[100]"
      style={{
        top: `${dropdownPosition.top}px`,
        right: `${dropdownPosition.right}px`
      }}
    >
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="overflow-y-auto max-h-[500px]">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {notifications.map((notification) => {
              // Prefer stored link from DB (keeps server-side notification logic authoritative)
              // Fallback to inferred routes for legacy notifications.
              const link = notification.link
                ? notification.link
                : notification.type === 'message'
                  ? '/messages'
                  : notification.type === 'project_invite'
                    ? '/people?tab=inbox'
                    : notification.related_entity_type === 'post' && notification.related_entity_id
                      ? `/post/${notification.related_entity_id}`
                      : notification.actor_id
                        ? profileHref(notification.actor?.username || notification.actor_id)
                        : '/notifications';

              const actorName =
                notification.actor?.full_name ||
                notification.actor?.username ||
                (notification.actor_id ? notification.actor_id.slice(0, 8) : 'Someone');

              const primaryText = (() => {
                switch (notification.type) {
                  case 'like':
                    return `${actorName} liked your post`;
                  case 'repost':
                    return `${actorName} reposted your post`;
                  case 'comment':
                    return `${actorName} commented on your post`;
                  default:
                    return notification.message;
                }
              })();

              // Build a short snippet from the post content
              const postSnippet = notification.post?.content
                ? (() => {
                  const collapsed = notification.post!.content.replace(/\s+/g, ' ').trim();
                  return collapsed.length > 80 ? collapsed.slice(0, 80) + '…' : collapsed;
                })()
                : null;

              return (
                <Link
                  key={notification.id}
                  href={link}
                  onClick={() => {
                    if (!notification.is_read) markAsRead(notification.id);
                    onNotificationClick(notification);
                    onClose();
                  }}
                  className={`
                    block p-4 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors
                    ${!notification.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}
                  `}
                >
                  <div className="flex gap-3">
                    {notification.actor?.avatar_url ? (
                      <Image
                        src={notification.actor.avatar_url}
                        alt={notification.actor.full_name || notification.actor.username || 'User'}
                        width={40}
                        height={40}
                        className="rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {notification.actor?.full_name?.[0]?.toUpperCase() || notification.actor?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
                          {primaryText}
                        </p>

                        {postSnippet && (
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                            {postSnippet}
                          </p>
                        )}

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Optional post image thumbnail on the right, if the post has images */}
                      {notification.post?.media?.type === 'image' &&
                        Array.isArray(notification.post.media?.urls) &&
                        notification.post.media.urls[0] && (
                          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-200 dark:border-zinc-700">
                            <Image
                              src={notification.post.media.urls[0]}
                              alt="Post preview"
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                        )}
                    </div>

                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                      {!notification.is_read && (
                        <div className="mt-2 w-2 h-2 rounded-full bg-blue-600 mx-auto"></div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <Link
            href="/notifications"
            onClick={onClose}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>,
    document.body
  ) || null;
}

