"use client";

import { X } from "lucide-react";
import { PROJECT_STATUS, PROJECT_TYPE, SORT_OPTIONS } from "@/constants/hub";
import { HubFilters } from "@/types/hub";

interface ActiveFiltersIndicatorProps {
  filters: HubFilters;
  onRemoveTech: (tech: string) => void;
  onClearStatus: () => void;
  onClearType: () => void;
  onClearSort: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

export default function ActiveFiltersIndicator({
  filters,
  onRemoveTech,
  onClearStatus,
  onClearType,
  onClearSort,
  onClearSearch,
  onClearAll,
}: ActiveFiltersIndicatorProps) {
  const activeFilters: Array<{
    id: string;
    label: string;
    value: string;
    onRemove: () => void;
  }> = [];

  if (filters.status && filters.status !== PROJECT_STATUS.ALL) {
    activeFilters.push({
      id: "status",
      label: "Status",
      value: filters.status,
      onRemove: onClearStatus,
    });
  }

  if (filters.type && filters.type !== PROJECT_TYPE.ALL) {
    activeFilters.push({
      id: "type",
      label: "Type",
      value: filters.type,
      onRemove: onClearType,
    });
  }

  if (filters.tech && filters.tech.length > 0) {
    filters.tech.forEach((tech) => {
      activeFilters.push({
        id: `tech-${tech}`,
        label: "Tech",
        value: tech,
        onRemove: () => onRemoveTech(tech),
      });
    });
  }

  if (filters.sort && filters.sort !== SORT_OPTIONS.NEWEST) {
    const sortLabels: Record<string, string> = {
      [SORT_OPTIONS.POPULAR]: "Popular",
      [SORT_OPTIONS.ALPHABETICAL]: "Alphabetical",
      [SORT_OPTIONS.RECENT_ACTIVITY]: "Recent Activity",
      [SORT_OPTIONS.MOST_CONTRIBUTORS]: "Most Contributors",
      [SORT_OPTIONS.MOST_FOLLOWERS]: "Most Followers",
    };
    activeFilters.push({
      id: "sort",
      label: "Sort",
      value: sortLabels[filters.sort] || filters.sort,
      onRemove: onClearSort,
    });
  }

  if (filters.search && filters.search.trim()) {
    activeFilters.push({
      id: "search",
      label: "Search",
      value: filters.search,
      onRemove: onClearSearch,
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Active filters:</span>
      {activeFilters.map((filter) => (
        <button
          key={filter.id}
          onClick={filter.onRemove}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Remove ${filter.label} filter: ${filter.value}`}
        >
          <span className="text-blue-600 dark:text-blue-400">{filter.label}:</span>
          <span>{filter.value}</span>
          <X className="w-3 h-3" />
        </button>
      ))}
      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
          aria-label="Clear all filters"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
