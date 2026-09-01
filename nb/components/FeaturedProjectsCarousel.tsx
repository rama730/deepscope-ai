"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Flame, ChevronRight, Users } from "lucide-react";

interface Project {
    id: string;
    title: string;
    status: string;
    slug?: string;
    looking_for?: string[] | null;
    creator: {
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
    };
    collaborators_count: number;
}

export default function FeaturedProjectsCarousel() {
    const supabase = createSupabaseBrowserClient();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFeaturedProjects();
    }, []);

    async function loadFeaturedProjects() {
        try {
            // Fetch open projects with recent activity or high engagement
            // For simplicity and performance, we'll fetch the most recent open projects
            // In a real app, this would use a more complex "trending" algorithm
            // Avoid "trial" selects that can 400 if a column doesn't exist (these show up as noisy console errors).
            // `*` is safe: it only returns existing columns (including `looking_for` if present).
            const { data } = await supabase
                .from("projects")
                .select(`
          *,
          creator:creator_id(username, full_name, avatar_url),
          project_collaborators(count)
        `)
                .eq("status", "open")
                .order("created_at", { ascending: false })
                .limit(10);

            if (data) {
                const formatted = data.map((p: any) => ({
                    ...p,
                    collaborators_count: p.project_collaborators?.[0]?.count || 0
                }));
                setProjects(formatted);
            }
        } catch (error) {
            console.error("Failed to load featured projects", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return null; // Don't show anything while loading to avoid layout shift
    if (projects.length === 0) return null;

    return (
        <div className="py-4 border-b border-zinc-100 dark:border-zinc-800/50">
            <div className="flex items-center justify-between px-4 mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                        <Flame className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-zinc-900 dark:text-white">Featured Projects</h3>
                </div>
                <Link
                    href="/hub"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                    View all <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="overflow-x-auto pb-2 px-4 scrollbar-hide">
                <div className="flex gap-4 w-max">
                    {projects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/projects/${project.slug || project.id}`}
                            className="w-64 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:shadow-sm group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                                        {project.creator.avatar_url ? (
                                            <Image
                                                src={project.creator.avatar_url}
                                                alt=""
                                                width={32}
                                                height={32}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            (project.creator.full_name?.[0] || project.creator.username?.[0] || "U").toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-zinc-900 dark:text-white truncate max-w-[120px]">
                                            {project.creator.full_name || project.creator.username}
                                        </span>
                                        <span className="text-[10px] text-zinc-500">Creator</span>
                                    </div>
                                </div>
                                {project.status === 'open' && (
                                    <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-[10px] font-medium">
                                        Open
                                    </span>
                                )}
                            </div>

                            <h4 className="font-semibold text-zinc-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {project.title}
                            </h4>

                            {project.looking_for && project.looking_for.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mb-3 h-12 overflow-hidden content-start">
                                    {project.looking_for.slice(0, 3).map((role) => (
                                        <span
                                            key={role}
                                            className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px]"
                                        >
                                            {role}
                                        </span>
                                    ))}
                                    {project.looking_for.length > 3 && (
                                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px]">
                                            +{project.looking_for.length - 3}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="h-12 flex items-center text-xs text-zinc-500 italic">
                                    No specific roles listed
                                </div>
                            )}

                            <div className="flex items-center gap-3 text-xs text-zinc-500 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>{project.collaborators_count} team</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
