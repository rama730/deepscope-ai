"use client";

import NotificationListEnhanced from "@/components/notifications/NotificationList";

export default function NotificationsPage() {
  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Notifications</h1>
        </div>
      </div>

      <div className="min-h-[calc(100vh-3.5rem)]">
        <NotificationListEnhanced showFilters={true} compact={false} />
      </div>
    </div>
  );
}
