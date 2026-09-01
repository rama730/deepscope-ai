"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Rocket, Star, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TrendingProject {
    id: string;
    title: string;
    description: string;
    status: string;
    popularity_score: number;
    slug?: string;
    looking_for?: string[] | null;
}

export default function TrendingProjects() {
    const supabase = createSupabaseBrowserClient();
    const router = useRouter();
    const [projects, setProjects] = useState<TrendingProject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProjects() {
            try {
                // Get current user and their skills for personalization
                const { data: { user } } = await supabase.auth.getUser();
                let skills: string[] = [];

                if (user) {
                    const { data: skillsData } = await supabase
                        .from("skills")
                        .select("skill_name")
                        .eq("user_id", user.id);
                    skills = skillsData?.map(s => s.skill_name.toLowerCase()) || [];
                }

                // Try fetching projects with all columns first
                const { data, error } = await supabase
                    .from('projects')
                    .select('id, title, description, status, popularity_score, slug, tags')
                    .eq('status', 'open')
                    .order('popularity_score', { ascending: false })
                    .limit(20);

                if (error) {
                    console.warn("TrendingProjects: Error fetching projects:", error);
                }

                if (data && data.length > 0) {
                    // Personalize based on user skills if available
                    let personalizedProjects = data;
                    if (skills.length > 0) {
                        personalizedProjects = data.map((project: any) => {
                            const projectTags = (Array.isArray(project.tags) ? project.tags : []).map((s: string) => s.toLowerCase());
                            const matchCount = skills.filter(skill =>
                                projectTags.some((tag: string) => tag.includes(skill) || skill.includes(tag))
                            ).length;
                            return { ...project, matchCount };
                        }).sort((a: any, b: any) => {
                            // Prioritize projects with skill matches, then by popularity
                            if (b.matchCount !== a.matchCount) {
                                return b.matchCount - a.matchCount;
                            }
                            return (b.popularity_score || 0) - (a.popularity_score || 0);
                        });
                    }
                    setProjects(personalizedProjects.slice(0, 5));
                } else {
                    // Fallback: Fetch recent open projects if no popular ones found
                    const { data: fallbackData } = await supabase
                        .from('projects')
                        .select('id, title, description, status, popularity_score, slug, tags')
                        .eq('status', 'open')
                        .order('created_at', { ascending: false })
                        .limit(5);

                    if (fallbackData) {
                        setProjects(fallbackData);
                    }
                }
            } catch (error: any) {
                // Suppress 406 and 400 errors - these are expected
                if (error?.status !== 406 && error?.status !== 400) {
                    console.error("Error loading trending projects:", error);
                }
            } finally {
                setLoading(false);
            }
        }

        loadProjects();
    }, []);

    if (loading) {
        return (
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                <div className="h-5 bg-zinc-300 dark:bg-zinc-800 rounded w-1/2 mb-4 animate-pulse" />
                <div className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="h-12 bg-zinc-300 dark:bg-zinc-800 rounded w-full animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-orange-500" />
                    Hot Projects
                </h3>
                <p className="text-sm text-zinc-500">No active projects yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-orange-500" />
                    Hot Projects
                </h3>
                {projects.length > 0 && (
                    <Link
                        href="/hub"
                        className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                    >
                        View all
                        <ExternalLink className="w-3 h-3" />
                    </Link>
                )}
            </div>
            <div className="space-y-3">
                {projects.map((project) => {
                    const matchCount = (project as any).matchCount || 0;
                    return (
                        <Link
                            href={`/projects/${project.slug || project.id}`}
                            key={project.id}
                            className="block group"
                            onMouseEnter={() => router.prefetch(`/projects/${project.slug || project.id}`)}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm text-zinc-800 dark:text-zinc-200 group-hover:text-blue-500 transition-colors line-clamp-1">
                                        {project.title}
                                    </h4>
                                    {matchCount > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                                            Matches your skills
                                        </span>
                                    )}
                                </div>
                                {project.popularity_score > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-zinc-500 flex-shrink-0">
                                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                        {project.popularity_score}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                                {project.description || "No description available."}
                            </p>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
