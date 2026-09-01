"use client";

import { Virtuoso } from "react-virtuoso";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { MessagingService } from "@/lib/services/messaging/index";
import { MessageSquarePlus, FolderKanban, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { isUserOnline } from "@/hooks/usePresence";
import { ConversationSkeleton } from "./ConversationSkeleton";
// import { createSupabaseBrowserClient } from "@/lib/supabase/client"; // Removed unused import
import { useMessageStore } from "@/stores/useMessageStore";
import { useConversationListSubscriptions } from "@/hooks/useConversationListSubscriptions";
import { ConversationListItem } from "./ConversationListItem";

interface ConversationListProps {
    userId: string;
    onSelectConversation: (conversationId: string, type: 'direct' | 'group' | 'project' | undefined, projectId?: string, initialDetails?: { name: string; avatarUrl?: string | null }) => void;
    onNewChat: () => void;
    onCreateGroup?: () => void;
    filterType?: "direct" | "project";
}

export function ConversationList({ userId, onSelectConversation, onNewChat, onCreateGroup, filterType = "direct" }: ConversationListProps) {
    const {
        conversationList,
        loadingConversations,
        fetchConversations,
        hasMoreConversations,
        loadMoreConversations,
        searchConversations,
        isSearching
    } = useMessageStore();

    // Subscribe to list updates (global)
    useConversationListSubscriptions(userId);

    const [typingStatus, setTypingStatus] = useState<Map<string, { userId: string; userName: string }>>(new Map());
    const [userPresence, setUserPresence] = useState<Map<string, string | null>>(new Map()); // userId -> last_active_at
    const [searchTerm, setSearchTerm] = useState("");
    // const userNamesCacheRef = useRef<Map<string, string>>(new Map()); // Removed unused ref

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (userId) {
                searchConversations(userId, searchTerm);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, userId, searchConversations]);


    // Initial Load
    useEffect(() => {
        if (userId && !isSearching && !searchTerm) {
            fetchConversations(userId);
        }
    }, [userId, fetchConversations, isSearching, searchTerm]);
    // Added searchTerm dep to ensure we fetch if cleared?
    // Actually searchConversations(userId, "") triggers fetchConversations(userId) inside store.
    // So we might not need this explicitly if we trust the store action.

    // Fetch presence for direct conversations (BATCHED)
    useEffect(() => {
        if (filterType === "direct" && conversationList.length > 0 && !loadingConversations) {
            const missingProfileIds = conversationList
                .filter(conv => conv.type === "direct" && conv.other_user_id && !userPresence.has(conv.other_user_id))
                .map(conv => conv.other_user_id as string);

            if (missingProfileIds.length > 0) {
                MessagingService.getUserProfilesBatch(missingProfileIds).then((profiles: any[]) => {
                    if (profiles && profiles.length > 0) {
                        setUserPresence(prev => {
                            const newMap = new Map(prev);
                            profiles.forEach((p: any) => {
                                if (p.id && p.last_active_at) {
                                    newMap.set(p.id, p.last_active_at);
                                }
                            });
                            return newMap;
                        });
                    }
                });
            }
        }
    }, [conversationList, filterType, loadingConversations]); // Removed userPresence from deps to avoid loop

    // Infinite Scroll via Virtuoso
    const endReached = useCallback(() => {
        if (hasMoreConversations && !loadingConversations && userId) {
            loadMoreConversations(userId);
        }
    }, [hasMoreConversations, loadingConversations, userId, loadMoreConversations]);

    // Filter conversations by type
    const filteredConversations = useMemo(() => {
        if (filterType === "project") {
            return conversationList.filter(conv => conv.type === "project");
        } else {
            return conversationList.filter(conv => conv.type === "direct");
        }
    }, [conversationList, filterType]);

    // Use a ref to hold the latest conversationList without triggering re-subscription
    const conversationListRef = useRef(conversationList);
    useEffect(() => {
        conversationListRef.current = conversationList;
    }, [conversationList]);

    // Subscribe to typing indicators (CONSOLIDATED - single global channel)
    useEffect(() => {
        // Explicitly clearing typing status when userId changes or on mount
        setTypingStatus(new Map());

        if (!userId) return;

        const unsubscribe = MessagingService.subscribeToGlobalTyping((conversationId, typingUserId, isTyping) => {
            // Find conversation using the ref to get the latest list
            const conv = conversationListRef.current.find(c => c.conversation_id === conversationId);

            setTypingStatus(prev => {
                const newMap = new Map(prev);

                if (!isTyping) {
                    if (newMap.get(conversationId)?.userId === typingUserId) {
                        newMap.delete(conversationId);
                    }
                    return newMap;
                }

                let userName = undefined;
                if (conv && conv.type === 'direct' && conv.other_user_id === typingUserId) {
                    userName = conv.other_user_full_name || conv.other_username;
                } else {
                    // Try to resolve from cache for group/project chats or if not in list
                    const state = useMessageStore.getState();
                    // Defensive: check if method exists on store
                    if (typeof (state as any).getCachedSenderProfile === 'function') {
                        const cachedProfile = (state as any).getCachedSenderProfile(typingUserId);
                        if (cachedProfile) {
                            userName = cachedProfile.full_name || cachedProfile.username;
                        }
                    }
                }

                newMap.set(conversationId, { userId: typingUserId, userName: userName || "Someone" });
                return newMap;
            });
        });

        return () => {
            unsubscribe();
        };
    }, [userId]); // Re-subscribe when userId changes


    // Subscribe to presence (Global optimization)
    useEffect(() => {
        if (!userId || filterType !== "direct") return;

        // Subscribe to global presence updates
        const unsubscribe = MessagingService.subscribeToGlobalPresence((updatedUserId, lastActiveAt) => {
            const isRelevant = filteredConversations.some(c => c.other_user_id === updatedUserId);

            if (isRelevant && lastActiveAt) {
                setUserPresence(prev => {
                    const current = prev.get(updatedUserId);
                    if (current === lastActiveAt) return prev;
                    const newMap = new Map(prev);
                    newMap.set(updatedUserId, lastActiveAt);
                    return newMap;
                });
            }
        });

        return () => {
            unsubscribe();
        };
    }, [filteredConversations, userId, filterType]);


    if (loadingConversations && conversationList.length === 0) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
                    <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="flex-1 overflow-y-auto">
                    {[...Array(5)].map((_, i) => (
                        <ConversationSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (filteredConversations.length === 0 && !isSearching) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    {filterType === "project" ? (
                        <FolderKanban className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
                    ) : (
                        <MessageSquarePlus className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
                    )}
                </div>
                <div className="space-y-1">
                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {filterType === "project" ? "No project chats yet" : "No messages yet"}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {filterType === "project"
                            ? "Project chats will appear here when you join projects."
                            : "Start a conversation with a colleague or friend."}
                    </p>
                </div>
                {filterType === "direct" && (
                    <div className="flex gap-2">
                        {onCreateGroup && (
                            <button
                                onClick={onCreateGroup}
                                className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                            >
                                Create Group
                            </button>
                        )}
                        <button
                            onClick={onNewChat}
                            className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                        >
                            New Chat
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Recent</span>
                    <div className="flex gap-2">
                        {filterType === "direct" && onCreateGroup && (
                            <button onClick={onCreateGroup} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                Create Group
                            </button>
                        )}
                        <button onClick={onNewChat} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                            New Chat
                        </button>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-9 text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                <Virtuoso
                    style={{ height: '100%' }}
                    data={filteredConversations}
                    endReached={endReached}
                    itemContent={(_, conv) => {
                        const typingInfo = typingStatus.get(conv.conversation_id);
                        const isTyping = !!typingInfo;
                        const lastActiveAt = conv.other_user_id ? userPresence.get(conv.other_user_id) : null;
                        const isOnline = conv.other_user_id ? isUserOnline(lastActiveAt) : false;

                        return (
                            <ConversationListItem
                                key={conv.conversation_id}
                                conversation={conv}
                                onSelect={onSelectConversation}
                                isTyping={isTyping}
                                typingUserName={typingInfo?.userName}
                                isOnline={isOnline}
                                lastActiveAt={lastActiveAt}
                            />
                        );
                    }}
                />
            </div>
        </div>
    );
}
