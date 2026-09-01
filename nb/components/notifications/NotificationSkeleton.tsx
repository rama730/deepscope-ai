"use client";

export default function NotificationSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex gap-4">
        {/* Avatar skeleton */}
        <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full flex-shrink-0" />

        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
        </div>

        {/* Media preview skeleton */}
        <div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex-shrink-0" />
      </div>
    </div>
  );
}

export function NotificationSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </>
  );
}
