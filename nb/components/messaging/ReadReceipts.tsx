"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { MessagingService } from "@/lib/services/messaging/index";
// import { Users, CheckCheck } from "lucide-react"; // Removed unused imports
import { cn } from "@/lib/utils";

interface ReadReceipt {
    user_id: string;
    read_at: string;
    user_profile?: {
        full_name?: string;
        username?: string;
        avatar_url?: string;
    };
}

interface ReadReceiptsProps {
    messageId: string;
    currentUserId: string;
    className?: string;
    showCount?: boolean;
    maxAvatars?: number;
}

export function ReadReceipts({
    messageId,
    currentUserId,
    className,
    showCount = true,
    maxAvatars = 3
}: ReadReceiptsProps) {
    const [receipts, setReceipts] = useState<ReadReceipt[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load initial read receipts
        const loadReceipts = async () => {
            try {
                const data = await MessagingService.getReadReceipts(messageId);
                // Filter out current user's own read receipt
                setReceipts(data.filter(r => r.user_id !== currentUserId));
                setLoading(false);
            } catch (error) {
                console.error("Error loading read receipts:", error);
                setLoading(false);
            }
        };

        loadReceipts();

        // Subscribe to real-time updates
        const unsubscribe = MessagingService.subscribeToReadReceipts(messageId, (receipt) => {
            if (receipt.user_id !== currentUserId) {
                setReceipts(prev => {
                    const existing = prev.find(r => r.user_id === receipt.user_id);
                    if (existing) {
                        return prev.map(r =>
                            r.user_id === receipt.user_id ? { ...r, read_at: receipt.read_at } : r
                        );
                    }
                    return [...prev, { ...receipt, user_profile: undefined }];
                });
            }
        });

        return () => {
            unsubscribe();
        };
    }, [messageId, currentUserId]);

    if (loading || receipts.length === 0) {
        return null;
    }

    const visibleReceipts = receipts.slice(0, maxAvatars);
    const remainingCount = receipts.length - maxAvatars;

    return (
        <TooltipProvider>
            <div className={cn("flex items-center gap-1", className)}>
                {showCount && receipts.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                        {receipts.length} {receipts.length === 1 ? 'read' : 'reads'}
                    </span>
                )}
                <div className="flex -space-x-2">
                    {visibleReceipts.map((receipt) => {
                        const displayName = receipt.user_profile?.full_name ||
                            receipt.user_profile?.username ||
                            'Unknown';
                        const initials = displayName.charAt(0).toUpperCase();

                        return (
                            <Tooltip key={receipt.user_id}>
                                <TooltipTrigger asChild>
                                    <div className="relative">
                                        <Avatar className="h-5 w-5 border-2 border-background ring-2 ring-background">
                                            <AvatarImage src={receipt.user_profile?.avatar_url} />
                                            <AvatarFallback className="text-[10px]">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="text-xs">
                                        <div className="font-medium">{displayName}</div>
                                        <div className="text-muted-foreground">
                                            Read {formatDistanceToNow(new Date(receipt.read_at), { addSuffix: true })}
                                        </div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                    {remainingCount > 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                    <span className="text-[10px] text-muted-foreground">+{remainingCount}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="text-xs">
                                    {remainingCount} more {remainingCount === 1 ? 'person' : 'people'} read this
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
