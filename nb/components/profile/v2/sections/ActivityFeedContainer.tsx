"use client";

import { useMemo, useState } from "react";
import { useRealtimeRouterSubscription } from "@/hooks/useRealtimeRouterSubscription";
import { ActivityFeed } from "./ActivityFeed";

export function ActivityFeedContainer({
    initialPosts,
    profile,
    currentUser,
}: {
    initialPosts: any[];
    profile: any;
    currentUser: any;
}) {
    const [posts, setPosts] = useState<any[]>(initialPosts || []);

    const displayPosts = useMemo(() => {
        return posts.map((post) => {
            // If profiles is missing or incomplete, and the post belongs to the current profile user
            if ((!post.profiles || !post.profiles.username) && post.user_id === profile?.id) {
                return {
                    ...post,
                    profiles: {
                        id: profile.id,
                        username: profile.username,
                        full_name: profile.full_name,
                        avatar_url: profile.avatar_url,
                    },
                };
            }
            return post;
        });
    }, [posts, profile]);

    useRealtimeRouterSubscription<any>({
        table: "posts",
        event: "*",
        filter: profile?.id ? `user_id=eq.${profile.id}` : undefined,
        enabled: !!profile?.id,
        onData: (payload) => {
            const eventType = payload.eventType;
            const newRow: any = payload.new;
            const oldRow: any = payload.old;

            if (eventType === "DELETE") {
                const deletedId = oldRow?.id;
                if (!deletedId) return;
                setPosts((prev) => prev.filter((p) => p.id !== deletedId));
                return;
            }

            if (eventType === "UPDATE") {
                if (!newRow?.id) return;
                setPosts((prev) => prev.map((p) => (p.id === newRow.id ? { ...p, ...newRow } : p)));
                return;
            }

            if (eventType === "INSERT") {
                if (!newRow?.id) return;
                setPosts((prev) => {
                    if (prev.some((p) => p.id === newRow.id)) return prev;
                    return [{ ...newRow }, ...prev];
                });
            }
        },
    });

    function handleDeletePost(postId: string) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
    }

    return (
        <ActivityFeed
            posts={displayPosts}
            currentUser={currentUser}
            interactive={!!currentUser}
            onDeletePost={handleDeletePost}
        />
    );
}
