"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import DashboardCard from "@/components/projects/dashboard/DashboardCard";
import { Sparkles } from "lucide-react";

interface RelatedProjectsCardProps {
  currentProject: {
    id: string;
    project_type?: string;
    tags?: string[];
    technologies_used?: string[];
  };
  limit?: number;
}

export default function RelatedProjectsCard({ currentProject, limit = 3 }: RelatedProjectsCardProps) {
  const [relatedProjects, setRelatedProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const fetchRelatedProjects = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from("projects")
          .select("id, title, slug, short_description, status, project_type, technologies_used, tags")
          .neq("id", currentProject.id)
          .eq("status", "open")
          .limit(limit);

        // Prioritize projects with same type
        if (currentProject.project_type) {
          query = query.eq("project_type", currentProject.project_type);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching related projects:", error);
          return;
        }

        // If we don't have enough results, fetch more by tags or technologies
        if (!data || data.length < limit) {
          const tags = currentProject.tags || [];
          const techs = currentProject.technologies_used || [];

          if (tags.length > 0 || techs.length > 0) {
            let additionalQuery = supabase
              .from("projects")
              .select("id, title, slug, short_description, status, project_type, technologies_used, tags")
              .neq("id", currentProject.id)
              .eq("status", "open");

            if (tags.length > 0) {
              additionalQuery = additionalQuery.contains("tags", tags);
            } else if (techs.length > 0) {
              additionalQuery = additionalQuery.contains("technologies_used", techs);
            }

            const { data: additionalData } = await additionalQuery.limit(limit - (data?.length || 0));

            if (additionalData) {
              const combined = [...(data || []), ...additionalData];
              const unique = combined.filter((project, index, self) =>
                index === self.findIndex(p => p.id === project.id)
              );
              setRelatedProjects(unique.slice(0, limit));
            } else {
              setRelatedProjects(data || []);
            }
          } else {
            setRelatedProjects(data || []);
          }
        } else {
          setRelatedProjects(data);
        }
      } catch (err) {
        console.error("Error fetching related projects:", err);
      } finally {
        setLoading(false);
      }
    };

    if (currentProject.id) {
      fetchRelatedProjects();
    }
  }, [currentProject.id, currentProject.project_type, currentProject.tags, currentProject.technologies_used, limit, supabase]);

  if (loading || relatedProjects.length === 0) return null;

  return (
    <DashboardCard
      title="Related Projects"
      icon={Sparkles}
      iconColor="text-purple-500 dark:text-purple-400"
      compact
    >
      <div className="space-y-3">
        {relatedProjects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.slug || project.id}`}
            className="block p-3 rounded-lg border border-slate-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                  {project.title}
                </h4>
                {project.short_description && (
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {project.short_description}
                  </p>
                )}
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}

