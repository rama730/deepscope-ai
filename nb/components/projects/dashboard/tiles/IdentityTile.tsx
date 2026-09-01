"use client";

import { Github, Globe, Share2, Clock } from "lucide-react";
import type { Project } from "@/types/hub";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface IdentityTileProps {
    project: Project;
}

const IdentityTile: React.FC<IdentityTileProps> = ({ project }) => {
    const links = project.external_links || {};
    const techStack = project.technologies_used || [];

    // Determine gradient based on project title hash or just random consistent color
    // For now, using a premium indigo-purple-blue mesh
    const gradientClass = "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-white dark:from-indigo-900/40 dark:via-purple-900/20 dark:to-[#0d1117]";

    return (
        <div className={`relative w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden ${gradientClass}`}>

            {/* Pattern Overlay */}
            <div className="absolute inset-0 bg-grid-zinc-900/[0.02] dark:bg-grid-white/[0.02] pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-10 p-6 md:p-8 flex flex-col gap-6">

                {/* Header Row: Breadcrumbs & Meta */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-300">
                            {project.profiles?.avatar_url ? (
                                <Image
                                    src={project.profiles.avatar_url}
                                    alt={project.profiles.username || "creator"}
                                    width={16}
                                    height={16}
                                    className="rounded-full"
                                />
                            ) : (
                                <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] text-white font-bold">
                                    {(project.profiles?.username || "C").charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors">
                                {project.profiles?.username || "creator"}
                            </span>
                            <span className="text-zinc-400">/</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {project.title}
                            </span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${project.visibility === 'public'
                            ? 'bg-emerald-100/80 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                            }`}>
                            {project.visibility || 'Public'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                        <span className="flex items-center gap-1 bg-white/50 dark:bg-zinc-900/50 px-2 py-1 rounded-md border border-zinc-100 dark:border-zinc-800">
                            <Clock className="w-3.5 h-3.5" />
                            Active {formatDistanceToNow(new Date(project.updated_at || project.created_at))} ago
                        </span>
                    </div>
                </div>

                {/* Main Identity: Title & Description */}
                <div className="max-w-4xl">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight mb-4">
                        {project.title}
                    </h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-3xl">
                        {project.description || project.short_description || "No description provided for this project."}
                    </p>
                </div>

                {/* Footer Row: Tech Stack & Links */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 border-t border-zinc-200/60 dark:border-zinc-700/50">

                    {/* Tech Stack */}
                    <div className="flex flex-wrap items-center gap-2">
                        {techStack.map((tech: string) => (
                            <span
                                key={tech}
                                className="px-3 py-1 rounded-lg bg-white/70 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm backdrop-blur-sm"
                            >
                                {tech}
                            </span>
                        ))}
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-4">
                        {links.website && (
                            <a
                                href={links.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900/20"
                            >
                                <Globe className="w-4 h-4" />
                                <span>Visit Website</span>
                            </a>
                        )}
                        {links.github && (
                            <a
                                href={links.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-200 text-sm font-medium transition-all shadow-sm"
                            >
                                <Github className="w-4 h-4" />
                                <span>Code</span>
                            </a>
                        )}
                        <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white dark:bg-zinc-900/5 transition-colors text-zinc-500">
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IdentityTile;
