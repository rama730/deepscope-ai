"use client";

import React from "react";

export default function ProjectDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Back Button Skeleton */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 w-32 h-9 animate-pulse" />
        </div>

        {/* Header Skeleton with Cover Image */}
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden mb-4 shadow-sm">
          {/* Cover Image Skeleton */}
          <div className="relative h-48 sm:h-64 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6">
              <div className="flex-1 space-y-4">
                {/* Status Badge Skeleton */}
                <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                
                {/* Title Skeleton */}
                <div className="space-y-2">
                  <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 animate-pulse" />
                  <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2 animate-pulse" />
                </div>
                
                {/* Description Skeleton */}
                <div className="space-y-2">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full animate-pulse" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6 animate-pulse" />
                </div>
                
                {/* Creator Skeleton */}
                <div className="flex items-center gap-2">
                  <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                    <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons Skeleton */}
              <div className="mt-4 sm:mt-0 w-full sm:w-auto flex-shrink-0 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                  <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                  <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                  <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar Skeleton */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 mb-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 w-10 h-10 animate-pulse" />
                <div className="space-y-1">
                  <div className="h-7 w-12 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lifecycle Tracker Skeleton */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <React.Fragment key={i}>
                <div className="flex-1 relative">
                  <div className="rounded-md border px-3 py-2 h-10 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                </div>
                {i < 4 && (
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          {/* Tab Navigation Skeleton */}
          <div className="sticky top-0 z-10 flex justify-center items-center gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 backdrop-blur-sm">
            <div className="flex gap-1 items-center overflow-x-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className={`h-9 px-4 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse ${
                    i === 1 ? 'w-24' : i === 2 ? 'w-20' : i === 3 ? 'w-16' : i === 4 ? 'w-20' : i === 5 ? 'w-24' : 'w-28'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Tab Content Skeleton */}
          <div className="p-6 space-y-6">
            {/* Overview Content Skeleton */}
            <div className="space-y-6">
              {/* About Section */}
              <div className="rounded-xl border bg-white dark:bg-zinc-900 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="space-y-2 mt-3">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full animate-pulse" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full animate-pulse" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6 animate-pulse" />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Vision Section */}
              <div className="rounded-xl border bg-white dark:bg-zinc-900 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-5 w-28 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full animate-pulse" />
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-4/5 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Open Roles Section */}
              <div className="rounded-xl border bg-white dark:bg-zinc-900 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                    <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-lg border p-4 bg-zinc-50 dark:bg-zinc-900/50">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                        <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {[1, 2, 3].map((j) => (
                          <div key={j} className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Members Section */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                    <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                      <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                        <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                      </div>
                      <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

