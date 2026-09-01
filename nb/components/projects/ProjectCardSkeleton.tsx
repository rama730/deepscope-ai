

export default function ProjectCardSkeleton() {
    return (
        <div className="h-full">
            <div className="group relative h-full rounded-2xl border border-slate-200/60 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 overflow-hidden flex flex-col">
                {/* Gradient Status Bar Skeleton */}
                <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 animate-pulse" />

                {/* Header Section */}
                <div className="p-5 pb-3">
                    <div className="flex items-start justify-between mb-3">
                        {/* Status Badge Skeleton */}
                        <div className="w-20 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />

                        {/* Actions Skeleton */}
                        <div className="flex flex-col items-end gap-2">
                            <div className="w-5 h-5 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                            <div className="w-16 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                        </div>
                    </div>

                    <div className="space-y-3 min-h-[140px]">
                        {/* Title Skeleton */}
                        <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 animate-pulse" />
                        <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2 animate-pulse" />

                        {/* Description Skeleton */}
                        <div className="space-y-2 pt-2">
                            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full animate-pulse" />
                            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full animate-pulse" />
                            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3 animate-pulse" />
                        </div>
                    </div>

                    {/* Tags Skeleton */}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                        <div className="flex flex-wrap gap-1.5">
                            <div className="w-16 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                            <div className="w-20 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                            <div className="w-14 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Content Section (Open Roles) */}
                <div className="px-5 py-0 flex-1 space-y-4">
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-24 h-4 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <div className="w-full h-4 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                            <div className="w-full h-4 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="p-5 pt-4 border-t border-slate-100 dark:border-zinc-800 mt-auto">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-4 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                            <div className="w-12 h-4 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                            <div className="w-12 h-4 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                        </div>
                        <div className="w-20 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
