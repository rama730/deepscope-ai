"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserPlus, Check } from "lucide-react";
import { useToast } from "@/components/ui-custom/Toast";


interface SuggestedUser {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
}

export default function WhoToFollowWidget() {
    const supabase = createSupabaseBrowserClient();
    const router = useRouter();
    const { showToast } = useToast();
    const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function loadSuggestions() {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    // Use RPC for logged in users
                    const { data, error } = await supabase.rpc('get_discover_suggestions', {
                        p_user_id: user.id,
                        p_limit: 3
                    });

                    if (error) throw error;

                    if (data) {
                        setSuggestions(data.map((p: any) => ({
                            ...p,
                            isConnected: false
                        })));
                    }
                } else {
                    // Fallback for guests: random 3 profiles
                    const { data } = await supabase
                        .from('profiles')
                        .select('id, username, full_name, avatar_url')
                        .limit(20); // Fetch more then randomize

                    if (data) {
                        const shuffled = data.sort(() => 0.5 - Math.random()).slice(0, 3);
                        setSuggestions(shuffled.map((p: any) => ({
                            ...p,
                            isConnected: false,
                            suggestionReason: 'Suggested'
                        })));
                    }
                }
            } catch (error) {
                console.error("Error loading who to follow:", error);
            } finally {
                setLoading(false);
            }
        }

        loadSuggestions();
    }, []);

    const handleFollow = async (userId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showToast("Please sign in to follow users", "error");
                return;
            }

            const { error } = await supabase
                .from('connections')
                .insert({
                    user_id: user.id,
                    connected_user_id: userId,
                    status: 'pending' // Or accepted depending on privacy model
                });

            if (error) throw error;

            setFollowing(prev => new Set(prev).add(userId));
            showToast("Follow request sent", "success");

            // Remove from suggestions after a short delay to show success state
            setTimeout(() => {
                setSuggestions(prev => prev.filter(u => u.id !== userId));
            }, 1500);
        } catch (error) {
            console.error("Error following user:", error);
            showToast("Failed to follow user", "error");
        }
    };

    if (loading) {
        return (
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                <div className="h-5 bg-zinc-300 dark:bg-zinc-800 rounded w-2/3 mb-4 animate-pulse" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-300 dark:bg-zinc-800 animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-zinc-300 dark:bg-zinc-800 rounded w-1/2 animate-pulse" />
                                <div className="h-3 bg-zinc-300 dark:bg-zinc-800 rounded w-1/3 animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return (
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Who to follow</h3>
                <p className="text-sm text-zinc-500">No suggestions available.</p>
            </div>
        );
    }

    return (
        <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Who to follow</h3>
            <div className="space-y-4">
                {suggestions.map((user) => (
                    <div className="flex items-center justify-between gap-2" key={user.id}>
                        <Link
                            href={`/profile/${user.username || user.id}`}
                            className="flex items-center gap-3 group min-w-0 flex-1"
                            onMouseEnter={() => router.prefetch(`/profile/${user.username || user.id}`)}
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                                {user.avatar_url ? (
                                    <Image src={user.avatar_url} alt={user.full_name || 'User'} width={40} height={40} className="w-full h-full object-cover" />
                                ) : (
                                    (user.full_name?.[0] || user.username?.[0] || "U").toUpperCase()
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-500 transition-colors">
                                    {user.full_name || 'User'}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">@{user.username || 'user'}</p>
                                {(user as any).suggestionReason && (
                                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                                        {(user as any).suggestionReason}
                                    </p>
                                )}
                            </div>
                        </Link>

                        {(user as any).isConnected ? (
                            <button
                                className="p-2 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 transition-colors"
                                title="Connected"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => handleFollow(user.id)}
                                disabled={following.has(user.id)}
                                className={`p-2 rounded-full transition-colors ${following.has(user.id)
                                    ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                                    : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                    }`}
                                title={following.has(user.id) ? "Request sent" : "Follow"}
                            >
                                {following.has(user.id) ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <UserPlus className="w-4 h-4" />
                                )}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
