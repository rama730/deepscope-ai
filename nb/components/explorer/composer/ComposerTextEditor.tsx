"use client";

import React, { useRef, useEffect } from "react";
import { ComposerAction, PostType } from "@/hooks/useComposer";

interface ComposerTextEditorProps {
    content: string;
    postType: PostType;
    placeholder: string;
    dispatch: React.Dispatch<ComposerAction>;
}

export const ComposerTextEditor = React.memo(function ComposerTextEditor({
    content,
    placeholder,
    dispatch
}: ComposerTextEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    return (
        <div className="relative w-full min-h-[80px] mb-4 group">
            {/* Highlight Layer (Mirror) - Determines Height & Visuals */}
            <div
                className="w-full min-h-[80px] p-0 text-lg whitespace-pre-wrap break-words bg-transparent text-zinc-900 dark:text-zinc-100 border-none font-sans"
                aria-hidden="true"
            >
                {content.split(/((?:https?:\/\/[^\s]+)|(?:#|@)\w+)/g).map((part, i) => {
                    if (part.match(/^https?:\/\//)) {
                        return <span key={i} className="text-blue-500">{part}</span>;
                    }
                    if (part.startsWith('#') || part.startsWith('@')) {
                        return <span key={i} className="text-blue-500">{part}</span>;
                    }
                    return <span key={i}>{part}</span>;
                })}
                {/* Trailing break to ensure height matches when cursor is on new line */}
                {content.endsWith('\n') && <br />}
            </div>

            {/* Interaction Textarea - Absolute Overlay */}
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => dispatch({ type: 'SET_CONTENT', payload: e.target.value })}
                placeholder={placeholder}
                className={`absolute inset-0 w-full h-full bg-transparent border-none focus:ring-0 focus:outline-none focus:border-none p-0 text-lg font-sans resize-none overflow-hidden caret-zinc-900 dark:caret-white ${content ? 'text-transparent placeholder:text-transparent' : 'text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400'
                    }`}
                autoFocus
                spellCheck={false}
            />
        </div>
    );
});
