"use client";

import { useState, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
// import { Input } from "@/components/ui/input"; // Removed unused import
import { Loader2, CheckCircle, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Task {
    id: string;
    title: string;
    status: string;
    priority?: string;
    assigned_to?: string;
    assigned_to_profile?: {
        full_name?: string;
        username?: string;
    };
}

interface TaskMentionPickerProps {
    projectId: string;
    isOpen: boolean;
    onSelect: (task: Task) => void;
    onClose: () => void;
    searchQuery?: string;
}

const statusConfig = {
    todo: { icon: Circle, color: "text-zinc-500" },
    in_progress: { icon: Clock, color: "text-blue-500" },
    done: { icon: CheckCircle, color: "text-emerald-500" },
};

export function TaskMentionPicker({
    projectId,
    isOpen,
    onSelect,
    onClose,
    searchQuery = ""
}: TaskMentionPickerProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && projectId) {
            loadTasks();
        }
    }, [isOpen, projectId, searchQuery]);

    const loadTasks = async () => {
        setLoading(true);
        try {
            const supabase = createSupabaseBrowserClient();
            let query = supabase
                .from('project_tasks')
                .select(`
                    id,
                    title,
                    status,
                    priority,
                    assigned_to,
                    profiles:assigned_to (
                        full_name,
                        username
                    )
                `)
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(50);

            // Filter by search query if provided
            if (searchQuery.trim()) {
                query = query.ilike('title', `%${searchQuery.trim()}%`);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error loading tasks:", error);
                setTasks([]);
            } else {
                const formattedTasks: Task[] = (data || []).map((task: any) => ({
                    id: task.id,
                    title: task.title,
                    status: task.status,
                    priority: task.priority,
                    assigned_to: task.assigned_to,
                    assigned_to_profile: task.profiles ? {
                        full_name: task.profiles.full_name,
                        username: task.profiles.username
                    } : undefined
                }));
                setTasks(formattedTasks);
            }
        } catch (error) {
            console.error("Error loading tasks:", error);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setSelectedIndex(0);
    }, [tasks]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, tasks.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (tasks[selectedIndex]) {
                onSelect(tasks[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            ref={containerRef}
            className="absolute bottom-full left-0 mb-2 w-80 bg-background border rounded-lg shadow-lg z-50"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            <div className="p-2 border-b">
                <div className="text-xs font-medium text-muted-foreground">
                    Mention a task
                </div>
            </div>
            <ScrollArea className="max-h-64">
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground p-8">
                        {searchQuery ? "No tasks found" : "No tasks available"}
                    </div>
                ) : (
                    <div className="p-1">
                        {tasks.map((task, index) => {
                            const config = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
                            const StatusIcon = config.icon;
                            const isSelected = index === selectedIndex;

                            return (
                                <button
                                    key={task.id}
                                    onClick={() => onSelect(task)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                                        isSelected ? "bg-primary/10" : "hover:bg-muted"
                                    )}
                                >
                                    <StatusIcon className={cn("h-4 w-4 flex-shrink-0", config.color)} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">
                                            {task.title}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="capitalize">{task.status.replace('_', ' ')}</span>
                                            {task.assigned_to_profile && (
                                                <>
                                                    <span>•</span>
                                                    <span>{task.assigned_to_profile.full_name || task.assigned_to_profile.username}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
