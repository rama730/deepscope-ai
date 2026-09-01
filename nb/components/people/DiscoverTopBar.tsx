"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Briefcase, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  title: string;
  slug: string | null;
  status?: string;
}

interface DiscoverTopBarProps {
  currentUserId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
  shortlistCount: number;
  onShortlistClick: () => void;
}

export default function DiscoverTopBar({
  currentUserId,
  searchQuery,
  onSearchChange,
  selectedProjectId,
  onProjectChange,
  shortlistCount,
  onShortlistClick,
}: DiscoverTopBarProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      setProjects([]);
      setSelectedProject(null);
      return;
    }

    async function loadProjects() {
      setLoadingProjects(true);
      try {
        const [created, collab] = await Promise.all([
          supabase
            .from("projects")
            .select("id, title, slug, status")
            .eq("creator_id", currentUserId)
            .in("status", ["open", "in_progress"])
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("project_collaborators")
            .select("project_id, role, projects(id, title, slug, status)")
            .eq("user_id", currentUserId)
            .in("role", ["owner", "admin"]),
        ]);

        const map = new Map<string, Project>();
        (created.data || []).forEach((p: any) => {
          map.set(p.id, { id: p.id, title: p.title, slug: p.slug || null, status: p.status });
        });
        (collab.data || []).forEach((c: any) => {
          if (c.projects && (c.projects.status === "open" || c.projects.status === "in_progress")) {
            map.set(c.projects.id, {
              id: c.projects.id,
              title: c.projects.title,
              slug: c.projects.slug || null,
              status: c.projects.status,
            });
          }
        });

        const list = Array.from(map.values());
        setProjects(list);

        if (selectedProjectId) {
          const found = list.find((p) => p.id === selectedProjectId);
          setSelectedProject(found || null);
        }
      } catch (error) {
        console.error("Error loading projects:", error);
      } finally {
        setLoadingProjects(false);
      }
    }

    loadProjects();
  }, [currentUserId, selectedProjectId, supabase]);

  useEffect(() => {
    if (selectedProjectId) {
      const found = projects.find((p) => p.id === selectedProjectId);
      setSelectedProject(found || null);
    } else {
      setSelectedProject(null);
    }
  }, [selectedProjectId, projects]);

  return (
    <div className="sticky top-0 z-30 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 -mx-4 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
        {/* Project Selector */}
        {currentUserId && (
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <Briefcase className="w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">Staffing for:</span>
            <select
              value={selectedProjectId || ""}
              onChange={(e) => onProjectChange(e.target.value || null)}
              disabled={loadingProjects}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg border bg-white dark:bg-zinc-900",
                "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "min-w-[180px]"
              )}
            >
              <option value="">No project (general)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {selectedProject && (
              <button
                onClick={() => onProjectChange(null)}
                className="p-1 rounded hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300 transition-colors"
                aria-label="Clear project selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Search */}
        <div className="flex-1 min-w-0 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search people, skills, roles, projects..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Shortlist Button */}
        {currentUserId && (
          <button
            onClick={onShortlistClick}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg border transition-colors",
              shortlistCount > 0
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            )}
          >
            Shortlist {shortlistCount > 0 && `(${shortlistCount})`}
          </button>
        )}
      </div>
    </div>
  );
}

