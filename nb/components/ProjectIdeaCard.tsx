"use client";

import { useRouter } from "next/navigation";
import { Users, Target, Lightbulb } from "lucide-react";

interface Role {
  role_name: string;
  description?: string;
  count?: number;
}

interface ProjectIdea {
  id: string;
  title: string;
  short_description?: string;
  problem_statement?: string;
  roles_needed: Role[];
  skills_needed?: string[];
  likes_count: number;
  comments_count: number;
  view_count?: number;
  converted_to_project_id?: string;
  created_at?: string;
}

interface ProjectIdeaCardProps {
  idea: ProjectIdea;
  onClick?: () => void;
}

export default function ProjectIdeaCard({ idea, onClick }: ProjectIdeaCardProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      router.push(`/ideas/${idea.id}`);
    }
  };

  const roles = (idea.roles_needed || []) as Role[];
  const hasRoles = roles.length > 0;

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 cursor-pointer mt-2"
    >
      {/* Header */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500">
              <Lightbulb className="h-3.5 w-3.5" />
              Project Idea
            </span>
            {idea.converted_to_project_id && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-500">
                Converted
              </span>
            )}
          </div>
          {idea.created_at && (
            <span className="text-xs text-zinc-500">
              {new Date(idea.created_at).toLocaleDateString('en-US')}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-lg font-bold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
          {idea.title}
        </h3>
      </div>

      {/* Problem Statement */}
      {idea.problem_statement && (
        <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            <Target className="h-3.5 w-3.5 text-zinc-500" />
            The Problem
          </div>
          <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            {idea.problem_statement}
          </p>
        </div>
      )}

      {/* Roles & Tasks - Explicitly listed */}
      {hasRoles && (
        <div className="pb-2">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <Users className="h-3.5 w-3.5" />
            Looking For
          </div>
          <div className="flex flex-col gap-2">
            {roles.slice(0, 3).map((role, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
                      {role.role_name}
                    </span>
                    {role.count && role.count > 1 && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        (×{role.count})
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <span className="text-zinc-500 dark:text-zinc-400 block text-xs mt-0.5">
                      {role.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {roles.length > 3 && (
              <p className="pl-3.5 text-xs text-zinc-500">
                +{roles.length - 3} more roles
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

