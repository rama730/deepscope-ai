"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback, memo, useMemo } from "react";
import { Timer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { useProjectDetails } from "@/hooks/useProjectDetails";
import { useCookieConsent } from "@/components/providers/CookieProvider";
import { DashboardTab } from "./tabs/DashboardTab";
import { TabErrorBoundary } from "./TabErrorBoundary";
import { toggleBookmarkAction, toggleFollowAction, advanceProjectStageAction } from "@/app/(main)/projects/[id]/actions";

// Phase 5: Performance & Tech Excellence
import { useProjectRouting, ActiveView } from "@/hooks/useProjectRouting";
import { useProjectModals } from "@/hooks/useProjectModals";
// import { useProjectUIStore } from "@/stores/useProjectUIStore"; // Removed as we are using local state + hooks
import { useProjectTasks } from "@/hooks/queries/useProjectTasks";
import { useProjectFiles } from "@/hooks/queries/useProjectFiles";
import { useProjectActivity } from "@/hooks/queries/useProjectActivity";
import { perfTracker } from "@/lib/performance/measure";
import { useProjectRealtime } from "@/hooks/useProjectRealtime";
import { projectKeys } from "@/lib/queryKeys";
import { ProjectService } from "@/lib/services/projectService";
import { useTaskDrawerStore } from "@/stores/useTaskDrawerStore";

// New Dashboard Layout
import ProjectLayout from "@/components/projects/dashboard/ProjectLayout";

import { ProjectErrorBoundary } from "@/components/projects/ProjectErrorBoundary";
import KeyboardShortcutsModal from "@/components/projects/KeyboardShortcutsModal";
import RealtimeStatusIndicator from "@/components/projects/RealtimeStatusIndicator";
import MobileProjectSidebar from "@/components/projects/MobileProjectSidebar";
import ShareModal from "@/components/projects/ShareModal";
import QuickActionsDropdown from "@/components/projects/QuickActionsDropdown";
import ExportProjectModal from "@/components/projects/ExportProjectModal";
import DuplicateProjectModal from "@/components/projects/DuplicateProjectModal";

// Dynamic imports for modals and full-page tabs
const ApplyToProjectModal = dynamic(() => import("@/components/projects/ApplyToProjectModal"), { ssr: false });
const EditProjectModal = dynamic(() => import("@/components/projects/EditProjectModal"), { ssr: false });
const TasksTab = dynamic(() => import("@/components/projects/TasksTab"), { ssr: false });
const FilesTab = dynamic(() => import("@/components/projects/FilesTab"), { ssr: false });

const AnalyticsTab = dynamic(() => import("@/components/projects/AnalyticsTab"), { ssr: false });
const OutcomesTab = dynamic(() => import("@/components/projects/OutcomesTab"), { ssr: false });
const ManageApplicationsModal = dynamic(() => import("@/components/projects/ManageApplicationsModal"), { ssr: false });
const ManageTeamModal = dynamic(() => import("@/components/projects/ManageTeamModal"), { ssr: false });
const FinalizeProjectModal = dynamic(() => import("@/components/projects/FinalizeProjectModal"), { ssr: false });
const ProjectSettingsTab = dynamic(() => import("@/components/projects/ProjectSettingsTab"), { ssr: false });
const TaskDetailPanel = dynamic(() => import("@/components/projects/TaskDetailPanel"), { ssr: false });
const QuickSearch = dynamic(() => import("@/components/ui-custom/QuickSearch"), { ssr: false });
const SprintPlanning = dynamic(() => import("@/components/projects/SprintPlanning"), { ssr: false });
const BurndownChart = dynamic(() => import("@/components/projects/BurndownChart"), { ssr: false });

// type ActiveView = ... // Removed in favor of imported type

interface ProjectDashboardClientProps {
    projectId: string;
    initialProject: any;
    initialUser: any;
    // Optional initial data (for backward compat or SSR)
    initialTasks?: any[];
    initialFiles?: any[];
    initialActivity?: any[];
    initialApplication?: any;

    initialFollowersCount?: number;
    initialBookmarked?: boolean;
    // Promises for streaming
    tasksPromise?: Promise<any>;
    filesPromise?: Promise<any>;

    applicationsPromise?: Promise<any>;
    followersPromise?: Promise<any>;
    pendingAppPromise?: Promise<any>;
    bookmarkPromise?: Promise<any>;
    initialTaskPage?: number;
    initialTaskLimit?: number;
}

function ProjectDashboardClient({
    projectId: id,
    initialProject,
    initialUser,
    initialTasks = [],
    initialFiles = [],
    initialActivity = [],
    initialApplication = null,
    initialFollowersCount = 0,
    initialBookmarked = false,
    initialTaskPage = 1,
    initialTaskLimit = 10
}: ProjectDashboardClientProps) {
    const supabase = createSupabaseBrowserClient();
    const queryClient = useQueryClient();
    const router = useRouter();
    const searchParams = useSearchParams();

    // --- PHASE 5: Zustand Store Integration / Refactor Phase 3: Hooks ---
    // We keep local activeView state for the hook to sync with
    const [activeView, setActiveView] = useState<ActiveView>("dashboard");

    // New Hooks
    const { navigateToView } = useProjectRouting(id, activeView, setActiveView);

    // Decomposed Modals State
    const {
        openModal, closeModal,
        isApplyOpen, isEditOpen, isShareOpen, isManageApplicationsOpen, isManageTeamOpen, isFinalizeOpen,
        isQuickSearchOpen, isShortcutsHelpOpen, isExportOpen, isDuplicateOpen,
        selectedRoleId, setSelectedRoleId, editInitialTab, setEditInitialTab
    } = useProjectModals();

    // Helper for legacy modal setting style (if needed temporarily, but better to update calls)
    const setModal = (modalName: string, isOpen: boolean) => {
        if (!isOpen) closeModal();
        else {
            // Map legacy string names to types if necessary, or just update usage sites.
            // We will update usage sites in this file to use openModal/closeModal directly where possible, 
            // or keep this adapter if there are too many.
            // Let's rely on the hook's returned booleans and update the JSX.
            // But valid string names: "apply", "edit", etc.
            if (isOpen) openModal(modalName as any);
        }
    };

    // Global Task Drawer (used for dashboard/task deep links without forcing tab switch)
    const taskDrawer = useTaskDrawerStore();

    // Core Project Data
    const { data: projectData, isLoading: projectLoading, refetch: refetchProject } = useProjectDetails({
        projectId: id,
        initialData: initialProject
    });

    const project = projectData || initialProject;
    const currentUserId = initialUser?.id || null;

    // Performance tracking
    useEffect(() => {
        if (!id) return;

        perfTracker.start('project-page-open', { projectId: id });
        return () => {
            perfTracker.end('project-page-open');
        };
    }, [id]);

    // Track tab switches
    useEffect(() => {
        if (activeView) {
            perfTracker.start(`project-tab-${activeView}`, { projectId: id, view: activeView });
            return () => {
                perfTracker.end(`project-tab-${activeView}`);
            };
        }
    }, [activeView, id]);

    // Measure tab-specific first render times
    useEffect(() => {
        if (!id) return;
        if (activeView === "tasks") {
            perfTracker.start("project-tasks-first-render", { projectId: id });
        } else if (activeView === "files") {
            perfTracker.start("project-files-first-render", { projectId: id });
        }
    }, [activeView, id]);

    // --- PHASE 5: TanStack Query Localized Hooks ---
    // Dashboard Specific (for pulse/activity) - Reduced initial load
    // Only fetch minimal tasks for dashboard overview (recent/active)
    const shouldFetchDashboardTasks = activeView === 'dashboard' && initialTasks.length === 0;
    const { data: dashboardTasksData } = useProjectTasks(
        id,
        // The Pulse Card uses `tasks` prop passed from DashboardTab.
        shouldFetchDashboardTasks ? { limit: 50, status: 'in_progress,todo' } : {},
        shouldFetchDashboardTasks ? undefined : undefined // Don't use small initial set for full query
    );

    const shouldFetchActivity = activeView === 'dashboard';
    const { data: activityData } = useProjectActivity(
        id,
        shouldFetchActivity ? 20 : 0,
        shouldFetchActivity ? initialActivity : undefined
    );
    // Updates tab removed: project updates are handled via normal posts with /project-slug mentions.

    // Default filters for prefetching
    const taskFilters = { page: 1, limit: 10 };

    // Prefetch non-active tabs shortly after hydration (keeps strict correctness on tab switch without blocking first paint)
    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        const run = () => {
            if (cancelled) return;
            // Prefetch Task Drawer UI so first open isn't a cold start (dashboard/pulse/work lists).
            // These are client-only dynamic components.
            import("@/components/projects/TaskDetailPanel").catch(() => { });
            import("@/components/tasks/TaskDetailContent").catch(() => { });

            // Tasks (current URL filters) - now handled by TasksTab, but we can prefetch generic
            // queryClient.prefetchQuery({
            //     queryKey: projectKeys.tasks(id, taskFilters),
            //     queryFn: () => ProjectService.getTasks(supabase, id, taskFilters),
            // });
            // Files
            queryClient.prefetchQuery({
                queryKey: projectKeys.files(id),
                queryFn: () => ProjectService.getFiles(supabase, id, {}),
            });
            // Activity
            queryClient.prefetchQuery({
                queryKey: projectKeys.activity(id),
                queryFn: () => ProjectService.getActivity(supabase, id, 100),
            });
        };

        const w = typeof window !== "undefined" ? (window as any) : null;
        if (w && typeof w.requestIdleCallback === "function") {
            const idleId = w.requestIdleCallback(run, { timeout: 1500 });
            return () => {
                cancelled = true;
                if (typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(idleId);
            };
        }

        const t = setTimeout(run, 600);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [id, queryClient, supabase]);

    // Only fetch files when files tab is active
    const { data: filesData } = useProjectFiles(
        id,
        activeView === 'files' ? {} : undefined,
        activeView === 'files' ? initialFiles : undefined
    );

    // const tasks = tasksRes?.data || initialTasks; // Removed full tasks list fetching
    const tasks = initialTasks; // Just use initialTasks for passing to things that might need it (Dashboard accepts tasks, but it really wants dashboardTasks for pulse)

    // For dashboardPulse, we prefer data from hook if available, otherwise fallback to initialTasks from SSR.
    const dashboardTasks = dashboardTasksData?.data || (activeView === 'dashboard' ? initialTasks : null);

    const files = filesData || initialFiles;
    const taskCount = initialTasks.length; // Simplified as main list calculation is moved to TasksTab
    // Updates tab removed.
    const projectActivityEvents = activityData || initialActivity;

    // engagement
    const [followersCount, setFollowersCount] = useState<number>(initialFollowersCount);
    const [bookmarked, setBookmarked] = useState(initialBookmarked);
    const [bookmarkLoading, setBookmarkLoading] = useState(false);
    const [following, setFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Centralized project-scoped realtime: strict correctness, batched updates.
    useProjectRealtime(id, {
        enabled: !!id,
        currentUserId,
        onFollowersDelta: (delta) => setFollowersCount((prev) => Math.max(0, prev + delta)),
        onFollowingChanged: (isFollowing) => setFollowing(isFollowing),
    });

    // Derived State from Project
    const roles = project?.project_open_roles || [];
    const members = project?.project_collaborators || [];

    // Calculate filled roles (Derived)
    const filledByRole: Record<string, number> = {};
    members.forEach((m: any) => {
        const key = (m.role || "").toLowerCase();
        if (!filledByRole[key]) filledByRole[key] = 0;
        filledByRole[key] += 1;
    });

    const rolesWithFilled = roles.map((r: any) => ({
        ...r,
        filled: filledByRole[(r.role || "").toLowerCase()] || 0,
    }));

    // Check collaborator status (Derived)
    const isCollaborator = useMemo(() => {
        return members.some((m: any) => m.user_id === currentUserId);
    }, [members, currentUserId]);

    const [viewCountIncremented, setViewCountIncremented] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);

    const handlePrefetch = useCallback((view: ActiveView) => {
        if (!id) return;
        if (view === "tasks") {
            queryClient.prefetchQuery({
                queryKey: projectKeys.tasks(id, taskFilters),
                queryFn: () => ProjectService.getTasks(supabase, id, taskFilters),
            });
        }
        if (view === "files") {
            queryClient.prefetchQuery({
                queryKey: projectKeys.files(id),
                queryFn: () => ProjectService.getFiles(supabase, id, {}),
            });
        }
        // Updates tab removed.
        if (view === "dashboard") {
            queryClient.prefetchQuery({
                queryKey: projectKeys.activity(id),
                queryFn: () => ProjectService.getActivity(supabase, id, 100),
            });
        }
    }, [id, queryClient, supabase, taskFilters]);



    const validTabs = useMemo(() => new Set<ActiveView>([
        "dashboard",
        "tasks",
        "files",
        "analytics",
        "outcomes",
        "settings",
        "sprints",
    ]), []);

    const getViewFromUrl = useCallback((): ActiveView => {
        const tab = searchParams?.get("tab");
        if (tab && validTabs.has(tab as ActiveView)) return tab as ActiveView;
        return "dashboard";
    }, [searchParams, validTabs]);

    // Keep state in sync with URL (supports refresh + back/forward)
    useEffect(() => {
        const fromUrl = getViewFromUrl();
        if (activeView !== fromUrl) {
            setActiveView(fromUrl);
        }
    }, [getViewFromUrl, activeView, setActiveView]);

    // navigateToView is imported from useProjectRouting hook

    const setUrlParam = useCallback((key: string, value?: string | null) => {
        const params = new URLSearchParams(searchParams?.toString());
        const current = params.get(key);
        // Avoid redundant navigations (which can trigger server re-renders).
        if (value) {
            if (current === value) return;
            params.set(key, value);
        } else {
            if (current === null) return;
            params.delete(key);
        }
        const qs = params.toString();
        const href = qs ? `?${qs}` : window.location.pathname;
        router.replace(href, { scroll: false });
    }, [router, searchParams]);

    const openTaskFromAnywhere = useCallback((taskId: string) => {
        if (!taskId) return;

        // Open task drawer without forcing tab switch.
        // Use push so browser Back closes the drawer.
        const params = new URLSearchParams(searchParams?.toString());
        params.set("task", taskId);
        const qs = params.toString();
        const href = qs ? `?${qs}` : window.location.pathname;

        taskDrawer.open({
            taskId,
            projectId: id as string,
            source: "project_dashboard",
            closeStrategy: "back",
        });
        router.push(href, { scroll: false });
    }, [router, searchParams, taskDrawer, id]);

    // Deep-linking: open the right tab + entity panel from URL params.
    useEffect(() => {
        // Support legacy/alternate deep links: ?taskId=... as well as ?task=...
        const taskId = searchParams?.get("task") || searchParams?.get("taskId");
        const fileId = searchParams?.get("file");
        // Updates tab removed; ignore any old deep-link params (?update=...)

        if (taskId) {
            // Task deep-link should open a drawer WITHOUT forcing the Tasks tab.
            // Close strategy is replace so closing doesn't navigate away when user landed on this URL directly.
            if (!taskDrawer.isOpen || taskDrawer.taskId !== taskId) {
                taskDrawer.open({
                    taskId,
                    projectId: id as string,
                    source: "deep_link",
                    closeStrategy: "replace",
                });
            }
            return;
        }

        // If URL no longer has task param, ensure drawer is closed.
        if (taskDrawer.isOpen) {
            taskDrawer.close();
        }

        if (fileId && activeView !== "files") {
            navigateToView("files");
            return;
        }

        // Previously: navigated to Updates tab (removed)
    }, [searchParams, activeView, navigateToView, taskDrawer, id]);

    // Task detail panel state (Derived)
    const selectedTask = useMemo(() => {
        if (!taskDrawer.taskId) return null;
        return tasks.find((t: any) => t.id === taskDrawer.taskId) ||
            dashboardTasks?.find((t: any) => t.id === taskDrawer.taskId) ||
            null;
    }, [taskDrawer.taskId, tasks, dashboardTasks]);

    const loading = projectLoading && !project;



    const { preferences } = useCookieConsent();

    // --- PHASE 5: Simplified RT & Effects ---
    useEffect(() => {
        if (id && !viewCountIncremented && preferences.analytics) {
            const timer = setTimeout(() => {
                supabase.rpc("increment_project_view_count", { project_id_param: id }).then(() => {
                    setViewCountIncremented(true);
                    queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
                });
            }, 2000); // 2 second delay for "meaningful" view
            return () => clearTimeout(timer);
        }
    }, [id, viewCountIncremented, supabase, queryClient, preferences.analytics]);

    // Engagement & Auth (Shared metadata)
    // Engagement & Auth (Shared metadata)

    // Followers & Following state syncing
    // Using unified subscription instead of deprecated hook

    // NOTE: follower realtime is handled by useProjectRealtime (centralized).

    // Combined loader used for manual refreshes (deprecated but kept if needed by other components)
    const loadProjectData = useCallback(async () => {
        await refetchProject();
        if (!id) return;
        queryClient.invalidateQueries({ queryKey: [...projectKeys.detail(id), "tasks"] });
        queryClient.invalidateQueries({ queryKey: projectKeys.files(id) });
        queryClient.invalidateQueries({ queryKey: projectKeys.activity(id) });
    }, [id, refetchProject, queryClient]);


    // Handlers
    async function handleToggleBookmark() {
        if (!currentUserId || !project || bookmarkLoading) return;

        const wasBookmarked = bookmarked;
        setBookmarked(!wasBookmarked);
        // Optimistic update of global count
        queryClient.setQueryData(projectKeys.detail(id), (prev: any) => prev ? ({
            ...prev,
            bookmarks_count: wasBookmarked ? Math.max(0, (prev.bookmarks_count || 0) - 1) : (prev.bookmarks_count || 0) + 1
        }) : prev);

        setBookmarkLoading(true);
        try {
            const result = await toggleBookmarkAction(id as string, currentUserId, wasBookmarked);
            if (!result.success) throw result.error;
        } catch (error) {
            setBookmarked(wasBookmarked);
            // Revert count
            queryClient.setQueryData(projectKeys.detail(id), (prev: any) => prev ? ({
                ...prev,
                bookmarks_count: wasBookmarked ? (prev.bookmarks_count || 0) + 1 : Math.max(0, (prev.bookmarks_count || 0) - 1)
            }) : prev);
            console.error("Error toggling bookmark:", error);
        } finally {
            setBookmarkLoading(false);
        }
    }

    async function handleToggleFollow() {
        if (!currentUserId || !project || followLoading) return;

        const wasFollowing = following;
        setFollowing(!wasFollowing);
        setFollowersCount(prev => wasFollowing ? Math.max(0, prev - 1) : prev + 1);

        setFollowLoading(true);
        try {
            const result = await toggleFollowAction(id as string, currentUserId, wasFollowing);
            if (!result.success) throw result.error;
        } catch (error) {
            setFollowing(wasFollowing);
            setFollowersCount(prev => wasFollowing ? prev + 1 : Math.max(0, prev - 1));
            console.error("Error toggling follow:", error);
        } finally {
            setFollowLoading(false);
        }
    }

    async function handleShare() {
        try {
            await navigator.clipboard.writeText(getShareUrl());
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        } catch (error) {
            console.error("Error copying link:", error);
        }
    }

    const getShareUrl = () => {
        if (typeof window === "undefined") {
            return `/projects/${project?.slug || project?.id}`;
        }
        const baseUrl = `${window.location.origin}/projects/${project?.slug || project?.id}`;
        return baseUrl;
    };

    function handleBackToProjects() {
        router.push("/hub");
    }

    async function handleAdvanceStage(): Promise<void> {
        if (!project || !project.lifecycle_stages || !isCreator) return;
        const nextStageIndex = Math.min((project.current_stage_index || 0) + 1, (project.lifecycle_stages.length || 0) - 1);
        if (nextStageIndex === project.current_stage_index) return;

        try {
            const result = await advanceProjectStageAction(id as string, nextStageIndex);
            if (!result.success) throw result.error;
        } catch (error) {
            console.error("Error advancing stage:", error);
        }
    }

    function handleApplyToRole(roleId?: string) {
        setSelectedRoleId(roleId);
        setModal("apply", true);
    }



    const isCreator = currentUserId === project?.creator_id;
    const isOwnerOrMember = isCreator || isCollaborator;



    // Lifecycle stages
    const lifecycleStages = useMemo(() => {
        const stages = project?.lifecycle_stages || [];
        const currentStageIndex = project?.current_stage_index ?? 0;
        return stages.map((stageName: string, index: number) => ({
            name: stageName,
            status: index < currentStageIndex ? "completed" : index === currentStageIndex ? "current" : "upcoming",
        }));
    }, [project?.lifecycle_stages, project?.current_stage_index]);




    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-zinc-400">Loading project...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-600 dark:text-zinc-400">Project not found</p>
                    <button onClick={handleBackToProjects} className="mt-4 text-indigo-600 hover:underline">
                        Back to projects
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ProjectErrorBoundary>
            <ProjectLayout
                project={project}
                isOwner={isCreator}
                activeTab={activeView}
                onTabChange={(tabId) => navigateToView(tabId as ActiveView)}
                onTabHover={(tabId) => handlePrefetch(tabId as ActiveView)}
                followersCount={followersCount}
                onEdit={() => {
                    setEditInitialTab("essentials");
                    setModal("edit", true);
                }}
                isBookmarked={bookmarked}
                onBookmark={handleToggleBookmark}
                isFollowing={following}
                onFollow={handleToggleFollow}
                onShare={() => setModal("share", true)}
            >
                {initialApplication?.status === 'rejected' && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20 p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full text-red-600 dark:text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
                                    Previously rejected
                                </h3>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                    You were previously rejected for the <span className="font-medium">{initialApplication.role_applied_for}</span> role
                                    {initialApplication.rejected_at ? ` on ${new Date(initialApplication.rejected_at).toLocaleDateString()}` : ''}.
                                </p>
                                {(() => {
                                    const created = new Date(initialApplication.created_at).getTime();
                                    const now = Date.now();
                                    const cooldownMs = 24 * 60 * 60 * 1000;
                                    const timeLeft = cooldownMs - (now - created);

                                    if (timeLeft > 0) {
                                        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
                                        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
                                        return (
                                            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                                                <Timer className="w-4 h-4" />
                                                You can reapply in {hours}h {minutes}m
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className="mt-3">
                                                <button
                                                    onClick={() => {
                                                        setEditInitialTab("essentials"); // Reset or handle specific reapply flow?
                                                        setModal("apply", true);
                                                    }}
                                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
                                                >
                                                    Ready to reapply? Click here.
                                                </button>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                <RealtimeStatusIndicator
                    projectId={id as string}
                    currentUser={initialUser ? {
                        id: initialUser.id,
                        full_name: initialUser.full_name || initialUser.profiles?.full_name,
                        username: initialUser.username || initialUser.profiles?.username,
                        avatar_url: initialUser.avatar_url || initialUser.profiles?.avatar_url
                    } : null}
                />

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeView}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="min-h-[calc(100vh-200px)]"
                    >
                        {activeView === "dashboard" && (
                            <TabErrorBoundary tabName="Dashboard">
                                <DashboardTab
                                    project={project}
                                    isCreator={isCreator}
                                    isOwnerOrMember={isOwnerOrMember}
                                    isCollaborator={isCollaborator}
                                    currentUserId={currentUserId}
                                    tasks={tasks}
                                    dashboardTasks={dashboardTasks}
                                    files={files}
                                    members={members}
                                    rolesWithFilled={rolesWithFilled}
                                    projectActivityEvents={projectActivityEvents}
                                    followersCount={followersCount}
                                    bookmarkCount={project.bookmarks_count || 0}
                                    bookmarked={bookmarked}
                                    bookmarkLoading={bookmarkLoading}
                                    shareCopied={shareCopied}
                                    onEdit={(tab) => {
                                        if (tab) setEditInitialTab(tab);
                                        setModal("edit", true);
                                    }}
                                    onShare={handleShare}
                                    onBookmark={handleToggleBookmark}
                                    onFinalize={() => setModal("finalize", true)}
                                    onAdvanceStage={handleAdvanceStage}
                                    onApplyToRole={handleApplyToRole}
                                    onManageTeam={() => setModal("manageTeam", true)}
                                    onViewBoard={() => navigateToView("tasks")}
                                    onUploadFile={() => navigateToView("files")}
                                    onViewAnalytics={() => navigateToView("analytics")}
                                    onViewSprints={() => navigateToView("sprints")}
                                    onViewSettings={() => navigateToView("settings")}
                                    onTaskClick={openTaskFromAnywhere}
                                    lifecycleStages={lifecycleStages}
                                />
                            </TabErrorBoundary>
                        )}

                        {activeView !== "dashboard" && (
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm min-h-[500px] p-6">
                                {activeView === "tasks" && (
                                    <TabErrorBoundary tabName="Tasks">
                                        <TasksTab
                                            projectId={id as string}
                                            isOwnerOrMember={isOwnerOrMember}
                                            projectCreatorId={project.creator_id}
                                            initialTasks={tasks}
                                            totalCount={taskCount}
                                            initialPage={initialTaskPage}
                                            initialLimit={initialTaskLimit}
                                        />
                                    </TabErrorBoundary>
                                )}

                                {activeView === "files" && (
                                    <TabErrorBoundary tabName="Files">
                                        <FilesTab
                                            projectId={id as string}
                                            initialFiles={files ?? []}
                                            isOwnerOrMember={isOwnerOrMember}
                                        />
                                    </TabErrorBoundary>
                                )}

                                {activeView === "analytics" && (
                                    <TabErrorBoundary tabName="Analytics">
                                        <AnalyticsTab
                                            projectId={id as string}
                                            project={project}
                                        />
                                    </TabErrorBoundary>
                                )}

                                {activeView === "outcomes" && (
                                    <TabErrorBoundary tabName="Outcomes">
                                        <OutcomesTab
                                            projectId={id as string}
                                            project={project}
                                            isOwnerOrMember={isOwnerOrMember}
                                        />
                                    </TabErrorBoundary>
                                )}

                                {/* Updates view removed */}

                                {activeView === "settings" && isCreator && (
                                    <TabErrorBoundary tabName="Settings">
                                        <ProjectSettingsTab
                                            projectId={id as string}
                                            project={project}
                                            onProjectUpdated={loadProjectData}
                                            isProjectOwner={isCreator}
                                        />
                                    </TabErrorBoundary>
                                )}

                                {activeView === "sprints" && (
                                    <TabErrorBoundary tabName="Sprints">
                                        <div className="space-y-6">
                                            <SprintPlanning projectId={id as string} isOwner={isCreator} />
                                            <BurndownChart projectId={id as string} />
                                        </div>
                                    </TabErrorBoundary>
                                )}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Modals & Global Components */}
                {isApplyOpen && (
                    <ApplyToProjectModal
                        projectId={id}
                        onClose={() => closeModal()}
                        initialRoleId={selectedRoleId}
                        onSuccess={() => loadProjectData()}
                    />
                )}

                {isEditOpen && (
                    <EditProjectModal
                        project={project}
                        onClose={() => closeModal()}
                        onSaved={loadProjectData}
                        initialTab={editInitialTab}
                    />
                )}

                {isManageApplicationsOpen && (
                    <ManageApplicationsModal
                        isOpen={isManageApplicationsOpen}
                        onClose={() => closeModal()}
                        projectId={id as string}
                        isProjectOwner={isCreator}
                    />
                )}

                {isManageTeamOpen && (
                    <ManageTeamModal
                        isOpen={isManageTeamOpen}
                        onClose={() => closeModal()}
                        projectId={id as string}
                        projectCreatorId={project.creator_id}
                        currentUserId={currentUserId}
                        isProjectOwner={isCreator}
                        onRefresh={loadProjectData}
                    />
                )}

                {isFinalizeOpen && (
                    <FinalizeProjectModal
                        isOpen={isFinalizeOpen}
                        onClose={() => closeModal()}
                        project={project}
                        tasks={tasks}
                        currentUser={initialUser}
                        onRefresh={loadProjectData}
                    />
                )}

                {isQuickSearchOpen && (
                    <QuickSearch
                        isOpen={isQuickSearchOpen}
                        onClose={() => closeModal()}
                        projectId={id as string}
                    />
                )}

                <AnimatePresence>
                    {taskDrawer.isOpen && taskDrawer.taskId && selectedTask && (
                        <TaskDetailPanel
                            task={selectedTask}
                            projectId={id as string}
                            members={members}
                            currentUserId={currentUserId}
                            projectCreatorId={project?.creator_id}
                            isOwnerOrMember={isOwnerOrMember}
                            onClose={() => {
                                // Close immediately; then update URL based on open strategy.
                                const strategy = taskDrawer.closeStrategy;
                                taskDrawer.close();
                                if (strategy === "back") {
                                    router.back();
                                } else {
                                    setUrlParam("task", null);
                                }
                            }}
                            onUpdate={loadProjectData}
                            onDelete={() => {
                                taskDrawer.close();
                                setUrlParam("task", null);
                                loadProjectData();
                            }}
                        />
                    )}
                </AnimatePresence>

                <MobileProjectSidebar isOpen={false} onClose={() => { }}>
                    <div className="mb-4">
                        <button onClick={() => setModal("manageTeam", true)} className="w-full text-left p-2 bg-indigo-50 text-indigo-700 rounded-lg">Manage Team</button>
                    </div>
                </MobileProjectSidebar>

                <KeyboardShortcutsModal isOpen={isShortcutsHelpOpen} onClose={() => closeModal()} />

                {project && isShareOpen && typeof window !== "undefined" && (
                    <ShareModal
                        isOpen={isShareOpen}
                        onClose={() => closeModal()}
                        url={getShareUrl()}
                        title={project.title}
                        description={project.short_description || project.description}
                    />
                )}

                {project && isExportOpen && (
                    <ExportProjectModal
                        isOpen={isExportOpen}
                        onClose={() => closeModal()}
                        project={project}
                        tasks={tasks}
                        files={files}
                        members={members}
                    />
                )}

                {project && isDuplicateOpen && (
                    <DuplicateProjectModal
                        isOpen={isDuplicateOpen}
                        onClose={() => closeModal()}
                        project={project}
                        onSuccess={() => { }}
                    />
                )}

                {isOwnerOrMember && (
                    <QuickActionsDropdown
                        onCreateTask={() => navigateToView("tasks")}
                        onUploadFile={() => navigateToView("files")}

                        onViewAnalytics={() => navigateToView("analytics")}
                        onViewSprints={() => navigateToView("sprints")}
                        onViewSettings={isCreator ? () => navigateToView("settings") : undefined}
                        isCreator={isCreator}
                    />
                )}
            </ProjectLayout>
        </ProjectErrorBoundary >
    );
}

export default memo(ProjectDashboardClient);
