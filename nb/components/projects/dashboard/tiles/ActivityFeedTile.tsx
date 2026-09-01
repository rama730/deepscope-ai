"use client";

import { FileText, MessageSquare, CheckCircle2, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Task } from "@/types/domain";

interface ProjectFile {
    id: string;
    name: string;
    created_at: string;
    [key: string]: unknown;
}

interface ActivityItem {
    id: string;
    type: 'file_upload' | 'task_complete' | 'new_member' | 'comment';
    user: { name: string; avatar: string | null };
    content: string;
    timestamp: string;
}

interface ActivityFeedTileProps {
    files: ProjectFile[];
    recentTasks: Task[]; // completed recently
}

export default function ActivityFeedTile({ files = [], recentTasks = [] }: ActivityFeedTileProps) {

    // Merge and sort for display
    const activities: ActivityItem[] = [
        ...files.map(f => ({
            id: f.id,
            type: 'file_upload' as const,
            user: { name: "Team Member", avatar: null },
            content: `uploaded ${f.name}`,
            timestamp: f.created_at
        })),
        ...recentTasks.map(t => ({
            id: t.id,
            type: 'task_complete' as const,
            user: { name: "Team Member", avatar: null },
            content: `${t.status === 'done' ? 'completed' : 'created'} task "${t.title}"`,
            timestamp: t.updated_at || t.created_at
        }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

    return (
        <div className="h-full bg-white dark:bg-[#0d1117] rounded-md border border-zinc-200 dark:border-zinc-800 flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Activity</h3>
                <span className="text-xs text-zinc-500">Recent Activity</span>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {activities.length > 0 ? activities.map((item, i) => (
                        <div key={i} className="px-4 py-3 flex gap-3 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors">
                            <div className="mt-1">
                                {item.type === 'file_upload' && <FileText className="w-3.5 h-3.5 text-blue-500" />}
                                {item.type === 'task_complete' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                {item.type === 'new_member' && <UserPlus className="w-3.5 h-3.5 text-indigo-500" />}
                                {item.type === 'comment' && <MessageSquare className="w-3.5 h-3.5 text-amber-500" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
                                    <span className="font-semibold hover:text-blue-600 cursor-pointer">{item.user.name}</span>
                                    <span className="text-zinc-600 dark:text-zinc-400"> {item.content}</span>
                                </p>
                                <p className="text-xs text-zinc-400 mt-1 font-mono">
                                    {(() => {
                                        if (!item.timestamp) return "just now";
                                        const date = new Date(item.timestamp);
                                        return isNaN(date.getTime()) ? "just now" : `${formatDistanceToNow(date)} ago`;
                                    })()}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <div className="p-6 text-center text-zinc-400 text-sm italic">
                            No recent activity.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

