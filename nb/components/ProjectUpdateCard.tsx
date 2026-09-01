"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, ThumbsUp, CheckCircle2, FileText, ArrowRight, Rocket, Megaphone, BookOpen, GitCommit } from "lucide-react";

interface LinkedTask {
  id: string;
  title: string;
  status: string;
}

interface LinkedFile {
  id: string;
  name: string;
  file_type?: string;
}

interface ProjectUpdate {
  id: string;
  project_id: string;
  title?: string; // Extracted from content usually
  content: string;
  update_type?: string; // milestone, release, etc.
  created_at: string;
  project?: {
    id: string;
    title: string;
    slug?: string;
  };
  likes_count?: number;
  comments_count?: number;
}

interface ProjectUpdateCardProps {
  update: ProjectUpdate;
  tasks: LinkedTask[];
  files: LinkedFile[];
  onClick?: () => void;
}

export default function ProjectUpdateCard({ update, tasks, files, onClick }: ProjectUpdateCardProps) {
  const router = useRouter();

  // Parse content to get title and body if title isn't provided or is empty
  const lines = (update.content || "").split("\n");
  const title = update.title || lines[0] || "Project Update";
  const body = update.title ? update.content : lines.slice(1).join("\n").trim();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else if (update.project?.id) {
      router.push(`/projects/${update.project.slug || update.project.id}?tab=updates`);
    }
  };

  const getTypeConfig = (type: string = "other") => {
    switch (type.toLowerCase()) {
      case "milestone":
        return { icon: Rocket, color: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30", label: "Milestone" };
      case "release":
        return { icon: GitCommit, color: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30", label: "Release" };
      case "announcement":
        return { icon: Megaphone, color: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30", label: "Announcement" };
      default: // dev_log or other
        return { icon: BookOpen, color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30", label: "Dev Log" };
    }
  };

  const typeConfig = getTypeConfig(update.update_type);
  const Icon = typeConfig.icon;

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 cursor-pointer mt-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig.color}`}>
            <Icon className="h-3.5 w-3.5" />
            {typeConfig.label}
          </span>
          {update.project && (
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              in {update.project.title}
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-500">
          {new Date(update.created_at).toLocaleDateString("en-US")}
        </span>
      </div>

      {/* Content */}
      <div>
        <h3 className="line-clamp-2 text-lg font-bold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
          {title}
        </h3>
        {body && (
          <p className="mt-2 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
            {body}
          </p>
        )}
      </div>

      {/* Work Log / Tasks */}
      {tasks.length > 0 && (
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Work Log
          </div>
          <div className="space-y-2">
            {tasks.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-start gap-2">
                <div className="mt-1 text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-1">
                  {task.title}
                </span>
              </div>
            ))}
            {tasks.length > 3 && (
              <p className="pl-6 text-xs text-zinc-500">
                +{tasks.length - 3} more tasks
              </p>
            )}
          </div>
        </div>
      )}

      {/* Linked Files */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          {files.slice(0, 2).map((file) => (
            <div key={file.id} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <FileText className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{file.name}</span>
            </div>
          ))}
          {files.length > 2 && (
            <span className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              +{files.length - 2} files
            </span>
          )}
        </div>
      )}
    </div>
  );
}

