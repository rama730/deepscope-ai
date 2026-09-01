"use client";

import { cn } from "@/lib/utils";

interface MessageSkeletonProps {
    isMe?: boolean;
    className?: string;
}

export function MessageSkeleton({ isMe = false, className }: MessageSkeletonProps) {
    return (
        <div className={cn("flex w-full gap-2 px-4 py-2", isMe ? "justify-end" : "justify-start", className)}>
            {!isMe && (
                <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse flex-shrink-0" />
            )}
            <div className={cn("max-w-[80%] flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                <div className={cn(
                    "rounded-lg px-3 py-2",
                    isMe
                        ? "bg-primary/20"
                        : "bg-zinc-200 dark:bg-zinc-700"
                )}>
                    <div className="space-y-2">
                        <div className="h-4 w-48 bg-zinc-300 dark:bg-zinc-600 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-zinc-300 dark:bg-zinc-600 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-2">
                        <div className="h-3 w-12 bg-zinc-300 dark:bg-zinc-600 rounded animate-pulse" />
                    </div>
                </div>
            </div>
            {isMe && (
                <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse flex-shrink-0" />
            )}
        </div>
    );
}
