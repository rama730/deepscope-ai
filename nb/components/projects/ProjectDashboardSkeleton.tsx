"use client";

import { motion } from "framer-motion";

export default function ProjectDashboardSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                        <div className="w-4 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                        <div className="w-32 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-8 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                        <div className="w-20 h-8 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                    </div>
                </div>

                {/* Main Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Project Overview Card Skeleton */}
                        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className="space-y-4 w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-zinc-800 animate-pulse" />
                                        <div className="space-y-2 flex-1">
                                            <div className="w-1/3 h-8 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                            <div className="w-1/4 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="w-full h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                        <div className="w-2/3 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-zinc-800">
                                <div className="w-24 h-10 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                                <div className="w-24 h-10 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                                <div className="w-10 h-10 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse ml-auto" />
                            </div>
                        </div>

                        {/* Work Feed / Content Skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Work Feed Skeleton */}
                            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 h-[400px]">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-32 h-6 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                    <div className="w-8 h-8 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                </div>
                                <div className="space-y-6">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse flex-shrink-0" />
                                            <div className="space-y-2 flex-1">
                                                <div className="w-3/4 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                                <div className="w-1/2 h-3 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* My Tasks Skeleton */}
                            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 h-[400px]">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-24 h-6 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                    <div className="w-8 h-8 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                </div>
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="p-3 rounded-lg border border-slate-100 dark:border-zinc-800 space-y-3">
                                            <div className="flex justify-between">
                                                <div className="w-1/2 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                                <div className="w-4 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="w-16 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                                                <div className="w-16 h-5 bg-slate-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Sidebar Skeleton */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Team Card Skeleton */}
                        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-20 h-5 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                <div className="w-16 h-5 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                            </div>
                            <div className="flex -space-x-2 overflow-hidden mb-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-slate-200 dark:bg-zinc-800 animate-pulse" />
                                ))}
                            </div>
                            <div className="w-full h-9 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                        </div>

                        {/* Timeline Skeleton */}
                        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                            <div className="w-24 h-5 bg-slate-200 dark:bg-zinc-800 rounded mb-4 animate-pulse" />
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="w-1/3 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                    <div className="w-1/4 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                </div>
                                <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                                <div className="flex justify-between gap-2">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="w-full h-1 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Open Roles Skeleton */}
                        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-24 h-5 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                <div className="w-6 h-6 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                            </div>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-zinc-800/50">
                                        <div className="w-1/3 h-4 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
                                        <div className="w-16 h-6 bg-slate-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
