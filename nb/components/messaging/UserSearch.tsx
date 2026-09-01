"use client";

import { useState, useEffect } from "react";
import { MessagingService } from "@/lib/services/messaging/index";
import { Search, Loader2, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

interface UserSearchProps {
    onUserSelect: (userId: string) => void;
    onCancel: () => void;
}

export function UserSearch({ onUserSelect, onCancel }: UserSearchProps) {
    const { user } = useAuth();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Load suggested users (Connections) on mount
    useEffect(() => {
        if (user) {
            loadSuggestions();
        }
    }, [user]);

    const loadSuggestions = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const connections = await MessagingService.getConnectedUsers(user.id);
            setConnectedUsers(connections);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (val: string) => {
        setQuery(val);
        if (val.length < 2) {
            setResults([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        setSearched(true);
        try {
            const users = await MessagingService.searchUsers(val);
            setResults(users);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    };

    const displayList = searched ? results : connectedUsers;

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="p-3 border-b flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search people..."
                    className="h-8 text-sm border-none shadow-none focus-visible:ring-0 px-1"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    autoFocus
                />
                <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
                    Cancel
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {loading && (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {!loading && !searched && connectedUsers.length === 0 && (
                    <div className="text-center p-6 text-sm text-muted-foreground space-y-2">
                        <div className="bg-muted rounded-full p-2 w-10 h-10 mx-auto flex items-center justify-center">
                            <Users className="h-5 w-5 opacity-50" />
                        </div>
                        <p>No connections yet.</p>
                        <p className="text-xs">Search above to find people.</p>
                    </div>
                )}

                {!loading && searched && results.length === 0 && (
                    <div className="text-center p-4 text-sm text-muted-foreground">
                        No users found.
                    </div>
                )}

                <div className="space-y-1">
                    {!searched && connectedUsers.length > 0 && (
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                            Suggested
                        </div>
                    )}

                    {displayList.map((u) => (
                        <div
                            key={u.id}
                            onClick={() => onUserSelect(u.id)}
                            className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                        >
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={u.avatar_url} />
                                <AvatarFallback>
                                    <UserPlus className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">{u.full_name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground truncate">@{u.username || "user"}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
