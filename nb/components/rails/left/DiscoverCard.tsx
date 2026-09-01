"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import {
    Sparkles, Flame, Users, UserPlus, Plus
} from "lucide-react";
import { profileHref } from "@/lib/routing/identifiers";
import { sendConnectionRequest } from "@/app/actions/connection";

export default function DiscoverCard({ userId }: { userId: string }) {
    const supabase = createSupabaseBrowserClient();
    const [matchingProjects, setMatchingProjects] = useState<any[]>([]);
    const [hotProjects, setHotProjects] = useState<any[]>([]);
    const [suggestedPeople, setSuggestedPeople] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [connectingTo, setConnectingTo] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            // Get user's skills first
            const { data: skillsData } = await supabase
                .from("skills")
                .select("skill_name")
                .eq("user_id", userId);

            const skills = skillsData?.map(s => s.skill_name.toLowerCase()) || [];

            // Fetch projects matching user's skills.
            const { data: projectsData } = await supabase
                .from("projects")
                .select("*")
                .eq("status", "open")
                .neq("creator_id", userId)
                .order("created_at", { ascending: false })
                .limit(10);

            // Calculate skill matches with percentage and matched skills
            const projectsWithMatches = (projectsData || []).map((project: any) => {
                const lookingFor = (Array.isArray(project.looking_for) ? project.looking_for : []).map((s: string) => s.toLowerCase());
                const matchedSkills = skills.filter(skill =>
                    lookingFor.some((lf: string) => lf.includes(skill) || skill.includes(lf))
                );
                const matchCount = matchedSkills.length;
                const matchPercentage = lookingFor.length > 0
                    ? Math.round((matchCount / lookingFor.length) * 100)
                    : 0;
                return { ...project, matchCount, matchPercentage, matchedSkills };
            });

            // Sort by match percentage first, then by match count
            const sorted = projectsWithMatches
                .filter(p => p.matchCount > 0)
                .sort((a, b) => {
                    if (b.matchPercentage !== a.matchPercentage) {
                        return b.matchPercentage - a.matchPercentage;
                    }
                    return b.matchCount - a.matchCount;
                });
            setMatchingProjects(sorted.slice(0, 2));

            // Fetch hot projects based on actual project activity/engagement metrics
            const pastMonth = new Date();
            pastMonth.setDate(pastMonth.getDate() - 30); // Look back 30 days for dev data visibility

            // Get projects with recent activity (posts, updates, applications)
            const { data: recentPosts } = await supabase
                .from("posts")
                .select("project_id, likes_count, comments_count, reposts_count, created_at")
                .gte("created_at", pastMonth.toISOString())
                .not("project_id", "is", null);

            // Get project applications (indicates active interest)
            const { data: recentApplications } = await supabase
                .from("project_applications")
                .select("project_id, created_at")
                .gte("created_at", pastMonth.toISOString());

            // Aggregate engagement by project
            const projectEngagement: Record<string, { score: number; project_id: string }> = {};

            recentPosts?.forEach((post: any) => {
                if (post.project_id) {
                    if (!projectEngagement[post.project_id]) {
                        projectEngagement[post.project_id] = { score: 0, project_id: post.project_id };
                    }
                    const engagement = (post.likes_count || 0) * 2 + (post.comments_count || 0) * 3 + (post.reposts_count || 0) * 1.5;
                    projectEngagement[post.project_id]!.score += engagement;
                }
            });
            recentApplications?.forEach((app: any) => {
                if (app.project_id) {
                    if (!projectEngagement[app.project_id]) {
                        projectEngagement[app.project_id] = { score: 0, project_id: app.project_id };
                    }
                    projectEngagement[app.project_id]!.score += 5; // Applications indicate high interest
                }
            });

            // Get top projects by engagement score
            let topProjectIds = Object.values(projectEngagement)
                .sort((a, b) => b.score - a.score)
                .slice(0, 2)
                .map(p => p.project_id);

            // FALLBACK: If no hot projects found (dev env or low activity), fetch recent open projects
            if (topProjectIds.length === 0) {
                const { data: fallbackProjects } = await supabase
                    .from("projects")
                    .select("id")
                    .eq("status", "open")
                    // Removed .neq("creator_id", userId) to allow showing own projects if nothing else exists (better for dev/small envs)
                    .order("created_at", { ascending: false })
                    .limit(2);

                if (fallbackProjects && fallbackProjects.length > 0) {
                    topProjectIds = fallbackProjects.map(p => p.id);
                }
            }

            if (topProjectIds.length > 0) {
                const { data: hotProjectsData } = await supabase
                    .from("projects")
                    .select("id, title, description, status, slug")
                    .in("id", topProjectIds)
                    .eq("status", "open");

                setHotProjects(hotProjectsData || []);
            } else {
                setHotProjects([]);
            }

            // Fetch suggested people using optimized RPC
            const { data: suggestions } = await supabase.rpc('get_discover_suggestions', {
                p_user_id: userId,
                p_limit: 3
            });

            setSuggestedPeople(suggestions || []);
            setLoading(false);
        })();
    }, [userId]);

    const handleQuickConnect = async (personId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setConnectingTo(personId);

        try {
            const { error } = await sendConnectionRequest(userId, personId);

            if (error) {
                logger.error("Connection error", { error });
                // Show error toast if available
            } else {
                // Show success feedback
                const person = suggestedPeople.find(p => p.id === personId);
                if (person) {
                    // Update button to show success state
                    setTimeout(() => {
                        setSuggestedPeople(prev => prev.filter(p => p.id !== personId));
                    }, 1000);
                } else {
                    setSuggestedPeople(prev => prev.filter(p => p.id !== personId));
                }
            }
        } catch (err) {
            logger.error("Error sending connection request", { error: err });
        } finally {
            setConnectingTo(null);
        }
    };

    if (loading) {
        return (
            <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-zinc-300 dark:bg-zinc-800 rounded w-20" />
                    <div className="h-10 bg-zinc-300 dark:bg-zinc-800 rounded" />
                    <div className="h-10 bg-zinc-300 dark:bg-zinc-800 rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-white">Discover</h3>
            </div>

            <div className="p-2 space-y-3">
                {/* Hot Right Now */}
                {hotProjects.length > 0 && (
                    <div>
                        <div className="flex items-center gap-1 mb-1.5">
                            <Flame className="h-3 w-3 text-orange-500 dark:text-orange-400" />
                            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-500">Hot right now</span>
                        </div>
                        <div className="space-y-1.5">
                            {hotProjects.slice(0, 2).map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.slug || project.id}`}
                                    className="block p-2 rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-500/10 dark:to-red-500/10 border border-orange-200 dark:border-orange-500/20 hover:border-orange-300 dark:hover:border-orange-500/40 transition-colors group"
                                >
                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white truncate font-medium">{project.title}</p>
                                    {project.description && (
                                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{project.description}</p>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Projects Matching Your Skills */}
                {matchingProjects.length > 0 && (
                    <div>
                        <div className="flex items-center gap-1 mb-1.5">
                            <Users className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-500">Matches your skills</span>
                        </div>
                        <div className="space-y-1.5">
                            {matchingProjects.slice(0, 2).map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.slug || project.id}`}
                                    className="block p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-300 dark:hover:bg-zinc-800 transition-colors group"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white truncate font-medium">{project.title}</p>
                                            {(project as any).matchedSkills && (project as any).matchedSkills.length > 0 && (
                                                <div className="flex flex-wrap gap-0.5 mt-1">
                                                    {(project as any).matchedSkills.slice(0, 2).map((skill: string, idx: number) => (
                                                        <span key={idx} className="text-[9px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {(project as any).matchCount > 0 && (
                                            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-medium">
                                                    {(project as any).matchPercentage}%
                                                </span>
                                                <span className="text-[8px] text-zinc-500 dark:text-zinc-400">
                                                    {(project as any).matchCount} match{(project as any).matchCount !== 1 ? 'es' : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Suggested People with Quick Connect */}
                {suggestedPeople.length > 0 && (
                    <div>
                        <div className="flex items-center gap-1 mb-1.5">
                            <UserPlus className="h-3 w-3 text-purple-500 dark:text-purple-400" />
                            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-500">People to connect</span>
                        </div>
                        <div className="space-y-1">
                            {suggestedPeople.slice(0, 3).map((person) => (
                                <div
                                    key={person.id}
                                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors group"
                                >
                                    <Link
                                        href={profileHref({ id: person.id, username: person.username })}
                                        className="flex items-center gap-2 flex-1 min-w-0"
                                    >
                                        <div className="relative h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0 overflow-hidden">
                                            {person.avatar_url ? (
                                                <Image
                                                    src={person.avatar_url}
                                                    alt=""
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                (person.full_name || person.username || "U").slice(0, 1).toUpperCase()
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate block group-hover:text-zinc-900 dark:group-hover:text-white font-medium">
                                                {person.full_name || person.username || "User"}
                                            </span>
                                            {(person as any).suggestionReason && (
                                                <span className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate block">
                                                    {(person as any).suggestionReason}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                    <button
                                        onClick={(e) => handleQuickConnect(person.id, e)}
                                        disabled={connectingTo === person.id}
                                        className={`p-1 rounded transition-colors ${connectingTo === person.id
                                            ? "bg-blue-200 dark:bg-blue-500/30 opacity-100"
                                            : "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 opacity-0 group-hover:opacity-100"
                                            }`}
                                        title={connectingTo === person.id ? "Sending..." : "Connect"}
                                    >
                                        {connectingTo === person.id ? (
                                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Plus className="h-3 w-3" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {matchingProjects.length === 0 && hotProjects.length === 0 && suggestedPeople.length === 0 && (
                    <div className="text-center py-4">
                        <Sparkles className="h-5 w-5 text-zinc-400 dark:text-zinc-600 mx-auto mb-1.5" />
                        <p className="text-xs text-zinc-500 dark:text-zinc-500">Nothing to discover yet</p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-600">Add skills for recommendations</p>
                    </div>
                )}
            </div>
        </div>
    );
}
