"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
    ProjectOverviewCard,
    TeamCard,
    OpenRolesCard,
    ProjectPulseCard,
} from "@/components/projects/dashboard";
import { Suspense } from "react";
import { TabErrorBoundary } from "@/components/projects/TabErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateTasksAction } from "@/app/(main)/projects/[id]/actions";
import { Clock, UserPlus, Play, CheckCircle2, ChevronRight } from "lucide-react";
// import { useToast } from "@/components/ui-custom/Toast";
import SwipeableRow from "@/components/common/SwipeableRow";
import { useTaskStatusFlow } from "@/lib/tasks/useTaskStatusFlow";
import { useProjectActivityFeed } from "@/hooks/useProjectActivityFeed";

const DASH_STATUS_META = {
    todo: {
        label: "To do",
        className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    },
    in_progress: {
        label: "In progress",
        className: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    },
    done: {
        label: "Done",
        className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    },
} as const;

const DASH_PRIORITY_META: Record<string, { label: string; className: string }> = {
    urgent: {
        label: "Urgent",
        className: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    },
    high: {
        label: "High",
        className: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    },
    medium: {
        label: "Medium",
        className: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    },
    low: {
        label: "Low",
        className: "bg-zinc-50 text-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800",
    },
};

interface DashboardTabProps {
    project: any;
    isCreator: boolean;
    isOwnerOrMember: boolean;
    isCollaborator: boolean;
    currentUserId: string | null;

    // Data
    tasks: any[];
    dashboardTasks: any[] | null;
    files: any[];
    members: any[];
    rolesWithFilled: any[];
    projectActivityEvents: any[];

    // Counts
    followersCount: number;
    bookmarkCount: number;

    // Interaction State
    bookmarked: boolean;
    bookmarkLoading: boolean;
    shareCopied: boolean;

    // Handlers
    onEdit: (tab?: string) => void;
    onShare: () => void;
    onBookmark: () => void;
    onFinalize: () => void;
    onAdvanceStage: () => void;
    onApplyToRole: (role: any) => void;
    onManageTeam: () => void;
    onViewBoard: () => void;
    onUploadFile: () => void;
    onViewAnalytics: () => void;
    onViewSprints: () => void;
    onViewSettings: () => void;
    onTaskClick: (taskId: string) => void;

    // Constants
    lifecycleStages: any[];
}

