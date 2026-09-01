import { memo } from "react";
import { FolderKanban } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { LastSeenIndicator } from "./LastSeenIndicator";
import { ConversationSummary } from "@/lib/services/messaging/index";
import { useMessageStore } from "@/stores/useMessageStore";

interface ConversationListItemProps {
    conversation: ConversationSummary;
    isSelected?: boolean;
    isTyping: boolean;
    typingUserName?: string;
    isActive?: boolean;
    isOnline?: boolean;
    lastActiveAt?: string | null;
    onSelect: (id: string, type: 'direct' | 'group' | 'project' | undefined, projectId?: string, initialDetails?: { name: string; avatarUrl?: string | null }) => void;
    innerRef?: React.Ref<HTMLDivElement>;
}

export const ConversationListItem = memo(function ConversationListItem({
    conversation,
    isSelected,
    isTyping,
    typingUserName,
    isOnline,
    lastActiveAt,
    onSelect,
    innerRef
}: ConversationListItemProps) {
    const { fetchApplication } = useMessageStore();
    const isProject = conversation.type === "project";
    const displayName = isProject
        ? (conversation.project_title || "Project Chat")
        : (conversation.other_user_full_name || conversation.other_name || conversation.other_username || "Unknown User");
    const avatarUrl = isProject ? null : (conversation.other_user_avatar_url || conversation.avatar_url);

    return (
        <div
            ref={innerRef}
            onMouseEnter={() => {
                if (conversation.conversation_id) {
                    // 1. Prefetch Code Chunk
                    import("./ChatWindow").catch(() => {
                        // Silently ignore prefetch failures
                    });

                    // 2. Prefetch Data (via store to respect cache)
                    useMessageStore.getState().fetchMessages(conversation.conversation_id).catch(() => {
                        // Silently ignore prefetch failures
                    });

                    // 3. Prefetch legacy
                    if (!isProject) {
                        fetchApplication(conversation.conversation_id).catch(() => {
                            // Silently ignore prefetch failures
                        });
                    }
                }
            }}
            onClick={() => onSelect(
                conversation.conversation_id,
                conversation.type,
                conversation.project_id,
                { name: displayName, avatarUrl }
            )}
            className={cn(
                "flex items-center gap-3 p-3 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 cursor-pointer transition-colors border-b border-zinc-200 dark:border-zinc-800 last:border-0",
                conversation.unread_count > 0 && "bg-zinc-50 dark:bg-zinc-800/50",
                isSelected && "bg-zinc-100 dark:bg-zinc-800"
            )}
        >
            {isProject ? (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    <FolderKanban className="h-5 w-5" />
                </div>
            ) : (
                <div className="relative h-10 w-10 flex-shrink-0">
                    <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={avatarUrl || undefined} />
                        <AvatarFallback>
                            {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    {conversation.other_user_id && isOnline && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                    )}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {displayName}
                        </span>
                        {!isProject && conversation.other_user_id && (
                            <LastSeenIndicator
                                lastActiveAt={lastActiveAt}
                                className="text-[10px]"
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {conversation.unread_count > 0 && (
                            <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                            </span>
                        )}
                        {(conversation.last_message_at || conversation.last_at) && (
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                {formatDistanceToNow(new Date(conversation.last_message_at || conversation.last_at || Date.now()), { addSuffix: true })}
                            </span>
                        )}
                    </div>
                </div>
                {isTyping ? (
                    <p className="text-xs text-primary italic truncate">
                        {typingUserName || "Someone"} is typing...
                    </p>
                ) : (
                    <p className={cn(
                        "text-xs truncate",
                        conversation.unread_count > 0 ? "text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-500 dark:text-zinc-400"
                    )}>
                        {conversation.last_message_content || conversation.last_message || "No messages yet"}
                    </p>
                )}
            </div>
        </div>
    );
});
