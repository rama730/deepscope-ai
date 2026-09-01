"use client";

import { MessageSquare, Paperclip, Calendar, Clock, AlertTriangle, CheckCircle2, User } from "lucide-react";
import { getTaskPermissions, getRoleBadge } from "@/lib/taskPermissions";
import { Task } from "./TasksTab";

const STATUS_META = {
    todo: {
        label: "To do",
        className: "text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700",
    },
    in_progress: {
        label: "In progress",
        className: "text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    },
    done: {
        label: "Done",
        className: "text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    },
} as const;

export interface TaskCardProps {
    task: Task;
    onClick: () => void;
    onMoveNext?: () => void;
    onAction?: () => void;
    actionLabel?: string;
    actionIcon?: string;
    actionColor?: string;
    onClaim?: () => void;
    claimLabel?: string;
    isClaiming?: boolean;
    showCompletionInfo?: boolean;
    currentUserId: string | null;
    projectCreatorId: string | undefined;
    isProjectMember: boolean;
    isBulkMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
}

export function TaskCard({
    task,
    onClick,
    onMoveNext,
    onAction,
    actionLabel,
    actionIcon,
    actionColor,
    onClaim,
    claimLabel,
    isClaiming,
    showCompletionInfo,
    currentUserId,
    projectCreatorId,
    isProjectMember,
    isBulkMode,
    isSelected,
    onToggleSelect
}: TaskCardProps) {
    const priorityColors: Record<string, string> = {
        low: "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700",
        medium: "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300",
        high: "text-red-700 bg-red-100 dark:bg-red-900/30 border-red-300",
        urgent: "text-purple-700 bg-purple-100 dark:bg-purple-900/30 border-purple-300",
    };

    const actionColors = {
        blue: "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        emerald: "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    };

    // Check permissions for this task
    const permissions = getTaskPermissions({
        taskId: task.id,
        taskCreatorId: task.created_by,
        taskAssignedTo: task.assigned_to,
        taskStatus: task.status,
        currentUserId,
        projectCreatorId: projectCreatorId || "",
        isProjectMember,
    });

    // Determine if action button should be enabled
    const canPerformAction = task.status === "todo" ? permissions.canStart : permissions.canComplete;
    const actionReason = task.status === "todo" ? permissions.startReason : permissions.completeReason;

    const moveNextLabel = task.status === "todo" ? "Move → In Progress" : task.status === "in_progress" ? "Move → Done" : null;
    const moveNextShort = task.status === "todo" ? "Start" : task.status === "in_progress" ? "Done" : null;
    const statusMeta = STATUS_META[task.status] ?? STATUS_META.todo;

    const canClaim =
        !!onClaim &&
        !!currentUserId &&
        isProjectMember &&
        !task.assigned_to &&
        task.status !== "done";

    // Get role badge
    const roleBadge = getRoleBadge(permissions);

    return (
        <div className={`rounded-lg border-2 bg-white dark:bg-zinc-800 hover:shadow-md transition-all duration-200 overflow-hidden group ${isSelected ? "ring-2 ring-blue-500 dark:ring-blue-400 border-blue-500 dark:border-blue-400" : ""
            }`}>
            <div className="p-3 space-y-3">
                {/* Bulk Selection Checkbox */}
                {isBulkMode && (
                    <div className="flex items-center justify-end">
                        <input
                            type="checkbox"
                            checked={isSelected || false}
                            onChange={(e) => {
                                e.stopPropagation();
                                onToggleSelect?.();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
                        />
                    </div>
                )}
                {/* Role Badge (if applicable) */}
                {roleBadge && (
                    <div className="flex items-center justify-between gap-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${roleBadge.color}`}>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={roleBadge.icon} />
                            </svg>
                            {roleBadge.text}
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <button
                        onClick={(e) => {
                            if (!isBulkMode) {
                                onClick();
                            } else {
                                onToggleSelect?.();
                            }
                        }}
                        className="flex-1 text-left group/title"
                    >
                        <h4 className="font-semibold text-sm line-clamp-2 group-hover/title:text-blue-600 dark:group-hover/title:text-blue-400 transition-colors">
                            {task.title}
                        </h4>
                    </button>
                    <div className="flex items-start gap-1.5">
                        {/* Move-to-next small button (preferred over drag-drop on Task Board) */}
                        {onMoveNext && moveNextLabel && moveNextShort && (
                            <div className="relative group/move">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (canPerformAction) onMoveNext();
                                    }}
                                    disabled={!canPerformAction}
                                    className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                                        canPerformAction
                                            ? "bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-700 cursor-not-allowed"
                                    }`}
                                    title={!canPerformAction ? actionReason : moveNextLabel}
                                >
                                    {moveNextShort}
                                </button>
                                {!canPerformAction && actionReason && (
                                    <div className="invisible group-hover/move:visible absolute bottom-full right-0 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg whitespace-nowrap shadow-lg z-10 max-w-xs text-center">
                                        {actionReason}
                                        <div className="absolute top-full right-3 -mt-1 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-100" />
                                    </div>
                                )}
                            </div>
                        )}

                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${statusMeta.className}`}>
                            {statusMeta.label}
                        </span>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${priorityColors[task.priority]}`}>
                            {String(task.priority || "medium").replace("_", " ")}
                        </span>
                    </div>
                </div>

                {/* Description */}
                {task.description && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                        {task.description}
                    </p>
                )}

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {task.assigned_profile && (
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700/50 px-2 py-1 rounded-md">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[8px] font-bold">
                                {task.assigned_profile.full_name?.[0] || task.assigned_profile.username?.[0] || "?"}
                            </div>
                            <span className="truncate max-w-[100px]">
                                {task.assigned_profile.full_name || task.assigned_profile.username || "Unassigned"}
                            </span>
                        </div>
                    )}

                    {task.due_date && (
                        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700/50 px-2 py-1 rounded-md">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                    )}
                </div>

                {/* Completion submission files were removed from the workflow.
                   If you need files, use the task Files tab (attachments). */}

                {/* Timestamps */}
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    {task.started_at && !task.completed_at && (
                        <span>Started {new Date(task.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    )}
                    {task.completed_at && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ Completed {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    )}
                </div>
            </div>

            {/* Action Button */}
            {canClaim && (
                <div className="border-t border-zinc-200 dark:border-zinc-700">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClaim?.();
                        }}
                        disabled={!!isClaiming}
                        className={`w-full px-3 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${isClaiming
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                        title="Claim & start"
                    >
                        {isClaiming ? "Claiming…" : (claimLabel || "Claim & Start")}
                    </button>
                </div>
            )}
            {onAction && actionLabel && (
                <div className="relative group/action">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (canPerformAction) {
                                onAction();
                            }
                        }}
                        disabled={!canPerformAction}
                        className={`w-full px-3 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all border-t-2 ${canPerformAction
                            ? actionColors[actionColor as keyof typeof actionColors] || ""
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-700 cursor-not-allowed"
                            }`}
                        title={!canPerformAction ? actionReason : undefined}
                    >
                        {!canPerformAction && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        )}
                        {canPerformAction && actionIcon && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={actionIcon} />
                            </svg>
                        )}
                        {actionLabel}
                    </button>
                    {/* Tooltip for disabled state */}
                    {!canPerformAction && actionReason && (
                        <div className="invisible group-hover/action:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg whitespace-nowrap shadow-lg z-10 max-w-xs text-center">
                            {actionReason}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-100" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
