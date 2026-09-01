"use client";

import { LayoutGrid, List as ListIcon } from "lucide-react";
import FilterPresetManager from "./FilterPresetManager";
import TechStackDropdown from "./TechStackDropdown";
import { PROJECT_STATUS, PROJECT_TYPE, SORT_OPTIONS, VIEW_MODES, ViewMode } from "@/constants/hub";
import { HubFilters as HubFiltersType, User } from "@/types/hub";

interface HubFiltersProps {
  filters: HubFiltersType;
  viewMode: ViewMode;
  selectedTech: string[];
  currentUser: User | null;
  onTechToggle: (techId: string) => void;
  onStatusChange: (status: string) => void;
  onTypeChange: (type: string) => void;
  onSortChange: (sort: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onApplyPreset: (filters: HubFiltersType) => void;
}

export default function HubFilters({
  filters,
  viewMode,
  selectedTech,
  currentUser,
  onTechToggle,
  onStatusChange,
  onTypeChange,
  onSortChange,
  onViewModeChange,
  onApplyPreset,
}: HubFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <FilterPresetManager
          currentFilters={{
            status: filters.status,
            type: filters.type,
            tech: filters.tech,
            sort: filters.sort,
          }}
          onApplyPreset={onApplyPreset}
          currentUser={currentUser}
        />

        <TechStackDropdown selectedTech={selectedTech} onToggle={onTechToggle} />

        <select
          value={filters.status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Filter by status"
        >
          <option value={PROJECT_STATUS.ALL}>All Status</option>
          <option value={PROJECT_STATUS.IDEA}>{PROJECT_STATUS.IDEA}</option>
          <option value={PROJECT_STATUS.IN_PROGRESS}>{PROJECT_STATUS.IN_PROGRESS}</option>
          <option value={PROJECT_STATUS.LAUNCHED}>{PROJECT_STATUS.LAUNCHED}</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => onTypeChange(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Filter by type"
        >
          <option value={PROJECT_TYPE.ALL}>All Types</option>
          <option value={PROJECT_TYPE.WEB_APP}>{PROJECT_TYPE.WEB_APP}</option>
          <option value={PROJECT_TYPE.MOBILE_APP}>{PROJECT_TYPE.MOBILE_APP}</option>
          <option value={PROJECT_TYPE.LIBRARY}>{PROJECT_TYPE.LIBRARY}</option>
          <option value={PROJECT_TYPE.OTHER}>{PROJECT_TYPE.OTHER}</option>
        </select>

        <select
          value={filters.sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Sort by"
        >
          <option value={SORT_OPTIONS.NEWEST}>Newest</option>
          <option value={SORT_OPTIONS.POPULAR}>Popular</option>
          <option value={SORT_OPTIONS.ALPHABETICAL}>Alphabetical</option>
          <option value={SORT_OPTIONS.RECENT_ACTIVITY}>Recent Activity</option>
          <option value={SORT_OPTIONS.MOST_CONTRIBUTORS}>Most Contributors</option>
          <option value={SORT_OPTIONS.MOST_FOLLOWERS}>Most Followers</option>
        </select>

        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700" role="group" aria-label="View mode">
          <button
            onClick={() => onViewModeChange(VIEW_MODES.GRID)}
            className={`p-1.5 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              viewMode === VIEW_MODES.GRID
                ? "bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300"
            }`}
            title="Grid View"
            aria-label="Grid View"
            aria-pressed={viewMode === VIEW_MODES.GRID}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange(VIEW_MODES.LIST)}
            className={`p-1.5 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              viewMode === VIEW_MODES.LIST
                ? "bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300"
            }`}
            title="List View"
            aria-label="List View"
            aria-pressed={viewMode === VIEW_MODES.LIST}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
