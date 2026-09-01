"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MessagingService, MessageAttachment, MessagesService } from "@/lib/services/messaging/index";
import { Message } from "@/lib/services/messaging/types";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { cn } from "@/lib/utils";
import { MessageStatusIcon } from "./MessageStatusIcon";
import { MessageTimestamp } from "./MessageTimestamp";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MessageActions } from "./MessageActions";
import { MessageEditor } from "./MessageEditor";
import { MessageReply } from "./MessageReply";
import { MessageAttachments } from "./MessageAttachments";
import { SwipeableMessage } from "./SwipeableMessage";
import { PostContent } from "@/components/explorer/post/PostContent";

import { ReadReceipts } from "./ReadReceipts";
import { ForwardedMessageIndicator } from "./ForwardedMessageIndicator";
import { TaskMention } from "./TaskMention";
import { ForwardMessageModal } from "./ForwardMessageModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface MessageListProps {
    messages: Message[];
    currentUserId?: string;
    onReply?: (message: Message) => void;
    onMessageUpdate?: () => void;
    onLoadMore?: (before: string) => Promise<void>;
    hasMore?: boolean;
    loadingMore?: boolean;
}

interface ExtendedMessage extends Message {
    sender_profile?: {
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
    };
    sender_name?: string | null;
}

