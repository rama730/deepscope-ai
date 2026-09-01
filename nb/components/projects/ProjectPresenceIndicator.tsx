"use client";

import { useProjectPresence } from "@/hooks/useProjectPresence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ProjectPresenceIndicatorProps {
    projectId: string;
    className?: string;
    showList?: boolean;
}

export function ProjectPresenceIndicator({
    projectId,
    className,
    showList = true
}: ProjectPresenceIndicatorProps) {
    const { members, onlineCount, activeCount, typingUsers, isLoading } = useProjectPresence(projectId);

    if (isLoading) {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const activeMembers = members.filter(m => 
        m.is_active && 
        m.activity_type === 'active' && 
        new Date(m.last_activity_at).getTime() > Date.now() - 5 * 60 * 1000
    ).slice(0, 5); // Show max 5 avatars

    if (!showList) {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                    {onlineCount} {onlineCount === 1 ? 'member' : 'members'} online
                </span>
            </div>
        );
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted transition-colors",
                    className
                )}>
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                        {onlineCount} {onlineCount === 1 ? 'online' : 'online'}
                    </span>
                    {activeMembers.length > 0 && (
                        <div className="flex -space-x-2">
                            {activeMembers.map((member) => {
                                const displayName = member.profile?.full_name || 
                                                  member.profile?.username || 
                                                  'Unknown';
                                const initials = displayName.charAt(0).toUpperCase();
                                
                                return (
                                    <TooltipProvider key={member.user_id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Avatar className="h-6 w-6 border-2 border-background">
                                                    <AvatarImage src={member.profile?.avatar_url} />
                                                    <AvatarFallback className="text-[10px]">
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="text-xs">
                                                    <div className="font-medium">{displayName}</div>
                                                    <div className="text-muted-foreground">
                                                        Active {formatDistanceToNow(new Date(member.last_activity_at), { addSuffix: true })}
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })}
                        </div>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
                <div className="space-y-2">
                    <div className="text-sm font-medium">Active Members</div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                        {members.filter(m => m.is_active).map((member) => {
                            const displayName = member.profile?.full_name || 
                                              member.profile?.username || 
                                              'Unknown';
                            const initials = displayName.charAt(0).toUpperCase();
                            const isTyping = typingUsers.includes(member.user_id);
                            
                            return (
                                <div
                                    key={member.user_id}
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors"
                                >
                                    <div className="relative">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={member.profile?.avatar_url} />
                                            <AvatarFallback className="text-xs">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        {member.is_active && (
                                            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-background rounded-full" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">
                                            {displayName}
                                            {isTyping && (
                                                <span className="text-xs text-muted-foreground ml-2 italic">
                                                    typing...
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {member.activity_type === 'active' 
                                                ? `Active ${formatDistanceToNow(new Date(member.last_activity_at), { addSuffix: true })}`
                                                : `Last seen ${formatDistanceToNow(new Date(member.last_seen_at), { addSuffix: true })}`
                                            }
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {members.filter(m => m.is_active).length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                            No active members
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