export function DashboardTab({
    project,
    isCreator,
    isOwnerOrMember,
    isCollaborator,
    currentUserId,
    tasks,
    dashboardTasks,
    files: _files, // kept for prop interface
    members,
    rolesWithFilled,
    // files, projectActivityEvents removed from usage
    followersCount,
    bookmarkCount,
    bookmarked,
    bookmarkLoading,
    shareCopied,
    onEdit,
    onShare,
    onBookmark,
    onFinalize,
    onAdvanceStage,
    onApplyToRole,
    onManageTeam,
    onViewBoard,
    onUploadFile,
    onViewAnalytics,
    onViewSprints,
    onViewSettings,
    onTaskClick,
    lifecycleStages
}: DashboardTabProps) {

    const tasksForPulse = dashboardTasks ?? tasks;
    const supabase = useMemo(() => createSupabaseBrowserClient(), []);
    // const { showToast } = useToast();
    const { moveNext: moveTaskNext, setStatus: setTaskStatus } = useTaskStatusFlow(project.id);

    const [activeSprint, setActiveSprint] = useState<{ id: string; name: string } | null>(null);
    const [taskActionLoading, setTaskActionLoading] = useState<Record<string, boolean>>({});

    // Lightweight: determine active sprint for “move to sprint” actions.
    useEffect(() => {
        if (!project?.id) return;
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from("project_sprints")
                .select("id, name")
                .eq("project_id", project.id)
                .eq("status", "active")
                .maybeSingle();
            if (cancelled) return;
            if (data?.id) setActiveSprint({ id: data.id, name: data.name });
            else setActiveSprint(null);
        })();
        return () => { cancelled = true; };
    }, [project?.id, supabase]);

    const quickUpdateTask = useCallback(async (taskId: string, updates: any) => {
        if (!project?.id || !taskId) return;
        setTaskActionLoading((prev) => ({ ...prev, [taskId]: true }));
        try {
            const result = await updateTasksAction(project.id, [taskId], updates);
            if (!result?.success) {
                console.error("Quick task update failed:", result?.error);
            }
        } finally {
            setTaskActionLoading((prev) => ({ ...prev, [taskId]: false }));
        }
    }, [project?.id]);

    // Status transitions now use shared status flow hook
    const confirmStatusChange = useCallback((t: any, nextStatus: "todo" | "in_progress" | "done") => {
        const label = nextStatus === "in_progress" ? "In Progress" : nextStatus === "done" ? "Done" : "To Do";
        return window.confirm(`Move "${t?.title || "task"}" to ${label}?`);
    }, []);

    const handleMoveNext = useCallback(
        async (t: any) => {
            if (!t?.id) return;
            const next = t.status === "todo" ? "in_progress" : t.status === "in_progress" ? "done" : null;
            if (!next) return;
            if (!confirmStatusChange(t, next)) return;
            await moveTaskNext(t, { withUndoToast: true });
        },
        [confirmStatusChange, moveTaskNext]
    );

    const handleSetStatus = useCallback(
        async (t: any, nextStatus: "todo" | "in_progress" | "done") => {
            if (!t?.id) return;
            if (t?.status === nextStatus) return;
            if (!confirmStatusChange(t, nextStatus)) return;
            await setTaskStatus(t, nextStatus, { withUndoToast: true });
        },
        [confirmStatusChange, setTaskStatus]
    );

    const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

    const myFocus = useMemo(() => {
        if (!currentUserId) return [];
        const list = (tasks || []).filter((t: any) => t?.status !== "done" && t?.assigned_to === currentUserId);
        return list.sort((a: any, b: any) => {
            const pa = priorityRank[a?.priority] ?? 9;
            const pb = priorityRank[b?.priority] ?? 9;
            if (pa !== pb) return pa - pb;
            const da = a?.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
            const db = b?.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
            if (da !== db) return da - db;
            return new Date(b?.updated_at || b?.created_at || 0).getTime() - new Date(a?.updated_at || a?.created_at || 0).getTime();
        }).slice(0, 6);
    }, [tasks, currentUserId]);

    const needsOwner = useMemo(() => {
        const list = (tasks || []).filter((t: any) => t?.status !== "done" && !t?.assigned_to);
        return list.sort((a: any, b: any) => {
            const pa = priorityRank[a?.priority] ?? 9;
            const pb = priorityRank[b?.priority] ?? 9;
            if (pa !== pb) return pa - pb;
            return new Date(b?.updated_at || b?.created_at || 0).getTime() - new Date(a?.updated_at || a?.created_at || 0).getTime();
        }).slice(0, 6);
    }, [tasks]);

    const overdue = useMemo(() => {
        const now = Date.now();
        const list = (tasks || []).filter((t: any) => {
            if (t?.status === "done") return false;
            if (!t?.due_date) return false;
            return new Date(t.due_date).getTime() < now;
        });
        return list.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 6);
    }, [tasks]);

    const activeSprintTasks = useMemo(() => {
        if (!activeSprint?.id) return [];
        const list = (tasks || []).filter((t: any) => t?.sprint_id === activeSprint.id && t?.status !== "done");
        return list.sort((a: any, b: any) => (priorityRank[a?.priority] ?? 9) - (priorityRank[b?.priority] ?? 9)).slice(0, 6);
    }, [tasks, activeSprint?.id]);

    // Fetches infinite feed from DB view
    const {
        data: activityData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useProjectActivityFeed(project.id);

    // Map to component format
    const pulseActivities = useMemo(() => {
        const rawItems = activityData?.pages.flat() || [];
        return rawItems.map((item) => ({
            id: item.id,
            type: item.type,
            description: item.description,
            created_at: item.created_at,
            metadata: item.metadata,
            actor: item.actor
                ? {
                    name: item.actor.full_name || item.actor.username || "Unknown",
                    id: item.actor_id || undefined,
                }
                : null,
        }));
    }, [activityData]);

    const hasMeaningfulPulseActivity = useMemo(() => {
        return pulseActivities.some((a: any) => {
            if (a?.type === "project_updated" && a?.metadata?.kind === "project_created") return false;
            return true;
        });
    }, [pulseActivities]);

    const hasPriorityTasks = useMemo(() => {
        const list = tasksForPulse || [];
        const active = list.filter((t: any) => t?.status !== "done");
        const myFocusCount = currentUserId
            ? active.filter((t: any) => t?.assigned_to === currentUserId).length
            : 0;
        const teamAttentionCount = active.filter((t: any) => !t?.assigned_to).length;
        const urgentOrHighCount = active.filter((t: any) => t?.priority === "urgent" || t?.priority === "high").length;
        return myFocusCount > 0 || teamAttentionCount > 0 || urgentOrHighCount > 0;
    }, [tasksForPulse, currentUserId]);

    const showPulseFirst = isOwnerOrMember && (hasMeaningfulPulseActivity || hasPriorityTasks);

    const totalOpenPositions = useMemo(() => {
        return (rolesWithFilled || []).reduce((sum: number, role: any) => {
            const remaining = (role?.count || 0) - (role?.filled || 0);
            return sum + Math.max(0, remaining);
        }, 0);
    }, [rolesWithFilled]);

    const pulseCard = (
        <TabErrorBoundary tabName="Dashboard">
            <Suspense fallback={<CardSkeleton />}>
                <ProjectPulseCard
                    projectId={project.id}
                    activities={pulseActivities}
                    tasks={tasksForPulse || []}
                    isCollaborator={isOwnerOrMember}
                    isCreator={isCreator}
                    currentUserId={currentUserId}
                    onViewBoard={onViewBoard}
                    onUploadFile={onUploadFile}
                    onViewAnalytics={onViewAnalytics}
                    onViewSprints={onViewSprints}
                    onViewSettings={onViewSettings}
                    onTaskClick={onTaskClick}
                    hasMoreActivities={hasNextPage}
                    isLoadingActivities={isFetchingNextPage}
                    onLoadMoreActivities={fetchNextPage}
                />
            </Suspense>
        </TabErrorBoundary>
    );

    const teamAndRoles = (
        <>
            <TabErrorBoundary tabName="Team">
                <Suspense fallback={<CardSkeleton />}>
                    <TeamCard
                        project={project}
                        members={members}
                        openRoles={rolesWithFilled}
                        isCreator={isCreator}
                        onManageTeam={onManageTeam}
                        onInvite={onManageTeam}
                    />
                </Suspense>
            </TabErrorBoundary>
            {totalOpenPositions > 0 && (
                <OpenRolesCard
                    roles={rolesWithFilled}
                    isCreator={isCreator}
                    isCollaborator={isCollaborator}
                    hasPendingApplication={false}
                    onApply={onApplyToRole}
                    onManageRoles={() => onEdit("roles")}
                />
            )}
        </>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
                <ProjectOverviewCard
                    project={project}
                    isCreator={isCreator}
                    bookmarked={bookmarked}
                    bookmarkCount={bookmarkCount}
                    followersCount={followersCount}
                    membersCount={members.length + 1}
                    hideActionBar={true}
                    onEdit={() => onEdit("essentials")}
                    onShare={onShare}
                    onBookmark={onBookmark}
                    onFinalize={onFinalize}
                    shareCopied={shareCopied}
                    bookmarkLoading={bookmarkLoading}
                    lifecycleStages={lifecycleStages}
                    currentStageIndex={project.current_stage_index || 0}
                    onAdvanceStage={onAdvanceStage}
                />

                {/* Next actions (productivity cockpit) */}
                {isOwnerOrMember && (
                    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Next actions</h3>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                    High-signal work lists with one-click actions.
                                </p>
                            </div>
                            <button
                                onClick={onViewBoard}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                View all tasks <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ActionList
                                title="My Focus"
                                emptyText="No active tasks assigned to you."
                                items={myFocus}
                                currentUserId={currentUserId}
                                loadingMap={taskActionLoading}
                                onOpen={onTaskClick}
                                onStart={(t) => {
                                    if (t.status === "todo") {
                                        handleMoveNext(t);
                                    } else {
                                        handleSetStatus(t, "in_progress");
                                    }
                                }}
                                onDone={(t) => {
                                    if (t.status === "in_progress") {
                                        handleMoveNext(t);
                                    } else {
                                        handleSetStatus(t, "done");
                                    }
                                }}
                                onAssignToMe={undefined}
                                onMoveToActiveSprint={
                                    activeSprint?.id
                                        ? (id) => quickUpdateTask(id, { sprint_id: activeSprint.id })
                                        : undefined
                                }
                                activeSprintName={activeSprint?.name}
                            />

                            <ActionList
                                title="Needs Owner"
                                emptyText="No unassigned tasks right now."
                                items={needsOwner}
                                currentUserId={currentUserId}
                                loadingMap={taskActionLoading}
                                onOpen={onTaskClick}
                                onStart={undefined}
                                onDone={undefined}
                                onAssignToMe={currentUserId ? (id) => quickUpdateTask(id, { assigned_to: currentUserId }) : undefined}
                                onMoveToActiveSprint={
                                    activeSprint?.id
                                        ? (id) => quickUpdateTask(id, { sprint_id: activeSprint.id })
                                        : undefined
                                }
                                activeSprintName={activeSprint?.name}
                            />

                            <ActionList
                                title="Overdue"
                                emptyText="No overdue tasks."
                                items={overdue}
                                currentUserId={currentUserId}
                                loadingMap={taskActionLoading}
                                onOpen={onTaskClick}
                                onStart={(t) => {
                                    if (t.status === "todo") {
                                        handleMoveNext(t);
                                    } else {
                                        handleSetStatus(t, "in_progress");
                                    }
                                }}
                                onDone={(t) => {
                                    if (t.status === "in_progress") {
                                        handleMoveNext(t);
                                    } else {
                                        handleSetStatus(t, "done");
                                    }
                                }}
                                onAssignToMe={undefined}
                                onMoveToActiveSprint={undefined}
                                activeSprintName={undefined}
                                showDueDate
                            />

                            <ActionList
                                title={activeSprint?.name ? `Active Sprint: ${activeSprint.name}` : "Active Sprint"}
                                emptyText={activeSprint?.id ? "No active sprint tasks right now." : "No active sprint. Create or start one in Sprints."}
                                items={activeSprintTasks}
                                currentUserId={currentUserId}
                                loadingMap={taskActionLoading}
                                onOpen={onTaskClick}
                                onStart={(t) => {
                                    if (t.status === "todo") {
                                        handleMoveNext(t);
                                    } else {
                                        handleSetStatus(t, "in_progress");
                                    }
                                }}
                                onDone={(t) => {
                                    if (t.status === "in_progress") {
                                        handleMoveNext(t);
                                    } else {
                                        handleSetStatus(t, "done");
                                    }
                                }}
                                onAssignToMe={undefined}
                                onMoveToActiveSprint={undefined}
                                activeSprintName={activeSprint?.name}
                                showDueDate
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="lg:col-span-5 space-y-6">
                {showPulseFirst ? (
                    <>
                        {pulseCard}
                        {teamAndRoles}
                    </>
                ) : (
                    <>
                        {teamAndRoles}
                        {pulseCard}
                    </>
                )}
            </div>
        </div>
    );
}

function ActionList({
    title,
    emptyText,
    items,
    currentUserId,
    loadingMap,
    onOpen,
    onAssignToMe,
    onStart,
    onDone,
    onMoveToActiveSprint,
    activeSprintName,
    showDueDate,
}: {
    title: string;
    emptyText: string;
    items: any[];
    currentUserId: string | null;
    loadingMap: Record<string, boolean>;
    onOpen: (taskId: string) => void;
    onAssignToMe?: (taskId: string) => void;
    onStart?: (task: any) => void;
    onDone?: (task: any) => void;
    onMoveToActiveSprint?: (taskId: string) => void;
    activeSprintName?: string;
    showDueDate?: boolean;
}) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-800/10 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-200">{title}</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">{items.length}</div>
            </div>
            <div className="p-2 space-y-1.5">
                {items.length === 0 ? (
                    <div className="px-2 py-4 text-xs text-slate-500 dark:text-zinc-400 text-center">
                        {emptyText}
                    </div>
                ) : (
                    items.map((t: any) => {
                        const busy = !!loadingMap[t.id];
                        const isUnassigned = !t?.assigned_to;
                        const isTodo = t?.status === "todo";
                        const isInProgress = t?.status === "in_progress";
                        const isDone = t?.status === "done";
                        const statusMeta = DASH_STATUS_META[t?.status as keyof typeof DASH_STATUS_META] ?? DASH_STATUS_META.todo;
                        const priorityKey = String(t?.priority || "medium").toLowerCase();
                        const priorityMeta = DASH_PRIORITY_META[priorityKey] ?? DASH_PRIORITY_META.medium!;

                        const canNextStart = !!onStart && isTodo && !isDone;
                        const canNextDone = !!onDone && isInProgress && !isDone;
                        const nextAction = canNextStart
                            ? { label: "Start", onClick: () => onStart?.(t), className: "bg-blue-600 text-white hover:bg-blue-700", icon: Play }
                            : canNextDone
                                ? { label: "Done", onClick: () => onDone?.(t), className: "bg-emerald-600 text-white hover:bg-emerald-700", icon: CheckCircle2 }
                                : null;

                        return (
                            <SwipeableRow
                                key={t.id}
                                canSwipe={!!onStart || !!onDone}
                                onSwipeRight={onStart && isTodo && !isDone ? () => onStart(t) : undefined}
                                onSwipeLeft={onDone && isInProgress && !isDone ? () => onDone(t) : undefined}
                                rightLabel={onStart && isTodo && !isDone ? "Start" : undefined}
                                leftLabel={onDone && isInProgress && !isDone ? "Done" : undefined}
                                rightColor="bg-blue-600"
                                leftColor="bg-emerald-600"
                            >
                                <div
                                    className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-colors"
                                >
                                    <button
                                        onClick={() => onOpen(t.id)}
                                        className="flex-1 min-w-0 text-left"
                                        title="Open task"
                                    >
                                        <div className="text-sm font-medium text-slate-900 dark:text-zinc-100 truncate">
                                            {t.title}
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusMeta.className}`}>
                                                {statusMeta.label}
                                            </span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${priorityMeta.className}`}>
                                                {priorityMeta.label}
                                            </span>
                                            {showDueDate && t?.due_date ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-900">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(t.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                                </span>
                                            ) : null}
                                        </div>
                                    </button>

                                    <div className="flex items-center gap-1.5 pt-0.5">
                                        {onAssignToMe && isUnassigned && currentUserId && (
                                            <button
                                                disabled={busy}
                                                onClick={() => onAssignToMe(t.id)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                                                title="Assign to me"
                                            >
                                                <UserPlus className="w-3 h-3" />
                                                Me
                                            </button>
                                        )}

                                        {onMoveToActiveSprint && !t?.sprint_id && activeSprintName && (
                                            <button
                                                disabled={busy}
                                                onClick={() => onMoveToActiveSprint(t.id)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                                                title={`Move to ${activeSprintName}`}
                                            >
                                                <ChevronRight className="w-3 h-3" />
                                                Sprint
                                            </button>
                                        )}

                                        {nextAction && (
                                            <button
                                                disabled={busy}
                                                onClick={nextAction.onClick}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium disabled:opacity-50 ${nextAction.className}`}
                                                title={nextAction.label}
                                            >
                                                <nextAction.icon className="w-3 h-3" />
                                                {nextAction.label}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </SwipeableRow>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function CardSkeleton() {
    return (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-md" />
                <Skeleton className="w-32 h-5" />
            </div>
            <div className="space-y-3 pt-4">
                <Skeleton className="w-full h-12 rounded-xl" />
                <Skeleton className="w-full h-12 rounded-xl" />
                <Skeleton className="w-full h-12 rounded-xl" />
            </div>
        </div>
    );
}

export default DashboardTab;
