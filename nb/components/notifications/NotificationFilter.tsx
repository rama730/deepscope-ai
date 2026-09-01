
"use client";

import { motion } from "framer-motion";

export type FilterType = "all" | "mentions" | "replies" | "system" | "projects" | "unread" | "read";

interface NotificationFilterProps {
    currentFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    compact?: boolean;
}

export default function NotificationFilter({ currentFilter, onFilterChange, compact = false }: NotificationFilterProps) {
    const filters: { id: FilterType; label: string }[] = [
        { id: "all", label: "All" },
        { id: "unread", label: "Unread" },
        { id: "mentions", label: "Mentions" },
        { id: "replies", label: "Replies" },
        { id: "projects", label: "Projects" },
        { id: "system", label: "System" },
    ];

    const displayedFilters = compact ? filters.slice(0, 4) : filters;

    return (
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl overflow-x-auto no-scrollbar">
            {displayedFilters.map((filter) => (
                <button
                    key={filter.id}
                    onClick={() => onFilterChange(filter.id)}
                    className={`relative px-4 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${currentFilter === filter.id
                            ? "text-zinc-900 dark:text-white"
                            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300"
                        }`}
                    aria-label={`Filter by ${filter.label}`}
                    aria-pressed={currentFilter === filter.id}
                >
                    {currentFilter === filter.id && (
                        <motion.div
                            layoutId="activeFilter"
                            className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-sm rounded-lg"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className="relative z-10">{filter.label}</span>
                </button>
            ))}
        </div>
    );
}
