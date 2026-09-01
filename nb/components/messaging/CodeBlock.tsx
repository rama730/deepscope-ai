"use client";

import { useTheme } from "next-themes";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Dynamically import SyntaxHighlighter to save bundle size
const SyntaxHighlighter = dynamic(async () => {
    const { Prism } = await import('react-syntax-highlighter');
    return Prism;
}, {
    loading: () => <div className="p-4 text-xs font-mono bg-zinc-100 dark:bg-zinc-800 animate-pulse">Loading code viewer...</div>,
    ssr: false
});

// We still need themes. Importing them statically is usually small enough (json/objects)
// compared to the parser engine. 
// However, to be fully safe we can import them inside the component if we wanted, 
// but passing them as props to the dynamic component is tricky without a wrapper.
// For now, static import of themes is acceptable as they are just style objects.
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
    code: string;
    language?: string;
    className?: string;
}

export function CodeBlock({ code, language = "text", className }: CodeBlockProps) {
    const { theme } = useTheme();
    const [copied, setCopied] = useState(false);
    const isDark = theme === "dark";

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={cn("relative group", className)}>
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 rounded-t-lg">
                <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 uppercase">
                    {language}
                </span>
                <button
                    onClick={handleCopy}
                    className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Copy code"
                >
                    {copied ? (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                        <Copy className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                    )}
                </button>
            </div>
            <SyntaxHighlighter
                language={language}
                style={isDark ? oneDark : oneLight}
                customStyle={{
                    margin: 0,
                    borderRadius: "0 0 0.5rem 0.5rem",
                    fontSize: "0.875rem",
                }}
                showLineNumbers={code.split('\n').length > 5}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
}
