"use client";

import { useState, useRef, useEffect } from "react";
import { Filter, Check, Bookmark, LayoutGrid, List as ListIcon, Archive, Layers, Users, X, GripVertical } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

type ViewMode = "board" | "list";

type Sprint = { id: string; name: string; status?: string };

export default function TaskFilters(props: {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;

    isBulkMode: boolean;
    setIsBulkMode: (next: boolean) => void;
    selectedCount: number;

    sprints: Sprint[];
    sprintFilter: string;
    applySprintFilter: (value: string) => void;

    showArchived: boolean;
    toggleArchived: () => void;

    savedViews: Array<{ id: string; name: string; query: string }>;
    onSaveCurrentView: () => void;
    onApplyView: (query: string) => void;
    onDeleteView: (id: string) => void;

    searchQuery: string;
    onClearSearch: () => void;

    canReorder: boolean;
    isReorderMode: boolean;
    onToggleReorder: () => void | Promise<void>;
}) {
    const {
        viewMode,
        setViewMode,
        isBulkMode,
        setIsBulkMode,
        selectedCount,
        sprints,
        sprintFilter,
        applySprintFilter,
        showArchived,
        toggleArchived,
        savedViews,
        onSaveCurrentView,
        onApplyView,
        onDeleteView,
        searchQuery,
        onClearSearch,
        canReorder,
        isReorderMode,
        onToggleReorder,
    } = props;

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeViewsOpen, setActiveViewsOpen] = useState(false);

    const statuses = ["todo", "in_progress", "done"] as const;
    const priorities = ["urgent", "high", "medium", "low"] as const;

    const currentStatus = searchParams.get("status")?.split(",").filter(Boolean) || [];
    const currentPriority = searchParams.get("priority")?.split(",").filter(Boolean) || [];

    const activeCount =
        currentStatus.length +
        currentPriority.length +
        (searchQuery ? 1 : 0) +
        (showArchived ? 1 : 0) +
        (sprintFilter !== "all" ? 1 : 0) +
        (isBulkMode ? 1 : 0);

    const hasAnythingActive = activeCount > 0;

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setActiveViewsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const updateFilter = (type: "status" | "priority", value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        const currentLower = type === "status" ? currentStatus : currentPriority;

        const newValues = currentLower.includes(value)
            ? currentLower.filter((v) => v !== value)
            : [...currentLower, value];

        if (newValues.length > 0) params.set(type, newValues.join(","));
        else params.delete(type);

        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

    const clearStatusPriority = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("status");
        params.delete("priority");
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

    const clearAll = async () => {
        // URL-backed filters
        const params = new URLSearchParams(searchParams.toString());
        params.delete("status");
        params.delete("priority");
        params.delete("search");
        params.delete("archived");
        params.delete("sprint");
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);

        // Local/UI state
        if (isBulkMode) setIsBulkMode(false);
        if (isReorderMode) await onToggleReorder();

        setIsOpen(false);
        setActiveViewsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen((v) => !v)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${hasAnythingActive
                        ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                        : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    }`}
            >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
                {hasAnythingActive && (
                    <span className="flex items-center justify-center min-w-5 h-5 px-1 text-xs bg-blue-600 text-white rounded-full">
                        {activeCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 8 }}
                        className="absolute top-full left-0 z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] bg-white dark:bg-zinc-950 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Task controls</div>
                            <div className="flex items-center gap-2">
                                {hasAnythingActive && (
                                    <button
                                        onClick={() => void clearAll()}
                                        className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                                    >
                                        Clear all
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setActiveViewsOpen(false);
                                    }}
                                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Search summary (driven by Global Search) */}
                            {searchQuery && (
                                <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="text-[11px] uppercase tracking-wider text-zinc-500">Search</div>
                                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate" title={searchQuery}>
                                            {searchQuery}
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClearSearch}
                                        className="shrink-0 px-2 py-1 rounded-md text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}

                            {/* View mode */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <LayoutGrid className="w-4 h-4 text-zinc-400" />
                                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">View</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setViewMode("board")}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${viewMode === "board"
                                                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                        Board
                                    </button>
                                    <button
                                        onClick={() => setViewMode("list")}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${viewMode === "list"
                                                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        <ListIcon className="w-4 h-4" />
                                        List
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-zinc-100 dark:border-zinc-800" />

                            {/* Scope */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Layers className="w-4 h-4 text-zinc-400" />
                                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Scope</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <button
                                        onClick={() => applySprintFilter("all")}
                                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${sprintFilter === "all"
                                                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        All tasks
                                    </button>
                                    <button
                                        onClick={() => applySprintFilter("backlog")}
                                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${sprintFilter === "backlog"
                                                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        Backlog
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={sprintFilter}
                                        onChange={(e) => applySprintFilter(e.target.value)}
                                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm"
                                        title="Filter by sprint"
                                    >
                                        <option value="all">All tasks</option>
                                        <option value="backlog">Backlog</option>
                                        {sprints.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={toggleArchived}
                                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showArchived
                                                ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                            }`}
                                        title="Show archived tasks"
                                    >
                                        <Archive className="w-4 h-4" />
                                        {showArchived ? "Archived" : "Hide"}
                                    </button>
                                </div>

                                {canReorder && (
                                    <button
                                        onClick={() => void onToggleReorder()}
                                        className={`mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${isReorderMode
                                                ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        <GripVertical className="w-4 h-4" />
                                        {isReorderMode ? "Close reorder" : "Reorder backlog"}
                                    </button>
                                )}
                            </div>

                            <div className="border-t border-zinc-100 dark:border-zinc-800" />

                            {/* Bulk selection */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="w-4 h-4 text-zinc-400" />
                                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bulk select</h4>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => setIsBulkMode(!isBulkMode)}
                                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${isBulkMode
                                                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        {isBulkMode ? "Enabled" : "Enable"}
                                    </button>
                                    <div className="text-sm text-zinc-500">
                                        {isBulkMode ? (
                                            <span>
                                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedCount}</span> selected
                                            </span>
                                        ) : (
                                            <span className="text-xs">Select multiple tasks</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-zinc-100 dark:border-zinc-800" />

                            {/* Saved views */}
                            <div>
                                <button
                                    onClick={() => setActiveViewsOpen((v) => !v)}
                                    className="w-full flex items-center justify-between gap-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <Bookmark className="w-4 h-4 text-zinc-400" />
                                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Saved views</h4>
                                    </div>
                                    <span className="text-xs text-zinc-500">{savedViews.length}</span>
                                </button>

                                {activeViewsOpen && (
                                    <div className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                        <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Views</div>
                                            <button
                                                onClick={onSaveCurrentView}
                                                className="text-xs font-semibold px-2 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                                            >
                                                Save current
                                            </button>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {savedViews.length === 0 ? (
                                                <div className="p-3 text-sm text-zinc-500">No saved views yet.</div>
                                            ) : (
                                                savedViews.map((v) => (
                                                    <div
                                                        key={v.id}
                                                        className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                onApplyView(v.query);
                                                                setIsOpen(false);
                                                                setActiveViewsOpen(false);
                                                            }}
                                                            className="flex-1 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate"
                                                            title={v.name}
                                                        >
                                                            {v.name}
                                                        </button>
                                                        <button
                                                            onClick={() => onDeleteView(v.id)}
                                                            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-zinc-100 dark:border-zinc-800" />

                            {/* Status */}
                            <div>
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Status</h4>
                                <div className="space-y-1">
                                    {statuses.map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => updateFilter("status", status)}
                                            className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                                        >
                                            <span className="text-sm text-zinc-700 dark:text-zinc-200 capitalize">
                                                {status.replace("_", " ")}
                                            </span>
                                            {currentStatus.includes(status) && <Check className="w-4 h-4 text-blue-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Priority */}
                            <div>
                                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Priority</h4>
                                <div className="space-y-1">
                                    {priorities.map((priority) => (
                                        <button
                                            key={priority}
                                            onClick={() => updateFilter("priority", priority)}
                                            className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                                        >
                                            <span className="text-sm text-zinc-700 dark:text-zinc-200 capitalize">{priority}</span>
                                            {currentPriority.includes(priority) && <Check className="w-4 h-4 text-blue-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {(currentStatus.length > 0 || currentPriority.length > 0) && (
                                <button
                                    onClick={clearStatusPriority}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    Clear status/priority
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
