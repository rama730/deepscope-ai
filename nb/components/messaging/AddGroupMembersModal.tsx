"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessagingService } from "@/lib/services/messaging/index";
import { Loader2, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface AddGroupMembersModalProps {
    conversationId: string;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
    onAdded: () => void;
}

interface UserOption {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
}

export function AddGroupMembersModal({
    conversationId,
    currentUserId,
    isOpen,
    onClose,
    onAdded
}: AddGroupMembersModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
    const [existingMemberIds, setExistingMemberIds] = useState<string[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadData();
        } else {
            setSearchQuery("");
            setSelectedUserIds([]);
        }
    }, [isOpen, conversationId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load existing members
            const members = await MessagingService.getGroupMembers(conversationId);
            setExistingMemberIds(members.map(m => m.user_id));

            // Load available users (excluding current user and existing members)
            const supabase = createSupabaseBrowserClient();
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url')
                .neq('id', currentUserId)
                .order('full_name', { ascending: true })
                .limit(100);

            if (error) throw error;
            setAvailableUsers(data || []);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = availableUsers.filter(user =>
        !existingMemberIds.includes(user.id) &&
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

    const handleAdd = async () => {
        if (selectedUserIds.length === 0) {
            alert("Please select at least one user to add");
            return;
        }

        setAdding(true);
        try {
            for (const userId of selectedUserIds) {
                await MessagingService.addGroupMember(conversationId, userId, 'member', currentUserId);
            }
            onAdded();
            onClose();
        } catch (error) {
            console.error("Error adding members:", error);
            alert("Failed to add members. Please try again.");
        } finally {
            setAdding(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        Add Members to Group
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4">
                    {/* Search */}
                    <div>
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users..."
                            className="w-full"
                        />
                    </div>

                    {/* Selected Members */}
                    {selectedUserIds.length > 0 && (
                        <div>
                            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Selected ({selectedUserIds.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
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
                                                    {(user.full_name || user.username || "User").charAt(0).toUpperCase()}
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
                        </div>
                    )}

                    {/* Available Users List */}
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                        </div>
                    ) : filteredUsers.length > 0 ? (
                        <div>
                            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Available Users
                            </div>
                            <div className="max-h-64 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
                                {filteredUsers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => toggleUserSelection(user.id)}
                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors text-left"
                                    >
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={user.avatar_url || undefined} />
                                            <AvatarFallback>
                                                {(user.full_name || user.username || "User").charAt(0).toUpperCase()}
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
                                        {selectedUserIds.includes(user.id) && (
                                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-white dark:bg-zinc-900" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : searchQuery && (
                        <div className="text-center py-8 text-sm text-zinc-500">
                            No users found
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={adding}>
                        Cancel
                    </Button>
                    <Button onClick={handleAdd} disabled={adding || selectedUserIds.length === 0}>
                        {adding ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            `Add ${selectedUserIds.length > 0 ? `${selectedUserIds.length} ` : ''}Member${selectedUserIds.length !== 1 ? 's' : ''}`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
