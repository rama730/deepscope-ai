"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import TopNav from "./TopNav";
import { WorkspaceProvider, WorkspaceDock } from "@/components/workspace-v2";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show nav on auth pages
  const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
  const isAuthPage = authRoutes.some(route => pathname?.startsWith(route));

  // Messages, Post Detail, Hub, and Settings pages need fixed layout with no scroll on main

  const isPostPage = pathname?.startsWith('/post/');
  const isHubPage = pathname === '/hub';
  const isMessagesPage = pathname === '/messages';

  if (isAuthPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (isPostPage || isHubPage || isMessagesPage) {
    return (
      <WorkspaceProvider>
        <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
          <Suspense fallback={<div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:!bg-zinc-950" />}>
            <TopNav />
          </Suspense>
          <main className="flex-1 overflow-hidden">{children}</main>
          <WorkspaceDock />
        </div>
      </WorkspaceProvider>
    );
  }

  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <Suspense fallback={<div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950" />}>
          <TopNav />
        </Suspense>
        <main className="bg-white dark:bg-zinc-950 min-h-[calc(100vh-4rem)]">{children}</main>
        <WorkspaceDock />
      </div>
    </WorkspaceProvider>
  );
}

