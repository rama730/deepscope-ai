"use client";

import { useEffect, useState, useCallback } from "react";
import { MessagingService } from "@/lib/services/messaging/index";
import { Message } from "@/lib/services/messaging/types";
import { MessageList } from "./MessageListVirtuoso"; // Use Virtuoso!
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProjectPresenceIndicator } from "@/components/projects/ProjectPresenceIndicator";
import { FailedMessage } from "./FailedMessage";
import { toast } from "sonner";
import { useMessageStore } from "@/stores/useMessageStore";
import { useMessageSubscriptions } from "@/hooks/useMessageSubscriptions";
import { perfTracker } from "@/lib/performance/measure";
import { ApplicationStatusBanner } from "./ApplicationStatusBanner";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";

interface ChatWindowProps {
    conversationId: string;
    initialProjectId?: string | null;
    initialType?: 'direct' | 'group' | 'project' | null;
    variant?: 'default' | 'compact';
}

export function ChatWindow({ conversationId, initialProjectId, initialType, variant = 'default' }: ChatWindowProps) {
    const { user } = useAuth();

    // Global Store
    const {
        conversations,
        fetchMessages,
        addMessage,
        // updateMessage, // unused
        pendingMessages,
        addPendingMessage,
        removePendingMessage,
        updatePendingMessageStatus
    } = useMessageStore();

    const messages = conversations[conversationId] || [];
    const localPendingMessages = pendingMessages.filter(m => m.conversationId === conversationId);

    // Global Subscriptions
    useMessageSubscriptions(conversationId);

    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [projectId, setProjectId] = useState<string | null>(initialProjectId ?? null);
    const [conversationType, setConversationType] = useState<'direct' | 'group' | 'project' | null>(initialType ?? null);
    const [recipientId, setRecipientId] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Fetch conversation details to get projectId
    // Fetch conversation details if missing
    // Fetch conversation details to get projectId
    // Fetch conversation details if missing
    useEffect(() => {
        if (!conversationId) return;

        // If provided via props, use them exclusively and skip verification fetch for speed
        if (initialType && (initialType !== 'project' || initialProjectId)) {
            setProjectId(initialProjectId || null);
            setConversationType(initialType);

            // Only fetch recipient if it's a direct chat and we don't know who it is yet
            // (But typically parent passes us enough context logic to know, 
            //  though we might not have the ID if we just clicked 'Direct' in list)
            // For now, let's trust the prop update.
        } else {
            // Fallback: If we don't have props, we MUST fetch.
            const supabase = createSupabaseBrowserClient();

            (async () => {
                // 1. Fetch Metadata if missing
                const hasMetadata = projectId && conversationType;
                if (!hasMetadata) {
                    const { data, error } = await supabase
                        .from('conversations')
                        .select('project_id, type')
                        .eq('id', conversationId)
                        .single();

                    if (data && !error) {
                        setProjectId(data.project_id);
                        const type = data.type as 'direct' | 'group' | 'project';
                        setConversationType(type);
                    }
                }
            })();
        }
    }, [conversationId, initialProjectId, initialType]); // Removed user, projectId, conversationType, recipientId deps to prevent loops.

    // Separate Effect for Recipient ID (only for direct chats)
    useEffect(() => {
        if (conversationId && user && conversationType === 'direct' && !recipientId) {
            const supabase = createSupabaseBrowserClient();
            (async () => {
                const { data: participant } = await supabase
                    .from('conversation_participants')
                    .select('user_id')
                    .eq('conversation_id', conversationId)
                    .neq('user_id', user.id)
                    .maybeSingle();

                if (participant) {
                    setRecipientId(participant.user_id);
                }
            })();
        }
    }, [conversationId, conversationType, recipientId, user]);

    const { profile: currentUserProfile } = useCurrentUserProfile();

    // Initial Load
    useEffect(() => {
        if (conversationId && user) {
            perfTracker.start('chat-window-load', { conversationId });
            setLoading(true);
            fetchMessages(conversationId)
                .then((msgs: unknown) => {
                    perfTracker.end('chat-window-load', {
                        messageCount: Array.isArray(msgs) ? msgs.length : 0,
                    });
                })
                .finally(() => setLoading(false));

            // Mark as read
            MessagingService.markConversationRead(conversationId, user.id);
        }
    }, [conversationId, user, fetchMessages]);


    // Handle loading more messages (pagination)
    const handleLoadMore = useCallback(async (before?: string) => {
        if (loadingMore || !hasMore || !user) return;

        setLoadingMore(true);
        try {
            // Use 'before' if provided, otherwise fallback to oldest message
            const timestamp = before || messages[0]?.created_at;
            if (!timestamp) return;

            const olderMessages = await MessagingService.getMessages(conversationId, {
                limit: 50,
                before: timestamp
            });

            if (olderMessages.length > 0) {
                const { setMessages, conversations } = useMessageStore.getState();
                const current = conversations[conversationId] || [];
                // Simple prepend merge
                const combined = [...olderMessages, ...current];

                setMessages(conversationId, combined);
                setHasMore(olderMessages.length >= 50);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error("Failed to load more messages:", err);
            toast.error("Failed to load older messages");
        } finally {
            setLoadingMore(false);
        }
    }, [conversationId, user, messages, loadingMore, hasMore]);


    // Subscribe to typing indicators
    useEffect(() => {
        if (!conversationId || !user) return;

        const supabase = createSupabaseBrowserClient();
        const typingMap = new Map<string, string>();

        const unsubscribe = MessagingService.subscribeToTyping(conversationId, (userId, isTyping) => {
            if (userId === user.id) return;

            if (isTyping) {
                supabase
                    .from('profiles')
                    .select('full_name, username')
                    .eq('id', userId)
                    .single()
                    .then(({ data }) => {
                        if (data) {
                            typingMap.set(userId, data.full_name || data.username || 'Someone');
                            setTypingUsers(new Map(typingMap));
                        }
                    });
            } else {
                typingMap.delete(userId);
                setTypingUsers(new Map(typingMap));
            }
        });

        return () => {
            unsubscribe();
        };
    }, [conversationId, user]);


    const handleSendMessage = async (
        content: string,
        replyToMessageId?: string,
        attachments?: Array<{ file_url: string; file_name: string; file_type: string; file_size: number; mime_type?: string; thumbnail_url?: string }>,
        mentionedTaskIds?: string[]
    ) => {
        if (!user) return;
        setSending(true);

        const tempId = `temp-${Date.now()}`;
        addPendingMessage({
            tempId,
            conversationId,
            content,
            senderId: user.id,
            status: 'sending',
            createdAt: new Date().toISOString(),
            attachments,
            replyToId: replyToMessageId,
            retryPayload: { content, senderId: user.id, attachments, replyToMessageId, mentionedTaskIds }
        });

        try {
            let sentMessage;
            if (attachments && attachments.length > 0) {
                sentMessage = await MessagingService.sendMessageWithAttachments(
                    conversationId, content, user.id, attachments, replyToMessageId, mentionedTaskIds, recipientId || undefined
                );
            } else {
                sentMessage = await MessagingService.sendMessage(conversationId, content, user.id, replyToMessageId, mentionedTaskIds, recipientId || undefined);
            }

            if (sentMessage) {
                addMessage(sentMessage);
                removePendingMessage(tempId);
            }
            setReplyTo(null);
        } catch (err) {
            console.error("Failed to send message", err);
            updatePendingMessageStatus(tempId, 'failed');
            toast.error("Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    const handleRetryMessage = async (failedMessage: any) => {
        if (!failedMessage.retryPayload) return;

        const { tempId } = failedMessage;
        updatePendingMessageStatus(tempId, 'sending');

        try {
            const { content, senderId, attachments, replyToMessageId, mentionedTaskIds } = failedMessage.retryPayload;
            let sentMessage;
            if (attachments && attachments.length > 0) {
                sentMessage = await MessagingService.sendMessageWithAttachments(
                    conversationId, content, senderId, attachments, replyToMessageId, mentionedTaskIds, recipientId || undefined
                );
            } else {
                sentMessage = await MessagingService.sendMessage(conversationId, content, senderId, replyToMessageId, mentionedTaskIds, recipientId || undefined);
            }

            if (sentMessage) {
                addMessage(sentMessage);
                removePendingMessage(tempId);
            }
        } catch (e) {
            updatePendingMessageStatus(tempId, 'failed');
            toast.error("Retry failed.");
        }
    };

    if (!user) return <div className="p-4 text-center text-sm text-muted-foreground">Please log in to chat.</div>;

    if (loading && messages.length === 0) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
                {/* Header Skeleton if needed, but usually header is in GlobalChatWidget. 
                     If we are inside the widget, the header is external. 
                     If this component is used standalone, we might need one.
                     For now, just message skeletons. */}
                <div className="flex-1 p-4 space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className={cn("flex gap-3 max-w-[80%]", i % 2 === 0 ? "ml-auto flex-row-reverse" : "")}>
                            <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                            <div className="space-y-2 flex-1">
                                <div className="h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                                <div className="h-3 w-12 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const typingUserNames = Array.from(typingUsers.values());

    const pendingAsMessages = localPendingMessages
        .filter(pm => pm.status === 'sending')
        .map(pm => ({
            id: pm.tempId,
            conversation_id: pm.conversationId,
            sender_id: pm.senderId,
            content: pm.content,
            created_at: pm.createdAt,
            updated_at: pm.createdAt,
            type: 'direct',
            project_id: null,
            is_pending: true,
            status: pm.status,
            sender_profile: {
                full_name: currentUserProfile?.full_name || user?.user_metadata?.full_name || 'You',
                username: currentUserProfile?.username || user?.user_metadata?.username || 'you',
                avatar_url: currentUserProfile?.avatar_url || user?.user_metadata?.avatar_url || null
            }
        } as unknown as Message));

    const displayMessages = [...messages, ...pendingAsMessages];

    const failedMessages = localPendingMessages.filter(pm => pm.status === 'failed');

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
            {/* Project Presence Indicator for project chats */}
            {projectId && conversationType === 'project' && (
                <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 bg-white dark:bg-zinc-900">
                    <ProjectPresenceIndicator projectId={projectId} />
                </div>
            )}

            {/* Smart Inbox: Application Review Banner */}
            <ApplicationStatusBanner conversationId={conversationId} variant={variant} />
            <MessageList
                messages={displayMessages}
                currentUserId={user.id}
                onReply={setReplyTo}
                onMessageUpdate={() => { }}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
            />
            {typingUserNames.length > 0 && (
                <TypingIndicator userName={typingUserNames[0]} />
            )}

            {failedMessages.length > 0 && (
                <div className="px-4 py-2 space-y-2 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                    {failedMessages.map((failedMsg) => (
                        <FailedMessage
                            key={failedMsg.tempId}
                            content={failedMsg.content}
                            onRetry={() => handleRetryMessage(failedMsg)}
                            onDismiss={() => removePendingMessage(failedMsg.tempId)}
                        />
                    ))}
                </div>
            )}

            <MessageInput
                key={conversationId}
                conversationId={conversationId}
                onSendMessage={handleSendMessage}
                isLoading={sending}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                projectId={projectId}
                showSuggestedReplies={false}
                lastMessage={messages.length > 0 ? messages[messages.length - 1] : null}
            />
        </div>
    );
}
