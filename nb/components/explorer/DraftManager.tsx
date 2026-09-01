"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { FileText, Trash2, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Draft {
    id: string;
    content: string;
    last_saved_at: string;
}

interface DraftManagerProps {
    currentUser: any;
    onRestoreDraft: (content: string) => void;
}

export default function DraftManager({ currentUser, onRestoreDraft }: DraftManagerProps) {
    const supabase = createSupabaseBrowserClient();
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (currentUser) {
            loadDrafts();
        }
    }, [currentUser, isOpen]);

    async function loadDrafts() {
        const { data } = await supabase
            .from('post_drafts')
            .select('id, content, last_saved_at')
            .eq('user_id', currentUser.id)
            .order('last_saved_at', { ascending: false });

        if (data) setDrafts(data);
    }

    async function deleteDraft(id: string, e: React.MouseEvent) {
        e.stopPropagation();
        await supabase.from('post_drafts').delete().eq('id', id);
        setDrafts(drafts.filter(d => d.id !== id));
    }

    if (!currentUser) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="View Drafts"
            >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Drafts</span>
                {drafts.length > 0 && (
                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs px-1.5 py-0.5 rounded-full">
                        {drafts.length}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50">
                                <h3 className="font-semibold text-sm">Saved Drafts</h3>
                                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-zinc-400">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                {drafts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-sm">
                                        No drafts found
                                    </div>
                                ) : (
                                    drafts.map(draft => (
                                        <div
                                            key={draft.id}
                                            onClick={() => { onRestoreDraft(draft.content); setIsOpen(false); }}
                                            className="group p-3 border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <p className="text-sm text-slate-700 dark:text-zinc-300 line-clamp-2 flex-1">
                                                    {draft.content || "Empty draft"}
                                                </p>
                                                <button
                                                    onClick={(e) => deleteDraft(draft.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                                                <Clock className="w-3 h-3" />
                                                <span>{new Date(draft.last_saved_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
