"use client";

import Link from "next/link";
import { Users, UserPlus, FileText, Calendar, Tag, Code, Globe, Lock, Github, ExternalLink } from "lucide-react";
import { profileHref } from "@/lib/routing/identifiers";

interface ProjectOverviewTabProps {
  project: any;
  teamMembers: any[];
  applications: any[];
  currentUser: any;
  onManageApplicants?: () => void;
  onManageTeam?: () => void;
  showTeam?: boolean;
}

export default function ProjectOverviewTab({
  project,
  teamMembers,
  applications,
  currentUser,
  onManageApplicants,
  onManageTeam,
  showTeam = true,
}: ProjectOverviewTabProps) {
  const isCreator = currentUser?.id === project?.creator_id;
  const openRolesCount = (project?.open_roles || []).reduce(
    (sum: number, role: any) => sum + (role.count || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* About Section */}
      <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-4">About</h2>
        
        {project?.description && (
          <div className="mb-4">
            <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {project.description}
            </p>
          </div>
        )}

        {project?.problem_statement && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Problem Statement</h3>
            <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed italic">
              "{project.problem_statement}"
            </p>
          </div>
        )}

        {project?.solution_overview && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Solution Overview</h3>
            <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              {project.solution_overview}
            </p>
          </div>
        )}

        {/* Project Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800">
          {project?.technologies_used && project.technologies_used.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Technologies</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.technologies_used.map((tech: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs border border-indigo-200 dark:border-indigo-800"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {project?.tags && project.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {project?.github_repository && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Github className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Repository</h3>
              </div>
              <a
                href={project.github_repository}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                View on GitHub
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {project?.live_demo_url && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Live Demo</h3>
              </div>
              <a
                href={project.live_demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Visit Demo
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Created</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-zinc-400">
              {new Date(project?.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Visibility</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-zinc-400 capitalize">
              {project?.visibility || 'public'}
            </p>
          </div>
        </div>
      </div>

      {/* Team Section */}
      {showTeam && (
        <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team ({teamMembers.length + 1})
            </h2>
            {isCreator && onManageTeam && (
              <button
                onClick={onManageTeam}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Manage Team
              </button>
            )}
          </div>

          <div className="space-y-3">
            {/* Creator */}
            {project?.profiles && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                  {project.profiles.full_name?.[0]?.toUpperCase() ||
                    project.profiles.username?.[0]?.toUpperCase() ||
                    'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={profileHref({ id: project.creator_id, username: project.profiles?.username })}
                    className="text-sm font-medium text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {project.profiles.full_name || project.profiles.username || 'Creator'}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Project Creator</p>
                </div>
              </div>
            )}

            {/* Team Members */}
            {teamMembers.map((member: any) => (
              <div key={member.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold">
                  {member.profiles?.full_name?.[0]?.toUpperCase() ||
                    member.profiles?.username?.[0]?.toUpperCase() ||
                    'M'}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={profileHref({ id: member.user_id, username: member.profiles?.username })}
                    className="text-sm font-medium text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {member.profiles?.full_name || member.profiles?.username || 'Member'}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {member.role || 'Team Member'}
                  </p>
                </div>
              </div>
            ))}

            {teamMembers.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-zinc-400 text-center py-4">
                No team members yet
              </p>
            )}
          </div>

          {/* Open Roles */}
          {openRolesCount > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  {openRolesCount} Open Role{openRolesCount !== 1 ? 's' : ''}
                </h3>
              </div>
              <div className="space-y-1">
                {project?.open_roles?.slice(0, 3).map((role: any, index: number) => (
                  <div key={index} className="text-xs text-slate-600 dark:text-zinc-400">
                    • {role.role} ({role.count || 1} position{role.count !== 1 ? 's' : ''})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Applications Section (Creator Only) */}
      {isCreator && applications.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Applications ({applications.length})
            </h2>
            {onManageApplicants && (
              <button
                onClick={onManageApplicants}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Manage Applications
              </button>
            )}
          </div>

          <div className="space-y-3">
            {applications.slice(0, 5).map((app: any) => (
              <div
                key={app.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50"
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm font-semibold">
                  {app.applicant_profile?.full_name?.[0]?.toUpperCase() ||
                    app.applicant_profile?.username?.[0]?.toUpperCase() ||
                    'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-zinc-100">
                    {app.applicant_profile?.full_name || app.applicant_profile?.username || 'Applicant'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Applied for {app.role_applied_for || 'Team Member'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium ${
                    app.status === 'pending'
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                      : app.status === 'accepted'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                  }`}
                >
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

