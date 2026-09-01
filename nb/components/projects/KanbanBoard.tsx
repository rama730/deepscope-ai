"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import { Task } from "./TasksTab";
import { TaskCard } from "./TaskCard";
import { ClipboardList, Plus, MoreVertical, ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export interface KanbanBoardProps {
    tasks: Task[];
    onMoveNext?: (task: Task) => void | Promise<void>;
    onTaskClick: (task: Task) => void;
    currentUserId: string | null;
    projectCreatorId: string | undefined;
    isOwnerOrMember: boolean;
    isBulkMode?: boolean;
    selectedTaskIds?: Set<string>;
    onToggleSelect?: (taskId: string) => void;
    onAddTask?: (status: Task['status']) => void;
    onClaimTask?: (taskId: string) => void;
    claimLoading?: Record<string, boolean>;
}

export function KanbanBoard({
    tasks,
    onMoveNext,
    onTaskClick,
    currentUserId,
    projectCreatorId,
    isOwnerOrMember,
    isBulkMode,
    selectedTaskIds,
    onToggleSelect,
    onAddTask,
    onClaimTask,
    claimLoading
}: KanbanBoardProps) {
    const [doneExpanded, setDoneExpanded] = useState(false);

    const tasksByStatus = useMemo(() => ({
        todo: tasks.filter(t => t.status === "todo"),
        in_progress: tasks.filter(t => t.status === "in_progress"),
        done: tasks.filter(t => t.status === "done"),
    }), [tasks]);

    return (
        <div className="grid gap-4 lg:grid-cols-3">
            <KanbanColumn
                id="todo"
                title="To Do"
                tasks={tasksByStatus.todo}
                onTaskClick={onTaskClick}
                onMoveNext={onMoveNext}
                currentUserId={currentUserId}
                projectCreatorId={projectCreatorId}
                isOwnerOrMember={isOwnerOrMember}
                isBulkMode={isBulkMode}
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={onToggleSelect}
                onAddTask={onAddTask ? () => onAddTask("todo") : undefined}
                onClaimTask={onClaimTask}
                claimLoading={claimLoading}
            />
            <KanbanColumn
                id="in_progress"
                title="In Progress"
                tasks={tasksByStatus.in_progress}
                onTaskClick={onTaskClick}
                onMoveNext={onMoveNext}
                currentUserId={currentUserId}
                projectCreatorId={projectCreatorId}
                isOwnerOrMember={isOwnerOrMember}
                isBulkMode={isBulkMode}
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={onToggleSelect}
                onAddTask={onAddTask ? () => onAddTask("in_progress") : undefined}
                onClaimTask={onClaimTask}
                claimLoading={claimLoading}
            />
            <KanbanColumn
                id="done"
                title="Done"
                tasks={tasksByStatus.done}
                showCompletionInfo
                isCollapsed={!doneExpanded}
                onToggleCollapse={() => setDoneExpanded(!doneExpanded)}
                onTaskClick={onTaskClick}
                onMoveNext={undefined}
                currentUserId={currentUserId}
                projectCreatorId={projectCreatorId}
                isOwnerOrMember={isOwnerOrMember}
                isBulkMode={isBulkMode}
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={onToggleSelect}
                onClaimTask={onClaimTask}
                claimLoading={claimLoading}
            />
        </div>
    );
}

interface KanbanColumnProps {
    id: string;
    title: string;
    tasks: Task[];
    showCompletionInfo?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    onTaskClick: (task: Task) => void;
    onMoveNext?: (task: Task) => void;
    currentUserId: string | null;
    projectCreatorId: string | undefined;
    isOwnerOrMember: boolean;
    isBulkMode?: boolean;
    selectedTaskIds?: Set<string>;
    onToggleSelect?: (taskId: string) => void;
    onAddTask?: () => void;
    onClaimTask?: (taskId: string) => void;
    claimLoading?: Record<string, boolean>;
}

function KanbanColumn({
    title,
    tasks,
    showCompletionInfo,
    isCollapsed,
    onToggleCollapse,
    onTaskClick,
    onMoveNext,
    currentUserId,
    projectCreatorId,
    isOwnerOrMember,
    isBulkMode,
    selectedTaskIds,
    onToggleSelect,
    onAddTask,
    onClaimTask,
    claimLoading
}: KanbanColumnProps) {
    const displayTasks = isCollapsed ? tasks.slice(0, 5) : tasks;
    const hasMore = isCollapsed && tasks.length > 5;

    const itemContent = useCallback((_: number, task: Task) => (
        <div
            key={task.id}
            className="mb-3"
        >
            <TaskCard
                task={task}
                showCompletionInfo={showCompletionInfo}
                onClick={() => onTaskClick(task)}
                onMoveNext={onMoveNext ? () => onMoveNext(task) : undefined}
                onClaim={onClaimTask ? () => onClaimTask(task.id) : undefined}
                isClaiming={!!claimLoading?.[task.id]}
                currentUserId={currentUserId}
                projectCreatorId={projectCreatorId}
                isProjectMember={isOwnerOrMember}
                isBulkMode={isBulkMode}
                isSelected={selectedTaskIds?.has(task.id)}
                onToggleSelect={() => onToggleSelect?.(task.id)}
            />
        </div>
    ), [showCompletionInfo, onTaskClick, onMoveNext, onClaimTask, claimLoading, currentUserId, projectCreatorId, isOwnerOrMember, isBulkMode, selectedTaskIds, onToggleSelect]);

    return (
        <div
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col min-h-[280px] max-h-[600px]"
        >
            {/* Clean, neutral header */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-3 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{title}</h3>
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {tasks.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {onAddTask && (
                            <button
                                onClick={onAddTask}
                                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                                title="Add task"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                        {onToggleCollapse && (
                            <button
                                onClick={onToggleCollapse}
                                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                                title={isCollapsed ? "Show all" : "Collapse"}
                            >
                                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                        )}
                        <button
                            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                            title="Column options"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Virtualized content */}
            <div className="flex-1 overflow-hidden min-h-0">
                {tasks.length === 0 ? (
                    <div className="min-h-[200px] flex items-center justify-center p-4">
                        <EmptyState
                            icon={ClipboardList}
                            title="No tasks"
                            description="Add a task or move it here using the next button"
                            className="py-4 border-none bg-transparent"
                        />
                    </div>
                ) : (
                    <Virtuoso
                        data={displayTasks}
                        itemContent={itemContent}
                        style={{ height: "100%" }}
                        components={{
                            List: React.forwardRef<HTMLDivElement>((props, ref) => (
                                <div {...props} ref={ref} className="p-4 pt-5" />
                            )),
                        }}
                    />
                )}
            </div>

            {/* Collapsed footer */}
            {hasMore && (
                <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <button
                        onClick={onToggleCollapse}
                        className="w-full text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium py-1.5"
                    >
                        Show {tasks.length - 5} more
                    </button>
                </div>
            )}
        </div>
    );
}
