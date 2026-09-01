"use client";

import { Link } from "lucide-react";
import { CheckCircle, Circle, Clock } from "lucide-react";

interface TaskLinkProps {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  projectId: string;
  compact?: boolean;
}

const statusConfig = {
  todo: { icon: Circle, color: "text-zinc-500", bgColor: "bg-zinc-100 dark:bg-zinc-800" },
  in_progress: { icon: Clock, color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  done: { icon: CheckCircle, color: "text-emerald-500", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
};

export default function TaskLink({ taskId, taskTitle, taskStatus, projectId, compact = false }: TaskLinkProps) {
  const config = statusConfig[taskStatus as keyof typeof statusConfig] || statusConfig.todo;
  const StatusIcon = config.icon;

  if (compact) {
    return (
      <a
        href={`/projects/${projectId}?tab=tasks&task=${taskId}`}
        className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Link className="w-3 h-3" />
        <span className="truncate max-w-[150px]">{taskTitle}</span>
      </a>
    );
  }

  return (
    <a
      href={`/projects/${projectId}?tab=tasks&task=${taskId}`}
      className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors group"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div className={`p-2 rounded-lg ${config.bgColor}`}>
        <StatusIcon className={`w-5 h-5 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Link className="w-4 h-4 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {taskTitle}
          </p>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
          {taskStatus.replace("_", " ")}
        </p>
      </div>
    </a>
  );
}

