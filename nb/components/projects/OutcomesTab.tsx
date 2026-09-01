"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TabLoadingScreen } from "@/components/ui-custom/LoadingSkeleton";

interface OutcomesTabProps {
  projectId: string;
  project: any;
  isOwnerOrMember: boolean;
}

interface CompletedTask {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  assigned_profile?: {
    full_name: string | null;
    username: string | null;
  };
}

export default function OutcomesTab({ projectId, project, isOwnerOrMember }: OutcomesTabProps) {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [stats, setStats] = useState({
    totalCompleted: 0,
  });

  useEffect(() => {
    if (projectId) {
      loadOutcomes();
    }
  }, [projectId]);

  async function loadOutcomes() {
    setLoading(true);

    try {
      // ULTRA SAFE: Start with minimal query that should always work
      const { data: tasks, error: tasksError } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "done")
        .order("created_at", { ascending: false });

      if (tasksError) {
        console.error("Error loading completed tasks:", tasksError);
        console.error("Error code:", tasksError.code);
        console.error("Error message:", tasksError.message);
        console.error("Error details:", JSON.stringify(tasksError, null, 2));
        setCompletedTasks([]);
        setStats({
          totalCompleted: 0,
        });
      } else {


        // Now try to enhance with related data
        if (tasks && tasks.length > 0) {
          // Try to load assigned profiles separately
          const enhancedTasks = await Promise.all(
            tasks.map(async (task) => {
              let assignedProfile = null;

              // Try to get assigned profile
              if (task.assigned_to) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name, username")
                  .eq("id", task.assigned_to)
                  .single();
                assignedProfile = profile;
              }

              return {
                ...task,
                assigned_profile: assignedProfile,
              };
            })
          );

          setCompletedTasks(enhancedTasks);

          setStats({
            totalCompleted: enhancedTasks.length,
          });
        } else {
          setCompletedTasks([]);
          setStats({
            totalCompleted: 0,
          });
        }
      }
    } catch (error) {
      console.error("Exception loading outcomes:", error);
      setCompletedTasks([]);
      setStats({
        totalCompleted: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <TabLoadingScreen type="outcomes" />;
  }

  if (!isOwnerOrMember) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-2">Access Restricted</h3>
        <p className="text-sm text-zinc-500">You must be a project member to view outcomes.</p>
      </div>
    );
  }

  const completionRate = project?.lifecycle_stages?.length > 0
    ? Math.round(((project.current_stage_index + 1) / project.lifecycle_stages.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">Project Outcomes</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Completed tasks and deliverables
          </p>
        </div>
      </div>

      {/* Project Overview Card */}
      <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{project.title}</h3>
            {project.short_description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{project.short_description}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${project.status === "open"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
              : project.status === "in-progress"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
            }`}>
            {project.status === "open" ? "Planning" : project.status === "in-progress" ? "In Progress" : "Completed"}
          </span>
        </div>

        {/* Project Lifecycle Progress */}
        {project.lifecycle_stages && project.lifecycle_stages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Project Lifecycle</span>
              <span className="text-sm font-bold text-blue-600">{completionRate}%</span>
            </div>
            <div className="flex items-center gap-2">
              {project.lifecycle_stages.map((stage: string, idx: number) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-semibold transition-all ${idx <= project.current_stage_index
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white dark:bg-zinc-800 border"
                    }`}
                >
                  {idx === project.current_stage_index && "→ "}
                  {stage}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-1">
        <div className="group rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-5 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">{stats.totalCompleted}</p>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Tasks Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Tasks */}
      <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Completed Tasks</h3>
            <p className="text-xs text-zinc-500 mt-0.5">All successfully completed project tasks</p>
          </div>
        </div>

        {completedTasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">No completed tasks yet</p>
            <p className="text-sm text-zinc-500">Tasks will appear here once they are marked as complete</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="group rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/50 via-green-50/50 to-emerald-50/50 dark:from-emerald-900/10 dark:via-green-900/10 dark:to-emerald-900/10 p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.01]"
              >
                <div className="flex items-start gap-4">
                  {/* Checkmark Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{task.description}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Completed
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mb-3">
                      {task.assigned_profile && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{task.assigned_profile.full_name || task.assigned_profile.username}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {new Date(task.completed_at || task.updated_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


