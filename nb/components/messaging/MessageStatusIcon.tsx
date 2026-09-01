"use client";

import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";

interface MessageStatusIconProps {
    status: "sending" | "sent" | "delivered" | "read";
    className?: string;
    deliveredAt?: string | null;
    readAt?: string | null;
    readCount?: number;
}

export function MessageStatusIcon({ 
    status, 
    className,
    deliveredAt,
    readAt,
    readCount
}: MessageStatusIconProps) {
    if (status === "sending") {
        return null; // Don't show icon while sending
    }

    const getTooltipContent = () => {
        if (status === "read" && readAt) {
            return `Read ${formatDistanceToNow(new Date(readAt), { addSuffix: true })}${readCount ? ` by ${readCount} ${readCount === 1 ? 'person' : 'people'}` : ''}`;
        }
        if (status === "delivered" && deliveredAt) {
            return `Delivered ${formatDistanceToNow(new Date(deliveredAt), { addSuffix: true })}`;
        }
        if (status === "sent") {
            return "Sent";
        }
        return null;
    };

    const tooltipContent = getTooltipContent();
    const icon = (
        <>
            {status === "read" && (
                <CheckCheck 
                    className={cn("h-3.5 w-3.5 text-blue-500 dark:text-blue-400", className)} 
                    aria-label="Read"
                />
            )}
            {status === "delivered" && (
                <CheckCheck 
                    className={cn("h-3.5 w-3.5 opacity-60", className)} 
                    aria-label="Delivered"
                />
            )}
            {status === "sent" && (
                <Check 
                    className={cn("h-3.5 w-3.5 opacity-60", className)} 
                    aria-label="Sent"
                />
            )}
        </>
    );

    if (tooltipContent) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span>{icon}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">{tooltipContent}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return icon;
}
