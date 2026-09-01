"use client";

import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export function EmptyState({
    title,
    description,
    actionLabel,
    onAction,
    icon: Icon,
    className
}: {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    icon?: any;
    className?: string;
}) {
    return (
        <div className={cn("text-center py-10 px-6 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50", className)}>
            {Icon && (
                <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 text-zinc-500 dark:text-zinc-400">
                    <Icon className="w-6 h-6" />
                </div>
            )}
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">{description}</p>
            {onAction && actionLabel && (
                <button
                    onClick={onAction}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
