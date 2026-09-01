"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCookieConsent } from "@/components/providers/CookieProvider";
import { Heart, MessageSquare, Repeat, Eye, Bookmark as SavedIcon, Share2 } from "lucide-react";
import { useToast } from "@/components/ui-custom/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PostEngagementBarProps {
    postId: string;
    currentUserId: string | null;
    initialCounts?: {
        likes: number;
        comments: number;
        reposts: number;
        saved: number;
        views: number;
    };
    onCommentClick?: () => void;
    className?: string;
}

const PostEngagementBar = React.memo(function PostEngagementBar({
    postId,
    currentUserId,
    initialCounts,
    onCommentClick,
    className = "",
}: PostEngagementBarProps) {
    // ... [Same implementation]
    const supabase = createSupabaseBrowserClient();
    const { showToast } = useToast();
    const { preferences } = useCookieConsent();

    // State for counts
    const [counts, setCounts] = useState({
        likes: initialCounts?.likes || 0,
        comments: initialCounts?.comments || 0,
        reposts: initialCounts?.reposts || 0,
        saved: initialCounts?.saved || 0,
        views: initialCounts?.views || 0,
    });

    // State for user interactions
    const [isLiked, setIsLiked] = useState(false);
    const [isReposted, setIsReposted] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // View tracking state
    const [hasViewed, setHasViewed] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    // Load initial interaction state
    useEffect(() => {
        if (!currentUserId || !postId) {
            return;
        }

        async function loadInteractions() {
            try {
                const [likeRes, repostRes, bookmarkRes] = await Promise.all([
                    supabase
                        .from("post_likes")
                        .select("id")
                        .eq("post_id", postId)
                        .eq("user_id", currentUserId!)
                        .maybeSingle(),
                    supabase
                        .from("post_reposts")
                        .select("id")
                        .eq("post_id", postId)
                        .eq("user_id", currentUserId!)
                        .maybeSingle(),
                    supabase
                        .from("bookmarks")
                        .select("id")
                        .eq("entity_id", postId)
                        .eq("entity_type", "post")
                        .eq("user_id", currentUserId!)
                        .maybeSingle(),
                ]);

                setIsLiked(!!likeRes.data);
                setIsReposted(!!repostRes.data);
                setIsSaved(!!bookmarkRes.data);
            } catch (error) {
                console.error("Error loading interactions:", error);
            }
        }

        loadInteractions();
    }, [postId, currentUserId, supabase]);

    // Sync with parent updates (e.g. from feed refresh)
    useEffect(() => {
        if (initialCounts) {
            setCounts({
                likes: initialCounts.likes || 0,
                comments: initialCounts.comments || 0,
                reposts: initialCounts.reposts || 0,
                saved: initialCounts.saved || 0,
                views: initialCounts.views || 0,
            });
        }
    }, [initialCounts]);

    // Real-time subscription for counts
    useEffect(() => {
        if (!postId) return;

        const channel = supabase
            .channel(`post-engagement-${postId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "posts",
                    filter: `id=eq.${postId}`,
                },
                (payload: any) => {
                    try {
                        if (payload.new) {
                            setCounts(prev => ({
                                ...prev,
                                // Use DB counts but prefer optimistic/local logic if needed. 
                                // Actually, simply taking server truth is best for "real-time" sync.
                                // However, we must be careful not to override optimistic updates if they haven't synced yet.
                                // But usually payload.new comes AFTER commit.
                                likes: payload.new.likes_count ?? prev.likes,
                                comments: payload.new.comments_count ?? prev.comments,
                                reposts: payload.new.reposts_count ?? prev.reposts,
                                saved: (payload.new.saved_count || payload.new.bookmarks_count) ?? prev.saved,
                                views: payload.new.views_count ?? prev.views,
                            }));
                        }
                    } catch (error) {
                        console.error("[PostEngagementBar] Error handling posts update:", error);
                    }
                }
            )
            // Listen for Likes
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "post_likes",
                    filter: `post_id=eq.${postId}`,
                },
                async (payload: any) => {
                    try {
                        // If I triggered it, my optimistic update handled it.
                        // But to be sure we are in sync, we can just refetch.
                        // Checking user_id helps avoid flicker if needed.
                        if (payload.new && payload.new.user_id === currentUserId) return;
                        if (payload.old && payload.old.user_id === currentUserId) return; // Might be undefined on DELETE

                        // Fetch fresh count
                        const { count, error } = await supabase
                            .from("post_likes")
                            .select("*", { count: "exact", head: true })
                            .eq("post_id", postId);

                        if (error) {
                            console.error("[PostEngagementBar] Error fetching like count:", error);
                            return;
                        }

                        if (count !== null) {
                            setCounts(prev => ({ ...prev, likes: count }));
                        }
                    } catch (error) {
                        console.error("[PostEngagementBar] Error handling like update:", error);
                    }
                }
            )
            // Listen for Reposts
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "post_reposts",
                    filter: `post_id=eq.${postId}`,
                },
                async (payload: any) => {
                    try {
                        if (payload.new && payload.new.user_id === currentUserId) return;
                        // For delete, if simple replica, user_id might be missing. 
                        // We'll proceed to fetch to be safe/accurate.

                        const { count, error } = await supabase
                            .from("post_reposts")
                            .select("*", { count: "exact", head: true })
                            .eq("post_id", postId);

                        if (error) {
                            console.error("[PostEngagementBar] Error fetching repost count:", error);
                            return;
                        }

                        if (count !== null) {
                            setCounts(prev => ({ ...prev, reposts: count }));
                        }
                    } catch (error) {
                        console.error("[PostEngagementBar] Error handling repost update:", error);
                    }
                }
            )
            // Listen for Bookmarks
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "bookmarks",
                    filter: `entity_id=eq.${postId}`, // Bookmarks uses entity_id
                },
                async (payload: any) => {
                    try {
                        // Only care if it's a post bookmark? The filter `entity_id=eq.postId` covers it, 
                        // assuming IDs are unique across entities or we should also filter entity_type.
                        // But realtime filter string doesn't support AND easily without composite filter syntax or distinct channel.
                        // Given UUIDs, collision is unlikely.

                        if (payload.new && payload.new.user_id === currentUserId) return;

                        const { count, error } = await supabase
                            .from("bookmarks")
                            .select("*", { count: "exact", head: true })
                            .eq("entity_id", postId)
                            .eq("entity_type", "post");

                        if (error) {
                            console.error("[PostEngagementBar] Error fetching bookmark count:", error);
                            return;
                        }

                        if (count !== null) {
                            setCounts(prev => ({ ...prev, saved: count }));
                        }
                    } catch (error) {
                        console.error("[PostEngagementBar] Error handling bookmark update:", error);
                    }
                }
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.log(`[PostEngagementBar] Subscribed to engagement updates for post ${postId}`);
                } else if (status === "CHANNEL_ERROR") {
                    console.error(`[PostEngagementBar] Channel error for post ${postId}`);
                } else if (status === "TIMED_OUT") {
                    console.warn(`[PostEngagementBar] Subscription timeout for post ${postId}`);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [postId, supabase, currentUserId]);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const recordView = useCallback(async () => {
        if (hasViewed || !preferences.analytics) return;

        try {
            setHasViewed(true);
            await supabase.rpc("increment_post_view_count", { post_id_param: postId });
            // Optimistic update
            setCounts(prev => ({ ...prev, views: prev.views + 1 }));
        } catch (error) {
            console.error("Error recording view:", error);
        }
    }, [postId, hasViewed, supabase]);

    // View tracking
    useEffect(() => {
        if (hasViewed || !postId) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry && entry.isIntersecting) {
                    // Wait 1s before counting view
                    timerRef.current = setTimeout(() => {
                        recordView();
                    }, 1000);
                } else {
                    // Cancel if scrolled away before 1s
                    if (timerRef.current) {
                        clearTimeout(timerRef.current);
                        timerRef.current = null;
                    }
                }
            },
            { threshold: 0.5 }
        );

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => {
            observer.disconnect();
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [postId, hasViewed, recordView]);

    // Handlers
    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUserId) {
            showToast("Please sign in to like posts", "error");
            return;
        }

        const previousState = isLiked;

        setIsLiked(!previousState);
        setCounts(prev => ({
            ...prev,
            likes: Math.max(0, prev.likes + (previousState ? -1 : 1))
        }));

        try {
            if (previousState) {
                // Unlike
                const { error } = await supabase
                    .from("post_likes")
                    .delete()
                    .eq("post_id", postId)
                    .eq("user_id", currentUserId);
                if (error) throw error;
            } else {
                // Like
                const { error } = await supabase
                    .from("post_likes")
                    .insert({ post_id: postId, user_id: currentUserId });

                if (error) {
                    // Ignore duplicate key error (race condition)
                    if (error.code === '23505') return;
                    throw error;
                }
            }
        } catch (error: any) {
            console.error("Error toggling like:", JSON.stringify(error, null, 2));
            setIsLiked(previousState);
            setCounts(prev => ({
                ...prev,
                likes: Math.max(0, prev.likes + (previousState ? 1 : -1))
            }));

            if (error?.code === '23503') {
                showToast("This post no longer exists", "error");
            } else {
                showToast("Failed to update like", "error");
            }
        }
    };

    const handleRepost = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUserId) {
            showToast("Please sign in to repost", "error");
            return;
        }

        const previousState = isReposted;

        setIsReposted(!previousState);
        setCounts(prev => ({
            ...prev,
            reposts: Math.max(0, prev.reposts + (previousState ? -1 : 1))
        }));

        try {
            if (previousState) {
                const { error } = await supabase
                    .from("post_reposts")
                    .delete()
                    .eq("post_id", postId)
                    .eq("user_id", currentUserId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("post_reposts")
                    .insert({ post_id: postId, user_id: currentUserId });

                if (error) {
                    // Ignore duplicate key error
                    if (error.code === '23505') return;
                    throw error;
                }
            }
        } catch (error: any) {
            console.error("Error toggling repost:", JSON.stringify(error, null, 2));
            setIsReposted(previousState);
            setCounts(prev => ({
                ...prev,
                reposts: Math.max(0, prev.reposts + (previousState ? 1 : -1))
            }));

            if (error?.code === '23503') {
                showToast("This post no longer exists", "error");
            } else {
                showToast("Failed to update repost", "error");
            }
        }
    };

    const handleSaved = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUserId) {
            showToast("Please sign in to save posts", "error");
            return;
        }

        const previousState = isSaved;

        setIsSaved(!previousState);
        setCounts(prev => ({
            ...prev,
            saved: Math.max(0, prev.saved + (previousState ? -1 : 1))
        }));

        try {
            if (previousState) {
                const { error } = await supabase
                    .from("bookmarks")
                    .delete()
                    .eq("entity_id", postId)
                    .eq("entity_type", "post")
                    .eq("user_id", currentUserId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("bookmarks")
                    .insert({ entity_id: postId, entity_type: "post", user_id: currentUserId });

                if (error) {
                    // Ignore duplicate key error
                    if (error.code === '23505') return;
                    throw error;
                }
            }
        } catch (error: any) {
            console.error("Error toggling saved:", JSON.stringify(error, null, 2));
            setIsSaved(previousState);
            setCounts(prev => ({
                ...prev,
                saved: Math.max(0, prev.saved + (previousState ? 1 : -1))
            }));

            if (error?.code === '23503') {
                showToast("This post no longer exists", "error");
            } else {
                showToast("Failed to update saved", "error");
            }
        }
    };

    return (
        <div
            ref={elementRef}
            className={cn("flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/50 mt-3", className)}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-1 sm:gap-6">
                <InteractionButton
                    onClick={handleLike}
                    isActive={isLiked}
                    activeColor="text-pink-500"
                    activeBg="bg-pink-50 dark:bg-pink-900/20"
                    count={counts.likes}
                    icon={Heart}
                    fillOnActive
                />

                <InteractionButton
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onCommentClick?.();
                    }}
                    isActive={false}
                    activeColor="text-blue-500"
                    activeBg="bg-blue-50 dark:bg-blue-900/20"
                    count={counts.comments}
                    icon={MessageSquare}
                />

                <InteractionButton
                    onClick={handleRepost}
                    isActive={isReposted}
                    activeColor="text-green-500"
                    activeBg="bg-green-50 dark:bg-green-900/20"
                    count={counts.reposts}
                    icon={Repeat}
                />

                <InteractionButton
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        const url = typeof window !== 'undefined' ? window.location.origin + '/post/' + postId : '';
                        if (navigator.share && url) {
                            navigator.share({ url: url }).catch(() => { });
                            showToast("Link shared", "success");
                        } else {
                            if (url) {
                                navigator.clipboard.writeText(url);
                                showToast("Link copied to clipboard", "success");
                            }
                        }
                    }}
                    isActive={false}
                    activeColor="text-blue-500"
                    activeBg="bg-blue-50 dark:bg-blue-900/20"
                    count={0}
                    icon={Share2}
                    showCount={false}
                />
            </div>

            <div className="flex items-center gap-1 sm:gap-4">
                <InteractionButton
                    onClick={handleSaved}
                    isActive={isSaved}
                    activeColor="text-yellow-500"
                    activeBg="bg-yellow-50 dark:bg-yellow-900/20"
                    count={counts.saved}
                    icon={SavedIcon}
                    fillOnActive
                    showCount={false}
                />
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-600 px-2">
                    <Eye className="w-3.5 h-3.5" />
                    <abbr title={`${counts.views} views`} className="no-underline">
                        {formatCompactNumber(counts.views)}
                    </abbr>
                </div>
            </div>
        </div>
    );
});

export default PostEngagementBar;

// Sub-component for individual buttons to keep main clean
function InteractionButton({
    onClick,
    isActive,
    activeColor,
    activeBg,
    count,
    icon: Icon,
    fillOnActive = false,
    showCount = true
}: any) {
    return (
        <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={onClick}
            className={cn(
                "group flex items-center gap-1.5 p-2 -ml-2 rounded-full transition-all duration-300 relative overflow-hidden",
                isActive ? activeColor : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
        >
            <span className={cn(
                "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                isActive ? activeBg : "bg-zinc-100 dark:bg-zinc-800"
            )} />

            <div className="relative z-10 flex items-center gap-1.5">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isActive ? "active" : "inactive"}
                        initial={isActive ? { scale: 0.5, rotate: -30 } : { scale: 1 }}
                        animate={isActive ? {
                            scale: [1, 1.4, 1],
                            rotate: fillOnActive ? [0, 15, -15, 0] : 0
                        } : { scale: 1, rotate: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <Icon
                            className={cn(
                                "w-4 h-4 sm:w-[18px] sm:h-[18px] transition-colors duration-300",
                                isActive && fillOnActive && "fill-current"
                            )}
                            strokeWidth={2}
                        />
                    </motion.div>
                </AnimatePresence>
                {showCount && count > 0 && (
                    <motion.span
                        key={count}
                        initial={{ y: -5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-xs sm:text-sm font-medium"
                    >
                        {formatCompactNumber(count)}
                    </motion.span>
                )}
            </div>
        </motion.button>
    );
}

function formatCompactNumber(number: number) {
    if (number < 1000) {
        return number;
    } else if (number >= 1000 && number < 1000000) {
        return (number / 1000).toFixed(1) + "K";
    } else if (number >= 1000000 && number < 1000000000) {
        return (number / 1000000).toFixed(1) + "M";
    } else if (number >= 1000000000 && number < 1000000000000) {
        return (number / 1000000000).toFixed(1) + "B";
    } else if (number >= 1000000000000 && number < 1000000000000000) {
        return (number / 1000000000000).toFixed(1) + "T";
    }
    return number;
}
