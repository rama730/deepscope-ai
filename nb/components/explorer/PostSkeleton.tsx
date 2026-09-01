export default function PostSkeleton() {
  return (
    <div className="relative border-b border-zinc-100 dark:border-zinc-800 p-4 sm:p-5 bg-white dark:bg-black overflow-hidden group">
      {/* Subtle shimmer effect */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />

      <div className="flex items-start gap-4">
        {/* Avatar skeleton - Circular and fixed size */}
        <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-900 flex-shrink-0" />

        <div className="flex-1 space-y-4">
          {/* Header skeleton */}
          <div className="flex items-center gap-3">
            <div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-900 rounded-md" />
            <div className="h-3 w-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-md" />
          </div>

          {/* Content skeleton - Staggered widths for natural look */}
          <div className="space-y-2.5">
            <div className="h-4 w-[95%] bg-zinc-100 dark:bg-zinc-900 rounded-md" />
            <div className="h-4 w-[85%] bg-zinc-100 dark:bg-zinc-900 rounded-md" />
            <div className="h-4 w-[60%] bg-zinc-100 dark:bg-zinc-900 rounded-md" />
          </div>

          {/* Image skeleton - Deterministic 16:9 aspect ratio to prevent CLS */}
          <div className="aspect-video w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden mt-4" />

          {/* Actions skeleton */}
          <div className="flex items-center justify-between max-w-sm pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 w-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}
