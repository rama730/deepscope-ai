import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useTaskDrawerStore } from "@/stores/useTaskDrawerStore";

export type ActiveView = "dashboard" | "tasks" | "files" | "analytics" | "outcomes" | "settings" | "sprints";

const VALID_TABS = new Set<ActiveView>([
  "dashboard",
  "tasks",
  "files",
  "analytics",
  "outcomes",
  "settings",
  "sprints",
]);

export function useProjectRouting(
  projectId: string | undefined, 
  activeView: ActiveView, 
  setActiveView: (view: ActiveView) => void
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskDrawer = useTaskDrawerStore();

  const getViewFromUrl = useCallback((): ActiveView => {
    const tab = searchParams?.get("tab");
    if (tab && VALID_TABS.has(tab as ActiveView)) return tab as ActiveView;
    return "dashboard";
  }, [searchParams]);

  const navigateToView = useCallback((next: ActiveView) => {
    setActiveView(next);
    const params = new URLSearchParams(searchParams?.toString());
    if (next === "dashboard") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    const href = qs ? `?${qs}` : window.location.pathname;
    router.replace(href, { scroll: false });
  }, [router, searchParams, setActiveView]);

  // Sync state with URL
  useEffect(() => {
    const fromUrl = getViewFromUrl();
    if (activeView !== fromUrl) {
      setActiveView(fromUrl);
    }
  }, [getViewFromUrl, activeView, setActiveView]);

  // Handle Deep Linking
  useEffect(() => {
    if (!projectId) return;

    // Support legacy/alternate deep links: ?taskId=... as well as ?task=...
    const taskId = searchParams?.get("task") || searchParams?.get("taskId");
    const fileId = searchParams?.get("file");

    if (taskId) {
      // Task deep-link should open a drawer WITHOUT forcing the Tasks tab.
      if (!taskDrawer.isOpen || taskDrawer.taskId !== taskId) {
        taskDrawer.open({
          taskId,
          projectId,
          source: "deep_link",
          closeStrategy: "replace",
        });
      }
      return;
    }

    if (fileId && activeView !== "files") {
      navigateToView("files");
      return;
    }
  }, [searchParams, activeView, navigateToView, taskDrawer, projectId]);

  return {
    navigateToView
  };
}
