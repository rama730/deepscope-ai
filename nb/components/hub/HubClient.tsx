"use client";

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";

import dynamicImport from "next/dynamic";
import { motion } from "framer-motion";
import { Search, Sparkles, Filter } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui-custom/Toast";
import { VirtuosoGrid } from 'react-virtuoso';
import { useHubProjectsQuery } from "@/hooks/useHubProjectsQuery";
import { useHubTrendingQuery } from "@/hooks/useHubTrendingQuery";
import { useUserBookmarks, useUserFollowedProjects } from "@/hooks/useUserInteractions";
// Restored imports
import { useDebounce } from "@/hooks/useDebounce";
import { useHubPreferences } from "@/hooks/useHubPreferences";
import { useCollectionProjects } from "@/hooks/useCollectionProjects";
import { useUserProjectIds } from "@/hooks/useUserProjectIds";
import { useAuth } from "@/hooks/useAuth";
import { useHubUrlFilters } from "@/hooks/useHubUrlFilters";
import { useFilterPersistence } from "@/hooks/useFilterPersistence";
import { Project, User } from "@/types/hub";

// Re-export Project type for backward compatibility
export type { Project };
import { FILTER_VIEWS, PROJECT_STATUS, PROJECT_TYPE, SORT_OPTIONS, VIEW_MODES, FilterView, ViewMode, SortOption, ProjectStatus, ProjectType } from "@/constants/hub";
import ProjectCard from "@/components/projects/ProjectCard";
import ProjectCardSkeleton from "@/components/projects/ProjectCardSkeleton";
import ProjectQuickView from "@/components/projects/ProjectQuickView";
import CollectionsSidebar from "@/components/hub/CollectionsSidebar";
import NotificationSettingsModal from "@/components/hub/NotificationSettingsModal";
import HubHeader from "@/components/hub/HubHeader";
import BulkActionBar from "@/components/hub/BulkActionBar";
// ActiveFiltersIndicator, QuickFilterChips, TechStackBadges removed

import MobileSidebarDrawer from "@/components/hub/MobileSidebarDrawer";

import { HubErrorBoundary } from "@/components/hub/HubErrorBoundary";

// Dynamic modals
const CreateProjectWizard = dynamicImport(() => import("@/components/projects/create-wizard/CreateProjectWizard"), { ssr: false });
const ProjectComparisonModal = dynamicImport(() => import("@/components/hub/ProjectComparisonModal"), { ssr: false });
const AddToCollectionModal = dynamicImport(() => import("@/components/hub/AddToCollectionModal"), { ssr: false });

interface HubClientProps {
  initialUser: User | null;
  totalCount?: number;
  initialPage?: number;
  initialLimit?: number;
}

