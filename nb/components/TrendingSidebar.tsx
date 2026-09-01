"use client";

import { useRouter } from "next/navigation";
import { TrendingUp, RefreshCw } from "lucide-react";
import { useTrendingTags } from "@/hooks/useTrendingTags";

export default function TrendingSidebar() {
    const { data: trending, isLoading, refetch, isRefetching } = useTrendingTags();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                <div className="h-5 bg-zinc-300 dark:bg-zinc-800 rounded w-1/3 mb-4 animate-pulse" />
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-4 bg-zinc-300 dark:bg-zinc-800 rounded w-full animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const tags = trending || [];

    return (
        <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Trending Topics
                </h3>
                <button
                    onClick={() => refetch()}
                    disabled={isLoading || isRefetching}
                    className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    title="Refresh trends"
                >
                    <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 ${(isLoading || isRefetching) ? 'animate-spin' : ''}`} />
                </button>
            </div>
            {tags.length === 0 ? (
                <div className="text-center py-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">No trending topics yet</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {tags.map((topic) => (
                        <button
                            key={topic.tag}
                            onClick={() => {
                                // Navigate directly to explorer with tag filter
                                router.push(`/explorer?tag=${encodeURIComponent(topic.tag)}`);
                            }}
                            className="w-full text-left px-2 py-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-zinc-600 dark:text-zinc-400 font-medium group-hover:text-blue-500 transition-colors truncate">#{topic.tag}</span>
                            </div>
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-2 flex-shrink-0">{topic.count}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
