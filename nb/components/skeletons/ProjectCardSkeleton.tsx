import { Skeleton } from "@/components/ui/skeleton";

export function ProjectCardSkeleton() {
    return (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden h-[380px] flex flex-col">
            <div className="p-6 flex-1 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-20 rounded-full" />
                        <Skeleton className="h-6 w-3/4 rounded-md" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>

                {/* Desc */}
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />

                {/* Tags */}
                <div className="flex gap-2 pt-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-4 w-20" />
            </div>
        </div>
    );
}

export function ProjectListSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <ProjectCardSkeleton key={i} />
            ))}
        </div>
    );
}
