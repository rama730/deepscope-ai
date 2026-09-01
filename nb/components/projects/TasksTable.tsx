"use client";

import { TableVirtuoso } from "react-virtuoso";
import { MoreVertical, User, Calendar, Flag, Target, Hash, Play } from "lucide-react";

interface Task {
    id: string;
    title: string;
    status: "todo" | "in_progress" | "done";
    priority: "low" | "medium" | "high" | "urgent";
    assigned_to: string | null;
    due_date: string | null;
    created_at: string;
    story_points?: number | null;
    sprint_id?: string | null;
    sprint_name?: string;
    assigned_profile?: {
        full_name: string | null;
        username: string | null;
    };
}

interface TasksTableProps {
    tasks: Task[];
    sortField: string;
    sortOrder: "asc" | "desc";
    onSort: (field: string) => void;
    selectedTaskIds: Set<string>;
    onToggleSelect: (taskId: string) => void;
    onTaskClick: (task: Task) => void;
    isBulkMode: boolean;
    onClaimTask?: (taskId: string) => void;
    claimLoading?: Record<string, boolean>;
}

export default function TasksTable({
    tasks,
    sortField,
    sortOrder,
    onSort,
    selectedTaskIds,
    onToggleSelect,
    onTaskClick,
    isBulkMode,
    onClaimTask,
    claimLoading,
}: TasksTableProps) {

    const sortIcon = (field: string) => {
        if (sortField !== field) return <span className="opacity-0 group-hover:opacity-30">↕</span>;
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'urgent': return "text-purple-600 dark:text-purple-400";
            case 'high': return "text-red-600 dark:text-red-400";
            case 'medium': return "text-amber-600 dark:text-amber-400";
            default: return "text-zinc-500 dark:text-zinc-400";
        }
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'done': return "text-emerald-600 dark:text-emerald-400";
            case 'in_progress': return "text-amber-600 dark:text-amber-400";
            default: return "text-zinc-500 dark:text-zinc-400";
        }
    };

    const getStatusLabel = (s: string) => {
        switch (s) {
            case 'done': return "Done";
            case 'in_progress': return "In Progress";
            default: return "To Do";
        }
    };

    return (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-[600px] overflow-hidden">
            <TableVirtuoso
                data={tasks}
                style={{ height: '100%' }}
                fixedHeaderContent={() => (
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                        {isBulkMode && (
                            <th className="px-4 py-3 w-12 text-left">
                                <input
                                    type="checkbox"
                                    checked={selectedTaskIds.size === tasks.length && tasks.length > 0}
                                    onChange={() => {
                                        if (selectedTaskIds.size === tasks.length) {
                                            tasks.forEach(t => {
                                                if (selectedTaskIds.has(t.id)) {
                                                    onToggleSelect(t.id);
                                                }
                                            });
                                        } else {
                                            tasks.forEach(t => {
                                                if (!selectedTaskIds.has(t.id)) {
                                                    onToggleSelect(t.id);
                                                }
                                            });
                                        }
                                    }}
                                    className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </th>
                        )}
                        <th
                            className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            onClick={() => onSort('title')}
                        >
                            <div className="flex items-center gap-1.5">
                                Title {sortIcon('title')}
                            </div>
                        </th>
                        <th
                            className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            onClick={() => onSort('status')}
                        >
                            <div className="flex items-center gap-1.5">
                                Status {sortIcon('status')}
                            </div>
                        </th>
                        <th
                            className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            onClick={() => onSort('priority')}
                        >
                            <div className="flex items-center gap-1.5">
                                <Flag className="w-3.5 h-3.5" />
                                Priority {sortIcon('priority')}
                            </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                Assignee
                            </div>
                        </th>
                        <th
                            className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            onClick={() => onSort('due_date')}
                        >
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                Due {sortIcon('due_date')}
                            </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5" />
                                Sprint
                            </div>
                        </th>
                        <th
                            className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            onClick={() => onSort('story_points')}
                        >
                            <div className="flex items-center gap-1.5">
                                <Hash className="w-3.5 h-3.5" />
                                Points {sortIcon('story_points')}
                            </div>
                        </th>
                        <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            <MoreVertical className="w-4 h-4 mx-auto opacity-0" />
                        </th>
                    </tr>
                )}
                itemContent={(_index, task) => (
                    <>
                        {isBulkMode && (
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={selectedTaskIds.has(task.id)}
                                    onChange={() => onToggleSelect(task.id)}
                                    className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                                />
                            </td>
                        )}
                        <td className="px-4 py-3">
                            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
                                {task.title}
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <span className={`text-xs font-medium capitalize ${getStatusColor(task.status)}`}>
                                {getStatusLabel(task.status)}
                            </span>
                        </td>
                        <td className="px-4 py-3">
                            <span className={`text-xs font-medium capitalize ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                            </span>
                        </td>
                        <td className="px-4 py-3">
                            {task.assigned_profile ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                                        {task.assigned_profile.full_name?.[0] || task.assigned_profile.username?.[0] || "?"}
                                    </div>
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[100px]">
                                        {task.assigned_profile.full_name || task.assigned_profile.username || "Unassigned"}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                            )}
                        </td>
                        <td className="px-4 py-3">
                            {task.due_date ? (
                                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                    {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            ) : (
                                <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                            )}
                        </td>
                        <td className="px-4 py-3">
                            {task.sprint_name ? (
                                <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">
                                    {task.sprint_name}
                                </span>
                            ) : (
                                <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                            )}
                        </td>
                        <td className="px-4 py-3">
                            {task.story_points ? (
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                    {task.story_points}
                                </span>
                            ) : (
                                <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                            )}
                        </td>
                        <td className="px-4 py-3 text-center">
                            {onClaimTask && !task.assigned_to && task.status !== "done" ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClaimTask(task.id);
                                    }}
                                    disabled={!!claimLoading?.[task.id]}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Claim & start"
                                >
                                    <Play className="w-3 h-3" />
                                    {claimLoading?.[task.id] ? "Claiming…" : "Claim"}
                                </button>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Row menu would go here
                                    }}
                                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            )}
                        </td>
                    </>
                )}
                components={{
                    Table: (props) => <table {...props} className="w-full text-left text-sm border-collapse" />,
                    TableRow: (props) => {
                        const { item: task, ...rest } = props as any;
                        return (
                            <tr
                                {...rest}
                                onClick={() => {
                                    if (isBulkMode) {
                                        onToggleSelect(task.id);
                                    } else {
                                        onTaskClick(task);
                                    }
                                }}
                                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800/50"
                            />
                        );
                    }
                }}
            />
            {tasks.length === 0 && (
                <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">No tasks found</div>
            )}
        </div>
    );
}
