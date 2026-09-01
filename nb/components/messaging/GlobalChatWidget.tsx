"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, X, ChevronDown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useMessageContext } from "@/contexts/MessageContext";
import { useMessageStore } from "@/stores/useMessageStore";
import { useConversationListSubscriptions } from "@/hooks/useConversationListSubscriptions";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { MessagingService } from "@/lib/services/messaging/index";

const ChatWindow = dynamic(() => import("./ChatWindow").then(mod => mod.ChatWindow), {
    loading: () => <div className="flex items-center justify-center h-full"><span className="animate-spin">⌛</span></div>
});
const ConversationList = dynamic(() => import("./ConversationList").then(mod => mod.ConversationList));
const UserSearch = dynamic(() => import("./UserSearch").then(mod => mod.UserSearch));

type ViewState = "LIST" | "SEARCH" | "CHAT";
type TabType = "chats" | "projects";

export function GlobalChatWidget() {
    const pathname = usePathname();
    const { user } = useAuth();
    const {
        setGlobalChatOpen,
        setGlobalChatConversationId,
        setProjectChatActive,
        setProjectChatConversationId
    } = useMessageContext();
    const [isOpen, setIsOpen] = useState(false);

    const {
        totalUnreadCount,
        currentProjectId,
        setCurrentProjectId,
        fetchConversations,
        conversationList,
        fetchMessages
    } = useMessageStore();

    // Global State
    const [view, setView] = useState<ViewState>("LIST");
    const [activeTab, setActiveTab] = useState<TabType>("chats");
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Metadata state for chat window optimization
    const [chatMetadata, setChatMetadata] = useState<{
        type?: 'direct' | 'group' | 'project';
        projectId?: string;
        name?: string;
        avatarUrl?: string | null;
    }>({});

    // Sync widget open state with context
    useEffect(() => {
        setGlobalChatOpen(isOpen);
    }, [isOpen, setGlobalChatOpen]);

    // Sync active conversation with context
    useEffect(() => {
        if (isOpen && activeConversationId) {
            if (currentProjectId) {
                setProjectChatActive(true);
                setProjectChatConversationId(activeConversationId);
                setGlobalChatConversationId(null);
            } else {
                setGlobalChatConversationId(activeConversationId);
                setProjectChatActive(false);
                setProjectChatConversationId(null);
            }
        } else {
            setGlobalChatConversationId(null);
            setProjectChatActive(false);
            setProjectChatConversationId(null);
        }
    }, [isOpen, activeConversationId, currentProjectId, setGlobalChatConversationId, setProjectChatActive, setProjectChatConversationId]);

    const userId = user?.id ?? null;
    const { hasAccess: hasProjectAccess } = useProjectPermissions(currentProjectId, userId);
    useConversationListSubscriptions(userId || undefined);

    const loadProjectConversation = useCallback(async (pid: string) => {
        setLoading(true);
        try {
            const conv = await MessagingService.getProjectConversation(pid);
            if (conv) {
                setActiveConversationId(conv.id);
                setView("CHAT");
            }
        } catch (error) {
            console.error("Failed to load project conversation", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Context Detection
    useEffect(() => {
        if (pathname === '/messages') return;

        let cancelled = false;
        const detectContext = async () => {
            const match = pathname?.match(/\/projects\/([^/]+)/);
            if (match && match[1] && match[1] !== 'new') {
                const slugOrId = match[1];
                if (currentProjectId && pathname.includes(currentProjectId)) return;

                const resolvedId = await MessagingService.resolveProjectId(slugOrId);
                if (cancelled) return;

                if (resolvedId && resolvedId !== currentProjectId) {
                    setCurrentProjectId(resolvedId);
                    const supabase = createSupabaseBrowserClient();
                    const { data: project } = await supabase.from('projects').select('title').eq('id', resolvedId).single();
                    if (project && !cancelled) setProjectName(project.title);
                }
            } else {
                if (currentProjectId && !cancelled) {
                    setCurrentProjectId(null);
                    setProjectName(null);
                }
            }
        };

        detectContext();
        return () => { cancelled = true; };
    }, [pathname, currentProjectId, setCurrentProjectId]);

    // Auto-open project chat
    useEffect(() => {
        if (!isOpen || !currentProjectId || !userId) return;
        if (hasProjectAccess) loadProjectConversation(currentProjectId);
    }, [isOpen, currentProjectId, userId, loadProjectConversation, hasProjectAccess]);

    // Handle Hover (Prefetch Code & Data)
    const handleHover = useCallback(() => {
        // 1. Prefetch Code Chunk
        import("./ChatWindow");
        import("./ConversationList");

        // 2. Prefetch Data
        if (userId && conversationList.length === 0) {
            fetchConversations(userId);
        }
    }, [userId, conversationList, fetchConversations]);

    const handleSelectConversation = useCallback((
        convId: string,
        type: 'direct' | 'group' | 'project' | undefined,
        projectId?: string,
        initialDetails?: { name: string; avatarUrl?: string | null }
    ) => {
        // 1. Start fetching immediately (Parallel Fetching)
        // Use the hook-derived function instead of getState()
        fetchMessages(convId);

        // 2. Set State with Optimistic Details
        setChatMetadata({
            type: type,
            projectId: projectId,
            name: initialDetails?.name,
            avatarUrl: initialDetails?.avatarUrl
        });
        setActiveConversationId(convId);
        setView("CHAT");
    }, [fetchMessages]);

    const handleStartDirectChat = async (otherUserId: string) => {
        setLoading(true);
        try {
            const convId = await MessagingService.createDirectConversation(otherUserId);
            if (convId) {
                setActiveConversationId(convId);
                setView("CHAT");
            }
        } catch (err) {
            console.error("Failed to start chat", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleOpen = () => setIsOpen(!isOpen);

    const handleBack = () => {
        if (view === "SEARCH") setView("LIST");
        else if (view === "CHAT") {
            setView("LIST");
            setActiveConversationId(null);
        }
    };

    useKeyboardShortcuts([
        {
            key: "Escape",
            handler: () => {
                if (isOpen) {
                    if (view === "CHAT") handleBack();
                    else setIsOpen(false);
                }
            }
        }
    ], isOpen && !!user);

    if (pathname === '/messages' || pathname?.startsWith('/post/')) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            <div
                className={cn(
                    "fixed bottom-20 right-0 w-[380px] h-[500px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 origin-bottom-right",
                    isOpen
                        ? "opacity-100 scale-100 pointer-events-auto translate-y-0"
                        : "opacity-0 scale-95 pointer-events-none translate-y-4"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-2">
                        {view !== "LIST" && (
                            <Button variant="ghost" size="icon" className="text-zinc-500 dark:text-zinc-400" onClick={handleBack}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                            {currentProjectId && view === "CHAT" ? (projectName || "Project Chat") :
                                view === "CHAT" && chatMetadata.name ? chatMetadata.name :
                                    view === "SEARCH" ? "New Message" : "Messages"}
                        </h3>
                        {loading && <span className="text-xs text-muted-foreground">Loading...</span>}
                    </div>
                    <Button variant="ghost" size="icon" className="text-zinc-500 dark:text-zinc-400" onClick={() => setIsOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    {/* LIST VIEW */}
                    <div className={cn("flex flex-col h-full", view !== "LIST" && "hidden")}>
                        <div className="flex border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                            <button
                                onClick={() => { setActiveTab("chats"); setActiveConversationId(null); }}
                                className={cn("flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2", activeTab === "chats" ? "border-primary text-primary dark:text-zinc-100" : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100")}
                            >
                                Chats
                            </button>
                            <button
                                onClick={() => { setActiveTab("projects"); setActiveConversationId(null); }}
                                className={cn("flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2", activeTab === "projects" ? "border-primary text-primary dark:text-zinc-100" : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100")}
                            >
                                Projects
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {user && (
                                <ConversationList
                                    userId={user.id}
                                    onSelectConversation={handleSelectConversation}
                                    onNewChat={() => setView("SEARCH")}
                                    filterType={activeTab === "projects" ? "project" : "direct"}
                                />
                            )}
                            {!user && (
                                <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 text-sm">
                                    Please log in to use messaging.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SEARCH VIEW */}
                    {view === "SEARCH" && (
                        <div className="absolute inset-0 bg-white dark:bg-zinc-900 z-10 flex flex-col h-full">
                            <UserSearch
                                onUserSelect={handleStartDirectChat}
                                onCancel={() => setView("LIST")}
                            />
                        </div>
                    )}

                    {/* CHAT VIEW (kept in DOM) */}
                    <div className={cn("absolute inset-0 bg-white dark:bg-zinc-900 z-20 flex flex-col h-full transition-transform duration-200",
                        view === "CHAT" ? "translate-x-0" : "translate-x-full pointer-events-none")}>
                        {activeConversationId && (
                            <ChatWindow
                                conversationId={activeConversationId}
                                initialProjectId={currentProjectId || chatMetadata.projectId}
                                initialType={currentProjectId ? 'project' : chatMetadata.type}
                                variant="compact"
                            />
                        )}
                    </div>
                </div>
            </div>

            <Button
                onClick={toggleOpen}
                onMouseEnter={handleHover}
                size="lg"
                className={cn(
                    "rounded-full h-14 w-14 shadow-lg transition-all duration-300 relative",
                    isOpen ? "bg-muted text-foreground hover:bg-muted/80" : "bg-primary text-primary-foreground"
                )}
            >
                {isOpen ? <ChevronDown className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
                {!isOpen && totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                    </span>
                )}
            </Button>
        </div>
    );
}
