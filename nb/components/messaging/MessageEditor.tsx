"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageEditorProps {
    initialContent: string;
    onSave: (newContent: string) => Promise<void>;
    onCancel: () => void;
    className?: string;
}

export function MessageEditor({ initialContent, onSave, onCancel, className }: MessageEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [saving, setSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Auto-focus and select all text
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, []);

    const handleSave = async () => {
        if (!content.trim() || content === initialContent) {
            onCancel();
            return;
        }

        setSaving(true);
        try {
            await onSave(content.trim());
        } catch (error) {
            console.error("Error saving message:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSave();
        } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
        }
    };

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] resize-none"
                disabled={saving}
            />
            <div className="flex items-center justify-end gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    disabled={saving}
                >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                </Button>
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !content.trim() || content === initialContent}
                >
                    <Check className="h-4 w-4 mr-1" />
                    {saving ? "Saving..." : "Save"}
                </Button>
            </div>
        </div>
    );
}
