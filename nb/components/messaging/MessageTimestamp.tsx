"use client";

import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MessageTimestampProps {
    timestamp: string;
    className?: string;
}

export function MessageTimestamp({ timestamp, className }: MessageTimestampProps) {
    const date = new Date(timestamp);

    // Determine relative time display
    let relativeTime: string;
    if (isToday(date)) {
        relativeTime = format(date, "h:mm a");
    } else if (isYesterday(date)) {
        relativeTime = "Yesterday";
    } else if (isThisWeek(date)) {
        relativeTime = format(date, "EEEE"); // Day name
    } else {
        relativeTime = format(date, "MMM d");
    }

    // Full timestamp for tooltip
    const fullTimestamp = format(date, "PPpp"); // Full date and time

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className={className}>
                        {relativeTime}
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{fullTimestamp}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
