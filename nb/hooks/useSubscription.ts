import { useEffect, useRef } from "react";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { RealtimeManager, PostgresEvent } from "@/lib/supabase/RealtimeManager";
import { perfTracker } from "@/lib/performance/measure";

interface UseSubscriptionOptions<T extends Record<string, any>> {
  table: string;
  schema?: string;
  event?: PostgresEvent;
  filter?: string;
  onData: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

/**
 * Unified hook for Real-Time subscriptions.
 * Uses centralized RealtimeManager for efficient channel reuse.
 */
export function useSubscription<T extends Record<string, any>>({
  table,
  schema = "public",
  event = "*",
  filter,
  onData,
  enabled = true,
}: UseSubscriptionOptions<T>) {
  const onDataRef = useRef(onData);

  // Keep callback fresh
  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  useEffect(() => {
    if (!enabled || !table) return;

    const unsubscribe = RealtimeManager.subscribe<T>(
      { table, schema, event, filter },
      (payload) => {
        if (onDataRef.current) {
          onDataRef.current(payload);
        }
      }
    );

    // Update subscription count for performance tracking
    const updateCount = () => {
      perfTracker.setSubscriptionCount(RealtimeManager.getTotalSubscriptionCount());
    };
    updateCount();

    return () => {
      unsubscribe();
      updateCount();
    };
  }, [table, schema, event, filter, enabled]);
}

