"use client";

import { useState, useMemo, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import { Post } from "@/components/explorer/types";
import ThreadedComment from "@/components/post/ThreadedComment";
import RealtimePost from "@/components/explorer/RealtimePost"; // For parent post preview
import ReplyComposer from "@/components/post/ReplyComposer";
import { usePostDetail } from "@/components/post/PostDetailContext";
import { useRealtimeRouterSubscription } from "@/hooks/useRealtimeRouterSubscription";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface PostCommentListProps {
    postId: string;
    initialComments: Post[];
    currentUser: any;
    parentPost?: Post | null; // For "Replying to" header
    threadRootId?: string;
}

export default function PostCommentList({
    postId,
    initialComments,
    currentUser,
    parentPost,
    threadRootId
}: PostCommentListProps) {
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();
    const { openLightbox, replyTargetId, setReplyTargetId } = usePostDetail();
    const [replies, setReplies] = useState<Post[]>(initialComments || []);
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
    const [commentSort] = useState<"top" | "newest" | "oldest">("top");

    // Real-time Subscriptions (Ported from PostDetailClient)
    useRealtimeRouterSubscription<any>({
        table: "posts",
        event: "*",
        filter: postId ? `thread_root_id=eq.${postId}` : undefined,
        enabled: !!postId,
        onData: async (payload) => {
            const eventType = payload.eventType;
            const newRow: any = payload.new;
            const oldRow: any = payload.old; // Add oldRow capture

            if (eventType === "DELETE") {
                const deletedId = oldRow?.id; // Safely access oldRow
                if (!deletedId) return;
                setReplies((prev) => prev.filter((r) => r.id !== deletedId));
                return;
            }

            if (eventType === "UPDATE") {
                if (!newRow?.id) return;
                setReplies((prev) => prev.map((r) => (r.id === newRow.id ? { ...r, ...newRow } : r)));
                return;
            }

            if (eventType === "INSERT") {
                if (!newRow?.id) return;
                // Fetch full profile for the new comment
                const { data } = await supabase
                    .from("posts")
                    .select(`
                        *,
                        profiles:user_id (username, full_name, avatar_url),
                        media, poll_data, collaboration_data, achievement_data
                    `)
                    .eq("id", newRow.id)
                    .maybeSingle();

                if (!data) return;

                setReplies((prev) => {
                    // Avoid duplicates
                    if (prev.some((r) => r.id === data.id)) return prev;
                    return [...prev, data as any];
                });
            }
        }
    });

    // Helper functions
    const toggleCollapse = useCallback((pid: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(pid)) next.delete(pid);
            else next.add(pid);
            return next;
        });
    }, []);

    const handleMediaClick = (p: Post, url: string, type: 'image' | 'video') => {
        // Reuse logic or better yet, make openLightbox smart enough? 
        // For now, duplicate the parsing logic briefly or export it?
        // Let's just create a quick helper or duplicate for speed, as it's small.
        const items: Array<{ url: string; type: 'image' | 'video' }> = [];
        const media: any = (p as any)?.media;

        if (media?.type === 'image' && Array.isArray(media?.urls)) {
            media.urls.forEach((u: string) => items.push({ url: u, type: 'image' }));
        } else if (media?.type === 'video' && media?.url) {
            items.push({ url: media.url, type: 'video' });
        } else if (media?.type === 'mixed' && Array.isArray(media?.items)) {
            media.items.forEach((it: any) => {
                if (it?.url && (it?.type === 'video' || it?.type === 'image')) {
                    items.push({ url: it.url, type: it.type });
                }
            });
        }

        if (items.length === 0) {
            openLightbox([{ url, type }], 0);
            return;
        }
        const index = Math.max(0, items.findIndex(i => i.url === url));
        openLightbox(items, index);
    };

    // Organizing Comments (Threading)
    const repliesByParentId = useMemo(() => {
        const map = new Map<string, Post[]>();
        for (const r of replies) {
            const pid = (r.parent_post_id || "") as string;
            // If it's a direct reply to the main post, we treat it as root (handled by filtering usually)
            // But here we might receive ALL decendants if the query was deep?
            // The query usually fetches `thread_root_id` eq current. 
            // If parent_post_id == postId, it's a direct reply.

            // We'll group by parent_post_id.
            if (!pid) continue;
            const arr = map.get(pid) || [];
            arr.push(r);
            map.set(pid, arr);
        }
        // Sor inside groups
        for (const [k, arr] of map.entries()) {
            arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            map.set(k, arr);
        }
        return map;
    }, [replies]);

    const rootComments = useMemo(() => {
        if (!postId) return [];
        // Root comments for this view are those whose parent is the current post
        const roots = repliesByParentId.get(postId) || [];
        const sorted = [...roots];

        if (commentSort === "newest") {
            sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (commentSort === "oldest") {
            sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        } else {
            // Top: Likes then Date
            sorted.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0) || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
        return sorted;
    }, [repliesByParentId, postId, commentSort]);


    return (
        <div className="flex flex-col h-full bg-white dark:bg-black/50">
            <div className="flex-1 min-h-0">
                {rootComments.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                        No comments yet. Be the first to reply!
                    </div>
                ) : (
                    <Virtuoso
                        style={{ height: '100%' }}
                        data={rootComments}
                        components={{
                            Header: () => (
                                <>
                                    {parentPost && (
                                        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 mb-2 cursor-pointer" onClick={() => router.push(`/post/${parentPost.id}`)}>
                                            <div className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">Replying to</div>
                                            {/* Should be lightweight preview, RealtimePost might be too heavy? It's fine for now */}
                                            <RealtimePost post={parentPost} currentUser={currentUser} onDelete={() => { }} />
                                        </div>
                                    )}
                                </>
                            ),
                            Footer: () => <div className="pb-20" /> // Space for composer
                        }}
                        itemContent={(_, comment) => (
                            <ThreadedComment
                                post={comment}
                                currentUser={currentUser}
                                depth={0}
                                repliesByParentId={repliesByParentId}
                                collapsedIds={collapsedIds}
                                onToggleCollapse={toggleCollapse}
                                onReply={(p) => setReplyTargetId(p.id)}
                                onMediaClick={(url, type, p) => handleMediaClick(p, url, type)}
                            />
                        )}
                    />
                )}
            </div>

            {/* Composer - Sticky at bottom or separate? 
               In the original design, it was at the bottom of the right column. 
               We'll place it here.
           */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10">
                <ReplyComposer
                    postId={postId}
                    postThreadRootId={threadRootId || postId}
                    currentUser={currentUser}
                    replyTargetId={replyTargetId}
                    onClearReplyTarget={() => setReplyTargetId(null)}
                    onReplySuccess={(optimisticReply) => {
                        setReplies(prev => [...prev, optimisticReply]);
                    }}
                />
            </div>
        </div>
    );
}
