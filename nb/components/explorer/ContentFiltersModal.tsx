"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { X } from "lucide-react";

interface ContentFiltersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void; // Callback to refresh posts
}

export default function ContentFiltersModal({ isOpen, onClose, onUpdate }: ContentFiltersModalProps) {
    const supabase = createSupabaseBrowserClient();
    const [mutedWords, setMutedWords] = useState<string[]>([]);
    const [newWord, setNewWord] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadMutedWords();
        }
    }, [isOpen]);

    async function loadMutedWords() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('muted_words')
            .select('word')
            .eq('user_id', user.id);

        if (data) {
            setMutedWords(data.map((item: any) => item.word));
        }
        setLoading(false);
    }

    async function handleAdd() {
        if (!newWord.trim()) return;
        const word = newWord.trim().toLowerCase();
        if (mutedWords.includes(word)) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('muted_words')
            .insert({ user_id: user.id, word });

        if (!error) {
            setMutedWords([...mutedWords, word]);
            setNewWord("");
            onUpdate();
        }
    }

    async function handleRemove(word: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('muted_words')
            .delete()
            .eq('user_id', user.id)
            .eq('word', word);

        if (!error) {
            setMutedWords(mutedWords.filter(w => w !== word));
            onUpdate();
        }
    }

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="content-filters-modal w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Content Filters</h2>
                    <button onClick={onClose} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                        Posts containing these words will be hidden from your feed.
                    </p>

                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            value={newWord}
                            onChange={(e) => setNewWord(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            placeholder="Add a word or phrase..."
                            className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newWord.trim()}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        >
                            Add
                        </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="text-center py-4 text-zinc-500 dark:text-zinc-400">Loading...</div>
                        ) : mutedWords.length === 0 ? (
                            <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                                No muted words yet.
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {mutedWords.map(word => (
                                    <div key={word} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm text-zinc-900 dark:text-zinc-100">
                                        <span>{word}</span>
                                        <button onClick={() => handleRemove(word)} className="text-zinc-400 dark:text-zinc-500 hover:text-red-500">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
