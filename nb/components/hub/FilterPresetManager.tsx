"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui-custom/Toast";
import { Bookmark, Plus, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FilterPreset, User } from "@/types/hub";

interface FilterPresetManagerProps {
    currentFilters: {
        status: string;
        type: string;
        tech: string[];
        sort: string;
    };
    onApplyPreset: (filters: { status: string; type: string; tech: string[]; sort: string }) => void;
    currentUser: User | null;
}

export default function FilterPresetManager({ currentFilters, onApplyPreset, currentUser }: FilterPresetManagerProps) {
    const supabase = createSupabaseBrowserClient();
    const { showToast } = useToast();
    const [presets, setPresets] = useState<FilterPreset[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [newPresetName, setNewPresetName] = useState("");
    const [loading, setLoading] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

    useEffect(() => {
        if (currentUser) {
            loadPresets();
        }
    }, [currentUser]);

    async function loadPresets() {
        // Table 'filter_presets' does not exist yet. functionality disabled.
        // const { data } = await supabase
        //     .from('filter_presets')
        //     .select('*')
        //     .eq('user_id', currentUser?.id)
        //     .order('created_at', { ascending: false });

        // if (data) setPresets(data);
        setPresets([]);
    }

    const savePreset = useCallback(async () => {
        if (!newPresetName.trim() || !currentUser) return;

        // Validate input
        const trimmedName = newPresetName.trim();
        if (trimmedName.length < 1 || trimmedName.length > 100) {
            showToast("Preset name must be between 1 and 100 characters", "error");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('filter_presets')
                .insert({
                    user_id: currentUser.id,
                    name: trimmedName,
                    filters: currentFilters
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setPresets([data, ...presets]);
                setShowSaveModal(false);
                setNewPresetName("");
                showToast("Filter preset saved", "success");
            }
        } catch (err) {
            console.error("Error saving preset:", err);
            showToast("Failed to save preset", "error");
        } finally {
            setLoading(false);
        }
    }, [newPresetName, currentUser, currentFilters, supabase, showToast, presets]);

    const handleDeletePreset = useCallback(async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const { error } = await supabase.from('filter_presets').delete().eq('id', id);
            if (error) throw error;
            setPresets(presets.filter(p => p.id !== id));
            showToast("Preset deleted", "success");
        } catch (err) {
            console.error("Error deleting preset:", err);
            showToast("Failed to delete preset", "error");
        }
    }, [supabase, presets, showToast]);

    useEffect(() => {
        if (!isOpen || !buttonRef.current) return;

        const updatePosition = () => {
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + 8,
                    right: window.innerWidth - rect.right
                });
            }
        };
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
                <Bookmark className="w-4 h-4 text-slate-500" />
                <span>Saved Filters</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && typeof window !== 'undefined' && dropdownPosition.top > 0 && createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="saved-filters-dropdown fixed w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-[100] overflow-hidden"
                        style={{
                            top: `${dropdownPosition.top}px`,
                            right: `${dropdownPosition.right}px`
                        }}
                    >
                        <div className="p-2 border-b border-slate-100 dark:border-zinc-800">
                            <button
                                onClick={() => { setIsOpen(false); setShowSaveModal(true); }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Save Current Filters
                            </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto p-2">
                            {presets.length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-500">
                                    No saved presets yet
                                </div>
                            ) : (
                                presets.map(preset => (
                                    <div
                                        key={preset.id}
                                        onClick={() => { onApplyPreset(preset.filters); setIsOpen(false); }}
                                        className="group flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 cursor-pointer"
                                    >
                                        <span className="truncate">{preset.name}</span>
                                        <button
                                            onClick={(e) => handleDeletePreset(preset.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                                            aria-label={`Delete preset ${preset.name}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {/* Save Modal */}
            <AnimatePresence>
                {showSaveModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="save-filter-modal bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                        >
                            <h3 className="text-lg font-bold mb-4">Save Filter Preset</h3>
                            <input
                                autoFocus
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.target.value)}
                                placeholder="e.g. React Startups"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && savePreset()}
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:bg-zinc-900 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={savePreset}
                                    disabled={loading || !newPresetName.trim()}
                                    className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Preset'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
