"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { X, Folder, Plus, Check } from "lucide-react";
import { motion } from "framer-motion";

interface AddToCollectionModalProps {
    projectIds: string[];
    onClose: () => void;
    currentUser: any;
}

export default function AddToCollectionModal({ projectIds, onClose, currentUser }: AddToCollectionModalProps) {
    const supabase = createSupabaseBrowserClient();
    const [collections, setCollections] = useState<any[]>([]);
    const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        // Load user's collections
        const { data: userCollections } = await supabase
            .from('collections')
            .select('id, name')
            .eq('owner_id', currentUser.id)
            .order('created_at', { ascending: false });

        // Load which collections these projects are already in
        // For bulk, we show "checked" if ALL selected projects are in the collection?
        // Or "indeterminate"? For simplicity, let's show checked if ALL are in.

        if (userCollections) setCollections(userCollections);

        if (projectIds.length === 1) {
            const { data: inCollections } = await supabase
                .from('collection_projects')
                .select('collection_id')
                .eq('project_id', projectIds[0]);

            if (inCollections) {
                setSelectedCollections(new Set(inCollections.map(c => c.collection_id)));
            }
        }
        setLoading(false);
    }

    async function toggleCollection(collectionId: string) {
        const isSelected = selectedCollections.has(collectionId);

        if (isSelected) {
            // Remove all selected projects from this collection
            await supabase
                .from('collection_projects')
                .delete()
                .eq('collection_id', collectionId)
                .in('project_id', projectIds);

            const next = new Set(selectedCollections);
            next.delete(collectionId);
            setSelectedCollections(next);
        } else {
            // Add all selected projects to this collection
            const updates = projectIds.map(pid => ({
                collection_id: collectionId,
                project_id: pid
            }));

            await supabase
                .from('collection_projects')
                .upsert(updates, { onConflict: 'collection_id,project_id' });

            const next = new Set(selectedCollections);
            next.add(collectionId);
            setSelectedCollections(next);
        }
    }

    async function createAndAdd() {
        if (!newCollectionName.trim()) return;

        const { data: newCollection } = await supabase
            .from('collections')
            .insert({
                owner_id: currentUser.id,
                name: newCollectionName
            })
            .select()
            .single();

        if (newCollection) {
            setCollections([newCollection, ...collections]);
            await toggleCollection(newCollection.id);
            setNewCollectionName("");
            setCreating(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800">
                    <h3 className="font-semibold text-lg">Add to Collection</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-2 max-h-80 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-slate-500">Loading...</div>
                    ) : (
                        <div className="space-y-1">
                            {collections.map(collection => (
                                <button
                                    key={collection.id}
                                    onClick={() => toggleCollection(collection.id)}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Folder className="w-5 h-5 text-slate-400" />
                                        <span className="font-medium text-sm">{collection.name}</span>
                                    </div>
                                    {selectedCollections.has(collection.id) && (
                                        <Check className="w-5 h-5 text-indigo-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {creating ? (
                        <div className="p-2">
                            <input
                                autoFocus
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
                                placeholder="Collection name..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setCreating(false)} className="px-3 py-1.5 text-xs font-medium text-slate-500">Cancel</button>
                                <button onClick={createAndAdd} className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg">Create</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setCreating(true)}
                            className="w-full flex items-center gap-3 p-3 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="font-medium text-sm">Create new collection</span>
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
