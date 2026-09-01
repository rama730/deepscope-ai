"use client";

import { motion } from "framer-motion";

interface PollCreatorProps {
    question: string;
    setQuestion: (q: string) => void;
    options: string[];
    setOptions: (opts: string[] | ((prev: string[]) => string[])) => void;
}

export default function PollCreator({ question, setQuestion, options, setOptions }: PollCreatorProps) {
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 space-y-3 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800"
        >
            <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 px-0 py-2 text-sm font-medium focus:border-blue-500 focus:ring-0"
            />
            {options.map((opt, i) => (
                <input
                    key={i}
                    value={opt}
                    onChange={(e) => setOptions(prev => prev.map((o, idx) => idx === i ? e.target.value : o))}
                    placeholder={`Option ${i + 1}`}
                    className="w-full bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
            ))}
            <button
                onClick={() => setOptions(prev => [...prev, ""])}
                className="text-xs text-blue-600 font-medium hover:underline"
            >
                + Add Option
            </button>
        </motion.div>
    );
}
