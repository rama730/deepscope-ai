"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessagingService } from "@/lib/services/messaging/index";
import { Loader2, Settings, Users, X, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GroupSettingsModalProps {
    conversationId: string;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
}

interface GroupMember {
    id: string;
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
    added_by: string | null;
    profile: {
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
    };
}

export function GroupSettingsModal({
    conversationId,
    currentUserId,
    isOpen,
    onClose,
    onUpdated
}: GroupSettingsModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadGroupData();
        }
    }, [isOpen, conversationId]);

    const loadGroupData = async () => {
        setLoading(true);
        try {
            // Load group members
            const membersData = await MessagingService.getGroupMembers(conversationId);
            setMembers(membersData);

            // Check if current user is admin
            const currentMember = membersData.find(m => m.user_id === currentUserId);
            setIsAdmin(currentMember?.role === 'admin' || false);

            // Load conversation details to get name, description, avatar
            const supabase = (await import("@/lib/supabase/client")).createSupabaseBrowserClient();
            const { data: conv } = await supabase
                .from('conversations')
                .select('group_name, group_description, group_avatar_url')
                .eq('id', conversationId)
                .single();

            if (conv) {
                setName(conv.group_name || "");
                setDescription(conv.group_description || "");
                setAvatarUrl(conv.group_avatar_url || "");
            }
        } catch (error) {
            console.error("Error loading group data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            alert("Please enter a group name");
            return;
        }

        setSaving(true);
        try {
            await MessagingService.updateGroupSettings(
                conversationId,
                name.trim(),
                description.trim() || undefined,
                avatarUrl.trim() || undefined,
                currentUserId
            );
            onUpdated();
            onClose();
        } catch (error) {
            console.error("Error updating group settings:", error);
            alert("Failed to update group settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this member?")) return;

        try {
            await MessagingService.removeGroupMember(conversationId, userId, currentUserId);
            loadGroupData();
            onUpdated();
        } catch (error) {
            console.error("Error removing member:", error);
            alert("Failed to remove member. Please try again.");
        }
    };

    const handleChangeRole = async (userId: string, newRole: 'admin' | 'member') => {
        try {
            await MessagingService.addGroupMember(conversationId, userId, newRole, currentUserId);
            loadGroupData();
            onUpdated();
        } catch (error) {
            console.error("Error changing role:", error);
            alert("Failed to change role. Please try again.");
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Group Settings
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-6">
                        {/* Group Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                                    Group Name *
                                </label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter group name"
                                    className="w-full"
                                    disabled={!isAdmin}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                                    Description
                                </label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What's this group about?"
                                    rows={3}
                                    className="w-full"
                                    disabled={!isAdmin}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
                                    Avatar URL
                                </label>
                                <Input
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full"
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>

                        {/* Members */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="w-4 h-4 text-zinc-500" />
                                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Members ({members.length})
                                </h3>
                            </div>
                            <div className="space-y-2">
                                {members.map(member => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10">
                                                <AvatarImage src={member.profile.avatar_url || undefined} />
                                                <AvatarFallback>
                                                    {(member.profile.full_name || member.profile.username || "U").charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                        {member.profile.full_name || member.profile.username}
                                                    </span>
                                                    {member.role === 'admin' && (
                                                        <Crown className="w-4 h-4 text-yellow-500" />
                                                    )}
                                                </div>
                                                {member.profile.username && (
                                                    <div className="text-xs text-zinc-500">
                                                        @{member.profile.username}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {isAdmin && member.user_id !== currentUserId && (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => handleChangeRole(member.user_id, e.target.value as 'admin' | 'member')}
                                                    className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                                >
                                                    <option value="member">Member</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <button
                                                    onClick={() => handleRemoveMember(member.user_id)}
                                                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-red-500"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    {isAdmin && (
                        <Button onClick={handleSave} disabled={saving || !name.trim()}>
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
