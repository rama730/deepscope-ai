"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Plus, Trash2 } from "lucide-react";

interface CustomFeed {
    id: string;
    name: string;
    query_config: {
        tags?: string[];
        user_ids?: string[];
        keywords?: string[];
    };
}

interface CustomFeedManagerProps {
    currentUser: any;
    onSelectFeed: (feed: CustomFeed | null) => void;
    selectedFeedId: string | null;
}

export default function CustomFeedManager({ currentUser, onSelectFeed, selectedFeedId }: CustomFeedManagerProps) {
    const [feeds, setFeeds] = useState<CustomFeed[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newFeedName, setNewFeedName] = useState("");
    const [newFeedTags, setNewFeedTags] = useState("");
    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        if (!currentUser) return;
        loadFeeds();
    }, [currentUser]);

    async function loadFeeds() {
        const { data } = await supabase
            .from('custom_feeds')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (data) setFeeds(data as any);
    }

    async function handleCreateFeed() {
        if (!newFeedName.trim()) return;

        const tags = newFeedTags.split(',').map(t => t.trim()).filter(Boolean);
        const config = { tags };

        const { data } = await supabase
            .from('custom_feeds')
            .insert({
                user_id: currentUser.id,
                name: newFeedName,
                query_config: config
            })
            .select()
            .single();

        if (data) {
            setFeeds([data as any, ...feeds]);
            setShowCreate(false);
            setNewFeedName("");
            setNewFeedTags("");
            onSelectFeed(data as any);
        }
    }

    async function handleDeleteFeed(id: string, e: React.MouseEvent) {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this feed?")) return;

        await supabase.from('custom_feeds').delete().eq('id', id);
        setFeeds(feeds.filter(f => f.id !== id));
        if (selectedFeedId === id) onSelectFeed(null);
    }

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Custom Feeds</h3>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="p-1 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded text-zinc-500"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {showCreate && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg mb-3 border border-zinc-200 dark:border-zinc-800">
                    <input
                        type="text"
                        placeholder="Feed Name"
                        value={newFeedName}
                        onChange={e => setNewFeedName(e.target.value)}
                        className="w-full mb-2 px-2 py-1 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                    <input
                        type="text"
                        placeholder="Tags (comma separated)"
                        value={newFeedTags}
                        onChange={e => setNewFeedTags(e.target.value)}
                        className="w-full mb-2 px-2 py-1 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setShowCreate(false)}
                            className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateFeed}
                            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <button
                    onClick={() => onSelectFeed(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFeedId === null
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                        }`}
                >
                    All Posts
                </button>

                {feeds.map(feed => (
                    <button
                        key={feed.id}
                        onClick={() => onSelectFeed(feed)}
                        className={`w-full group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFeedId === feed.id
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                            }`}
                    >
                        <span className="truncate">{feed.name}</span>
                        <span
                            onClick={(e) => handleDeleteFeed(feed.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                        >
                            <Trash2 className="w-3 h-3" />
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
