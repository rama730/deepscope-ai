"use client";

import { useState, useEffect } from "react";
import { ChatWindow } from "./ChatWindow";
import { useAuth } from "@/hooks/useAuth";
import { ConversationList } from "./ConversationList";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { NewChatModal } from "./NewChatModal";
import { GroupConversationModal } from "./GroupConversationModal";
import { useMessageStore } from "@/stores/useMessageStore";
import { useMessageContext } from "@/contexts/MessageContext";
import { perfTracker } from "@/lib/performance/measure";
import { useSearchParams } from "next/navigation";
import { MessagingService } from "@/lib/services/messaging/index";

type TabType = "chats" | "projects";

interface MessagesPageClientProps {
    initialUser: any;
}

export function MessagesPageClient({ initialUser }: MessagesPageClientProps) {
    const { user } = useAuth();
    const currentUser = user || initialUser;
    const searchParams = useSearchParams();
    const { setActiveConversationId: setContextActiveConversationId } = useMessageContext();
    const {
        fetchConversations,
        conversationList
    } = useMessageStore();

    // Performance tracking
    useEffect(() => {
        perfTracker.start('messages-page-open');
        return () => {
            perfTracker.end('messages-page-open');
        };
    }, []);

    // Global State
    const [activeTab, setActiveTab] = useState<TabType>("chats");
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [conversationMetadata, setConversationMetadata] = useState<{
        type?: 'direct' | 'group' | 'project';
        projectId?: string;
        name?: string;
        avatarUrl?: string | null;
    }>({});

    // Fetch conversations on mount if empty
    useEffect(() => {
        if (currentUser?.id && conversationList.length === 0) {
            fetchConversations(currentUser.id);
        }
    }, [currentUser?.id, conversationList.length, fetchConversations]);

    // Sync local state with context
    useEffect(() => {
        setContextActiveConversationId(activeConversationId);
    }, [activeConversationId, setContextActiveConversationId]);

    // URL-based open (used by notifications + application flows)
    useEffect(() => {
        if (!currentUser?.id) return;
        const conversationId =
            searchParams?.get("conversation") ||
            searchParams?.get("conversationId") ||
            null;
        const targetUserId = searchParams?.get("userId") || null;

        (async () => {
            if (conversationId) {
                setActiveConversationId(conversationId);
                return;
            }
            if (targetUserId) {
                try {
                    const conv = await MessagingService.getOrCreateDirectConversation(currentUser.id, targetUserId);
                    if (conv?.id) setActiveConversationId(conv.id);
                } catch (e) {
                    // Ignore; user can still open via conversation list
                }
            }
        })();
    }, [currentUser?.id, searchParams]);

    // Keyboard shortcuts
    useKeyboardShortcuts([
        {
            key: "Escape",
            handler: () => {
                if (activeConversationId) {
                    setActiveConversationId(null);
                }
            }
        }
    ], !!currentUser);

    const handleSelectConversation = (
        convId: string,
        type: 'direct' | 'group' | 'project' | undefined,
        projectId?: string,
        initialDetails?: { name: string; avatarUrl?: string | null }
    ) => {
        perfTracker.start('conversation-open', { conversationId: convId });
        setActiveConversationId(convId);
        setConversationMetadata({
            type,
            projectId: projectId ?? undefined,
            name: initialDetails?.name,
            avatarUrl: initialDetails?.avatarUrl
        });
    };

    if (!currentUser) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">Please log in to view messages.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 truncate max-w-[300px]">
                        {activeConversationId && conversationMetadata.name ? conversationMetadata.name : "Messages"}
                    </h2>
                </div>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Conversation List */}
                <div className="w-full md:w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0 flex flex-col">
                    {/* Tabs */}
                    <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                        <button
                            onClick={() => {
                                setActiveTab("chats");
                                setActiveConversationId(null);
                            }}
                            className={cn(
                                "flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2",
                                activeTab === "chats"
                                    ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-zinc-100"
                                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                            )}
                        >
                            Chats
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("projects");
                                setActiveConversationId(null);
                            }}
                            className={cn(
                                "flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2",
                                activeTab === "projects"
                                    ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-zinc-100"
                                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                            )}
                        >
                            Projects
                        </button>
                    </div>

                    <ConversationList
                        userId={currentUser.id}
                        onSelectConversation={handleSelectConversation}
                        onNewChat={() => setShowNewChatModal(true)}
                        onCreateGroup={() => setShowCreateGroupModal(true)}
                        filterType={activeTab === "projects" ? "project" : "direct"}
                    />
                </div>

                {/* Right Side - Chat Window or Empty State */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {activeConversationId ? (
                        <ChatWindow
                            conversationId={activeConversationId}
                            initialType={conversationMetadata.type}
                            initialProjectId={conversationMetadata.projectId || null}
                        />
                    ) : (
                        <div className="flex flex-1 items-center justify-center bg-white dark:bg-zinc-950">
                            <div className="text-center p-8">
                                <svg className="h-12 w-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.426L3 21l1.426-5.745A9.863 9.863 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">Select a conversation to start messaging</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Chat Modal */}
            <NewChatModal
                isOpen={showNewChatModal}
                onClose={() => setShowNewChatModal(false)}
                onSelectUser={(conversationId, metadata) => {
                    handleSelectConversation(conversationId, 'direct', undefined, metadata);
                    setShowNewChatModal(false);
                }}
            />

            {/* Create Group Modal */}
            <GroupConversationModal
                currentUserId={currentUser.id}
                isOpen={showCreateGroupModal}
                onClose={() => setShowCreateGroupModal(false)}
                onCreated={(conversationId) => {
                    setActiveConversationId(conversationId);
                    setShowCreateGroupModal(false);
                }}
            />
        </div>
    );
}
