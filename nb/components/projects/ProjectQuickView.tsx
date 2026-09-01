"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Calendar, Users, Eye, Bookmark, Share2, MessageSquare, ChevronLeft, ChevronRight, Activity, Code, Layers } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import SimilarProjectsWidget from "@/components/hub/SimilarProjectsWidget";

interface ProjectQuickViewProps {
    project: any;
    isOpen: boolean;
    onClose: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
    hasNext?: boolean;
    hasPrevious?: boolean;
}

type Tab = 'overview' | 'tech' | 'activity' | 'team';

export default function ProjectQuickView({ project, isOpen, onClose, onNext, onPrevious, hasNext, hasPrevious }: ProjectQuickViewProps) {
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Keyboard Navigation
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' && hasNext) onNext?.();
            if (e.key === 'ArrowLeft' && hasPrevious) onPrevious?.();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, hasNext, hasPrevious, onNext, onPrevious, onClose]);

    if (!project) return null;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Layers },
        { id: 'tech', label: 'Tech Stack', icon: Code },
        { id: 'activity', label: 'Activity', icon: Activity },
        { id: 'team', label: 'Team', icon: Users },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Holographic Slide-over Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full max-w-lg bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl z-50 border-l border-white/20 dark:border-zinc-700/50 flex flex-col"
                    >
                        {/* Header with Navigation */}
                        <div className="flex items-center justify-between p-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onPrevious}
                                    disabled={!hasPrevious}
                                    className="p-1.5 rounded-full hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={onNext}
                                    disabled={!hasNext}
                                    className="p-1.5 rounded-full hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest hidden sm:block">Quick View</span>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Project Hero Header */}
                        <div className="p-6 pb-2">
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${project.status === 'open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                        project.status === 'in-progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    }`}>
                                    {project.status === 'open' ? 'Planning' : project.status === 'in-progress' ? 'In Progress' : 'Completed'}
                                </span>
                                <span className="text-zinc-500 dark:text-zinc-400 text-xs">
                                    Started {new Date(project.created_at).toLocaleDateString("en-US", { month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight mb-2">
                                {project.title}
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed line-clamp-2">
                                {project.short_description || project.description}
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 border-b border-zinc-200/50 dark:border-zinc-800/50 flex space-x-6 overflow-x-auto no-scrollbar">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as Tab)}
                                    className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id
                                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                            : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300"
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {activeTab === 'overview' && (
                                        <div className="space-y-6">
                                            {/* Quick Stats Grid */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-center">
                                                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{project.view_count || 0}</div>
                                                    <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Views</div>
                                                </div>
                                                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-center">
                                                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{(project.technologies_used || []).length}</div>
                                                    <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Techs</div>
                                                </div>
                                                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-center">
                                                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{project.tags?.length || 0}</div>
                                                    <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Tags</div>
                                                </div>
                                            </div>

                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">Description</h4>
                                                <p>{project.description || "No detailed description available."}</p>
                                            </div>

                                            <SimilarProjectsWidget projectId={project.id} />
                                        </div>
                                    )}

                                    {activeTab === 'tech' && (
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Technologies Used</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {project.technologies_used?.map((tech: string) => (
                                                    <span key={tech} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium">
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                            {!project.technologies_used?.length && <p className="text-zinc-500 text-sm">No technologies listed.</p>}
                                        </div>
                                    )}

                                    {activeTab === 'activity' && (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <Activity className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                                            <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No Recent Activity</h4>
                                            <p className="text-zinc-500 text-sm max-w-xs mx-auto mt-2">
                                                This project hasn't had any public updates recently. Check back later!
                                            </p>
                                        </div>
                                    )}

                                    {activeTab === 'team' && (
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Team Members</h4>
                                            {/* Placeholder for Team List as we need data fetching here or passed prop */}
                                            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                                    {project.profiles?.full_name?.[0] || 'C'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{project.profiles?.full_name || 'Creator'}</div>
                                                    <div className="text-xs text-zinc-500">Project Lead</div>
                                                </div>
                                            </div>
                                            <p className="text-xs text-zinc-500 italic mt-4 text-center">More team details available in full view.</p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                            <div className="flex gap-3">
                                <Link
                                    href={`/projects/${(project as any).slug || project.id}`}
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    View Full Project
                                    <ExternalLink className="w-4 h-4" />
                                </Link>
                                <button className="p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-white dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors shadow-sm">
                                    <Share2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
