"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessagingService } from "@/lib/services/messaging/index";
import { Loader2, Users, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface GroupConversationModalProps {
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
    onCreated: (conversationId: string) => void;
}

interface UserOption {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
}

export function GroupConversationModal({
    currentUserId,
    isOpen,
    onClose,
    onCreated
}: GroupConversationModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadAvailableUsers();
        } else {
            // Reset state when modal closes
            setName("");
            setDescription("");
            setAvatarUrl("");
            setSearchQuery("");
            setSelectedUserIds([]);
        }
    }, [isOpen]);

    const loadAvailableUsers = async () => {
        setLoading(true);
        try {
            const supabase = createSupabaseBrowserClient();
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url')
                .neq('id', currentUserId)
                .order('full_name', { ascending: true })
                .limit(50);

            if (error) throw error;
            setAvailableUsers(data || []);
        } catch (error) {
            console.error("Error loading users:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = availableUsers.filter(user =>
        (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         user.username?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !selectedUserIds.includes(user.id)
    );

    const toggleUserSelection = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            alert("Please enter a group name");
            return;
        }

        setCreating(true);
        try {
            const conversationId = await MessagingService.createGroupConversation(
                currentUserId,
                name.trim(),
                description.trim() || undefined,
                avatarUrl.trim() || undefined,
                selectedUserIds.length > 0 ? selectedUserIds : undefined
            );

            if (conversationId) {
                onCreated(conversationId);
                onClose();
            }
        } catch (error) {
            console.error("Error creating group:", error);
            alert("Failed to create group. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Create Group Conversation
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4">
                    {/* Group Name */}
                    <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                            Group Name *
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter group name"
                            className="w-full"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                            Description (optional)
                        </label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this group about?"
                            rows={3}
                            className="w-full"
                        />
                    </div>

                    {/* Avatar URL */}
                    <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                            Avatar URL (optional)
                        </label>
                        <Input
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full"
                        />
                    </div>

                    {/* Add Members */}
                    <div>
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                            Add Members (optional)
                        </label>
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users..."
                            className="w-full mb-2"
                        />

                        {/* Selected Members */}
                        {selectedUserIds.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {selectedUserIds.map(userId => {
                                    const user = availableUsers.find(u => u.id === userId);
                                    if (!user) return null;
                                    return (
                                        <div
                                            key={userId}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
                                        >
                                            <Avatar className="w-6 h-6">
                                                <AvatarImage src={user.avatar_url || undefined} />
                                                <AvatarFallback>
                                                    {(user.full_name || user.username || "U").charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                                {user.full_name || user.username}
                                            </span>
                                            <button
                                                onClick={() => toggleUserSelection(userId)}
                                                className="ml-1 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Available Users List */}
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                            </div>
                        ) : filteredUsers.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
                                {filteredUsers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => toggleUserSelection(user.id)}
                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-left"
                                    >
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={user.avatar_url || undefined} />
                                            <AvatarFallback>
                                                {(user.full_name || user.username || "U").charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {user.full_name || user.username}
                                            </div>
                                            {user.username && (
                                                <div className="text-xs text-zinc-500">
                                                    @{user.username}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : searchQuery && (
                            <div className="text-center py-8 text-sm text-zinc-500">
                                No users found
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={creating}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                        {creating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Group"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
