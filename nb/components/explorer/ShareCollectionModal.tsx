"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { X, Copy, Check, Globe, Lock, Users } from "lucide-react";

interface ShareCollectionModalProps {
    collection: any;
    onClose: () => void;
}

export default function ShareCollectionModal({ collection, onClose }: ShareCollectionModalProps) {
    const [visibility, setVisibility] = useState(collection.visibility || 'private');
    const [copied, setCopied] = useState(false);
    const supabase = createSupabaseBrowserClient();

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/collections/${collection.share_token || collection.id}` : '';

    async function handleVisibilityChange(newVisibility: string) {
        setVisibility(newVisibility);
        await supabase
            .from('collections')
            .update({ visibility: newVisibility })
            .eq('id', collection.id);
    }

    function copyLink() {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Share Collection</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Visibility</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleVisibilityChange('private')}
                                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${visibility === 'private'
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                                    }`}
                            >
                                <Lock className="w-5 h-5 mb-2" />
                                <span className="text-xs font-medium">Private</span>
                            </button>
                            <button
                                onClick={() => handleVisibilityChange('shared')}
                                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${visibility === 'shared'
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                                    }`}
                            >
                                <Users className="w-5 h-5 mb-2" />
                                <span className="text-xs font-medium">Shared</span>
                            </button>
                            <button
                                onClick={() => handleVisibilityChange('public')}
                                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${visibility === 'public'
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                                    }`}
                            >
                                <Globe className="w-5 h-5 mb-2" />
                                <span className="text-xs font-medium">Public</span>
                            </button>
                        </div>
                    </div>

                    {visibility !== 'private' && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Share Link</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-400"
                                />
                                <button
                                    onClick={copyLink}
                                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                                >
                                    {copied ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
