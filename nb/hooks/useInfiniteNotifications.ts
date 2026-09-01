"use client";

import { useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { notificationKeys } from "@/lib/queryKeys";
import { Notification } from "@/lib/utils/notifications";
import { useAuth } from "@/hooks/useAuth";
import { STALE_TIMES } from "@/lib/config/query-config";

interface UseInfiniteNotificationsProps {
    limit?: number;
    filter?: string;
    searchQuery?: string;
    sortBy?: string;
}

export function useInfiniteNotifications({
    limit = 20,
    filter = "all",
    searchQuery = "",
    sortBy = "newest",
}: UseInfiniteNotificationsProps = {}) {
    const supabase = createSupabaseBrowserClient();
    const { user } = useAuth();

    const fetchNotifications = async ({ pageParam = null }: { pageParam?: string | null }) => {
        if (!user) return { notifications: [], nextPage: null };

        console.log("Fetching notifications with Params:", { pageParam, filter });

        let query = supabase
            .from("notifications")
            .select(`
                id,
                user_id,
                type,
                title,
                message,
                link,
                actor_id,
                related_entity_type,
                related_entity_id,
                is_read,
                created_at,
                actor:profiles!actor_id(username, full_name, avatar_url)
            `)
            .eq("user_id", user.id);

        // Apply filters
        if (filter === "unread") {
            query = query.eq("is_read", false);
        } else if (filter === "mentions") {
            query = query.eq("type", "mention");
        } else if (filter === "replies") {
            query = query.eq("type", "comment");
        } else if (filter === 'projects') {
             // For project filter, we can pre-filter here if possible, or client side. 
             // Existing component logic seems to filter client side for 'projects' sometimes, 
             // but let's try to do it here if we can.
             // Actually, the 'related_entity_type' column exists. 
             query = query.in('related_entity_type', ['project', 'project_application']);
        }

        if (searchQuery) {
            query = query.ilike("message", `%${searchQuery}%`);
        }

        // Apply sorting
        if (sortBy === "oldest") {
            query = query.order("created_at", { ascending: true });
        } else {
            query = query.order("created_at", { ascending: false });
        }

        // Pagination
        if (pageParam) {
            if (sortBy === "oldest") {
                query = query.gt("created_at", pageParam);
            } else {
                query = query.lt("created_at", pageParam);
            }
        }

        const { data, error } = await query.limit(limit);

        if (error) {
            console.error("Error fetching notifications:", JSON.stringify(error, null, 2));
            throw error;
        }

        const rawNotifications = (data || []) as any[];

        // Collect IDs for related entities
        const relatedPostIds = new Set<string>();
        const relatedProjectIds = new Set<string>();

        rawNotifications.forEach(n => {
            if (!n.related_entity_id) return;

            if (['post', 'comment', 'like', 'repost'].includes(n.related_entity_type)) {
                relatedPostIds.add(n.related_entity_id);
            } else if (['project', 'project_application', 'project_invite'].includes(n.related_entity_type)) {
                relatedProjectIds.add(n.related_entity_id);
            }
        });

        // Batch fetch posts
        const postsById: Record<string, { id: string; content: string | null; media: any | null }> = {};
        if (relatedPostIds.size > 0) {
            const { data: posts } = await supabase
                .from('posts')
                .select('id, content, media')
                .in('id', Array.from(relatedPostIds));
            
            posts?.forEach(p => {
                postsById[p.id] = p;
            });
        }

        // Batch fetch projects
        const projectsById: Record<string, { id: string; slug: string | null; title: string | null }> = {};
        if (relatedProjectIds.size > 0) {
            const { data: projects } = await supabase
                .from('projects')
                .select('id, slug, title')
                .in('id', Array.from(relatedProjectIds));

            projects?.forEach(p => {
                projectsById[p.id] = p;
            });
        }

        // Map and hydrate notifications
        const notifications: Notification[] = rawNotifications.map(n => ({
            ...n,
            post: n.related_entity_id ? postsById[n.related_entity_id] : null,
            project: n.related_entity_id ? projectsById[n.related_entity_id] : null
        }));

        const lastItem = notifications[notifications.length - 1];
        const nextPage = (notifications.length === limit && lastItem) ? lastItem.created_at : null;

        return {
            notifications,
            nextPage
        };
    };

    const queryKey = notificationKeys.list({ limit, filter, searchQuery, sortBy });

    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isPending,
        refetch,
    } = useInfiniteQuery({
        queryKey,
        queryFn: fetchNotifications,
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => {
            return lastPage.nextPage;
        },
        enabled: !!user,
        staleTime: STALE_TIMES.SHORT,
    });

    const notifications = data ? data.pages.flatMap(page => page.notifications) : [];

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return {
        notifications,
        loading: isPending,
        loadingMore: isFetchingNextPage,
        hasMore: hasNextPage,
        error: error as Error | null,
        loadMore,
        refresh: refetch,
    };
}
