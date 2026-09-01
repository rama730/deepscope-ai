"use client";

// Reusable Loading Skeleton Components

export function CardSkeleton() {
  return (
    <div className="rounded-xl border-2 bg-white dark:bg-zinc-900 p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="rounded-lg border-2 bg-white dark:bg-zinc-800 p-3 space-y-3 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
          <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
        </div>
        <div className="w-16 h-6 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-20 h-6 bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="w-24 h-6 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
    </div>
  );
}

export function FileCardSkeleton() {
  return (
    <div className="rounded-xl border-2 bg-white dark:bg-zinc-900 overflow-hidden animate-pulse">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
          </div>
        </div>
      </div>
      <div className="flex border-t-2 border-zinc-100 dark:border-zinc-800">
        <div className="flex-1 h-10 bg-zinc-100 dark:bg-zinc-800" />
        <div className="w-20 h-10 bg-zinc-100 dark:bg-zinc-800 border-l-2 border-zinc-100 dark:border-zinc-800" />
      </div>
    </div>
  );
}

export function MessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} animate-pulse`}>
      <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700" />
      <div className={`max-w-[70%] space-y-2 ${isOwn ? 'items-end' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 ${isOwn ? 'bg-blue-200 dark:bg-blue-900' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
          <div className="h-3 bg-zinc-300 dark:bg-zinc-700 rounded w-48 mb-2" />
          <div className="h-3 bg-zinc-300 dark:bg-zinc-700 rounded w-32" />
        </div>
      </div>
    </div>
  );
}

export function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg animate-pulse">
      <div className="w-9 h-9 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
        <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white dark:bg-zinc-900 p-5 space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
        </div>
        <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b animate-pulse">
      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
        <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
      </div>
      <div className="w-20 h-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
    </div>
  );
}

export function OutcomeCardSkeleton() {
  return (
    <div className="rounded-xl border-2 bg-white dark:bg-zinc-900 p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
            </div>
            <div className="w-20 h-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 h-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="w-32 h-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
          <div className="rounded-lg border-2 bg-white dark:bg-zinc-800 p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
              </div>
              <div className="w-24 h-8 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading Screen for Tabs
export function TabLoadingScreen({ type }: { type: "tasks" | "files" | "chat" | "analytics" | "outcomes" | "applications" | "members" }) {
  if (type === "tasks") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 animate-pulse">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-40" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-64" />
          </div>
          <div className="w-32 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
        </div>
        <CardSkeleton />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            {[1, 2, 3].map(i => <TaskCardSkeleton key={i} />)}
          </div>
          <div className="space-y-2">
            {[1, 2].map(i => <TaskCardSkeleton key={i} />)}
          </div>
          <div className="space-y-2">
            {[1].map(i => <TaskCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (type === "files") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 animate-pulse">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-40" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-64" />
          </div>
          <div className="w-32 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <FileCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (type === "chat") {
    return (
      <div className="flex flex-col h-[700px]">
        <div className="px-6 py-5 border-b-2 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-40" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-64" />
            </div>
            <div className="w-16 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-32 h-9 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-zinc-50 dark:bg-zinc-950">
          {[1, 2, 3, 4, 5].map(i => (
            <MessageSkeleton key={i} isOwn={i % 3 === 0} />
          ))}
        </div>
      </div>
    );
  }

  if (type === "analytics") {
    return (
      <div className="space-y-6">
        <div className="space-y-2 animate-pulse">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-48" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => <CardSkeleton key={i} />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <ActivityItemSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (type === "outcomes") {
    return (
      <div className="space-y-6">
        <div className="space-y-2 animate-pulse">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-48" />
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-72" />
        </div>
        <CardSkeleton />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <OutcomeCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (type === "applications") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 h-9 bg-zinc-200 dark:bg-zinc-700 rounded-md animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (type === "members") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return null;
}


