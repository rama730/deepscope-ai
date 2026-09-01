"use client";

import { ProjectStatus, ProjectType, SortOption, FilterView, FILTER_VIEWS, VIEW_MODES } from "@/constants/hub";
import { Plus, LayoutGrid, List, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import UnifiedFilterMenu from "./UnifiedFilterMenu";

interface HubHeaderProps {
  filterView: FilterView;
  selectedCollectionName: string | null;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onCreateProject: () => void;
  onPreloadModal: () => void;
  // Filters
  filters: {
    status: ProjectStatus;
    type: ProjectType;
    tech: string[];
    sort: SortOption;
  };
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onApplyFilters: (newFilters: {
    status: ProjectStatus;
    type: ProjectType;
    sort: SortOption;
    tech: string[]
  }) => void;
}

export default function HubHeader({
  filterView,
  selectedCollectionName,
  selectionMode,
  onToggleSelectionMode,
  onCreateProject,
  onPreloadModal,
  filters,
  viewMode,
  onViewModeChange,
  onApplyFilters,
}: HubHeaderProps) {

  // Title logic
  const getTitle = () => {
    if (selectedCollectionName) return selectedCollectionName;
    switch (filterView) {
      case FILTER_VIEWS.MY_PROJECTS: return "My Projects";
      case FILTER_VIEWS.TRENDING: return "Trending Projects";
      case FILTER_VIEWS.RECOMMENDATIONS: return "Recommended For You";
      default: return "All Projects";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Row: Title & Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
          {getTitle()}
        </h1>

        <div className="flex items-center gap-2">
          {/* Unified Filter Button */}
          <UnifiedFilterMenu
            filters={filters}
            onApply={onApplyFilters}
          />

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

          {/* View Toggle */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => onViewModeChange(VIEW_MODES.GRID)}
              aria-label="Grid View"
              aria-pressed={viewMode === VIEW_MODES.GRID}
              className={`p-1.5 rounded-md transition-all ${viewMode === VIEW_MODES.GRID
                ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange(VIEW_MODES.LIST)}
              aria-label="List View"
              aria-pressed={viewMode === VIEW_MODES.LIST}
              className={`p-1.5 rounded-md transition-all ${viewMode === VIEW_MODES.LIST
                ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              aria-pressed={selectionMode}
              aria-label="Select Projects"
              onClick={onToggleSelectionMode}
              className={`p-2 rounded-full transition-colors ${selectionMode ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              title="Select Projects"
            >
              <CheckSquare className="w-5 h-5" />
            </button>
          </div>

          <Button
            onClick={onCreateProject}
            onMouseEnter={onPreloadModal}
            className="hidden sm:flex ml-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
          <Button
            onClick={onCreateProject}
            onMouseEnter={onPreloadModal}
            size="icon"
            aria-label="Create project"
            className="sm:hidden ml-2 h-10 w-10"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
