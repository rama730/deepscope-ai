"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessagingService } from "@/lib/services/messaging/index";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Loader2, Search, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectUser: (conversationId: string, metadata: { name: string; avatarUrl: string | null | undefined }) => void;
}

interface UserOption {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    hasExistingConversation?: boolean;
    conversationId?: string;
}

export function NewChatModal({ isOpen, onClose, onSelectUser }: NewChatModalProps) {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadAvailableUsers();
        } else {
            setSearchQuery("");
        }
    }, [isOpen]);

    const loadAvailableUsers = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const supabase = createSupabaseBrowserClient();

            // Get all users except current user
            let query = supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url')
                .neq('id', user.id)
                .order('full_name', { ascending: true })
                .limit(50);

            if (searchQuery.trim()) {
                query = query.or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
            }

            const { data: users, error } = await query;

            if (error) {
                console.error("Error loading users:", error);
                setAvailableUsers([]);
                return;
            }

            if (!users || users.length === 0) {
                setAvailableUsers([]);
                setLoading(false);
                return;
            }

            // Check which users already have conversations with the current user
            const userIds = users.map(u => u.id);
            const { data: existingConversations } = await supabase
                .from('conversation_participants')
                .select('conversation_id, user_id, conversations!inner(type)')
                .in('user_id', userIds)
                .or('conversations.type.eq.direct,conversations.type.is.null');

            // Create a map of user_id -> conversation_id for existing conversations
            const conversationMap = new Map<string, string>();
            if (existingConversations) {
                // Get all conversations where current user is also a participant
                const conversationIds = [...new Set(existingConversations.map(c => c.conversation_id))];
                if (conversationIds.length > 0) {
                    const { data: currentUserParticipants } = await supabase
                        .from('conversation_participants')
                        .select('conversation_id, user_id')
                        .eq('user_id', user.id)
                        .in('conversation_id', conversationIds);

                    if (currentUserParticipants) {
                        const currentUserConvs = new Set(currentUserParticipants.map(p => p.conversation_id));
                        existingConversations.forEach((p: any) => {
                            if (currentUserConvs.has(p.conversation_id) && p.user_id !== user.id) {
                                conversationMap.set(p.user_id, p.conversation_id);
                            }
                        });
                    }
                }
            }

            // Mark users with existing conversations
            const usersWithConversations = users.map(userOption => ({
                ...userOption,
                hasExistingConversation: conversationMap.has(userOption.id),
                conversationId: conversationMap.get(userOption.id)
            }));

            setAvailableUsers(usersWithConversations);
        } catch (error) {
            console.error("Error loading users:", error);
            setAvailableUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            const timeoutId = setTimeout(() => {
                loadAvailableUsers();
            }, 300); // Debounce search

            return () => clearTimeout(timeoutId);
        }
        return undefined;
    }, [searchQuery, isOpen]);

    const handleSelectUser = async (userOption: UserOption) => {
        try {
            // Use createDirectConversation which handles both existing and new conversations correctly via RPC
            const conversationId = await MessagingService.createDirectConversation(userOption.id);

            if (!conversationId) {
                throw new Error("Failed to start conversation");
            }

            onSelectUser(conversationId, {
                name: userOption.full_name || userOption.username || "Unknown User",
                avatarUrl: userOption.avatar_url
            });
            onClose();
        } catch (error) {
            console.error("Error opening conversation:", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-zinc-900 dark:text-zinc-100">Start New Chat</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                        <Input
                            placeholder="Search for a user..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Users List */}
                    <div className="max-h-[400px] overflow-y-auto space-y-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-zinc-500 dark:text-zinc-400" />
                            </div>
                        ) : availableUsers.length === 0 ? (
                            <div className="text-center py-8 text-sm text-zinc-500 dark:text-zinc-400">
                                {searchQuery ? "No users found" : "No users available"}
                            </div>
                        ) : (
                            availableUsers.map((userOption) => (
                                <button
                                    key={userOption.id}
                                    onClick={() => handleSelectUser(userOption)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-left"
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={userOption.avatar_url || undefined} />
                                        <AvatarFallback>
                                            {userOption.full_name?.[0]?.toUpperCase() || userOption.username?.[0]?.toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                            {userOption.full_name || userOption.username || "Unknown"}
                                        </div>
                                        {userOption.full_name && userOption.username && (
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                @{userOption.username}
                                            </div>
                                        )}
                                        {userOption.hasExistingConversation && (
                                            <div className="text-xs text-primary mt-0.5">
                                                Existing chat
                                            </div>
                                        )}
                                    </div>
                                    <UserPlus className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
