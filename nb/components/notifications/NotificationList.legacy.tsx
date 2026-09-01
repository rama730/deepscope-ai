
"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Notification, groupNotifications } from "@/lib/utils/notifications";
import NotificationItem from "./NotificationItem";
import NotificationFilter, { FilterType } from "./NotificationFilter";
import { useNotifications } from "./NotificationProvider";
import { Loader2, CheckCheck, Bell } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

interface NotificationListProps {
    limit?: number;
    showFilters?: boolean;
}

import { Virtuoso } from "react-virtuoso";

export default function NotificationList({ limit, showFilters = true }: NotificationListProps) {
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<FilterType>("all");
    const { markAsRead, markAllAsRead } = useNotifications();
    const supabase = createSupabaseBrowserClient();

    // Fetch logic
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
            .from("notifications")
            .select(`
          *,
          actor:profiles!notifications_actor_id_fkey(username, full_name, avatar_url)
      `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (limit) query = query.limit(limit);
        else query = query.limit(50); // Hard limit for safety

        const { data, error } = await query;

        if (!error && data) {
            // We need to fetch related post content separately efficiently
            const postIds = data
                .filter((n: any) => n.related_entity_type === 'post' && n.related_entity_id)
                .map((n: any) => n.related_entity_id);

            // simple dedup
            const uniquePostIds = Array.from(new Set(postIds));

            let postsById: any = {};
            if (uniquePostIds.length) {
                const { data: posts } = await supabase.from('posts').select('id, content, media').in('id', uniquePostIds);
                if (posts) {
                    postsById = Object.fromEntries(posts.map(p => [p.id, p]));
                }
            }

            const enriched = data.map((n: any) => ({
                ...n,
                post: (n.related_entity_type === 'post' && n.related_entity_id) ? postsById[n.related_entity_id] : null
            }));
            setNotifications(enriched as Notification[]);
        }
        setLoading(false);
    }, [supabase, limit]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Handle Mark All Read
    const handleMarkAllRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

        await markAllAsRead();
    };

    const handleItemClick = async (id: string, is_read: boolean) => {
        if (!is_read) {
            // Optimistic
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            await markAsRead(id);
        }
    };

    // Filter Logic
    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'mentions') return n.message.includes('mention') || n.type === 'mention'; // Adjust based on real type
        if (filter === 'replies') return n.type === 'comment';
        if (filter === 'system') return ['like', 'follow', 'repost'].includes(n.type);
        return true;
    });

    // Grouping
    const groupedNotifications = groupNotifications(filteredNotifications);

    return (
        <div className="flex flex-col h-full">
            {showFilters && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                    <NotificationFilter currentFilter={filter} onFilterChange={setFilter} />
                    <button
                        onClick={handleMarkAllRead}
                        title="Mark all as read"
                        className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                        <CheckCheck className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex-1 min-h-0 bg-transparent">
                {loading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                    </div>
                ) : groupedNotifications.length > 0 ? (
                    <Virtuoso
                        style={{ height: '100%' }}
                        data={groupedNotifications}
                        itemContent={(_index, group) => (
                            <div className="border-b border-zinc-100 dark:border-zinc-800">
                                <NotificationItem
                                    key={group.id}
                                    group={group}
                                    onClick={() => handleItemClick(group.id, group.is_read)}
                                />
                            </div>
                        )}
                    />
                ) : (
                    <EmptyState
                        icon={Bell}
                        title="No notifications"
                        description="We'll notify you when something arrives."
                        className="py-8 h-48 border-none bg-transparent"
                    />
                )}
            </div>
        </div>
    );
}
