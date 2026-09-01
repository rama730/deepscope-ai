"use client";

export function ConversationSkeleton() {
    return (
        <div className="flex items-center gap-3 p-3 border-b border-border/50">
            <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-3 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            </div>
            <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse flex-shrink-0" />
        </div>
    );
}
