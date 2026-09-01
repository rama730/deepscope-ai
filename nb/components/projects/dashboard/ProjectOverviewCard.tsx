"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import StatusTransitionAnimation from "@/components/projects/StatusTransitionAnimation";
import Link from "next/link";
import {
    Github,
    Globe,
    ExternalLink,
    Bookmark,
    Users,
    Share2,
    Edit,
    CheckCircle,
    Zap,
    Lock,
    Eye,
    ArrowRight
} from "lucide-react";
import ProjectTypeBadge from "@/components/projects/ProjectTypeBadge";
import { profileHref } from "@/lib/routing/identifiers";

interface ProjectOverviewCardProps {
    project: any;
    isCreator: boolean;
    bookmarked: boolean;
    bookmarkCount: number;
    followersCount: number;
    membersCount: number;
    onEdit?: () => void;
    onShare?: () => void;
    onBookmark?: () => void;
    onFinalize?: () => void;
    onExport?: () => void;
    onDuplicate?: () => void;
    shareCopied?: boolean;
    bookmarkLoading?: boolean;
    defaultExpanded?: boolean;
    hideToggle?: boolean;
    hideActionBar?: boolean;
    isFollowing?: boolean;
    onFollow?: () => void;
    followLoading?: boolean;
    lifecycleStages?: Array<{ name: string; status: string }>;
    currentStageIndex?: number;
    onAdvanceStage?: () => void;
}

