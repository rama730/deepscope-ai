"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MessagingService } from "@/lib/services/messaging/index";
import { Message } from "@/lib/services/messaging/types";
import { Loader2, Search, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ForwardMessageModalProps {
    message: Message;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
    onForwarded: () => void;
}

interface ConversationOption {
    id: string;
    name: string;
    avatar?: string;
    type: 'direct' | 'project';
    lastMessage?: string;
}

export function ForwardMessageModal({
    message,
    currentUserId,
    isOpen,
    onClose,
    onForwarded
}: ForwardMessageModalProps) {
    const [conversations, setConversations] = useState<ConversationOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [context, setContext] = useState("");
    const [forwarding, setForwarding] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadConversations();
        } else {
            // Reset state when modal closes
            setSearchQuery("");
            setSelectedConversationId(null);
            setContext("");
        }
    }, [isOpen, currentUserId]);

    const loadConversations = async () => {
        setLoading(true);
        try {
            const data = await MessagingService.getUserConversations(currentUserId);
            const options: ConversationOption[] = (data || []).map((conv: any) => ({
                id: conv.conversation_id,
                name: conv.type === 'project'
                    ? (conv.project_title || "Project Chat")
                    : (conv.other_user_full_name || conv.other_name || conv.other_username || "Unknown User"),
                avatar: conv.type === 'direct' ? (conv.other_user_avatar_url || conv.avatar_url) : undefined,
                type: conv.type === 'project' ? 'project' : 'direct',
                lastMessage: conv.last_message_content || conv.last_message
            }));
            setConversations(options);
        } catch (error) {
            console.error("Error loading conversations:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleForward = async () => {
        if (!selectedConversationId) return;

        setForwarding(true);
        try {
            await MessagingService.forwardMessage(
                message.id,
                selectedConversationId,
                currentUserId,
                context.trim() || undefined
            );
            onForwarded();
            onClose();
        } catch (error) {
            console.error("Error forwarding message:", error);
            alert("Failed to forward message. Please try again.");
        } finally {
            setForwarding(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Forward Message</DialogTitle>
                </DialogHeader>

                {/* Message Preview */}
                <div className="p-3 bg-muted rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Forwarding:</div>
                    <div className="text-sm">{message.content}</div>
                </div>

                {/* Context Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Add a comment (optional)</label>
                    <Textarea
                        placeholder="Add a comment..."
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        rows={2}
                    />
                </div>

                {/* Conversation Search */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Select conversation</label>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <div className="max-h-[300px] overflow-y-auto space-y-1 border rounded-md p-2">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground p-8">
                            {searchQuery ? "No conversations found" : "No conversations available"}
                        </div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => setSelectedConversationId(conv.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left",
                                    selectedConversationId === conv.id && "bg-primary/10 border border-primary"
                                )}
                            >
                                {conv.type === 'direct' && conv.avatar ? (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={conv.avatar} />
                                        <AvatarFallback>
                                            {conv.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                        <MessageSquare className="h-4 w-4 text-white" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{conv.name}</div>
                                    {conv.lastMessage && (
                                        <div className="text-xs text-muted-foreground truncate">
                                            {conv.lastMessage}
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={forwarding}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleForward}
                        disabled={!selectedConversationId || forwarding}
                    >
                        {forwarding ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Forwarding...
                            </>
                        ) : (
                            "Forward"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