const HubClient = memo(function HubClient({ initialUser }: HubClientProps) {
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();
  const { user } = useAuth();

  // Current user - prefer from auth hook, fallback to initial
  const currentUser = (user ? { ...user, ...initialUser } : initialUser) as User | null;

  // URL filters hook
  const { urlFilters, updateUrlFilters, clearFilters: clearUrlFilters, hasActiveFilters } = useHubUrlFilters();

  // State - initialize from URL or defaults
  const [filterView, setFilterView] = useState<FilterView>(urlFilters.view);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>(urlFilters.status);
  const [typeFilter, setTypeFilter] = useState<ProjectType>(urlFilters.type);
  const [sortBy, setSortBy] = useState<SortOption>(urlFilters.sort);
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODES.GRID);
  const [selectedTech, setSelectedTech] = useState<string[]>(urlFilters.tech);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedCollectionName, setSelectedCollectionName] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showAddToCollectionModal, setShowAddToCollectionModal] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);

  const scrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setScrollContainer(node);
    }
  }, []);


  // Debounce filter changes (search is handled via URL directly)
  const debouncedStatusFilter = useDebounce(statusFilter, 300);
  const debouncedTypeFilter = useDebounce(typeFilter, 300);
  const debouncedSortBy = useDebounce(sortBy, 300);



  // Hooks - React Query
  const { data: trendingData } = useHubTrendingQuery();
  const trendingScores = trendingData || {};

  const { projectIds: userProjectIds } = useUserProjectIds(currentUser?.id ?? null); // Keeping for 'My Projects' specific logic if needed? 
  // Actually, 'My Projects' view typically filters by creator_id. 
  // If we want to support 'My Projects' via useHubProjectsQuery, we need a filter for it.
  // For now, let's assume 'My Projects' just filters by currentUser.id in query.

  // Interaction hooks (N+1 fix)
  const { data: myBookmarks } = useUserBookmarks(currentUser?.id);

  const { data: myFollowed } = useUserFollowedProjects(currentUser?.id);
  const { projectIds: collectionProjectIds } = useCollectionProjects(selectedCollectionId);
  const recommendations: Project[] = []; // Placeholder for now
  const recommendationsLoading = false;

  // Determine includedIds based on view
  const includedIds = useMemo(() => {
    if (filterView === FILTER_VIEWS.COLLECTION && selectedCollectionId) {
      return Array.from(collectionProjectIds);
    }
    if (filterView === FILTER_VIEWS.MY_PROJECTS && currentUser) {
      return Array.from(userProjectIds);
    }
    if (filterView === FILTER_VIEWS.TRENDING) {
      // Sort keys by score descending
      return Object.entries(trendingScores)
        .sort(([, scoreA], [, scoreB]) => (scoreB as number) - (scoreA as number))
        .map(([id]) => id);
    }
    if (filterView === FILTER_VIEWS.RECOMMENDATIONS) {
      // If recommendations provided as prop or hook... 
      // useHubRecommendations returns 'recommendations' (Project[]).
      // We need IDs.
      // Actually useHubRecommendations fetches objects.
      // We can map to IDs.
      // But wait, if useHubRecommendations fetches objects, we are double fetching if we pass IDs to useHubProjectsQuery?
      // Yes.
      // For Recommendations, maybe we just pass the objects as initialData or just render them directly?
      // But we want virtualization and consistent grid.
      // If we have full objects, passing them to 'includedIds' doesn't help useHubProjectsQuery unless we pre-seed cache?
      // Optimized approach: If View is Recommendations, stick to client-side list for now?
      // OR extract IDs and re-fetch via query (cleaner but wasteful).
      // OR use 'initialData' in useHubProjectsQuery?
      // Let's use ID extraction for consistency.
      return recommendations.map(p => p.id);
    }
    return undefined;
  }, [filterView, selectedCollectionId, collectionProjectIds, currentUser, userProjectIds, trendingScores, recommendations]);

  // Build filters object
  const currentFilters = useMemo(() => ({
    status: statusFilter,
    type: typeFilter,
    tech: selectedTech,
    sort: sortBy,
    search: urlFilters.q,
    includedIds: includedIds
  }), [statusFilter, typeFilter, selectedTech, sortBy, urlFilters.q, includedIds]);

  // Main Data Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error: projectsError
  } = useHubProjectsQuery({
    filters: currentFilters,
    view: filterView,
  });

  const allProjects = useMemo(() => {
    return data.pages.flatMap((p: any) => p.projects) || [];
  }, [data]);


  // Preferences hook
  const { preferences } = useHubPreferences(
    currentUser?.id ?? null,
    currentFilters,
    viewMode,
    sortBy
  );

  // Filter persistence to localStorage
  const { persistedState } = useFilterPersistence(
    {
      view: filterView,
      filters: currentFilters,
      viewMode,
    },
    true // Enabled
  );

  // Load filters from URL or persisted state on mount
  const hasInitializedFromUrl = useRef(false);
  useEffect(() => {
    if (!hasInitializedFromUrl.current) {
      // Check if URL has params - if yes, use URL; if no, check persisted state
      const hasUrlParams = !!(urlFilters.q ||
        urlFilters.view !== FILTER_VIEWS.ALL ||
        urlFilters.status !== PROJECT_STATUS.ALL ||
        urlFilters.type !== PROJECT_TYPE.ALL ||
        urlFilters.sort !== SORT_OPTIONS.NEWEST ||
        urlFilters.tech.length > 0);

      if (hasUrlParams) {
        // Use URL params
        setFilterView(urlFilters.view);
        setStatusFilter(urlFilters.status);
        setTypeFilter(urlFilters.type);
        setSortBy(urlFilters.sort);
        setSelectedTech(urlFilters.tech);
        if (urlFilters.view && urlFilters.view !== FILTER_VIEWS.ALL) {
          // URL might have view mode in persisted state, but we'll use viewMode default
        }
      } else if (persistedState) {
        // Use persisted state
        setFilterView(persistedState.view);
        setStatusFilter(persistedState.filters.status as ProjectStatus);
        setTypeFilter(persistedState.filters.type as ProjectType);
        setSortBy(persistedState.filters.sort as SortOption);
        setSelectedTech(persistedState.filters.tech);
        if (persistedState.viewMode) {
          setViewMode(persistedState.viewMode);
        }
      } else {
        // Use URL defaults
        setFilterView(urlFilters.view);
        setStatusFilter(urlFilters.status);
        setTypeFilter(urlFilters.type);
        setSortBy(urlFilters.sort);
        setSelectedTech(urlFilters.tech);
      }
      hasInitializedFromUrl.current = true;
    }
  }, [urlFilters, persistedState]);

  // Load preferences on mount (but respect URL params first)
  const hasLoadedPreferences = useRef(false);
  useEffect(() => {
    if (preferences && !hasLoadedPreferences.current && !hasInitializedFromUrl.current) {
      // Only apply preferences if no URL params are set
      if (!hasActiveFilters) {
        if (preferences.hub_view_mode) setViewMode(preferences.hub_view_mode);
        if (preferences.hub_sort_by) setSortBy(preferences.hub_sort_by as SortOption);
        if (preferences.hub_filters) {
          const filters = preferences.hub_filters;
          if (filters.status) setStatusFilter(filters.status as ProjectStatus);
          if (filters.type) setTypeFilter(filters.type as ProjectType);
          if (filters.tech) setSelectedTech(filters.tech);
        }
      }
      hasLoadedPreferences.current = true;
    }
  }, [preferences, hasActiveFilters]);

  // Track if we're updating from URL (to prevent loops)
  const isUpdatingFromUrl = useRef(false);

  // Sync all filters to URL (debounced) - search is handled directly via global search/URL
  useEffect(() => {
    if (!hasInitializedFromUrl.current || isUpdatingFromUrl.current) return;

    // Check if any filter differs from URL
    const needsUpdate =
      urlFilters.view !== filterView ||
      urlFilters.status !== debouncedStatusFilter ||
      urlFilters.type !== debouncedTypeFilter ||
      urlFilters.sort !== debouncedSortBy ||
      JSON.stringify(urlFilters.tech.sort()) !== JSON.stringify(selectedTech.sort());

    if (needsUpdate) {
      updateUrlFilters({
        view: filterView,
        q: urlFilters.q, // Keep existing search query from URL
        status: debouncedStatusFilter,
        type: debouncedTypeFilter,
        sort: debouncedSortBy,
        tech: selectedTech,
      });
    }
  }, [filterView, debouncedStatusFilter, debouncedTypeFilter, debouncedSortBy, selectedTech, updateUrlFilters, urlFilters]);

  // Sync URL changes back to state (only when URL actually changes from external source)
  useEffect(() => {
    if (!hasInitializedFromUrl.current) return;

    isUpdatingFromUrl.current = true;

    if (urlFilters.view !== filterView) setFilterView(urlFilters.view);
    if (urlFilters.status !== statusFilter) setStatusFilter(urlFilters.status);
    if (urlFilters.type !== typeFilter) setTypeFilter(urlFilters.type);
    if (urlFilters.sort !== sortBy) setSortBy(urlFilters.sort);
    const urlTechSorted = [...urlFilters.tech].sort();
    const currentTechSorted = [...selectedTech].sort();
    if (JSON.stringify(urlTechSorted) !== JSON.stringify(currentTechSorted)) {
      setSelectedTech(urlFilters.tech);
    }

    // Reset flag after state updates
    setTimeout(() => {
      isUpdatingFromUrl.current = false;
    }, 0);
  }, [urlFilters.view, urlFilters.status, urlFilters.type, urlFilters.sort, JSON.stringify(urlFilters.tech)]);

  // Sticky header
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainer) {
        setIsSticky(scrollContainer.scrollTop > 10);
      }
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
    }
    return () => scrollContainer?.removeEventListener('scroll', handleScroll);
  }, [scrollContainer]);

  // Preload modals
  const preloadModal = useCallback(() => {
    import("@/components/projects/create-wizard/CreateProjectWizard");
  }, []);

  // Handlers




  const handleClearFilters = useCallback(() => {
    setStatusFilter(PROJECT_STATUS.ALL);
    setTypeFilter(PROJECT_TYPE.ALL);
    setSortBy(SORT_OPTIONS.NEWEST);
    setSelectedTech([]);
    clearUrlFilters();
  }, [clearUrlFilters]);

  const toggleSelection = useCallback((projectId: string) => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const handleBulkBookmark = useCallback(async () => {
    if (!currentUser || selectedProjectIds.size === 0) return;

    try {
      const updates = Array.from(selectedProjectIds).map(id => ({
        user_id: currentUser.id,
        entity_id: id,
        entity_type: 'project'
      }));

      const { error } = await supabase
        .from('bookmarks')
        .upsert(updates, { onConflict: 'user_id,entity_id,entity_type' });

      if (error) throw error;

      showToast(`${selectedProjectIds.size} project(s) bookmarked`, "success");
      setSelectionMode(false);
      setSelectedProjectIds(new Set());
    } catch (error) {
      console.error("Error bookmarking projects:", error);
      showToast("Failed to bookmark projects", "error");
    }
  }, [currentUser, selectedProjectIds, supabase, showToast]);

  // Filter and sort projects
  // Client-side filtering/sorting removed in favor of Server-side useHubProjectsQuery


  const selectAll = useCallback(() => {
    setSelectedProjectIds(prev => {
      if (prev.size === allProjects.length && allProjects.length > 0) {
        return new Set();
      } else {
        return new Set(allProjects.map(p => p.id));
      }
    });
  }, [allProjects]);

  // Consolidated loading state

  // Our new query provides `isLoading`.
  // recommendations might still be separate if we keep that hook.
  // But wait, if I used 'includedIds' logic for recommendations which maps `recommendations` ids...
  // `recommendationsLoading` IS relevant.

  const isGlobalLoading = isLoading || (filterView === FILTER_VIEWS.RECOMMENDATIONS && recommendationsLoading);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
      } else if (e.key === 'Escape') {
        if (selectedProject) {
          setSelectedProject(null);
          e.preventDefault();
        }
        if (selectionMode) {
          setSelectionMode(false);
          setSelectedProjectIds(new Set());
          e.preventDefault();
        }
      }
      // Arrow keys navigation with Virtuoso is complex, skipping for V1
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProject, selectionMode]);

  return (
    <HubErrorBoundary>
      <div className="h-full overflow-hidden bg-zinc-50 dark:bg-zinc-900 dark:!bg-zinc-950">
        {projectsError && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-2 rounded-lg shadow-sm">
            Error loading projects: {projectsError.message}
          </div>
        )}

        <div className="max-w-[1600px] mx-auto flex h-full w-full">
          {/* Sidebar - Static */}
          <div className="hidden lg:block w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-700 dark:lg:border-zinc-800 h-full overflow-y-auto scrollbar-hide lg:pr-8 py-8 pl-4 lg:pl-8">
            <CollectionsSidebar
              currentUser={currentUser}
              onSelectCollection={(id, name) => {
                setSelectedCollectionId(id);
                setSelectedCollectionName(name || null);
                setFilterView(FILTER_VIEWS.COLLECTION);
                setShowMobileSidebar(false);
              }}
              selectedCollectionId={selectedCollectionId}
              activeView={filterView}
              onSelectView={(view) => {
                setFilterView(view as FilterView);
                setSelectedCollectionId(null);
                setSelectedCollectionName(null);
                setShowMobileSidebar(false);
              }}
            />
          </div>

          {/* Main Content - Scroll Container */}
          <div
            className="flex-1 min-w-0 h-full overflow-y-auto scrollbar-hide"
            ref={scrollContainerRef}
            id="hub-scroll-container"
          >
            <div className="px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">

              {/* Header with Sticky Logic */}
              <div
                className={`sticky top-0 z-30 transition-all duration-300 ease-in-out ${isSticky ? '-mt-2 pt-2 pb-2' : ''}`}
                ref={filterRef}
              >
                <div className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 transition-shadow duration-300 ${isSticky ? 'shadow-md' : 'shadow-sm'}`}>
                  <div className="flex flex-col gap-4">
                    <HubHeader
                      filterView={filterView}
                      selectedCollectionName={selectedCollectionName}
                      selectionMode={selectionMode}
                      onToggleSelectionMode={() => {
                        setSelectionMode(!selectionMode);
                        if (selectionMode) setSelectedProjectIds(new Set());
                      }}
                      onApplyFilters={(newFilters) => {
                        setStatusFilter(newFilters.status);
                        setTypeFilter(newFilters.type);
                        setSortBy(newFilters.sort);
                        setSelectedTech(newFilters.tech);
                      }}
                      onCreateProject={() => setShowCreateModal(true)}
                      onPreloadModal={preloadModal}
                      // Filters Props
                      filters={currentFilters}
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                    />
                  </div>
                </div>
              </div>

              {/* Bulk Action Bar */}
              <BulkActionBar
                selectedCount={selectedProjectIds.size}
                totalCount={allProjects.length}
                onSelectAll={selectAll}
                onAddToCollection={() => setShowAddToCollectionModal(true)}
                onBookmark={handleBulkBookmark}
                onCompare={() => setShowComparisonModal(true)}
                onCancel={() => {
                  setSelectionMode(false);
                  setSelectedProjectIds(new Set());
                }}
                onShare={() => {
                  const projectIds = Array.from(selectedProjectIds);
                  const shareUrl = `${window.location.origin}/hub?projects=${projectIds.join(',')}`;
                  if (navigator.share) {
                    navigator.share({ url: shareUrl, title: `Shared ${projectIds.length} projects` });
                  } else {
                    navigator.clipboard.writeText(shareUrl);
                    showToast("Share link copied to clipboard", "success");
                  }
                }}
                onExport={() => {
                  const projectIds = Array.from(selectedProjectIds);
                  const exportData = {
                    projects: projectIds,
                    exportedAt: new Date().toISOString(),
                    count: projectIds.length,
                  };
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `projects-export-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast(`Exported ${projectIds.length} projects`, "success");
                }}
                canCompare={selectedProjectIds.size >= 2 && selectedProjectIds.size <= 4}
              />

              {/* Projects Grid with Virtualization */}
              {(isGlobalLoading && allProjects.length === 0) ? (
                <div className={`grid gap-6 ${viewMode === VIEW_MODES.GRID ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <ProjectCardSkeleton key={i} />
                  ))}
                </div>
              ) : allProjects.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800"
                >
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-50 dark:bg-zinc-800 flex items-center justify-center">
                    <Search className="w-10 h-10 text-slate-300 dark:text-zinc-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {selectedCollectionId ? "Empty Collection" :
                      filterView === FILTER_VIEWS.TRENDING ? "No Trending Projects" :
                        filterView === FILTER_VIEWS.RECOMMENDATIONS ? "No Recommendations Yet" :
                          filterView === FILTER_VIEWS.MY_PROJECTS ? "No Projects Found" :
                            "No Projects Found"}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                    {selectedCollectionId ? "This collection is empty. Add projects to get started!" :
                      filterView === FILTER_VIEWS.TRENDING ? "Check back later to see what's popular." :
                        filterView === FILTER_VIEWS.RECOMMENDATIONS ? "Interact with more projects to get personalized recommendations." :
                          filterView === FILTER_VIEWS.MY_PROJECTS ? "You haven't created or joined any projects yet." :
                            "We couldn't find any projects matching your filters. Try adjusting your search or create a new project."}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-zinc-500"
                        aria-label="Clear all filters"
                      >
                        Clear Filters
                      </button>
                    )}
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Start New Project"
                    >
                      <Sparkles className="w-5 h-5" />
                      Start New Project
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex-1 w-full min-h-[600px]">
                  {scrollContainer && (
                    <VirtuosoGrid
                      customScrollParent={scrollContainer}
                      style={{ width: '100%' }}
                      totalCount={allProjects.length}
                      data={allProjects}
                      endReached={() => {
                        if (hasNextPage && !isFetchingNextPage) {
                          fetchNextPage();
                        }
                      }}
                      components={{
                        List: ({ children, ...props }) => (
                          <div
                            {...props}
                            className={`grid gap-6 ${viewMode === VIEW_MODES.GRID ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} pb-24`}
                          >
                            {children}
                          </div>
                        ),
                        Footer: () => (
                          isFetchingNextPage ? (
                            <div className="col-span-full py-8 text-center text-zinc-500">
                              Loading more...
                            </div>
                          ) : null
                        )
                      }}
                      itemContent={(_, project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          viewMode={viewMode}
                          selectionMode={selectionMode}
                          isSelected={selectedProjectIds.has(project.id)}
                          onToggleSelection={() => toggleSelection(project.id)}
                          onQuickView={setSelectedProject}
                          isBookmarked={myBookmarks?.has(project.id)}
                          isFollowing={myFollowed?.has(project.id)}
                          followersCount={Array.isArray(project.project_followers) ? project.project_followers.length : 0}
                        />
                      )}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Modals - Keeping them inside the scroll container context mostly for convenience, they use Portals anyway */}
            <ProjectQuickView
              project={selectedProject}
              isOpen={!!selectedProject}
              onClose={() => setSelectedProject(null)}
              onNext={() => {
                const currentList = allProjects;
                const idx = currentList.findIndex(p => p.id === selectedProject?.id);
                if (idx >= 0 && idx < currentList.length - 1) {
                  const nextProject = currentList[idx + 1];
                  if (nextProject) setSelectedProject(nextProject);
                }
              }}
              onPrevious={() => {
                const currentList = allProjects;
                const idx = currentList.findIndex(p => p.id === selectedProject?.id);
                if (idx > 0) {
                  const previousProject = currentList[idx - 1];
                  if (previousProject) setSelectedProject(previousProject);
                }
              }}
              hasNext={allProjects.findIndex(p => p.id === selectedProject?.id) < allProjects.length - 1}
              hasPrevious={allProjects.findIndex(p => p.id === selectedProject?.id) > 0}
            />

            {showCreateModal && (
              <CreateProjectWizard
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                  setShowCreateModal(false);
                  showToast("Project created successfully!", "success");
                }}
              />
            )}

            <NotificationSettingsModal
              isOpen={showNotificationSettings}
              onClose={() => setShowNotificationSettings(false)}
            />

            {showComparisonModal && selectedProjectIds.size >= 2 && (
              <ProjectComparisonModal
                projects={allProjects.filter(p => selectedProjectIds.has(p.id)).slice(0, 4)}
                onClose={() => setShowComparisonModal(false)}
              />
            )}

            {showAddToCollectionModal && (
              <AddToCollectionModal
                projectIds={Array.from(selectedProjectIds)}
                onClose={() => setShowAddToCollectionModal(false)}
                currentUser={currentUser}
              />
            )}
          </div>
        </div>

        {/* Mobile Sidebar Toggle & Drawer (Global) */}
        <button
          onClick={() => setShowMobileSidebar(true)}
          className="lg:hidden fixed bottom-6 right-6 z-30 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open filters and collections"
        >
          <Filter className="w-5 h-5" />
        </button>

        <MobileSidebarDrawer isOpen={showMobileSidebar} onClose={() => setShowMobileSidebar(false)}>
          <CollectionsSidebar
            currentUser={currentUser}
            onSelectCollection={(id, name) => {
              setSelectedCollectionId(id);
              setSelectedCollectionName(name || null);
              setFilterView(FILTER_VIEWS.COLLECTION);
              setShowMobileSidebar(false);
            }}
            selectedCollectionId={selectedCollectionId}
            activeView={filterView}
            onSelectView={(view) => {
              setFilterView(view as FilterView);
              setSelectedCollectionId(null);
              setSelectedCollectionName(null);
              setShowMobileSidebar(false);
            }}
          />
        </MobileSidebarDrawer>

      </div>
    </HubErrorBoundary>
  );
});

export default HubClient;
