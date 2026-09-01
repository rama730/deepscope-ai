import { ProfileShell } from "./ProfileShell";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
    const header = (
        <div className="rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <div className="px-5 sm:px-8 py-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 w-full">
                        {/* Avatar */}
                        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex-shrink-0" />
                        <div className="pb-1 w-full space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Name */}
                                <Skeleton className="h-8 w-48 rounded-md" />
                                {/* Strength Chip */}
                                <Skeleton className="h-6 w-24 rounded-full hidden sm:block" />
                            </div>
                            {/* Headline */}
                            <Skeleton className="h-4 w-3/4 max-w-md rounded-md" />
                            <div className="flex gap-4 mt-2">
                                <Skeleton className="h-4 w-24 rounded-md" />
                                <Skeleton className="h-4 w-24 rounded-md" />
                            </div>
                        </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="hidden sm:flex flex-row gap-2">
                        <Skeleton className="h-10 w-28 rounded-xl" />
                        <Skeleton className="h-10 w-28 rounded-xl" />
                    </div>
                </div>
                {/* Open To Chips */}
                <div className="mt-4 flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
            </div>
        </div>
    );

    const tabs = (
        <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-px">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
        </div>
    );

    const main = (
        <div className="space-y-6">
            {/* About Card */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
                <Skeleton className="h-6 w-32 rounded-md" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-2/3 rounded-md" />
                </div>
            </div>
            {/* Featured Projects */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
                <Skeleton className="h-6 w-40 rounded-md" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-48 w-full rounded-xl" />
                </div>
            </div>
        </div>
    );

    const rail = (
        <div className="space-y-6">
            {/* Stats Card */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-5 w-8 rounded-md" />
                </div>
                <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-5 w-8 rounded-md" />
                </div>
                <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-5 w-8 rounded-md" />
                </div>
            </div>
            {/* Social Links */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                <Skeleton className="h-5 w-32 rounded-md" />
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </div>
        </div>
    );

    return <ProfileShell header={header} tabs={tabs} main={main} rail={rail} />;
}
