"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FocusModeProps {
    isActive: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    placeholder?: string;
    className?: string;
}

export default function FocusModeWrapper({ isActive, onToggle, children, placeholder, className }: FocusModeProps) {
    // Lock body scroll when active
    useEffect(() => {
        if (isActive) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isActive]);

    return (
        <>
            {/* Trigger Button (if not active, usually positioned near the input) */}
            <div className={cn("relative group", className)}>
                {children}
                {!isActive && (
                    <button
                        onClick={onToggle}
                        type="button"
                        className="absolute top-2 right-2 p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Enter Focus Mode"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Focus Mode Overlay */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-6 sm:p-12"
                    >
                        <div className="w-full max-w-3xl h-full flex flex-col relative">
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                        Focus Mode
                                    </h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {placeholder || "Writing..."}
                                    </p>
                                </div>
                                <button
                                    onClick={onToggle}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-medium text-sm"
                                >
                                    <Minimize2 className="w-4 h-4" />
                                    Exit Focus
                                </button>
                            </div>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="flex-1 overflow-visible"
                            >
                                {/* We clone the children to inject larger styling if needed, or simply render them */}
                                <div className="focus-mode-content h-full">
                                    {children}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
