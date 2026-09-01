"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui-custom/Toast";
import { useFlashNotification } from "@/hooks/useFlashNotification";
import { useSubscription } from "@/hooks/useSubscription";
import { useQueryClient } from "@tanstack/react-query";
import { notificationKeys } from "@/lib/queryKeys";

interface Notification {
  id: string;
  type: string;
  message: string;
  actor_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface NotificationContextType {
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteNotifications: (ids: string[]) => Promise<void>;
  reloadUnreadCount: () => void;
  requestNotificationPermission: () => Promise<boolean>;
  showDesktopNotification: (message: string, options?: NotificationOptions) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  markAsRead: async () => { },
  markAsUnread: async () => { },
  markAllAsRead: async () => { },
  deleteNotification: async () => { },
  deleteNotifications: async () => { },
  reloadUnreadCount: () => { },
  requestNotificationPermission: async () => false,
  showDesktopNotification: () => { },
});

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

export default function NotificationProvider({ children }: NotificationProviderProps) {
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth(); // Get user from context
  const queryClient = useQueryClient();

  const [unreadCount, setUnreadCount] = useState(0);
  const { showToast } = useToast();
  const { startFlashing } = useFlashNotification();

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setUnreadCount(count || 0);
  }, [supabase, user]);

  // Centralized Realtime Subscription
  // This automatically handles channel uniqueness and cleanup
  const handleNotificationChange = useCallback(async (payload: any) => {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      // Invalidate the infinite query to fetch fresh data (safest strategy)
      // We explicitly invalidate all notification lists for this user
      // Delay slightly to ensure DB consistency (optional, but sometimes needed with complex trigger logic)

      // Optimistic update for COUNT only
      if (eventType === 'INSERT') {
        const newNotification = newRecord as Notification;

        // Show toast using global provider
        showToast(newNotification.message, "info");

        // Flash the tab title
        startFlashing("New Notification! 🔔");

        // Update unread count
        setUnreadCount(prev => prev + 1);

        // Invalidate list queries so the list updates automatically
        queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });

      } else if (eventType === 'UPDATE') {
        // If is_read changed, reload count
        // Optimistic check:
        if (newRecord && oldRecord && newRecord.is_read !== oldRecord.is_read) {
          // Let loadUnreadCount handle exact sync, or manually adjust:
          // But simpler to just reload count
          loadUnreadCount();
          // And invalidate lists to update UI Read indicators
          queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
        } else {
          // Other updates
          queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
        }
      } else if (eventType === 'DELETE') {
        // If deleted, refresh count
        loadUnreadCount();
        queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      }
    } catch (error) {
      console.error("[NotificationProvider] Error handling realtime update:", error);
    }
  }, [showToast, startFlashing, loadUnreadCount, queryClient]);

  useSubscription({
    table: 'notifications',
    filter: user ? `user_id=eq.${user.id}` : undefined,
    event: '*', // Listen to all events, filter in callback
    enabled: !!user,
    onData: handleNotificationChange
  });

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic UI update for count
    setUnreadCount(prev => Math.max(0, prev - 1));

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    // Invalidate queries so lists update their specific item state
    queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
  }, [supabase, queryClient]);

  const markAsUnread = useCallback(async (id: string) => {
    setUnreadCount(prev => prev + 1);

    await supabase
      .from('notifications')
      .update({ is_read: false })
      .eq('id', id);

    queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
  }, [supabase, queryClient]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    setUnreadCount(0);

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
  }, [supabase, user, queryClient]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!user) return;

    // We can't easily know if it was read or not locally without fetching or passing param
    // But we can just fetch count again after.
    // For now, let's just do the delete.

    await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    // Refresh everything
    loadUnreadCount();
    queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
  }, [supabase, user, loadUnreadCount, queryClient]);

  const deleteNotifications = useCallback(async (ids: string[]) => {
    if (!user) return;

    await supabase
      .from('notifications')
      .delete()
      .in('id', ids);

    loadUnreadCount();
    queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
  }, [supabase, user, loadUnreadCount, queryClient]);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const showDesktopNotification = useCallback((message: string, options: NotificationOptions = {}) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(message, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    }
  }, []);

  const contextValue = useMemo(() => ({
    unreadCount,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    deleteNotifications,
    reloadUnreadCount: loadUnreadCount,
    requestNotificationPermission,
    showDesktopNotification,
  }), [
    unreadCount,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    deleteNotifications,
    loadUnreadCount,
    requestNotificationPermission,
    showDesktopNotification
  ]);

  return (
    <NotificationContext.Provider
      value={contextValue}
    >
      {children}
    </NotificationContext.Provider>
  );
}

