"use client";


import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui-custom/Toast";
import { Post } from "@/components/explorer/types";
import { useRealtimeRouterSubscription } from "@/hooks/useRealtimeRouterSubscription";

interface PostInteractionBarProps {
    post: Post;
    initialLiked: boolean;
    initialReposted: boolean;
    initialBookmarked: boolean;
    currentUser: any;
}

export default function PostInteractionBar({
    post,
    initialLiked,
    initialReposted,
    initialBookmarked,
    currentUser
}: PostInteractionBarProps) {
    const supabase = createSupabaseBrowserClient();
    const { showToast } = useToast();

    // Optimistic State
    const [liked, setLiked] = useState(initialLiked);
    const [reposted, setReposted] = useState(initialReposted);
    const [bookmarked, setBookmarked] = useState(initialBookmarked);

    // Counts (Optimistic)
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [repostsCount, setRepostsCount] = useState(post.reposts_count || 0);

    // Realtable Subscriptions for Counts
    useRealtimeRouterSubscription<any>({
        table: "post_likes",
        event: "*",
        filter: `post_id=eq.${post.id}`,
        enabled: true,
        onData: (payload) => {
            if (payload.eventType === "INSERT") {
                setLikesCount(prev => prev + 1);
            } else if (payload.eventType === "DELETE") {
                setLikesCount(prev => Math.max(0, prev - 1));
            }
        }
    });

    useRealtimeRouterSubscription<any>({
        table: "post_reposts",
        event: "*",
        filter: `post_id=eq.${post.id}`,
        enabled: true,
        onData: (payload) => {
            if (payload.eventType === "INSERT") {
                setRepostsCount(prev => prev + 1);
            } else if (payload.eventType === "DELETE") {
                setRepostsCount(prev => Math.max(0, prev - 1));
            }
        }
    });

    const handleLike = async () => {
        if (!currentUser) {
            showToast("Please login to like", "error");
            return;
        }

        const newLiked = !liked;
        const newCount = likesCount + (newLiked ? 1 : -1);

        setLiked(newLiked);
        setLikesCount(Math.max(0, newCount));

        try {
            if (newLiked) {
                await supabase.from("post_likes").upsert({ user_id: currentUser.id, post_id: post.id }, { ignoreDuplicates: true });
            } else {
                await supabase.from("post_likes").delete().eq("user_id", currentUser.id).eq("post_id", post.id);
            }
        } catch (error) {
            console.error("Error toggling like:", error);
            // Revert on error
            setLiked(!newLiked);
            setLikesCount(likesCount);
            showToast("Failed to like post", "error");
        }
    };

    const handleRepost = async () => {
        if (!currentUser) return;

        const newReposted = !reposted;
        const newCount = repostsCount + (newReposted ? 1 : -1);

        setReposted(newReposted);
        setRepostsCount(Math.max(0, newCount));

        try {
            if (newReposted) {
                await supabase.from("post_reposts").insert({ user_id: currentUser.id, post_id: post.id });
            } else {
                await supabase.from("post_reposts").delete().eq("user_id", currentUser.id).eq("post_id", post.id);
            }
        } catch (error) {
            console.error(error);
            setReposted(!newReposted);
            setRepostsCount(repostsCount);
            showToast("Failed to repost", "error");
        }
    };

    const handleBookmark = async () => {
        if (!currentUser) return;
        const newBookmarked = !bookmarked;
        setBookmarked(newBookmarked);

        try {
            if (newBookmarked) {
                await supabase.from("bookmarks").insert({ user_id: currentUser.id, entity_id: post.id, entity_type: 'post' });
                showToast("Post saved", "success");
            } else {
                await supabase.from("bookmarks").delete().eq("user_id", currentUser.id).eq("entity_id", post.id).eq("entity_type", "post");
                showToast("Post removed from saved", "success");
            }
        } catch (error) {
            setBookmarked(!newBookmarked);
            showToast("Failed to save post", "error");
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            showToast("Link copied to clipboard", "success");
        } catch {
            showToast("Failed to copy link", "error");
        }
    };

    return (
        <div className="flex items-center justify-between border-t border-b border-zinc-100 dark:border-zinc-800 py-3 mt-4">
            {/* Stat Counts Display (Optional, can be integrated into buttons or separate) */}
            {/* For this design, we'll keep it simple like Twitter/X */}

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-1 group">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleLike}
                        className={`p-2 group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20 group-hover:text-pink-500 rounded-full transition-colors ${liked ? 'text-pink-500' : 'text-zinc-500'}`}
                    >
                        <motion.div animate={liked ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.2 }}>
                            <svg className="w-6 h-6" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        </motion.div>
                    </motion.button>
                    <span className={`text-sm ${liked ? 'text-pink-500' : 'text-zinc-500 group-hover:text-pink-500'}`}>{likesCount > 0 && likesCount}</span>
                </div>

                <div className="flex items-center gap-1 group">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleRepost}
                        className={`p-2 group-hover:bg-green-50 dark:group-hover:bg-green-900/20 group-hover:text-green-500 rounded-full transition-colors ${reposted ? 'text-green-500' : 'text-zinc-500'}`}
                    >
                        <motion.div animate={reposted ? { rotate: [0, 180, 360] } : {}} transition={{ duration: 0.4 }}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </motion.div>
                    </motion.button>
                    <span className={`text-sm ${reposted ? 'text-green-500' : 'text-zinc-500 group-hover:text-green-500'}`}>{repostsCount > 0 && repostsCount}</span>
                </div>

                <div className="flex items-center gap-1 group">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleBookmark}
                        className={`p-2 group-hover:bg-yellow-50 dark:group-hover:bg-yellow-900/20 group-hover:text-yellow-500 rounded-full transition-colors ${bookmarked ? 'text-yellow-500 fill-current' : 'text-zinc-500'}`}
                    >
                        <svg className="w-6 h-6" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    </motion.button>
                </div>
            </div>

            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleCopyLink}
                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 rounded-full transition-colors text-zinc-500"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </motion.button>
        </div>
    );
}