export function MessageList({
    messages,
    currentUserId,
    onReply,
    onMessageUpdate,
    onLoadMore,
    hasMore = false,
    loadingMore = false
}: MessageListProps) {
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [messageAttachments, setMessageAttachments] = useState<Map<string, MessageAttachment[]>>(new Map());
    const [replyMessages, setReplyMessages] = useState<Map<string, Message>>(new Map());
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const [mentionedTasks, setMentionedTasks] = useState<Map<string, Array<{ id: string; title: string; status: string; project_id: string }>>>(new Map());
    const [isAtBottom, setIsAtBottom] = useState(true);
    const isInitialLoadRef = useRef(true);

    // Auto-scroll to bottom on initial load
    useEffect(() => {
        if (messages.length > 0 && isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
            setTimeout(() => {
                virtuosoRef.current?.scrollToIndex({
                    index: messages.length - 1,
                    behavior: "auto",
                    align: "end"
                });
            }, 300);
        }
    }, [messages.length]);

    // Auto-scroll to bottom when new messages arrive (if already at bottom)
    useEffect(() => {
        if (messages.length > 0 && isAtBottom) {
            setTimeout(() => {
                virtuosoRef.current?.scrollToIndex({
                    index: messages.length - 1,
                    behavior: "smooth",
                    align: "end"
                });
            }, 100);
        }
    }, [messages.length, isAtBottom]);

    // Track processed message IDs to avoid refetching
    const processedMessageIdsRef = useRef<Set<string>>(new Set());
    const processedAttachmentsRef = useRef<Set<string>>(new Set());
    const processedTasksRef = useRef<Set<string>>(new Set());

    // Load attachments and task details for messages (INCREMENTAL - only new messages)
    useEffect(() => {
        const loadMessageData = async () => {
            const supabase = createSupabaseBrowserClient();

            // Find new messages that haven't been processed
            const newMessages = messages.filter(m => !processedMessageIdsRef.current.has(m.id));
            if (newMessages.length === 0) {
                // Still update reply map from local messages (no network call)
                const repliesMap = new Map<string, Message>();
                for (const msg of messages) {
                    if (msg.reply_to_message_id) {
                        const replyMsg = messages.find(m => m.id === msg.reply_to_message_id);
                        if (replyMsg) {
                            repliesMap.set(msg.id, replyMsg);
                        }
                    }
                }
                setReplyMessages(repliesMap);
                return;
            }

            // Mark new messages as processed
            newMessages.forEach(m => processedMessageIdsRef.current.add(m.id));

            // Build reply map from local messages first (always update)
            const repliesMap = new Map<string, Message>();
            for (const msg of messages) {
                if (msg.reply_to_message_id) {
                    const replyMsg = messages.find(m => m.id === msg.reply_to_message_id);
                    if (replyMsg) {
                        repliesMap.set(msg.id, replyMsg);
                    }
                }
            }
            setReplyMessages(repliesMap);

            // Only fetch attachments for new messages
            const messagesNeedingAttachments = newMessages.filter(m =>
                !processedAttachmentsRef.current.has(m.id)
            );

            if (messagesNeedingAttachments.length > 0) {
                try {
                    const attachmentsMap = await MessagesService.getMessageAttachmentsBatch(
                        messagesNeedingAttachments.map(m => m.id)
                    );

                    // Merge with existing attachments
                    setMessageAttachments(prev => {
                        const merged = new Map(prev);
                        attachmentsMap.forEach((attachments, msgId) => {
                            merged.set(msgId, attachments);
                            processedAttachmentsRef.current.add(msgId);
                        });
                        return merged;
                    });
                } catch (err) {
                    console.warn('Failed to batch load attachments:', err);
                }
            }

            // Only fetch task details for new messages with task mentions
            const allTaskIds = new Set<string>();
            const messageTaskMap = new Map<string, string[]>();

            for (const msg of newMessages) {
                const taskIds = (msg as any).mentioned_task_ids;
                if (Array.isArray(taskIds) && taskIds.length > 0) {
                    const unprocessedTaskIds = taskIds.filter((id: string) => !processedTasksRef.current.has(id));
                    if (unprocessedTaskIds.length > 0) {
                        messageTaskMap.set(msg.id, unprocessedTaskIds);
                        unprocessedTaskIds.forEach((id: string) => allTaskIds.add(id));
                    }
                }
            }

            if (allTaskIds.size > 0) {
                try {
                    const { data: tasks } = await supabase
                        .from('project_tasks')
                        .select('id, title, status, project_id')
                        .in('id', Array.from(allTaskIds));

                    if (tasks && tasks.length > 0) {
                        const taskById = new Map(tasks.map(t => [t.id, t]));

                        // Mark tasks as processed
                        tasks.forEach(t => processedTasksRef.current.add(t.id));

                        // Merge with existing tasks
                        setMentionedTasks(prev => {
                            const merged = new Map(prev);
                            for (const [msgId, taskIds] of messageTaskMap.entries()) {
                                const msgTasks = taskIds
                                    .map(id => taskById.get(id))
                                    .filter(Boolean) as Array<{ id: string; title: string; status: string; project_id: string }>;
                                if (msgTasks.length > 0) {
                                    const existing = merged.get(msgId) || [];
                                    merged.set(msgId, [...existing, ...msgTasks]);
                                }
                            }
                            return merged;
                        });
                    }
                } catch (err) {
                    console.warn('Failed to batch load task details:', err);
                }
            }
        };

        if (messages.length > 0) {
            loadMessageData();
        }
    }, [messages]);


    const scrollToBottom = () => {
        virtuosoRef.current?.scrollToIndex({
            index: messages.length - 1,
            behavior: "smooth",
            align: "end"
        });
    };

    const handleEdit = async (messageId: string, newContent: string) => {
        try {
            await MessagingService.editMessage(messageId, newContent);
            setEditingMessageId(null);
            onMessageUpdate?.();
            toast.success("Message updated");
        } catch (error) {
            console.error("Error editing message:", error);
            toast.error("Failed to edit message");
        }
    };

    const handleDelete = async (messageId: string) => {
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            await MessagingService.deleteMessage(messageId);
            onMessageUpdate?.();
            toast.success("Message deleted");
        } catch (error) {
            console.error("Error deleting message:", error);
            toast.error("Failed to delete message");
        }
    };

    const handleStartReached = useCallback(() => {
        if (hasMore && !loadingMore && messages.length > 0) {
            const oldestMessage = messages[0];
            if (oldestMessage && onLoadMore) {
                onLoadMore(oldestMessage.created_at);
            }
        }
    }, [hasMore, loadingMore, messages, onLoadMore]);

    const renderMessage = (index: number) => {
        const msg = messages[index];
        if (!msg) return null;

        const isMe = msg.sender_id === currentUserId;
        const extendedMsg = msg as ExtendedMessage;
        const senderName = extendedMsg.sender_profile?.full_name ||
            extendedMsg.sender_profile?.username ||
            extendedMsg.sender_name ||
            (isMe ? "You" : "Unknown User");
        const avatarUrl = extendedMsg.sender_profile?.avatar_url;
        const initials = senderName.charAt(0).toUpperCase();
        const isEditing = editingMessageId === msg.id;
        const attachments = messageAttachments.get(msg.id) || [];
        const replyTo = msg.reply_to_message_id ? replyMessages.get(msg.id) : null;
        const replyToAttachments = replyTo ? (messageAttachments.get(replyTo.id) || []) : [];
        const isHighlighted = highlightedMessageId === msg.id;

        return (
            <div
                key={msg.id}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300 transform-gpu"
            >
                <SwipeableMessage
                    onSwipeRight={() => onReply?.(msg)}
                    onSwipeLeft={isMe ? () => handleDelete(msg.id) : undefined}
                    disabled={isEditing}
                >
                    <div
                        className={cn(
                            "group flex w-full gap-2 relative transition-all duration-500 px-4 py-1",
                            isMe ? "justify-end" : "justify-start",
                            isHighlighted && "bg-primary/20 rounded-lg"
                        )}
                    >
                        {!isMe && (
                            <div className="relative h-6 w-6 mt-1 flex-shrink-0">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={avatarUrl || undefined} />
                                    <AvatarFallback className="text-[10px]">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        )}
                        <div className={cn("max-w-[80%] flex flex-col gap-1 relative group overflow-visible", isMe ? "items-end" : "items-start")}>
                            {replyTo && (
                                <MessageReply
                                    replyTo={replyTo}
                                    attachments={replyToAttachments}
                                    onClick={() => {
                                        const index = messages.findIndex(m => m.id === replyTo.id);
                                        if (index >= 0) {
                                            virtuosoRef.current?.scrollToIndex({
                                                index,
                                                behavior: "smooth",
                                                align: "center"
                                            });
                                            setHighlightedMessageId(replyTo.id);
                                            setTimeout(() => setHighlightedMessageId(null), 2000);
                                        }
                                    }}
                                    className="mb-1"
                                />
                            )}
                            {isEditing ? (
                                <MessageEditor
                                    initialContent={msg.content}
                                    onSave={(newContent) => handleEdit(msg.id, newContent)}
                                    onCancel={() => setEditingMessageId(null)}
                                    className="bg-background border rounded-lg p-2"
                                />
                            ) : (
                                <div className="flex flex-col gap-1 relative overflow-visible">
                                    <div
                                        className={cn(
                                            "rounded-lg px-3 py-2 text-sm relative",
                                            isMe
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-foreground"
                                        )}
                                    >
                                        {(msg as any).forwarded_from_message_id && (
                                            <ForwardedMessageIndicator
                                                forwardedFromConversationId={(msg as any).forwarded_from_conversation_id}
                                                forwardedBy={(msg as any).forwarded_by}
                                                className="mb-2"
                                            />
                                        )}

                                        {(msg as any).mentioned_task_ids && Array.isArray((msg as any).mentioned_task_ids) && (msg as any).mentioned_task_ids.length > 0 && (
                                            <div className="mb-2 space-y-1">
                                                {(msg as any).mentioned_task_ids.map((taskId: string) => {
                                                    const task = mentionedTasks.get(msg.id)?.find(t => t.id === taskId);
                                                    if (!task) return null;
                                                    return (
                                                        <TaskMention
                                                            key={taskId}
                                                            taskId={task.id}
                                                            taskTitle={task.title}
                                                            taskStatus={task.status}
                                                            projectId={task.project_id}
                                                            compact
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {msg.content && msg.content !== "📎 Attachment" && (
                                            <PostContent content={msg.content} className="mt-0 text-[14px] leading-relaxed text-inherit" />
                                        )}
                                        {attachments.length > 0 && (
                                            <MessageAttachments
                                                attachments={attachments}
                                                className={msg.content && msg.content !== "📎 Attachment" ? "mt-2" : ""}
                                            />
                                        )}
                                        {msg.content === "📎 Attachment" && attachments.length === 0 && (
                                            <p className="text-muted-foreground italic text-xs">{msg.content}</p>
                                        )}
                                        <div className="flex items-center justify-end gap-1.5 mt-1">
                                            {msg.is_edited && (
                                                <span className={cn(
                                                    "text-[10px] opacity-70 italic",
                                                    isMe && "text-primary-foreground/70"
                                                )}>
                                                    (edited)
                                                </span>
                                            )}
                                            {isMe && (
                                                <MessageStatusIcon
                                                    status={(msg as any).read_at ? "read" : "delivered"}
                                                    deliveredAt={(msg as any).delivered_at}
                                                    readAt={(msg as any).read_at}
                                                    className={isMe ? "text-primary-foreground/70" : ""}
                                                />
                                            )}
                                            {!isMe && (msg as any).read_receipt_count > 0 && (
                                                <ReadReceipts
                                                    messageId={msg.id}
                                                    currentUserId={currentUserId || ""}
                                                    showCount={false}
                                                    maxAvatars={2}
                                                />
                                            )}
                                            <MessageTimestamp
                                                timestamp={msg.edited_at || msg.created_at}
                                                className={cn(
                                                    "text-[10px] opacity-70",
                                                    isMe && "text-primary-foreground/70"
                                                )}
                                            />
                                        </div>
                                    </div>
                                    {currentUserId && (
                                        <div className={cn(
                                            "absolute opacity-0 group-hover:opacity-100 transition-opacity z-30 top-1/2 -translate-y-1/2",
                                            isMe ? "left-[-28px]" : "right-[-28px]"
                                        )}>
                                            <MessageActions
                                                message={msg}
                                                currentUserId={currentUserId}
                                                onEdit={() => setEditingMessageId(msg.id)}
                                                onDelete={() => handleDelete(msg.id)}
                                                onReply={() => onReply?.(msg)}
                                                onForward={() => setForwardingMessage(msg)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {isMe && (
                            <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
                                <AvatarImage src={avatarUrl || undefined} />
                                <AvatarFallback className="text-[10px]">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                </SwipeableMessage>
            </div>
        );
    };

    return (
        <div className="relative flex-1 h-full overflow-hidden">
            <Virtuoso
                ref={virtuosoRef}
                data={messages}
                totalCount={messages.length}
                itemContent={renderMessage}
                followOutput="smooth"
                initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
                atBottomStateChange={setIsAtBottom}
                atTopStateChange={(atTop) => {
                    if (atTop && hasMore && !loadingMore) {
                        handleStartReached();
                    }
                }}
                startReached={handleStartReached}
                components={{
                    Header: loadingMore ? () => (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                        </div>
                    ) : undefined
                }}
                style={{ height: "100%" }}
            />
            {!isAtBottom && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-4 right-4 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center z-10"
                    aria-label="Scroll to bottom"
                >
                    <ChevronDown className="h-5 w-5" />
                </button>
            )}
            {forwardingMessage && currentUserId && (
                <ForwardMessageModal
                    message={forwardingMessage}
                    currentUserId={currentUserId}
                    isOpen={!!forwardingMessage}
                    onClose={() => setForwardingMessage(null)}
                    onForwarded={() => {
                        setForwardingMessage(null);
                        onMessageUpdate?.();
                    }}
                />
            )}
        </div>
    );
}
