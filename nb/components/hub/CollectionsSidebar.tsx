"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Trash2, Lock, Globe, Layout, TrendingUp, Sparkles, User, Edit2, GripVertical, Save, X, Activity } from "lucide-react";
import { useHubCollections } from "@/hooks/useHubCollections";
import { useToast } from "@/components/ui-custom/Toast";
import { Collection, User as UserType } from "@/types/hub";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Reorder } from "framer-motion";

interface CollectionsSidebarProps {
    currentUser: UserType | null;
    selectedCollectionId: string | null;
    onSelectCollection: (id: string | null, name?: string) => void;
    activeView?: string;
    onSelectView?: (view: string) => void;
}

export default function CollectionsSidebar({ currentUser, selectedCollectionId, onSelectCollection, activeView, onSelectView }: CollectionsSidebarProps) {
    const { showToast } = useToast();
    const supabase = createSupabaseBrowserClient();
    const { collections, loading, createCollection, deleteCollection, updateCollectionOrder, reload } = useHubCollections(currentUser?.id ?? null);
    const [isCreating, setIsCreating] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [reorderedCollections, setReorderedCollections] = useState<Collection[]>([]);
    const editInputRef = useRef<HTMLInputElement>(null);

    // Update reordered collections when collections change
    useEffect(() => {
        if (collections.length > 0) {
            setReorderedCollections(collections);
        }
    }, [collections]);

    const handleEditCollection = useCallback(async (id: string, name: string, description?: string) => {
        try {
            const { error } = await supabase
                .from('collections')
                .update({
                    name: name.trim(),
                    description: description?.trim() || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            showToast("Collection updated", "success");
            setEditingId(null);
            reload();
        } catch (error) {
            console.error("Error updating collection:", error);
            showToast("Failed to update collection", "error");
        }
    }, [supabase, showToast, reload]);

    const startEdit = useCallback((collection: Collection) => {
        setEditingId(collection.id);
        setEditName(collection.name);
        setEditDescription((collection as any).description || "");
        setTimeout(() => editInputRef.current?.focus(), 0);
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingId(null);
        setEditName("");
        setEditDescription("");
    }, []);

    const saveEdit = useCallback(() => {
        if (!editingId || !editName.trim()) return;
        handleEditCollection(editingId, editName, editDescription);
    }, [editingId, editName, editDescription, handleEditCollection]);

    const handleReorder = useCallback(async (newOrder: Collection[]) => {
        setReorderedCollections(newOrder);
        // Save order to database
        const orderedIds = newOrder.map(c => c.id);
        try {
            await updateCollectionOrder(orderedIds);
        } catch (error) {
            console.error("Error saving collection order:", error);
            showToast("Failed to save collection order", "error");
        }
    }, [updateCollectionOrder, showToast]);

    const handleCreateCollection = useCallback(async () => {
        if (!newCollectionName.trim()) return;

        try {
            await createCollection(newCollectionName);
            setNewCollectionName("");
            setIsCreating(false);
            showToast("Collection created", "success");
        } catch (error) {
            console.error("Error creating collection:", error);
            showToast("Failed to create collection", "error");
        }
    }, [newCollectionName, createCollection, showToast]);

    const handleDeleteCollection = useCallback(async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this collection?")) return;

        try {
            await deleteCollection(id);
            if (selectedCollectionId === id) onSelectCollection(null);
            showToast("Collection deleted", "success");
        } catch (error) {
            console.error("Error deleting collection:", error);
            showToast("Failed to delete collection", "error");
        }
    }, [selectedCollectionId, onSelectCollection, deleteCollection, showToast]);

    if (!currentUser) return null;

    return (
        <div className="w-full lg:w-64 flex-shrink-0 lg:pr-6">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900 dark:text-zinc-100">Collections</h3>
                    {loading && <Activity className="w-4 h-4 text-blue-500 animate-spin" aria-label="Loading collections" />}
                    <button
                        onClick={() => setIsCreating(true)}
                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Create new collection"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-1">
                    <button
                        onClick={() => {
                            if (onSelectView) onSelectView('all');
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${activeView === 'all' && !selectedCollectionId
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-900"
                            }`}
                        aria-pressed={activeView === 'all' && !selectedCollectionId}
                        aria-label="View all projects"
                    >
                        <Layout className="w-4 h-4" />
                        All Projects
                    </button>

                    <button
                        onClick={() => {
                            if (onSelectView) onSelectView('trending');
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${activeView === 'trending' && !selectedCollectionId
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-900"
                            }`}
                        aria-pressed={activeView === 'trending' && !selectedCollectionId}
                        aria-label="View trending projects"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Trending
                    </button>

                    <button
                        onClick={() => {
                            if (onSelectView) onSelectView('recommendations');
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${activeView === 'recommendations' && !selectedCollectionId
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-900"
                            }`}
                        aria-pressed={activeView === 'recommendations' && !selectedCollectionId}
                        aria-label="View recommended projects"
                    >
                        <Sparkles className="w-4 h-4" />
                        For You
                    </button>

                    <button
                        onClick={() => {
                            if (onSelectView) onSelectView('my-projects');
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${activeView === 'my-projects' && !selectedCollectionId
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-900"
                            }`}
                        aria-pressed={activeView === 'my-projects' && !selectedCollectionId}
                        aria-label="View my projects"
                    >
                        <User className="w-4 h-4" />
                        My Projects
                    </button>

                    <div className="border-t border-zinc-400 dark:border-zinc-800 my-2" />

                    <Reorder.Group
                        axis="y"
                        values={reorderedCollections}
                        onReorder={handleReorder}
                        className="space-y-1"
                    >
                        {reorderedCollections.map(collection => (
                            <Reorder.Item
                                key={collection.id}
                                value={collection}
                                className="reorder-item"
                            >
                                {editingId === collection.id ? (
                                    <div className="px-3 py-2 bg-white dark:bg-zinc-800 border border-blue-500 rounded-xl">
                                        <input
                                            ref={editInputRef}
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEdit();
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                            className="w-full px-2 py-1 text-sm bg-transparent border border-zinc-200 dark:border-zinc-700 rounded mb-2 outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Collection name"
                                        />
                                        <textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    saveEdit();
                                                }
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                            className="w-full px-2 py-1 text-xs bg-transparent border border-zinc-200 dark:border-zinc-700 rounded mb-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                            placeholder="Description (optional)"
                                            rows={2}
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={saveEdit}
                                                className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                                aria-label="Save"
                                            >
                                                <Save className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="p-1 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 rounded transition-colors"
                                                aria-label="Cancel"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => onSelectCollection(collection.id, collection.name)}
                                        className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${selectedCollectionId === collection.id
                                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-900"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <GripVertical className="w-4 h-4 text-zinc-400 cursor-grab active:cursor-grabbing" />
                                            {collection.is_public ? (
                                                <Globe className="w-4 h-4 opacity-50 flex-shrink-0" />
                                            ) : (
                                                <Lock className="w-4 h-4 opacity-50 flex-shrink-0" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate">{collection.name}</div>
                                                {(collection as any).description && (
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                        {(collection as any).description}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs opacity-50 flex-shrink-0">({collection.project_count})</span>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEdit(collection);
                                                }}
                                                className="p-1 text-slate-400 hover:text-blue-500 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                aria-label={`Edit collection ${collection.name}`}
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteCollection(collection.id, e)}
                                                className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                                aria-label={`Delete collection ${collection.name}`}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>

                    {isCreating && (
                        <div className="px-3 py-2">
                            <input
                                autoFocus
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateCollection();
                                    if (e.key === 'Escape') setIsCreating(false);
                                }}
                                onBlur={() => {
                                    if (!newCollectionName) setIsCreating(false);
                                }}
                                placeholder="Collection name..."
                                className="w-full px-2 py-1 text-sm bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
