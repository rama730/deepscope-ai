"use client";

import { MessageSquare, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ForwardedMessageIndicatorProps {
    forwardedFromConversationId?: string;
    forwardedBy?: string;
    forwardedByProfile?: {
        full_name?: string;
        username?: string;
    };
    className?: string;
    onViewOriginal?: () => void;
}

export function ForwardedMessageIndicator({
    forwardedFromConversationId,
    forwardedBy,
    forwardedByProfile,
    className,
    onViewOriginal
}: ForwardedMessageIndicatorProps) {
    if (!forwardedFromConversationId && !forwardedBy) {
        return null;
    }

    const forwardedByName = forwardedByProfile?.full_name || 
                           forwardedByProfile?.username || 
                           "Someone";

    const content = (
        <div className={cn(
            "flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded-md border border-border/50",
            onViewOriginal && "cursor-pointer hover:bg-muted transition-colors",
            className
        )}>
            <MessageSquare className="h-3 w-3" />
            <span>Forwarded by {forwardedByName}</span>
            {onViewOriginal && (
                <ArrowRight className="h-3 w-3 ml-auto" />
            )}
        </div>
    );

    if (onViewOriginal) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div onClick={onViewOriginal}>
                            {content}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">Click to view original conversation</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {content}
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs">This message was forwarded</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
