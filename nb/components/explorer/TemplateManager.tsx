"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Plus, Trash2 } from "lucide-react";

interface Template {
    id: string;
    name: string;
    content: string;
}

interface TemplateManagerProps {
    onSelect: (content: string) => void;
    onClose: () => void;
}

export default function TemplateManager({ onSelect, onClose }: TemplateManagerProps) {
    const supabase = createSupabaseBrowserClient();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [newTemplateContent, setNewTemplateContent] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    async function loadTemplates() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('post_templates')
            .select('id, name, content, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            setTemplates(data);
        }
        setLoading(false);
    }

    async function handleCreate() {
        if (!newTemplateName.trim() || !newTemplateContent.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('post_templates')
            .insert({
                user_id: user.id,
                name: newTemplateName.trim(),
                content: newTemplateContent.trim()
            })
            .select()
            .single();

        if (data && !error) {
            setTemplates([data, ...templates]);
            setNewTemplateName("");
            setNewTemplateContent("");
            setIsCreating(false);
        }
    }

    async function handleDelete(id: string) {
        const { error } = await supabase
            .from('post_templates')
            .delete()
            .eq('id', id);

        if (!error) {
            setTemplates(templates.filter(t => t.id !== id));
        }
    }

    return (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-200">
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
                <h3 className="text-sm font-semibold">Templates</h3>
                <button onClick={() => setIsCreating(!isCreating)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors">
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                {isCreating && (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-2">
                        <input
                            type="text"
                            placeholder="Template Name"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            className="w-full px-2 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        <textarea
                            placeholder="Content..."
                            value={newTemplateContent}
                            onChange={(e) => setNewTemplateContent(e.target.value)}
                            className="w-full px-2 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-blue-500 outline-none resize-none h-20"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsCreating(false)} className="text-xs px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded">Cancel</button>
                            <button onClick={handleCreate} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Save</button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-4 text-zinc-500 text-xs">Loading...</div>
                ) : templates.length === 0 && !isCreating ? (
                    <div className="text-center py-4 text-zinc-500 text-xs">No templates yet. Click + to create one.</div>
                ) : (
                    templates.map(template => (
                        <div key={template.id} className="group flex items-start justify-between p-2 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 rounded-lg border border-transparent hover:border-zinc-200 dark:border-zinc-700 dark:hover:border-zinc-700 transition-all">
                            <button
                                onClick={() => { onSelect(template.content); onClose(); }}
                                className="flex-1 text-left"
                            >
                                <div className="text-sm font-medium">{template.name}</div>
                                <div className="text-xs text-zinc-500 line-clamp-1">{template.content}</div>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
