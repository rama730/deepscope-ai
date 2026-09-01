import { useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PROJECT_STATUS, PROJECT_TYPE, SORT_OPTIONS, FILTER_VIEWS, FilterView, ProjectStatus, ProjectType, SortOption } from "@/constants/hub";

/**
 * Hub URL filter state
 */
export interface HubUrlFilters {
  view: FilterView;
  q: string;
  status: ProjectStatus;
  type: ProjectType;
  sort: SortOption;
  tech: string[];
  page?: number;
}

/**
 * Return type for hub URL filters hook
 */
interface UseHubUrlFiltersReturn {
  urlFilters: HubUrlFilters;
  updateUrlFilters: (updates: Partial<HubUrlFilters>) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Hook to manage hub filters via URL query parameters
 * 
 * Synchronizes filter state with URL query parameters for shareable filter states.
 * Automatically updates URL when filters change and reads from URL on mount.
 * 
 * @returns Object containing current filters, update function, clear function, and active state
 * @example
 * ```tsx
 * const { urlFilters, updateUrlFilters, clearFilters, hasActiveFilters } = useHubUrlFilters();
 * updateUrlFilters({ status: 'active', type: 'web' });
 * ```
 */
export function useHubUrlFilters(): UseHubUrlFiltersReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read filters from URL
  const urlFilters = useMemo<HubUrlFilters>(() => {
    const view = (searchParams.get("view") as FilterView) || FILTER_VIEWS.ALL;
    const q = searchParams.get("q") || "";
    const status = (searchParams.get("status") as ProjectStatus) || PROJECT_STATUS.ALL;
    const type = (searchParams.get("type") as ProjectType) || PROJECT_TYPE.ALL;
    const sort = (searchParams.get("sort") as SortOption) || SORT_OPTIONS.NEWEST;
    const techParam = searchParams.get("tech");
    const tech = techParam ? techParam.split(",").filter(Boolean) : [];

    const pageParam = searchParams.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : undefined;

    return { view, q, status, type, sort, tech, page };
  }, [searchParams]);

  // Update URL with filters
  const updateUrlFilters = useCallback((updates: Partial<HubUrlFilters>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Update or remove each filter
    if ("view" in updates) {
      if (updates.view && updates.view !== FILTER_VIEWS.ALL) {
        params.set("view", updates.view);
      } else {
        params.delete("view");
      }
    }

    if ("q" in updates) {
      if (updates.q) {
        params.set("q", updates.q);
      } else {
        params.delete("q");
      }
    }

    if ("status" in updates) {
      if (updates.status && updates.status !== PROJECT_STATUS.ALL) {
        params.set("status", updates.status);
      } else {
        params.delete("status");
      }
    }

    if ("type" in updates) {
      if (updates.type && updates.type !== PROJECT_TYPE.ALL) {
        params.set("type", updates.type);
      } else {
        params.delete("type");
      }
    }

    if ("sort" in updates) {
      if (updates.sort && updates.sort !== SORT_OPTIONS.NEWEST) {
        params.set("sort", updates.sort);
      } else {
        params.delete("sort");
      }
    }

    if ("tech" in updates) {
      if (updates.tech && updates.tech.length > 0) {
        params.set("tech", updates.tech.join(","));
      } else {
        params.delete("tech");
      }
    }

    if ("page" in updates) {
      if (updates.page && updates.page > 1) {
        params.set("page", updates.page.toString());
      } else {
        params.delete("page");
      }
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      urlFilters.view !== FILTER_VIEWS.ALL ||
      urlFilters.q !== "" ||
      urlFilters.status !== PROJECT_STATUS.ALL ||
      urlFilters.type !== PROJECT_TYPE.ALL ||
      urlFilters.sort !== SORT_OPTIONS.NEWEST ||
      urlFilters.tech.length > 0
    );
  }, [urlFilters]);

  return {
    urlFilters,
    updateUrlFilters,
    clearFilters,
    hasActiveFilters,
  };
}
