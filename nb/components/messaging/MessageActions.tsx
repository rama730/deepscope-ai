"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Trash2, Reply, MoreVertical, Forward } from "lucide-react";
import { Message } from "@/lib/services/messaging/index";
import { cn } from "@/lib/utils";

interface MessageActionsProps {
    message: Message;
    currentUserId: string;
    onEdit?: () => void;
    onDelete?: () => void;
    onReply?: () => void;
    onForward?: () => void;
    className?: string;
}

export function MessageActions({
    message,
    currentUserId,
    onEdit,
    onDelete,
    onReply,
    onForward,
    className
}: MessageActionsProps) {
    const isOwnMessage = message.sender_id === currentUserId;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={cn(
                    "p-1 rounded transition-colors text-foreground/70 hover:text-foreground hover:bg-muted-foreground/20",
                    className
                )}>
                    <MoreVertical className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {onReply && (
                    <DropdownMenuItem onClick={onReply}>
                        <Reply className="h-4 w-4 mr-2" />
                        Reply
                    </DropdownMenuItem>
                )}
                {onForward && (
                    <DropdownMenuItem onClick={onForward}>
                        <Forward className="h-4 w-4 mr-2" />
                        Forward
                    </DropdownMenuItem>
                )}
                {isOwnMessage && onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                    </DropdownMenuItem>
                )}
                {isOwnMessage && onDelete && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={onDelete}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu >
    );
}
