"use client";

import { isToday, isYesterday, format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { isUserOnline } from "@/hooks/usePresence";
import { cn } from "@/lib/utils";

interface LastSeenIndicatorProps {
    lastActiveAt: string | null | undefined;
    className?: string;
    showOnlineStatus?: boolean;
}

export function LastSeenIndicator({ lastActiveAt, className, showOnlineStatus = true }: LastSeenIndicatorProps) {
    if (!lastActiveAt) {
        return (
            <span className={cn("text-xs text-muted-foreground", className)}>
                Never active
            </span>
        );
    }

    const isOnline = showOnlineStatus && isUserOnline(lastActiveAt);
    const date = new Date(lastActiveAt);

    // Format relative time
    let relativeTime: string;
    if (isOnline) {
        // Don't show text when online - green dot is enough
        return null;
    } else if (isToday(date)) {
        const minutesAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
        if (minutesAgo < 60) {
            relativeTime = `${minutesAgo}m ago`;
        } else {
            relativeTime = format(date, "h:mm a");
        }
    } else if (isYesterday(date)) {
        relativeTime = "Yesterday";
    } else {
        const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo < 7) {
            relativeTime = `${daysAgo}d ago`;
        } else {
            relativeTime = format(date, "MMM d");
        }
    }

    // Full timestamp for tooltip
    const fullTimestamp = format(date, "PPpp");

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className={cn(
                        "text-xs",
                        isOnline ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
                        className
                    )}>
                        {relativeTime}
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isOnline ? "Active now" : `Last seen: ${fullTimestamp}`}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