export default function ProjectOverviewCard({
    project,
    isCreator,
    bookmarked,
    membersCount,
    onEdit,
    onShare,
    onBookmark,
    shareCopied = false,
    bookmarkLoading = false,
    lifecycleStages = [],
    currentStageIndex = 0,
    onAdvanceStage,
    hideActionBar = false,
}: ProjectOverviewCardProps) {
    const [showStatusTransition, setShowStatusTransition] = useState(false);
    const [statusTransition, setStatusTransition] = useState<{ from: string; to: string } | null>(null);
    const previousStatusRef = useRef(project?.status);

    // Watch for status changes
    useEffect(() => {
        if (project?.status && previousStatusRef.current && previousStatusRef.current !== project.status) {
            setStatusTransition({ from: previousStatusRef.current, to: project.status });
            setShowStatusTransition(true);
        }
        previousStatusRef.current = project?.status;
    }, [project?.status]);

    const statusColors: Record<string, string> = {
        open: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900",
        "in-progress": "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900",
        completed: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
    };

    const statusLabels: Record<string, string> = {
        open: "Planning",
        "in-progress": "In Progress",
        completed: "Completed",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col h-fit"
        >
            <div className="p-8">
                {/* Header: Type & Status */}
                <div className="flex items-center gap-3 mb-6">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${statusColors[project?.status] || statusColors.open}`}>
                        {statusLabels[project?.status] || "Planning"}
                    </span>
                    {(project?.project_type || project?.custom_project_type) && (
                        <ProjectTypeBadge
                            projectType={project.project_type || "other"}
                            customType={project.custom_project_type}
                            size="md"
                            showIcon={true}
                        />
                    )}
                    {project?.visibility === "private" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                            <Lock className="w-3 h-3" />
                            Private
                        </span>
                    )}
                </div>

                {/* Hero Section: Title & Tagline */}
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-zinc-100 mb-4 tracking-tight leading-tight">
                        {project?.title}
                    </h1>
                    {project?.short_description && (
                        <p className="text-xl text-slate-600 dark:text-zinc-400 font-medium leading-relaxed max-w-3xl">
                            {project.short_description}
                        </p>
                    )}
                </div>

                {/* Action Bar */}
                {!hideActionBar && (
                    <div className="flex items-center justify-between py-6 border-t border-b border-slate-100 dark:border-zinc-800 mb-8">
                        <div className="flex items-center gap-6">
                            {/* Stats */}
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400" title="Total Views">
                                <Eye className="w-4 h-4" />
                                <span className="font-semibold text-slate-900 dark:text-zinc-200">{project?.view_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400" title="Members">
                                <Users className="w-4 h-4" />
                                <span className="font-semibold text-slate-900 dark:text-zinc-200">{membersCount}</span>
                            </div>
                            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700" />

                            {/* Social Proof */}
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                                <span>Created by</span>
                                <Link
                                    href={profileHref({ id: project?.creator_id, username: project?.profiles?.username })}
                                    className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    {project?.profiles?.full_name || project?.profiles?.username || "Creator"}
                                </Link>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {onBookmark && (
                                <button
                                    onClick={onBookmark}
                                    disabled={bookmarkLoading}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${bookmarked
                                        ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400"
                                        : "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                                        }`}
                                >
                                    <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-current" : ""}`} />
                                    {bookmarked ? "Saved" : "Save"}
                                </button>
                            )}
                            {onShare && (
                                <button
                                    onClick={onShare}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
                                >
                                    {shareCopied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                                    Share
                                </button>
                            )}
                            {isCreator && onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition-colors ml-2 shadow-sm"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Project
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Content Tabs / Sections */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Project Journey (Timeline) */}
                    <section className="bg-slate-50 dark:bg-zinc-800/20 rounded-xl p-5 border border-slate-100 dark:border-zinc-800 mb-2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                    <CheckCircle className="w-3 h-3" />
                                </span>
                                Project Journey
                            </h3>
                            {isCreator && onAdvanceStage && (
                                <div className="flex items-center gap-3">
                                    <div className="hidden md:flex items-center text-[10px] text-slate-400">
                                        <span className="mr-2">Current stage:</span>
                                        <span className="font-medium text-slate-700 dark:text-zinc-300">
                                            {(lifecycleStages.length > 0 ? lifecycleStages : [
                                                { name: "Concept", status: "completed" },
                                                { name: "Team Formation", status: "current" },
                                                { name: "MVP", status: "upcoming" },
                                                { name: "Beta", status: "upcoming" },
                                                { name: "Launch", status: "upcoming" },
                                            ])[currentStageIndex]?.name || "Planning"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={onAdvanceStage}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-medium transition-colors shadow-sm"
                                    >
                                        Advance
                                        <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            {/* Horizontal Line */}
                            <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-200 dark:bg-zinc-700 hidden md:block" />

                            <div className="flex flex-col md:flex-row w-full justify-between gap-4 md:gap-0">
                                {(lifecycleStages.length > 0 ? lifecycleStages : [
                                    { name: "Concept", status: "completed" },
                                    { name: "Team Formation", status: "current" },
                                    { name: "MVP", status: "upcoming" },
                                    { name: "Beta", status: "upcoming" },
                                    { name: "Launch", status: "upcoming" },
                                ]).map((stage: any, index: number) => {
                                    const isCompleted = index < currentStageIndex;
                                    const isCurrent = index === currentStageIndex;
                                    // const isUpcoming = index > currentStageIndex;

                                    return (
                                        <div key={index} className="relative z-10 flex md:flex-col items-center md:text-center gap-3 md:gap-2 flex-1">
                                            {/* Dot Indicator */}
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${isCompleted
                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                : isCurrent
                                                    ? "bg-white dark:bg-zinc-900 border-indigo-600 text-indigo-600 shadow-sm ring-4 ring-indigo-50 dark:ring-indigo-900/20"
                                                    : "bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-600 text-slate-400"
                                                }`}>
                                                {isCompleted ? (
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                ) : isCurrent ? (
                                                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-600" />
                                                )}
                                            </div>

                                            {/* Label */}
                                            <div className="flex-1 md:flex-initial">
                                                <p className={`text-xs font-semibold ${isCurrent ? "text-indigo-600 dark:text-indigo-400" : isCompleted ? "text-slate-700 dark:text-zinc-300" : "text-slate-400 dark:text-zinc-500"
                                                    }`}>
                                                    {stage.name}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* The Vision (Description) */}
                    {project?.description && (
                        <section>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-4 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Vision & Description
                            </h3>
                            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-zinc-400">
                                <p className="whitespace-pre-wrap leading-relaxed">
                                    {project.description}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Problem & Solution Grid */}
                    {(project?.problem_statement || project?.solution_overview) && (
                        <div className="grid md:grid-cols-2 gap-6">
                            {project.problem_statement && (
                                <div className="h-full p-6 rounded-2xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-100 dark:border-zinc-800">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-3">The Problem</h3>
                                    <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed italic">
                                        "{project.problem_statement}"
                                    </p>
                                </div>
                            )}
                            {project.solution_overview && (
                                <div className="h-full p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                                    <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100 mb-3">The Solution</h3>
                                    <p className="text-emerald-800 dark:text-emerald-200/80 text-sm leading-relaxed">
                                        {project.solution_overview}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tech Stack & Links */}
                    <div className="flex flex-wrap items-start gap-12 pt-4 border-t border-slate-100 dark:border-zinc-800">
                        {project?.technologies_used && project.technologies_used.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                                    Built With
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {project.technologies_used.map((tech: string, index: number) => (
                                        <Link
                                            key={index}
                                            href={`/hub?tech=${encodeURIComponent(tech.toLowerCase())}`}
                                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 shadow-sm hover:border-indigo-300 transition-colors"
                                        >
                                            {tech}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(project?.github_repository || project?.live_demo_url) && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                                    Resources
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {project.github_repository && (
                                        <a
                                            href={project.github_repository}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
                                        >
                                            <Github className="w-4 h-4" />
                                            Source Code
                                            <ExternalLink className="w-3 h-3 opacity-50" />
                                        </a>
                                    )}
                                    {project.live_demo_url && (
                                        <a
                                            href={project.live_demo_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                        >
                                            <Globe className="w-4 h-4" />
                                            Live Demo
                                            <ExternalLink className="w-3 h-3 opacity-50" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Status Transition Animation */}
            {statusTransition && (
                <StatusTransitionAnimation
                    fromStatus={statusTransition.from}
                    toStatus={statusTransition.to}
                    isVisible={showStatusTransition}
                    onComplete={() => {
                        setShowStatusTransition(false);
                        setTimeout(() => setStatusTransition(null), 300);
                    }}
                />
            )}
        </motion.div>
    );
}
