"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Project } from "./HubClient";
import Link from "next/link";


interface SimilarProjectsWidgetProps {
    projectId: string;
}

export default function SimilarProjectsWidget({ projectId }: SimilarProjectsWidgetProps) {
    const [similarProjects, setSimilarProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        async function loadSimilar() {
            const { data, error } = await supabase.rpc('get_similar_projects', { project_id_param: projectId });
            if (!error && data) {
                setSimilarProjects(data as any);
            }
            setLoading(false);
        }
        loadSimilar();
    }, [projectId]);

    if (loading) return <div className="animate-pulse h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>;
    if (similarProjects.length === 0) return null;

    return (
        <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Similar Projects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {similarProjects.map(project => (
                    <Link key={project.id} href={`/project/${project.id}`} className="block group">
                        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-white dark:bg-zinc-900">
                            <h4 className="font-medium group-hover:text-blue-500 truncate">{project.title}</h4>
                            <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{project.description}</p>
                            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                                <span className="capitalize">{project.custom_project_type || project.project_type}</span>
                                <span>•</span>
                                <span>{project.tags?.length || 0} tags</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
