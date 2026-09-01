"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Plus, Users, Lock, Globe, Trash2, Edit3 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface List {
    id: string;
    name: string;
    description: string | null;
    is_private: boolean;
    created_at: string;
    member_count?: number;
}

interface ListsClientProps {
    initialLists: List[];
    initialUser: any;
}

export default function ListsClient({ initialLists, initialUser }: ListsClientProps) {
    const supabase = createSupabaseBrowserClient();
    const router = useRouter();
    const [lists, setLists] = useState<List[]>(initialLists);
    const [loading, setLoading] = useState(!initialLists);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newListName, setNewListName] = useState("");
    const [newListDescription, setNewListDescription] = useState("");
    const [newListPrivate, setNewListPrivate] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(initialUser);

    useEffect(() => {
        if (!initialUser) {
            loadCurrentUser();
        }
    }, [initialUser]);

    useEffect(() => {
        if (!initialLists && currentUser) {
            loadLists();
        }
    }, [currentUser, initialLists]);

    async function loadCurrentUser() {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        setCurrentUser(user);
    }

    async function loadLists() {
        if (!currentUser) return;

        setLoading(true);
        const { data } = await supabase
            .from("lists")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: false });

        // Get member counts
        if (data) {
            const listsWithCounts = await Promise.all(
                data.map(async (list) => {
                    const { count } = await supabase
                        .from("list_members")
                        .select("*", { count: "exact", head: true })
                        .eq("list_id", list.id);

                    return { ...list, member_count: count || 0 };
                })
            );
            setLists(listsWithCounts);
        }

        setLoading(false);
    }

    async function createList() {
        if (!currentUser || !newListName.trim()) return;

        const { error } = await supabase.from("lists").insert({
            user_id: currentUser.id,
            name: newListName.trim(),
            description: newListDescription.trim() || null,
            is_private: newListPrivate,
        });

        if (!error) {
            setShowCreateModal(false);
            setNewListName("");
            setNewListDescription("");
            setNewListPrivate(false);
            loadLists();
            router.refresh();
        }
    }

    async function deleteList(id: string) {
        if (!confirm("Are you sure you want to delete this list?")) return;

        const { error } = await supabase.from("lists").delete().eq("id", id);

        if (!error) {
            loadLists();
            router.refresh();
        }
    }

    if (!currentUser) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center py-12">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                    Please log in to view your lists
                </h3>
                <Link
                    href="/login"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
                >
                    Log In
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Lists</h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Organize users into custom feeds
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Create List
                </button>
            </div>

            {/* Lists Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : lists.length === 0 ? (
                <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                        No lists yet
                    </h3>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                        Create a list to organize users and see their posts in a custom feed
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Create Your First List
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lists.map((list) => (
                        <Link
                            key={list.id}
                            href={`/lists/${list.id}`}
                            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                                        {list.name}
                                    </h3>
                                    {list.description && (
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                            {list.description}
                                        </p>
                                    )}
                                </div>
                                {list.is_private ? (
                                    <Lock className="w-4 h-4 text-zinc-400" />
                                ) : (
                                    <Globe className="w-4 h-4 text-zinc-400" />
                                )}
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {list.member_count} {list.member_count === 1 ? "member" : "members"}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            // Edit functionality
                                        }}
                                        className="p-1 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded"
                                    >
                                        <Edit3 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            deleteList(list.id);
                                        }}
                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create List Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Create New List</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., AI Researchers"
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    maxLength={50}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Description (optional)
                                </label>
                                <textarea
                                    placeholder="What's this list about?"
                                    value={newListDescription}
                                    onChange={(e) => setNewListDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    maxLength={200}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="private"
                                    checked={newListPrivate}
                                    onChange={(e) => setNewListPrivate(e.target.checked)}
                                    className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                />
                                <label htmlFor="private" className="text-sm text-zinc-700 dark:text-zinc-300">
                                    Make this list private
                                </label>
                            </div>
                        </div>
                        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 justify-end">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createList}
                                disabled={!newListName.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create List
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
