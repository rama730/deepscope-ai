"use client";
// Force rebuild: 2026-01-06 - Removed UserHoverCard

import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Post } from "./types";
import PostEngagementBar from "@/components/posts/PostEngagementBar";
import LinkPreviewCard from "@/components/posts/LinkPreviewCard";
import { cn } from "@/lib/utils";
import { SmartPostTags } from "@/components/explorer/SmartPostEnhancements";
import dynamic from "next/dynamic";
import { PostHeader } from "@/components/explorer/post/PostHeader";
import { PostContent } from "@/components/explorer/post/PostContent";
import { PostContextPill } from "./post/PostContextPill";
import { ThreadVisuals } from "./post/ThreadVisuals";
import { PostQuote } from "./post/PostQuote";
import { CollaborationCard } from "./post/CollaborationCard";
import { SmartLink } from "@/components/ui-custom";
import { useSmartPrefetch } from "@/hooks/useSmartPrefetch";

const PostMediaDisplay = dynamic(() => import("@/components/post/PostMediaDisplay"), {
    loading: () => (
        <div className="w-full h-64 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
    ),
    ssr: false,
});

interface RealtimePostProps {
    post: Post;
    currentUser: any;
    onDelete?: (postId: string) => void;
    onComment?: (post: Post) => void;
    onMediaClick?: (url: string, type: "image" | "video", post?: Post) => void;
    isFocused?: boolean;
    searchQuery?: string;
    selectedTag?: string;
    isReplyInThread?: boolean;
    priority?: boolean;
    threadContext?: "start" | "middle" | "end";
}

