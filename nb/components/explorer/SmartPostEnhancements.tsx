"use client";

import { useState, useEffect } from "react";
import { Sparkles, BrainCircuit, Lightbulb, HelpCircle, Code, Newspaper, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SmartAnalysisProps {
    text: string;

    visible?: boolean;
}

interface AnalysisData {
    tags: string[];
    sentiment: "positive" | "neutral" | "negative" | "debate";
    summary?: string;
    category?: "showcase" | "question" | "tutorial" | "discussion" | "coding";
    relevance?: string;
}

export function SmartPostTags({ text, visible = true }: SmartAnalysisProps) {
    const [data, setData] = useState<AnalysisData | null>(null);
    const [showSummary, setShowSummary] = useState(false);

    useEffect(() => {
        // Only analyze if significant text length or specific request
        // For optimization, we could wrap this in an intersection observer or only trigger on hover
        // For now, we'll trigger on mount for demo
        if (!visible || !text || text.length < 20) return;

        let isMounted = true;

        async function analyze() {
            try {
                const res = await fetch("/api/ai/analyze", {
                    method: "POST",
                    body: JSON.stringify({ text }),
                    headers: { "Content-Type": "application/json" }
                });

                if (!res.ok) return;

                // Safe parsing
                try {
                    const json = await res.json();
                    if (isMounted && json) {
                        setData(json);
                    }
                } catch {
                    // Silently fail if AI analysis response is invalid/HTML
                    return;
                }
            } catch (e) {
                console.error("Analysis failed", e);
            }
        }

        analyze();
        return () => { isMounted = false; };
    }, [text, visible]);

    if (!data) return null;

    // Helper to get icon
    const getCategoryIcon = () => {
        switch (data.category) {
            case "question": return <HelpCircle className="w-3 h-3" />;
            case "coding": return <Code className="w-3 h-3" />;
            case "showcase": return <Lightbulb className="w-3 h-3" />;
            case "tutorial": return <Newspaper className="w-3 h-3" />;
            default: return <Sparkles className="w-3 h-3" />;
        }
    };

    const getTags = () => {
        const displayTags = [...data.tags];
        if (data.category && !displayTags.includes(data.category)) {
            // displayTags.push(data.category.charAt(0).toUpperCase() + data.category.slice(1));
        }
        return displayTags;
    };

    return (
        <div className="flex flex-col gap-2 mt-2" onClick={e => e.stopPropagation()}>
            <div className="flex flex-wrap items-center gap-2">
                {/* AI Badge */}
                {data.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/30">
                        <BrainCircuit className="w-3 h-3" />
                        <span>AI Analysis</span>
                    </div>
                )}

                {/* Category/Tags */}
                {getTags().map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        {i === 0 && getCategoryIcon()}
                        {tag}
                    </span>
                ))}

                {/* Summary Toggle */}
                {data.summary && (
                    <button
                        onClick={() => setShowSummary(!showSummary)}
                        className="flex items-center gap-1 text-[11px] font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 hover:underline transition-colors ml-auto sm:ml-0"
                    >
                        {showSummary ? "Hide TL;DR" : "Smart TL;DR"}
                        {showSummary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                )}
            </div>

            {/* Expandable Summary */}
            <AnimatePresence>
                {showSummary && data.summary && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-1">TL;DR:</span>
                            {data.summary}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function ContextPill({ text }: { text: string }) {
    // Only fetch context relative to the user - this is usually prop driven, but we can simulate self-fetch or random
    // For now this component just displays the prop data
    if (!text) return null;

    return (
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 mb-2">
            <Sparkles className="w-2.5 h-2.5" />
            {text}
        </div>
    );
}