const RealtimePost = memo(function RealtimePost({
    post,
    currentUser,
    onDelete,
    onComment,
    onMediaClick,
    isFocused = false,
    searchQuery,
    selectedTag,
    isReplyInThread = false,
    priority = false,
    threadContext,
}: RealtimePostProps) {
    const router = useRouter();

    // Level 2: Use pre-extracted URL from service layer to avoid regex in render
    const firstUrl = post.firstUrl;

    const handleProfileClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        // Link component handles navigation
    }, []);

    const handlePostClick = useCallback(() => {
        if (post.is_reply && post.parent_post_id) {
            const rootId =
                post.thread_ancestors &&
                    post.thread_ancestors.length > 0 &&
                    (post.thread_ancestors[0] as any)?.id
                    ? (post.thread_ancestors[0] as any).id
                    : null;
            const targetId = rootId || post.parent_post_id;
            router.push(`/post/${targetId}?reply=${post.id}`);
        } else {
            router.push(`/post/${post.id}`);
        }
    }, [post.is_reply, post.parent_post_id, post.id, post.thread_ancestors, router]);

    // Determine target URL for prefetch
    const targetUrl = useMemo(() => {
        if (post.is_reply && post.parent_post_id) {
            const rootId =
                post.thread_ancestors &&
                    post.thread_ancestors.length > 0 &&
                    (post.thread_ancestors[0] as any)?.id
                    ? (post.thread_ancestors[0] as any).id
                    : null;
            const targetId = rootId || post.parent_post_id;
            return `/post/${targetId}?reply=${post.id}`;
        }
        return `/post/${post.id}`;
    }, [post.is_reply, post.parent_post_id, post.id, post.thread_ancestors]);

    const { onMouseEnter, onMouseLeave } = useSmartPrefetch(targetUrl);

    // Level 2: Lazy Hydration / Viewport rendering
    const [isVisible, setIsVisible] = useState(priority);
    const visibilityRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (priority) {
            setIsVisible(true);
            return;
        }
        if (isVisible) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry && entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "600px" } // Load even earlier for smoother scrolling
        );

        if (visibilityRef.current) {
            observer.observe(visibilityRef.current);
        }

        return () => observer.disconnect();
    }, [priority, isVisible]);

    return (
        <div
            className={cn(
                "relative transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300",
                threadContext
                    ? "p-0 sm:p-0"
                    : isReplyInThread
                        ? "pb-3 pt-3 pr-4 pl-0"
                        : "border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 p-4 sm:p-5 my-2 rounded-2xl bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md dark:shadow-none dark:hover:bg-zinc-900/40 opacity-100", // Added opacity-100 to ensure visibility
                isFocused ? "ring-2 ring-blue-500/20 bg-blue-50/10 dark:bg-blue-900/10" : ""
            )}
            data-post-id={post.id}
            onClick={handlePostClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            ref={visibilityRef}
        >
            {/* AI Context Pill - Deterministic to prevent hydration mismatch */}
            <PostContextPill postId={post.id} isReply={!!post.is_reply} threadContext={threadContext} />

            <div
                className={`flex items-stretch gap-4 ${threadContext ? "p-4 sm:p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors" : ""}`}
            >
                <div className="relative flex-shrink-0 flex flex-col items-center">
                    {/* Thread Visuals */}
                    <ThreadVisuals threadContext={threadContext} />

                    <div className="relative z-10">
                        <SmartLink
                            href={`/profile/${post.profiles?.username}`}
                            onClick={handleProfileClick}
                            className="block relative group/avatar"
                        >
                            <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-br from-white to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800">
                                {post.profiles?.avatar_url ? (
                                    <Image
                                        src={post.profiles.avatar_url}
                                        alt={post.profiles.full_name || post.profiles.username || "User"}
                                        width={44}
                                        height={44}
                                        loading={priority ? "eager" : "lazy"}
                                        fetchPriority={priority ? "high" : "auto"}
                                        sizes="44px" // Refined sizes for small avatar
                                        className="w-full h-full rounded-full object-cover transition-transform duration-300 group-hover/avatar:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                        {(post.profiles?.full_name || post.profiles?.username || "U")
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </SmartLink>
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    {/* Reply Context Pill */}
                    {post.is_reply && post.parent_post?.profiles?.username && (
                        <div
                            className="inline-flex items-center gap-1.5 px-3 py-1 mb-2 rounded-full bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 backdrop-blur-sm text-xs text-blue-600 dark:text-blue-400 font-medium"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span className="opacity-70">Replying to</span>
                            <SmartLink
                                href={`/profile/${post.parent_post.profiles.username}`}
                                className="hover:underline font-semibold"
                            >
                                @{post.parent_post.profiles.username}
                            </SmartLink>
                        </div>
                    )}

                    {/* Componentized Header - Level 2: Pass primitives for granular memoization */}
                    <PostHeader
                        post={post}
                        postId={post.id}
                        userId={post.user_id}
                        username={post.profiles?.username || "unknown"}
                        fullName={post.profiles?.full_name || "Unknown User"}
                        createdAt={post.created_at}
                        currentUser={currentUser}
                        onDelete={onDelete}
                        onProfileClick={(e) => e.stopPropagation()}
                    />

                    {/* Componentized Content */}
                    <PostContent
                        content={post.content}
                        tokens={post.tokens}
                        searchQuery={searchQuery}
                        selectedTag={selectedTag}
                    />

                    {/* Smart AI Analysis Tags */}
                    {!post.is_reply && post.content && post.content.length > 50 && (
                        <SmartPostTags text={post.content} />
                    )}

                    {/* Rich Link Preview */}
                    {firstUrl && !post.media && !post.quoted_post && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                            <LinkPreviewCard url={firstUrl} />
                        </div>
                    )}

                    {/* Media & Action Bar - Level 2: Defer until visible for massive perf gains in long feeds */}
                    {isVisible ? (
                        <>
                            {/* Media Display */}
                            <div className="mt-3">
                                {post.media && (
                                    <PostMediaDisplay post={post} priority={priority} onMediaClick={onMediaClick} />
                                )}
                            </div>

                            {/* Quoted Post */}
                            <PostQuote post={post} />

                            {/* Collaboration Card */}
                            <CollaborationCard post={post} />

                            <div className="mt-1">
                                <PostEngagementBar
                                    postId={post.id}
                                    currentUserId={currentUser?.id}
                                    initialCounts={{
                                        likes: post.likes_count || 0,
                                        comments: post.comments_count || 0,
                                        reposts: post.reposts_count || 0,
                                        saved: post.saved_count || 0,
                                        views: post.views_count || 0,
                                    }}
                                    onCommentClick={() => {
                                        if (onComment) {
                                            onComment(post);
                                        } else {
                                            router.push(`/post/${post.id}`);
                                        }
                                    }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="h-10 invisible" /> // Placeholder for actions
                    )}
                </div>
            </div>
        </div>
    );
});

export default RealtimePost;
